const MAX_BODY_BYTES = 4_096;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ENTRIES = 1_000;
const EMAIL_MAX_LENGTH = 254;

const rateLimits = new Map();

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const RATE_LIMIT_MAX_PER_WINDOW = numberFromEnv("EARLY_ACCESS_RATE_LIMIT_PER_MINUTE", 5);

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

function checkRateLimit(clientIp) {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) {
      rateLimits.delete(ip);
    }
  }
  if (rateLimits.size >= RATE_LIMIT_MAX_ENTRIES && !rateLimits.has(clientIp)) {
    rateLimits.delete(rateLimits.keys().next().value);
  }

  const current = rateLimits.get(clientIp) ?? { startedAt: now, count: 0 };
  if (now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    current.startedAt = now;
    current.count = 0;
  }

  current.count += 1;
  rateLimits.set(clientIp, current);

  if (current.count > RATE_LIMIT_MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.startedAt)) / 1000),
    };
  }

  return { ok: true };
}

async function readJsonBodyLimited(request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("Request is too large.");

  const reader = request.body?.getReader();
  if (!reader) return {};

  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("Request is too large.");
    }
    chunks.push(value);
  }

  const rawBody = new TextDecoder().decode(Buffer.concat(chunks));
  if (!rawBody.trim()) return {};
  return JSON.parse(rawBody);
}

function sanitizeFreeText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeEmail(value) {
  const email = sanitizeFreeText(value, EMAIL_MAX_LENGTH);
  if (!email || email.length > EMAIL_MAX_LENGTH) throw new Error("Enter a valid email.");
  if (/["'`<>\u0000-\u001f\u007f\s]/.test(email)) throw new Error("Enter a valid email.");

  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1 || email.indexOf("@") !== at) {
    throw new Error("Enter a valid email.");
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (local.length > 63 || !/^[a-z0-9.-]+$/i.test(domain) || !domain.includes(".")) {
    throw new Error("Enter a valid email.");
  }

  return { original: email, canonical: `${local}@${domain}` };
}

function normalizeXHandle(value) {
  const handle = sanitizeFreeText(value, 32).replace(/^@/, "");
  if (!handle) return null;
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    throw new Error("Enter a valid X handle.");
  }
  return handle.toLowerCase();
}

function normalizeLead(payload) {
  const email = normalizeEmail(payload.email);
  return {
    email_original: email.original,
    email_canonical: email.canonical,
    x_handle: normalizeXHandle(payload.x_handle),
  };
}

async function insertLead(lead) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, status: 503 };
  }

  const endpoint = new URL("/rest/v1/early_access_leads", supabaseUrl).href;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(lead),
  });

  if (response.ok || response.status === 409) return { ok: true };
  return { ok: false, status: 502 };
}

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(normalizeClientIp(request));
    if (!rateLimit.ok) {
      return json(429, { error: "Too many requests. Try again shortly." }, {
        "retry-after": String(rateLimit.retryAfterSeconds),
      });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json(415, { error: "Send JSON." });
    }

    const payload = await readJsonBodyLimited(request);
    const lead = normalizeLead(payload);
    const inserted = await insertLead(lead);
    if (!inserted.ok) {
      return json(inserted.status, { error: "Could not join early access." });
    }

    return json(200, { ok: true });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : "Invalid early access request." });
  }
}

export async function GET() {
  return json(405, { error: "Method not allowed." }, { allow: "POST" });
}
