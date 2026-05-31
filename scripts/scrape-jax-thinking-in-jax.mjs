import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourceUrl = "https://docs.jax.dev/en/latest/notebooks/thinking_in_jax.html";
const outputPath = resolve(
  "apps/sibar-research-workspace/src/flows/workspace/jaxThinkingInJaxSource.ts",
);
const articleSelector = "article.bd-article";
const sourcePrefix = "thinking-in-jax";
const allowedTags = new Set([
  "a",
  "blockquote",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);
const dataSourceTags = new Set([
  "blockquote",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "img",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
]);
const keptClassNames = new Set([
  "cell",
  "cell_input",
  "cell_output",
  "container",
  "docutils",
  "external",
  "headerlink",
  "highlight",
  "highlight-default",
  "highlight-ipython3",
  "highlight-ipythontb",
  "highlight-myst-ansi",
  "launch-links",
  "literal",
  "notranslate",
  "output",
  "pre",
  "reference",
  "simple",
  "stream",
  "tag_raises-exception",
  "text_plain",
  "tex2jax_ignore",
  "traceback",
]);

const entityMap = new Map([
  ["amp", "&"],
  ["gt", ">"],
  ["lt", "<"],
  ["nbsp", " "],
  ["quot", "\""],
  ["apos", "'"],
]);

function decodeHtml(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }
    if (normalized.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }
    return entityMap.get(normalized) ?? `&${entity};`;
  });
}

function encodeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function slugFromText(value) {
  return stripTags(value)
    .replace(/#/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function getAttribute(rawAttributes, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\s${escaped}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+)))?`, "i");
  const match = rawAttributes.match(pattern);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? "";
}

function extractArticle(html) {
  const match = html.match(/<article\b[^>]*class=["'][^"']*\bbd-article\b[^"']*["'][^>]*>[\s\S]*?<\/article>/i);
  if (!match) {
    throw new Error(`Could not find ${articleSelector}.`);
  }
  return match[0]
    .replace(/^<article\b[^>]*>/i, "")
    .replace(/<\/article>\s*$/i, "");
}

function absoluteUrl(value, baseUrl) {
  if (!value || value.startsWith("#")) return value;
  return new URL(decodeHtml(value), baseUrl).href;
}

function normalizeClass(value) {
  return value
    .split(/\s+/)
    .filter((className) => keptClassNames.has(className))
    .join(" ");
}

function sanitizeHtml(html, baseUrl) {
  let sourceIndex = 0;
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|iframe|form|button|nav|footer|aside|header)\b[\s\S]*?<\/\1>/gi, "");

  return withoutNoise.replace(/<\s*(\/)?\s*([a-z0-9:-]+)([^>]*)>/gi, (full, closing, rawTag, rawAttributes) => {
    const tag = rawTag.toLowerCase();
    if (!allowedTags.has(tag)) return "";
    if (closing) return `</${tag}>`;

    const attrs = [];
    const id = getAttribute(rawAttributes, "id");
    const className = normalizeClass(getAttribute(rawAttributes, "class") ?? "");
    const href = getAttribute(rawAttributes, "href");
    const src = getAttribute(rawAttributes, "src");
    const alt = getAttribute(rawAttributes, "alt");
    const title = getAttribute(rawAttributes, "title");

    if (id && /^[A-Za-z][\w:.-]*$/.test(id)) attrs.push(`id="${encodeHtml(id)}"`);
    if (className) attrs.push(`class="${encodeHtml(className)}"`);
    if (href && tag === "a") {
      attrs.push(`href="${encodeHtml(absoluteUrl(href, baseUrl))}"`);
      if (!href.startsWith("#")) {
        attrs.push('target="_blank"');
        attrs.push('rel="noreferrer"');
      }
    }
    if (src && tag === "img") attrs.push(`src="${encodeHtml(absoluteUrl(src, baseUrl))}"`);
    if (alt && tag === "img") attrs.push(`alt="${encodeHtml(decodeHtml(alt))}"`);
    if (title && tag === "a") attrs.push(`title="${encodeHtml(decodeHtml(title))}"`);
    if (dataSourceTags.has(tag)) {
      sourceIndex += 1;
      attrs.push(`data-source-ref="${sourcePrefix}#html-${String(sourceIndex).padStart(3, "0")}"`);
    }

    return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
  }).trim();
}

function collectSections(html) {
  const seenIds = new Set();
  const sections = [];
  const headingPattern = /<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;

  for (const match of html.matchAll(headingPattern)) {
    const level = Number(match[1]);
    const rawAttributes = match[2] ?? "";
    const headingHtml = match[3] ?? "";
    const title = stripTags(headingHtml).replace(/\s*#$/, "").trim();
    if (!title) continue;
    const id = getAttribute(rawAttributes, "id") ?? slugFromText(title);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    sections.push({
      id,
      title,
      level,
      sourceRef: `${sourcePrefix}#${id}`,
    });
  }

  return sections;
}

function tsString(value) {
  return JSON.stringify(value);
}

function renderSourceFile({ html, sections }) {
  const escapedHtml = html.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const renderedSections = sections
    .map((section) => `  {
    id: ${tsString(section.id)},
    title: ${tsString(section.title)},
    level: ${section.level},
    sourceRef: ${tsString(section.sourceRef)},
  }`)
    .join(",\n");

  return `export const jaxThinkingInJaxSourceUrl =
  ${tsString(sourceUrl)};

export const jaxThinkingInJaxScrapedAt = ${tsString(new Date().toISOString().slice(0, 10))};
export const jaxThinkingInJaxScrapeSelector = ${tsString(articleSelector)};

export type JaxThinkingInJaxSection = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  sourceRef: string;
};

export const jaxThinkingInJaxSections: readonly JaxThinkingInJaxSection[] = [
${renderedSections}
];

export const jaxThinkingInJaxHtml = String.raw\`
${escapedHtml}
\`;
`;
}

async function main() {
  const response = await fetch(sourceUrl, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "user-agent": "SibarJaxDocScraper/0.1",
    },
  });
  if (!response.ok) {
    throw new Error(`JAX source fetch failed with HTTP ${response.status}.`);
  }

  const rawHtml = await response.text();
  const articleHtml = extractArticle(rawHtml);
  const sanitizedHtml = sanitizeHtml(articleHtml, sourceUrl);
  const sections = collectSections(sanitizedHtml);

  if (sections.length < 10) {
    throw new Error(`Expected the scraped notebook to expose at least 10 headings, got ${sections.length}.`);
  }
  if (!sanitizedHtml.includes("Just-in-time compilation with")) {
    throw new Error("Scraped notebook is missing the JIT section.");
  }
  if (!sanitizedHtml.includes("jax.debug.print")) {
    throw new Error("Scraped notebook is missing the debugging section.");
  }

  await writeFile(outputPath, renderSourceFile({ html: sanitizedHtml, sections }));
  console.log(`Wrote ${outputPath}`);
  console.log(`Scraped ${sections.length} headings from ${articleSelector}`);
}

await main();
