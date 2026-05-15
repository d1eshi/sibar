import { createServer } from "node:http";
import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { join } from "node:path";

import { assertHttpUrl, extractReadableArticle, type ReadableArticle } from "./article-workspace.ts";

const root = process.cwd();
const port = Number(process.env.PORT ?? 4177);
const demoPath = join(root, "docs", "demo", "article-workspace.html");
const fetchTimeoutMs = Number(process.env.ARTICLE_FETCH_TIMEOUT_MS ?? 8_000);
const maxHtmlBytes = Number(process.env.ARTICLE_MAX_HTML_BYTES ?? 2_000_000);
const articleCacheTtlMs = Number(process.env.ARTICLE_CACHE_TTL_MS ?? 15 * 60_000);
const maxRedirects = 5;
const rateLimitWindowMs = 60_000;
const rateLimitMaxPerMinute = Number(process.env.ARTICLE_RATE_LIMIT_PER_MINUTE ?? 10);
const rateLimitMaxPerHour = Number(process.env.ARTICLE_RATE_LIMIT_PER_HOUR ?? 60);

type CacheEntry = {
  article: ReadableArticle;
  cachedAt: number;
};

type RateEntry = {
  minuteStartedAt: number;
  minuteCount: number;
  hourStartedAt: number;
  hourCount: number;
};

const articleCache = new Map<string, CacheEntry>();
const rateLimits = new Map<string, RateEntry>();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalizeClientIp(value: string | undefined): string {
  const candidate = (value ?? "unknown").split(",")[0].trim();
  return candidate.replace(/^::ffff:/, "") || "unknown";
}

function isPrivateIPv4(address: string): boolean {
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

function isPrivateIPv6(address: string): boolean {
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

function isPrivateAddress(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) return isPrivateIPv4(address);
  if (ipVersion === 6) return isPrivateIPv6(address);
  return true;
}

async function assertPublicNetworkTarget(url: URL): Promise<void> {
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

function checkRateLimit(clientIp: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const current = rateLimits.get(clientIp) ?? {
    minuteStartedAt: now,
    minuteCount: 0,
    hourStartedAt: now,
    hourCount: 0,
  };

  if (now - current.minuteStartedAt >= rateLimitWindowMs) {
    current.minuteStartedAt = now;
    current.minuteCount = 0;
  }
  if (now - current.hourStartedAt >= 60 * rateLimitWindowMs) {
    current.hourStartedAt = now;
    current.hourCount = 0;
  }

  current.minuteCount += 1;
  current.hourCount += 1;
  rateLimits.set(clientIp, current);

  if (current.minuteCount > rateLimitMaxPerMinute) {
    return { ok: false, retryAfterSeconds: Math.ceil((rateLimitWindowMs - (now - current.minuteStartedAt)) / 1000) };
  }
  if (current.hourCount > rateLimitMaxPerHour) {
    return { ok: false, retryAfterSeconds: Math.ceil(((60 * rateLimitWindowMs) - (now - current.hourStartedAt)) / 1000) };
  }

  return { ok: true };
}

async function readResponseTextLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > maxHtmlBytes) {
      await reader.cancel();
      throw new Error("Article response is too large.");
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function fetchArticleHtml(initialUrl: URL): Promise<{ html: string; finalUrl: URL }> {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertPublicNetworkTarget(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

    try {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "accept": "text/html,application/xhtml+xml",
          "user-agent": "SibiArticleWorkspace/0.1",
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

async function readArticle(articleUrl: URL): Promise<{ article: ReadableArticle; cache: "hit" | "miss" }> {
  const cacheKey = articleUrl.href;
  const cached = articleCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < articleCacheTtlMs) {
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

async function handle(request: Request, clientIp = "unknown"): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/" || url.pathname === "/article-workspace") {
    const html = await readFile(demoPath, "utf8");
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (url.pathname === "/api/read") {
    try {
      const articleUrl = assertHttpUrl(url.searchParams.get("url") ?? "");
      const rateLimit = checkRateLimit(normalizeClientIp(clientIp));
      if (!rateLimit.ok) {
        return new Response(JSON.stringify({ error: "Too many article reads. Try again shortly." }), {
          status: 429,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "retry-after": String(rateLimit.retryAfterSeconds),
          },
        });
      }

      return json(200, await readArticle(articleUrl));
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : "Could not read article." });
    }
  }

  return new Response("Not found", { status: 404 });
}

const server = createServer((incoming, outgoing) => {
  const request = new Request(`http://${incoming.headers.host}${incoming.url}`, {
    method: incoming.method,
    headers: incoming.headers as HeadersInit,
  });

  const forwardedFor = Array.isArray(incoming.headers["x-forwarded-for"])
    ? incoming.headers["x-forwarded-for"][0]
    : incoming.headers["x-forwarded-for"];
  const clientIp = forwardedFor ?? incoming.socket.remoteAddress ?? "unknown";

  void handle(request, clientIp).then(async (response) => {
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  }).catch((error) => {
    outgoing.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    outgoing.end(JSON.stringify({ error: error instanceof Error ? error.message : "Server error." }));
  });
});

server.listen(port, () => {
  console.log(`Sibi article workspace: http://localhost:${port}/article-workspace`);
});
