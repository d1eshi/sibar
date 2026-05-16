# Spec 12: Early Access Waitlist

## Decision

Sibar early access should collect structured leads in Supabase through a Vercel
Function. The browser must never talk to Supabase directly for this flow.

The initial product signal is:

```text
email + optional X handle
```

This is a waitlist, not an account system. Do not add Supabase Auth, magic links,
workspace persistence, or user profiles in this slice.

## Architecture

```text
Reader / early access UI
  -> POST /api/early-access
  -> Vercel Function validates input and rate limits
  -> Supabase REST insert with server-side service role key
  -> early_access_leads table

Optional Forward Email / ImprovMX
  -> early@sibar.diegosilva.com
  -> personal inbox, only if we want inbound replies
```

Supabase is the source of truth for the waitlist. Forward Email is optional and
only handles inbound replies; it is not required to collect early access leads.

## Vercel Environment Variables

Set these in the Vercel project environment, not in source code:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
EARLY_ACCESS_RATE_LIMIT_PER_MINUTE
```

Rules:

1. `SUPABASE_SERVICE_ROLE_KEY` is server-only.
2. Never prefix it with `NEXT_PUBLIC_`, `PUBLIC_`, or any browser-exposed naming
   convention.
3. Never pass it to the browser, query strings, local storage, analytics,
   console logs, or client bundles.
4. Do not use Supabase from client-side JavaScript for this flow.
5. Rotate the key immediately if it appears in a commit, browser Network panel,
   deployment logs, chat, screenshots, or public docs.

Vercel environment variables are read during build or function execution and are
configured outside source code. Supabase secret/service keys are for trusted
server-side components only.

## API Contract

Endpoint:

```text
POST /api/early-access
content-type: application/json
```

Payload:

```json
{
  "email": "user@example.com",
  "x_handle": "optional_handle"
}
```

Response:

```json
{ "ok": true }
```

The response must not echo the submitted email, X handle, or Supabase error
details.

## Validation

Server-side validation is mandatory. Client-side validation may exist only for
UX.

Validation rules:

1. body size max: `4096` bytes
2. content type: `application/json`
3. email: required, max `254`, one `@`, no whitespace, no quotes/backticks/nulls,
   domain lowercased for canonical comparison
4. X handle: optional, strips leading `@`, allows only `[A-Za-z0-9_]`, max `15`
5. rate limit: default `5` submissions per minute per IP per warm function
   instance
6. invalid or missing rate limit env values fall back to `5`
7. warm-instance rate limit memory is pruned and capped

Email canonicalization stores:

1. `email_original` for display/contact
2. `email_canonical` for duplicate comparison

Only the domain portion is lowercased. Do not implement Gmail-specific dot
removal or plus-address stripping.

## Supabase Schema

Apply:

```sql
create extension if not exists pgcrypto;

create table if not exists public.early_access_leads (
  id uuid primary key default gen_random_uuid(),
  email_original text not null check (char_length(email_original) <= 254),
  email_canonical text not null check (char_length(email_canonical) <= 254),
  x_handle text check (x_handle is null or x_handle ~ '^[a-z0-9_]{1,15}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists early_access_leads_email_canonical_idx
  on public.early_access_leads (email_canonical);

alter table public.early_access_leads enable row level security;

revoke all on table public.early_access_leads from public;
revoke all on table public.early_access_leads from anon;
revoke all on table public.early_access_leads from authenticated;
```

No anon/authenticated policies are required for this slice because browser
clients do not access the table directly.

## Network And Logging Boundaries

Browser Network panel may show:

1. request to `/api/early-access`
2. request payload submitted by the user
3. generic success or validation error

Browser Network panel must never show:

1. Supabase URL if we later decide to hide it
2. Supabase service role key
3. Supabase REST response details
4. database row contents returned from Supabase

Function logs must not include:

1. service role key
2. request headers
3. submitted email
4. submitted X handle
5. Supabase error body

## Non-Goals

1. no Supabase Auth
2. no magic links
3. no client-side Supabase SDK
4. no localStorage waitlist table
5. no analytics events containing email or handle
6. no admin UI
7. no outbound email automation in this slice

## Verification

Required checks:

```bash
pnpm exec node --test --test-concurrency=1 --experimental-strip-types Tests/early-access.test.ts Tests/article-workspace-vercel.test.ts
```

Acceptance:

1. tests prove valid submissions insert through server-side fetch
2. tests prove invalid emails are rejected before Supabase
3. tests prove duplicate Supabase conflicts return generic success
4. tests prove the service role key is only read from `process.env`
5. tests prove no client file contains `SUPABASE_SERVICE_ROLE_KEY`
6. tests prove `web/vercel.json` explicitly bounds `api/early-access.mjs`

## Sources

1. Vercel Environment Variables:
   https://vercel.com/docs/environment-variables
2. Supabase API Keys:
   https://supabase.com/docs/guides/getting-started/api-keys
3. OWASP Input Validation Cheat Sheet:
   https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
4. OWASP Email Validation and Verification Cheat Sheet:
   https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html
