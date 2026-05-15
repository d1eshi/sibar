# Sibar Reader Web Deploy

This directory is the isolated public deploy surface for the article reader.

It contains only:

1. `index.html` - public product entrypoint served at `/`
2. `styles/` - reader styling
3. `scripts/` - client behavior split by API, storage, UI, and app orchestration
4. `api/read.mjs` - minimal Vercel Function for URL fetching and article extraction
5. `vercel.json` - Vercel function config

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

The reader calls:

```text
/api/read?url=...
```

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
