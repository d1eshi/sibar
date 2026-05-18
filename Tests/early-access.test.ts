import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const earlyAccessApi = readFileSync(join(root, "web/api/early-access.mjs"), "utf8");
const webHtml = readFileSync(join(root, "web/index.html"), "utf8");
const webApp = readFileSync(join(root, "web/scripts/app.js"), "utf8");
const webStorage = readFileSync(join(root, "web/scripts/storage.js"), "utf8");
const waitlistSpec = readFileSync(join(root, "docs/specs/12_early_access_waitlist.md"), "utf8");
const waitlistSql = readFileSync(join(root, "docs/specs/12_early_access_waitlist.sql"), "utf8");
const vercelConfig = JSON.parse(readFileSync(join(root, "web/vercel.json"), "utf8"));

type RequestInitWithHeaders = RequestInit & { headers?: Record<string, string> };

function request(body: unknown, init: RequestInitWithHeaders = {}) {
  const headers = {
    "content-type": "application/json",
    "x-forwarded-for": "203.0.113.42",
    ...(init.headers ?? {}),
  };
  return new Request("https://sibar.test/api/early-access", {
    method: "POST",
    ...init,
    headers,
    body: JSON.stringify(body),
  });
}

test("early access API keeps Supabase service key server-only", () => {
  assert.match(earlyAccessApi, /process\.env\.SUPABASE_URL/);
  assert.match(earlyAccessApi, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(webHtml, /SUPABASE|service_role|SERVICE_ROLE|supabase/i);
  assert.doesNotMatch(webApp, /SUPABASE|service_role|SERVICE_ROLE|supabase/i);
  assert.doesNotMatch(webStorage, /early_access|waitlist|email|x_handle|SUPABASE/i);
  assert.doesNotMatch(earlyAccessApi, /console\.(log|error|warn)/);
});

test("early access Vercel function is explicitly bounded", () => {
  assert.deepEqual(vercelConfig.functions["api/early-access.mjs"], { maxDuration: 5 });
  assert.equal(vercelConfig.functions["api/read.mjs"].maxDuration, 10);
});

test("early access spec documents secret and OWASP validation boundaries", () => {
  assert.match(waitlistSpec, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(waitlistSpec, /Never prefix it with `NEXT_PUBLIC_`/);
  assert.match(waitlistSpec, /Browser Network panel must never show/);
  assert.match(waitlistSpec, /Function logs must not include/);
  assert.match(waitlistSpec, /OWASP Input Validation Cheat Sheet/);
  assert.match(waitlistSpec, /OWASP Email Validation and Verification Cheat Sheet/);
});

test("early access schema enables RLS and revokes browser roles", () => {
  assert.match(waitlistSql, /create table if not exists public\.early_access_leads/);
  assert.match(waitlistSql, /email_original text not null/);
  assert.match(waitlistSql, /email_canonical text not null/);
  assert.doesNotMatch(waitlistSql, /goal|source_url_attempted/);
  assert.match(waitlistSql, /create unique index if not exists early_access_leads_email_canonical_idx/);
  assert.match(waitlistSql, /alter table public\.early_access_leads enable row level security/);
  assert.match(waitlistSql, /revoke all on table public\.early_access_leads from public/);
  assert.match(waitlistSql, /revoke all on table public\.early_access_leads from anon/);
  assert.match(waitlistSql, /revoke all on table public\.early_access_leads from authenticated/);
});

test("early access API inserts valid leads without echoing PII", async (t) => {
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-secret";

  const fetchCalls: Array<{ url: string; options: RequestInit & { headers: Record<string, string>; body: string } }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url: String(url), options: options as RequestInit & { headers: Record<string, string>; body: string } });
    return new Response(null, { status: 201 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv.SUPABASE_URL === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    if (originalEnv.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
  });

  const { POST } = await import(`../web/api/early-access.mjs?valid=${Date.now()}`);
  const response = await POST(request({
    email: "Diego@Example.COM",
    x_handle: "@d1eshi",
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "https://project.supabase.co/rest/v1/early_access_leads");
  assert.equal(fetchCalls[0].options.headers.apikey, "server-only-secret");
  assert.equal(fetchCalls[0].options.headers.authorization, "Bearer server-only-secret");

  const inserted = JSON.parse(fetchCalls[0].options.body);
  assert.equal(inserted.email_original, "Diego@Example.COM");
  assert.equal(inserted.email_canonical, "Diego@example.com");
  assert.equal(inserted.x_handle, "d1eshi");
  assert.deepEqual(Object.keys(inserted).sort(), ["email_canonical", "email_original", "x_handle"]);
});

test("early access API rejects invalid email before Supabase", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(null, { status: 201 });
  };

  try {
    const { POST } = await import(`../web/api/early-access.mjs?invalid=${Date.now()}`);
    const response = await POST(request({
      email: "\"<script>\"@example.org",
      x_handle: "d1eshi",
    }));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Enter a valid email.");
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("early access API treats duplicate Supabase conflicts as generic success", async (t) => {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-secret";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 409 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { POST } = await import(`../web/api/early-access.mjs?conflict=${Date.now()}`);
  const response = await POST(request({
    email: "already@example.com",
  }, {
    headers: { "x-forwarded-for": "203.0.113.43" },
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
});

test("early access API validates rate limit env and prunes warm-instance entries", () => {
  assert.match(earlyAccessApi, /function numberFromEnv\(name, fallback\)/);
  assert.match(earlyAccessApi, /Number\.isFinite\(value\) && value > 0 \? Math\.floor\(value\) : fallback/);
  assert.match(earlyAccessApi, /const RATE_LIMIT_MAX_ENTRIES = 1_000/);
  assert.match(earlyAccessApi, /rateLimits\.delete\(ip\)/);
  assert.match(earlyAccessApi, /rateLimits\.delete\(rateLimits\.keys\(\)\.next\(\)\.value\)/);
});
