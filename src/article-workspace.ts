export type ReadableArticle = {
  url: string;
  title: string;
  host: string;
  excerpt: string;
  paragraphs: string[];
};

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
  apos: "'",
};

function decodeHtml(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
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

function sanitizeText(value: string): string {
  return decodeHtml(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg|noscript|iframe|form|button|nav|footer|aside|header)\b[\s\S]*?<\/\1>/gi, " ");
}

function stripTags(html: string): string {
  return sanitizeText(html.replace(/<[^>]+>/g, " "));
}

function metaContent(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i");
  return sanitizeText((html.match(propertyFirst)?.[1] ?? html.match(contentFirst)?.[1] ?? "").trim()) || null;
}

function titleFromHtml(html: string, fallback: string): string {
  const title = metaContent(html, "og:title") ?? stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  return title || fallback;
}

function tagBlocks(html: string, tagName: string): string[] {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, "gi");
  return html.match(pattern) ?? [];
}

function bestReadableBlock(html: string): string {
  const cleaned = stripNoise(html);
  const candidates = [...tagBlocks(cleaned, "article"), ...tagBlocks(cleaned, "main")];
  if (candidates.length > 0) {
    return candidates.sort((a, b) => stripTags(b).length - stripTags(a).length)[0];
  }
  return cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? cleaned;
}

function paragraphsFromBlock(block: string): string[] {
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

function fallbackParagraphs(html: string): string[] {
  const text = stripTags(stripNoise(html));
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 80)
    .slice(0, 40);
}

export function extractReadableArticle(input: { url: string; html: string }): ReadableArticle {
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

export function assertHttpUrl(rawUrl: string): URL {
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
