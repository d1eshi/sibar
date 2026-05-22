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

The review logic is now consumed from `src/ownership-core/diff-review.ts` and
re-exported by `sibi/src/ownershipReview.ts`, so Sibi and `ownership-core` keep
contract behavior in sync.

This app still does not request OS permissions or call a model. Slice 1 adds a
local, bounded `repo_inventory` path from the shared `../src/repo-inventory`
contract, with the concrete Sibi path still bounded to the app root
(`sourceRoot=src` by default), exposed through a Vite endpoint so browser code
can request metadata and build deterministic inventory status signals.

It is Tauri-ready in that the web surface can be packaged later. It also
remains independent of `WorkspaceIntent` and all PedagogoAI workspace adapters for
this slice.

## Commands

From the repo root:

```bash
pnpm run sibi:dev
pnpm run sibi:build
```

The first input path is pasted text. A future Sibar session handoff can reuse the
review output as the starting artifact; opening a Sibar workspace session is not
connected in this slice.

## Boundaries

The product and runtime boundaries for this wedge live in
[`docs/ownership-wedge.md`](docs/ownership-wedge.md). New Sibi features should
preserve that split: the model proposes claims, while the runtime validates
evidence, scope, pedagogy, readiness, and handoff shape.
