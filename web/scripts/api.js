export function normalizeArticleUrl(rawUrl) {
  const parsed = new URL(rawUrl.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Solo se aceptan URLs http o https.");
  }
  parsed.hash = "";
  return parsed.href;
}

export async function fetchReadableArticle(url) {
  const response = await fetch(`/api/read?url=${encodeURIComponent(url)}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No se pudo cargar.");
  return payload;
}
