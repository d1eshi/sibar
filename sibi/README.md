# Sibi Ownership Review

Sibi is the first sellable wedge for the monorepo: review AI-generated diffs,
PR text, or agent output before merge so the developer can decide whether they
own the change.

The MVP is intentionally local and deterministic:

- paste a diff, PR body, or agent output into the UI,
- optionally add the intended goal or context,
- receive an `OwnershipReview` with touched areas, ownership questions, gaps,
  suggested evidence, a minimal read path, and a `blocked | limited | ready`
  status.

This app does not request OS permissions, inspect user folders, call a model, or
open repository files. It is Tauri-ready only in the sense that the web surface
can be packaged later. Shared runtime and pedagogy contracts continue to live in
the monorepo `src/`; this first wedge keeps its local review contract in
`sibi/src/ownershipReview.ts` until it proves useful as shared runtime.

## Commands

From the repo root:

```bash
pnpm run sibi:dev
pnpm run sibi:build
```

The first input path is pasted text. A future Sibar session handoff can reuse the
review output as the starting artifact.
