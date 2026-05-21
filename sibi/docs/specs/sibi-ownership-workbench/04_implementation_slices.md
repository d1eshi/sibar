# Implementation Slices

## Slice 0 - Project Shell

Goal: create the web workbench shell without real repo intelligence.

Deliverables:

- Vite/React route or app entry for Sibi Ownership Workbench.
- Static fixture with file tree, one diff, one boundary, one prompt.
- Three-panel layout plus evidence drawer.
- Maintain modular React structure for this slice:
  - fixture data/types/helpers in dedicated module(s),
  - dedicated components for file tree, code/diff view, ownership harness, and evidence drawer,
  - `App` kept as behavior/state orchestration only.
- Prefer component modules well below 500 lines (avoid monolithic React files).

Acceptance:

- reviewer can see the final product shape;
- no model call;
- no filesystem access;
- no explain-first UI.

## Slice 1 - Deterministic Repo Inventory

Goal: read a bounded directory and produce a fast tree model.

Deliverables:

- local server endpoint or script for `repo_inventory`;
- skip rules for `.git`, `node_modules`, build outputs, caches;
- file metadata: path, extension, size, lines, role, excerpt;
- tree projection with rollup counts.

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
pnpm run sibi:build
pnpm test -- Tests/ownership-core.test.ts
pnpm run typecheck
```

If the first implementation uses only static docs/prototypes, `git diff --check`
is sufficient.
