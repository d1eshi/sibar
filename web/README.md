# Sibar Reader Web Deploy

This directory is the isolated public deploy surface for the article reader.
Deploy-shape changes are governed by
`../docs/specs/11_vercel_deploy_ownership.md`; read that spec before changing
`vercel.json`, functions, SSR, framework, build, install, or routing behavior.

It contains only:

1. `index.html` - public product entrypoint served at `/`
2. `styles/` - reader styling
3. `scripts/` - client behavior split by API, storage, UI, and app orchestration
4. `api/read.mjs` - minimal Vercel Function for URL fetching and article extraction
5. `changelog.html` - direct URL product changelog for preview/release review
6. `vercel.json` - Vercel function config

It intentionally does not depend on the TypeScript runtime, Swift sidecar, local
workspace server, or evaluator code.

Reader notes and recent article history are stored in browser `localStorage`.
This avoids data loss for the demo without introducing login or profile-backed
persistence.

The page includes Vercel Web Analytics for aggregate page views only. See
`ANALYTICS_RESEARCH.md` before adding behavioral events such as reading time,
article hosts, highlights, or note counts.

## Vercel Setup

Create a Vercel project with this repository and set:

```text
Root Directory: web
Framework Preset: Other
Build Command: empty
Install Command: empty
Output Directory: empty
```

The public route is:

```text
/
```

The product changelog is intentionally not linked from the reader UI, but is
available by direct URL:

```text
/changelog
```

The reader calls:

```text
/api/read?url=...
```

The early access form calls:

```text
POST /api/early-access
```

Configure the required Supabase secrets in Vercel project environment variables,
not in source code:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

See `../docs/specs/12_early_access_waitlist.md` before changing this endpoint,
schema, logging, or client behavior.

## CLI Deploy

From the repository root:

```bash
npx vercel deploy web
```

For production:

```bash
npx vercel deploy web --prod
```

## Runtime Notes

The API keeps the same public-launch protections as the local prototype:

1. only `http` and `https` URLs
2. no credentials in URLs
3. private network targets blocked before fetch
4. redirect limit
5. response size limit
6. fetch timeout
7. best-effort in-memory IP rate limit
8. short Vercel CDN cache for successful article reads

The rate limit is per warm function instance. Treat it as demo protection, not a
production abuse-control layer.
