# Spec 11: Vercel Deploy Ownership

## Goal

Protect the public web deploy from accidental SSR, framework, build, install, or
function-surface changes.

The current deploy is a static web reader with one bounded Vercel Function:

```text
web/
  index.html
  styles/
  scripts/
  api/read.mjs
  vercel.json
```

This is an ownership decision. Do not change it as a convenience fix.

## Current Contract

`web/vercel.json` must stay intentionally small:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "cleanUrls": true,
  "installCommand": "",
  "buildCommand": null,
  "functions": {
    "api/read.mjs": {
      "maxDuration": 10
    }
  }
}
```

The deploy contract is:

1. `web/` is the Vercel root directory.
2. `framework` is `null`.
3. `installCommand` is empty.
4. `buildCommand` is `null`.
5. Static HTML/CSS/JS render the product shell.
6. `api/read.mjs` is the only Vercel Function.
7. `api/read.mjs` has a bounded `maxDuration` of `10`.
8. Clean URLs are enabled.
9. The reader is not SSR.
10. The reader is not a Next.js, Astro, SvelteKit, Remix, or Vite app unless a
    later spec explicitly owns that migration.

## Non-Negotiable Rule

If a change requires modifying `web/vercel.json`, adding SSR, adding a framework,
adding another function, changing install/build behavior, or changing function
duration, stop and answer the ownership questions below before editing.

If the answer is unclear, ask the user. Do not infer SSR or framework ownership
from a UI bug, local-preview issue, routing issue, or convenience request.

## Ownership Questions

Before changing `web/vercel.json`, answer:

1. What user-visible problem cannot be solved with the current static shell plus
   `api/read.mjs`?
2. Is this a product decision or just a local development convenience?
3. Does the change introduce SSR, server rendering, framework routing, server
   components, or build-time rendering?
4. Which exact route will render on the server?
5. Which exact user data, URL, article text, notes, or learning evidence will
   cross the server boundary?
6. Does the change increase Vercel Function invocations, duration, memory,
   bandwidth, cache misses, or cold-start risk?
7. What is the failure mode when Vercel quota, function timeout, or upstream
   fetch limits are reached?
8. What cache layer owns the result: browser local storage, Vercel CDN, in-memory
   function cache, KV/Redis, or database?
9. What prevents repeated fetches for the same URL?
10. What prevents abuse from anonymous users?
11. What is the rollback path if the deploy starts costing too much or rendering
    becomes unreliable?
12. Which tests prove the intended deploy shape?
13. Which docs or product copy explain the new server boundary to a future
    maintainer?
14. If this is SSR, why do we own that complexity now?
15. If this is a new function, why is it not part of `api/read.mjs` or a future
    authenticated workspace backend?

## Allowed Without Vercel Config Changes

These are allowed without revisiting the deploy contract:

1. Copy changes in `index.html`.
2. CSS changes in `styles/`.
3. Client-only behavior in `scripts/`.
4. Local-only trial limits stored in browser storage.
5. Demo fixture changes.
6. Tests that assert the current static deploy boundary.
7. Documentation clarifying the current deploy boundary.

## Requires Explicit Ownership

These require answering the ownership questions first:

1. Setting `framework` to anything other than `null`.
2. Adding or changing `installCommand`.
3. Adding or changing `buildCommand`.
4. Adding rewrites, redirects, headers, middleware, or routes in `vercel.json`.
5. Adding another entry under `functions`.
6. Increasing `api/read.mjs.maxDuration`.
7. Adding SSR, ISR, server components, edge rendering, or framework routing.
8. Moving article persistence, notes, or learning memory into an anonymous
   backend.
9. Adding KV/Redis/database dependencies to the public reader deploy.

## Verification

Every PR or agent handoff that touches the public web deploy should verify:

```bash
pnpm exec node --test --test-concurrency=1 --experimental-strip-types Tests/article-workspace-vercel.test.ts
```

When dependencies are installed:

```bash
pnpm typecheck
```

Acceptance:

1. tests assert `framework: null`
2. tests assert no install command
3. tests assert no build command
4. tests assert only `api/read.mjs` is configured as a function
5. tests assert `api/read.mjs.maxDuration` remains `10`
6. tests assert this spec still contains the SSR and function ownership questions
