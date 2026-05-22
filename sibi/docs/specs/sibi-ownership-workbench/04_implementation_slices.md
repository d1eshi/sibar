# Implementation Slices

## Slice 0 - Project Shell

Goal: create the web workbench shell without real repo intelligence.

Status: PR-ready as a fixture-backed shell. Slice 0 is intentionally not a repo
scanner yet; it proves the workbench shape, the attempt-first ownership loop,
and the library-backed tree/code surfaces without adding filesystem or model
runtime behavior.

Deliverables:

- Vite/React route or app entry for Sibi Ownership Workbench.
- Static fixture with file tree, one diff, one boundary, one prompt.
- Three-panel layout plus evidence drawer.
- Library-backed presentation in Slice 0:
  - use `@pierre/trees` / `@pierre/trees/react` for file-tree UI;
  - use `@pierre/diffs` for code and diff rendering.
- Maintain modular React structure for this slice:
  - fixture data/types/helpers in dedicated module(s),
  - explicit Slice 0 adapters that transform fixture records into `@pierre/trees` and `@pierre/diffs` public item shapes,
  - dedicated components for file tree, code/diff view, ownership harness, and evidence drawer,
  - `App` kept as behavior/state orchestration only.
- Prefer component modules that stay focused: avoid >500-line monoliths and avoid
  excessive hyper-granular splits / unnecessary tiny recursive component decomposition.
- Keep Sibi-owned tests under `sibi/Tests/`, not the parent `Tests/`
  directory, so the parent repo remains only the orchestration workspace.
- Keep build-warning hygiene strict: known `@pierre/*/dist/react/*`
  module-level `"use client"` directive warnings are handled through an exact
  allowlist and build-backed contract test. Any new `@pierre` directive source
  should force a bundle-boundary decision, not a wider warning filter.

Acceptance:

- reviewer can see the final product shape;
- no model call;
- no filesystem access;
- no live scanning of repo contents (fixture-backed adapters only);
- no persistent state beyond current local interaction;
- no explain-first UI.
- Slice 0 fixtures are demo-only and selected by default.
- Once `load` and `select-empty` states are introduced, their empty-state copy is required;
  fixture-only fallback renderings still must avoid chat invitations.

Current PR-ready scope:

- Vite/React Sibi app shell.
- `@pierre/trees` / `@pierre/trees/react` file tree integration.
- `@pierre/diffs` code and diff view integration through explicit adapters.
- Modular workbench components for file tree, code/diff, review guide,
  ownership harness, lab, and evidence drawer.
- Guided attempt-first ownership sequence over the fixture diff.
- Local derivation lab gated behind query params (`?view=lab` or `?lab=1`).
- Sibi JS/TS tests located under `sibi/Tests/`.
- Strict `@pierre` warning contract test that keeps chunk-size warnings visible.

## Slice 1 - Deterministic Repo Inventory

Goal: read a bounded directory and produce a fast tree model.

Next-session starting contract:

```text
repo_inventory(sourceRoot) -> deterministic JSON
```

The first implementation should be a bounded local runtime contract, not a
browser filesystem reader. The browser requests inventory data; it never walks
the filesystem directly.

Deliverables:

- shared runtime contract under `../src/repo-inventory`, currently consumed by the Sibi
  local `/__sibi/repo-inventory` endpoint.
- skip rules for `.git`, `node_modules`, build outputs, caches;
- file metadata: path, extension, size, lines, role, excerpt;
- tree projection with rollup counts.

Initial JSON shape should be boring and stable:

```ts
type RepoInventory = {
  sourceRoot: string;
  generatedAt: string;
  files: {
    path: string;
    extension: string;
    sizeBytes: number;
    lineCount: number;
    role: "source" | "test" | "doc" | "config" | "unknown";
    excerpt: string;
  }[];
  tree: {
    path: string;
    kind: "directory" | "file";
    fileCount: number;
    totalSizeBytes: number;
    children?: RepoInventory["tree"][];
  };
};
```

Slice 1 should start with fixture tests for this repo's bounded `src/` surface,
then add the endpoint/script once the JSON contract is stable.

Acceptance:

- can inventory this repo's `src/` fixture;
- output is deterministic JSON;
- browser never reads the filesystem directly.

## Slice 2 - Code And Diff View

Goal: navigate files and changed lines quickly.

Deliverables:

- file content endpoint for bounded paths;
- diff parser for pasted diff or fixture diff;
- code view with stable line numbers;
- line/range selection contract.

Acceptance:

- selecting a file updates code view;
- selecting a line/range creates a `CodeSelection`;
- diff mode and file mode share evidence refs.

## Slice 3 - Evidence Extraction Contract

Goal: build the cheap truth layer.

Deliverables:

- `CodeEvidence` contract;
- observed imports/exports/symbol text extraction;
- nearby test/doc detection;
- possible caller search;
- confidence labels.

Acceptance:

- evidence distinguishes `observed`, `inferred`, `unverified`, and `conflict`;
- no AST dependency required;
- verifier can downgrade unsupported model claims.

## Slice 4 - Ownership Boundary Builder

Goal: turn files/diffs/evidence into 3-5 candidate boundaries.

Deliverables:

- `OwnershipBoundary` contract;
- deterministic risk scoring;
- selected riskiest boundary;
- file tree state projection.

Acceptance:

- each boundary has files, responsibility claim, evidence, open questions, risk,
  and confidence;
- no whole-repo ownership claims;
- every non-owned tree state has a reason.

## Slice 5 - Attempt Harness

Goal: make the user prove ownership.

Deliverables:

- ownership prompt panel;
- attempt capture;
- diagnosis fixture or deterministic first pass;
- smallest repair and return condition;
- state update after attempt.

Acceptance:

- no readiness without attempt;
- no answer-first explanation;
- gap reasons are specific and tied to evidence;
- user can re-attempt the same boundary.

## Slice 6 - Gemini Evidence Extractor

Goal: add LLM extraction under contract.

Deliverables:

- AI SDK provider integration for Gemini;
- JSON schema validation for evidence reports;
- runtime verification of cited files/lines/symbols;
- conflict/downgrade behavior.

Acceptance:

- invented files or lines are rejected;
- inferred claims cannot update ownership facts;
- model output can propose questions but not readiness.

## Slice 7 - Ownership Memory

Goal: persist cognitive state over time.

Deliverables:

- append-only attempt records;
- boundary state history;
- recurring gap memory;
- revisit schedule labels.

Acceptance:

- repeated gaps update memory instead of appearing as new isolated findings;
- readiness remains scoped to evidence and attempt;
- export includes evidence refs and open gaps.

## First Build Recommendation

Start with slices 0-2 in one implementation pass only if they remain fixture
backed. Split slices 3-7 into separate commits because they change runtime
contracts and product semantics.

## Verification Commands

Use the smallest meaningful command for the touched surface:

```text
pnpm -s sibi:test
pnpm -s sibi:build
pnpm -s sibi:e2e
```

`pnpm -s typecheck` is not a Slice 0 PR gate while the root project still has
pre-existing non-Sibi type errors under `src/**` and parent `Tests/**`. Do not
use those parent errors to block the Sibi Slice 0 PR unless the root typecheck
is fixed in a separate cleanup slice.

For docs-only changes, `git diff --check` is sufficient.
