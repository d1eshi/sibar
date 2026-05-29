import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const FETCH_TIMEOUT_MS = Number(process.env.ARTICLE_FETCH_TIMEOUT_MS ?? 8_000);
const MAX_HTML_BYTES = Number(process.env.ARTICLE_MAX_HTML_BYTES ?? 2_000_000);
const CACHE_TTL_MS = Number(process.env.ARTICLE_CACHE_TTL_MS ?? 15 * 60_000);
const MAX_REDIRECTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_MINUTE = Number(process.env.ARTICLE_RATE_LIMIT_PER_MINUTE ?? 10);
const RATE_LIMIT_MAX_PER_HOUR = Number(process.env.ARTICLE_RATE_LIMIT_PER_HOUR ?? 60);

const ENTITY_MAP = {
  amp: "&",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
  apos: "'",
};

const articleCache = new Map();
const rateLimits = new Map();

function json(status, body, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function normalizeClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const candidate = (forwardedFor ?? realIp ?? "unknown").split(",")[0].trim();
  return candidate.replace(/^::ffff:/, "") || "unknown";
}

function assertHttpUrl(rawUrl) {
  const parsedUrl = new URL(rawUrl.trim());
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Only http and https article URLs are supported.");
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("Article URLs cannot include credentials.");
  }
  parsedUrl.hash = "";
  return parsedUrl;
}

function isPrivateIPv4(address) {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0)
  );
}

function isPrivateIPv6(address) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function isPrivateAddress(address) {
  const ipVersion = isIP(address);
  if (ipVersion === 4) return isPrivateIPv4(address);
  if (ipVersion === 6) return isPrivateIPv6(address);
  return true;
}

async function assertPublicNetworkTarget(url) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Private network article URLs are not supported.");
    }
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: false });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("Private network article URLs are not supported.");
  }
}

function checkRateLimit(clientIp) {
  const now = Date.now();
  const current = rateLimits.get(clientIp) ?? {
    minuteStartedAt: now,
    minuteCount: 0,
    hourStartedAt: now,
    hourCount: 0,
  };

  if (now - current.minuteStartedAt >= RATE_LIMIT_WINDOW_MS) {
    current.minuteStartedAt = now;
    current.minuteCount = 0;
  }
  if (now - current.hourStartedAt >= 60 * RATE_LIMIT_WINDOW_MS) {
    current.hourStartedAt = now;
    current.hourCount = 0;
  }

  current.minuteCount += 1;
  current.hourCount += 1;
  rateLimits.set(clientIp, current);

  if (current.minuteCount > RATE_LIMIT_MAX_PER_MINUTE) {
    return { ok: false, retryAfterSeconds: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.minuteStartedAt)) / 1000) };
  }
  if (current.hourCount > RATE_LIMIT_MAX_PER_HOUR) {
    return { ok: false, retryAfterSeconds: Math.ceil(((60 * RATE_LIMIT_WINDOW_MS) - (now - current.hourStartedAt)) / 1000) };
  }

  return { ok: true };
}

function decodeHtml(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }
    if (normalized.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }
    return ENTITY_MAP[normalized] ?? `&${entity};`;
  });
}

function sanitizeText(value) {
  return decodeHtml(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNoise(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg|noscript|iframe|form|button|nav|footer|aside|header)\b[\s\S]*?<\/\1>/gi, " ");
}

function stripTags(html) {
  return sanitizeText(html.replace(/<[^>]+>/g, " "));
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i");
  return sanitizeText((html.match(propertyFirst)?.[1] ?? html.match(contentFirst)?.[1] ?? "").trim()) || null;
}

function titleFromHtml(html, fallback) {
  const title = metaContent(html, "og:title") ?? stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  return title || fallback;
}

function tagBlocks(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, "gi");
  return html.match(pattern) ?? [];
}

function bestReadableBlock(html) {
  const cleaned = stripNoise(html);
  const candidates = [...tagBlocks(cleaned, "article"), ...tagBlocks(cleaned, "main")];
  if (candidates.length > 0) {
    return candidates.sort((a, b) => stripTags(b).length - stripTags(a).length)[0];
  }
  return cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? cleaned;
}

function paragraphsFromBlock(block) {
  const readable = block
    .replace(/<(h[1-3]|p|li|blockquote|pre)\b[^>]*>/gi, "\n\n")
    .replace(/<\/(h[1-3]|p|li|blockquote|pre)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");

  return readable
    .split(/\n{2,}/)
    .map(stripTags)
    .map(sanitizeText)
    .filter((paragraph) => paragraph.length >= 48)
    .slice(0, 80);
}

function fallbackParagraphs(html) {
  const text = stripTags(stripNoise(html));
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 80)
    .slice(0, 40);
}

function extractReadableArticle(input) {
  const parsedUrl = new URL(input.url);
  const block = bestReadableBlock(input.html);
  const paragraphs = paragraphsFromBlock(block);
  const finalParagraphs = paragraphs.length >= 2 ? paragraphs : fallbackParagraphs(input.html);
  const title = titleFromHtml(input.html, parsedUrl.hostname.replace(/^www\./, ""));

  return {
    url: parsedUrl.href,
    title,
    host: parsedUrl.hostname.replace(/^www\./, ""),
    excerpt: finalParagraphs[0] ?? "",
    paragraphs: finalParagraphs,
  };
}

async function readResponseTextLimited(response) {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Article response is too large.");
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function fetchArticleHtml(initialUrl) {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicNetworkTarget(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "SibarArticleWorkspace/0.1 Vercel",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Article redirect is missing a location.");
        currentUrl = assertHttpUrl(new URL(location, currentUrl).href);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Article fetch failed with HTTP ${response.status}.`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        throw new Error("Article URL did not return HTML.");
      }

      return { html: await readResponseTextLimited(response), finalUrl: currentUrl };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Article fetch timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Article redirected too many times.");
}

async function readArticle(articleUrl) {
  const cacheKey = articleUrl.href;
  const cached = articleCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { article: cached.article, cache: "hit" };
  }

  const fetched = await fetchArticleHtml(articleUrl);
  const article = extractReadableArticle({ url: fetched.finalUrl.href, html: fetched.html });
  articleCache.set(cacheKey, { article, cachedAt: Date.now() });
  if (fetched.finalUrl.href !== cacheKey) {
    articleCache.set(fetched.finalUrl.href, { article, cachedAt: Date.now() });
  }
  return { article, cache: "miss" };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const articleUrl = assertHttpUrl(url.searchParams.get("url") ?? "");
    const rateLimit = checkRateLimit(normalizeClientIp(request));
    if (!rateLimit.ok) {
      return json(429, { error: "Too many article reads. Try again shortly." }, {
        "retry-after": String(rateLimit.retryAfterSeconds),
      });
    }

    return json(200, await readArticle(articleUrl), {
      "cache-control": "public, max-age=0",
      "vercel-cdn-cache-control": "max-age=900",
    });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : "Could not read article." });
  }
}
