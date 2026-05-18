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

export async function requestEarlyAccess(input) {
  const response = await fetch("/api/early-access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      x_handle: input.xHandle || null
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No se pudo pedir acceso.");
  return payload;
}
