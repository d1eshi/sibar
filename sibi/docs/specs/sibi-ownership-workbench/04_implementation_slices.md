# Implementation Slices

## Baseline and Scope

Slice 0 and Slice 1 are the current baseline.

- Slice 0: PR-ready shell is present and accepted as fixture-backed.
- Slice 1: deterministic repo inventory contract is implemented at local runtime level and used to avoid direct browser filesystem reads.

The remaining slices are product roadmap items. None of these imply runtime implementation is complete.
The workbench remains no-chat-first and no-explain-first for all planned slices.

## Cross-Cutting Rules

- Every new UI slice must include Playwright coverage and browser-skill/agent-flow verification for the same interaction path.
- Every new runtime/evidence feature must be reproducible in UI/lab with contract fixtures.
- Any readiness output must be tied to attempt, evidence, and calibration checks.
- Any readiness claim must include the scope-limited state (`owned`, `partial`, `blocked`, `gap`, `questionable`) and the reason for non-owned states.
- Voice, Jarvis, and other out-of-band controllers are post-v0.1 experimental and cannot be default-capable.
- Research grounding for these slices is in:
  `sibi/docs/research/cognitive-debt-ownership-research.md`,
  `sibi/docs/ownership-wedge.md`,
  `docs/product/00_foundation.md`,
  and `docs/product/01_moat.md`.

## Slice 0 - Project Shell

Goal: prove the workbench shape with deterministic attempt-first interaction.

Status: PR-ready.

Deliverables:

- Vite/React route/app entry for Sibi Ownership Workbench.
- Static fixture with file tree, one diff, one boundary, one prompt.
- Three-panel layout plus evidence drawer.
- Library-backed rendering in Slice 0:
  - `@pierre/trees` and `@pierre/trees/react` for file-tree UI;
  - `@pierre/diffs` for code/diff rendering.
- Modular boundaries:
  - fixture data/types/helpers in dedicated modules,
  - explicit adapters from fixtures into package item shapes,
  - dedicated components for file tree, code/diff, ownership harness, and evidence drawer,
  - `App` as behavior/state orchestrator only.
- Strict warning contract behavior stays explicit and not globally widened.
- Existing lab split (`?view=lab`, `?lab=1`) remains in place.

Acceptance:

- reviewer can see final product shape;
- no model call;
- no filesystem access by browser;
- no live repo scanning;
- no persistent state beyond local interaction;
- no explain-first UI.
- Slice 0 fixtures are demo-only and selected by default.

## Slice 1 - Deterministic Repo Inventory

Goal: read a bounded directory and produce a stable, deterministic tree model.

Status: implemented in current baseline.

Contract:

```text
repo_inventory(sourceRoot) -> deterministic JSON
```

Deliverables:

- shared runtime contract under `src/repo-inventory` and local `/__sibi/repo-inventory` endpoint consumption;
- skip rules for `.git`, `node_modules`, build outputs, caches;
- file metadata: `path`, `extension`, `sizeBytes`, `lineCount`, `role`, `excerpt`;
- tree projection with rollup counts.

Acceptance:

- can inventory bounded `src/` surface deterministically;
- browser never reads the filesystem directly;
- contract shape remains stable for downstream contracts.

## Slice 2 - Code, Diff, and Relation Navigation

Goal: navigate changed code and relation anchors quickly, reproducibly.

Deliverables:

- bounded file content endpoint for path reads;
- parser for pasted or fixture diffs with stable file anchors;
- code view with stable line numbers and deterministic `CodeSelection`;
- relation preview in file/diff view: touched file -> possible caller/test/doc evidence links;
- shared evidence ref IDs across file and diff modes.

Acceptance:

- selecting file updates both file content and boundary context;
- selecting a line/range creates deterministic `CodeSelection`;
- relation links are visible when available and explicit `missing` when unavailable;
- diff and file modes share the same evidence ref schema.

Gates / Validation:

- Playwright scenario for file open, line select, relation probe, and fallback text.
- Browser-skill replay of the same interaction path.

## Slice 3 - Relation-Gap Evidence Extraction

Goal: expose relation-level gaps before ownership claims.

Deliverables:

- `CodeEvidence` contract with relation metadata;
- relation-sensitive evidence extraction:
  - observed imports/exports/symbol text,
  - nearby test/doc detection,
  - caller candidates with confidence levels and explicit `missing-caller`;
- `EvidenceKind` support for `observed`, `inferred`, `unverified`, `conflict`;
- relation gap type with source IDs and downgrade behavior.

Acceptance:

- evidence kinds are distinguishable and contract-visible;
- relation missing evidence yields explicit gap reasons (e.g., `missing caller`, `missing test path`, `missing runtime contract`);
- no AST dependency required before repeated, contract-confirmed failures;
- verifier can downgrade unsupported model claims to questions.

## Slice 4 - Ownership Boundary Builder and Relation Risk Scoring

Goal: build ownership boundaries from cheap signals and relation structure.

Deliverables:

- `OwnershipBoundary` contract:
  - `id`, `files`, `responsibility_claim`, `evidence`, `open_questions`,
    `risk`, `confidence`;
- deterministic boundary risk scoring with relation weight;
- selected highest-risk boundary policy for user flow;
- file tree state projection with reasoned non-owned labels:
  - `gap: missing caller`,
  - `gap: missing deletion path`,
  - `blocked: prerequisite`,
  - `questionable`.

Acceptance:

- each boundary has evidence-backed files, claim, questions, risk, confidence;
- no whole-repo ownership claim without whole-repo evidence;
- every non-owned boundary has explicit reason text.

## Slice 5 - Attempt Harness, Calibration, and Readiness Gate

Goal: make readiness impossible without calibrated user attempt.

Deliverables:

- attempt capture with attempt evidence refs and timing;
- readiness state contract:
  - `attempt_id`,
  - `self_confidence`,
  - `evidence_fit`,
  - `calibration_score`,
  - `readiness_gate`;
- gap diagnosis and smallest repair tied to evidence anchors;
- anti-overconfidence rule for `owned` state.

Acceptance:

- no readiness without recorded attempt;
- no explain-first acceptance path;
- no `owned` state when calibration check fails;
- each gap reason maps to evidence refs and repair step;
- user can re-attempt same boundary after repair and see different state.

Gates / Validation:

- Playwright and browser-skill coverage for initial attempt, failed attempt, repair, and re-attempt.
- Any new readiness rule must include a fixture in UI/lab proof.

## Slice 6 - Transfer Verification

Goal: verify understanding transfer before boundary consolidation.

Deliverables:

- transfer probes tied to current boundary and a nearby related boundary;
- transfer failure/success contract (`transfer_pass`, `transfer_fail`, `transfer_skip`);
- repeated transfer failure causes escalation candidate and recovery task list;
- transfer outcomes represented in readiness exports.

Acceptance:

- a boundary cannot be considered stable without one transfer probe when required;
- transfer failure emits recurrence tags and explicit follow-up task;
- transfer success updates readiness continuity and reduces debt signal.

## Slice 7 - Workspace Escalation and Intent Handoff

Goal: hand complex ownership debt from the workbench to deeper Workspace flow only when local proof is insufficient.

Deliverables:

- deterministic escalation conditions:
  - relation-gap recurrence,
  - repeated low calibration after re-attempt,
  - transfer failure despite repair,
  - prerequisite chain dependency and dependency churn;
- escalation contract with reason, evidence_refs, and blocking IDs;
- user-authorized handoff UI and lab trace.

Acceptance:

- escalation is explicit and visible;
- no automatic escalation without user authorization;
- handoff includes evidence summary and minimum viable context for Workspace intake.

## Slice 8 - Ownership Memory Store

Goal: persist attempt history needed by calibration, transfer, escalation, and metrics.

Deliverables:

- `ownership-memory` event and boundary-state contracts:
  - append-only attempt records,
  - boundary state history,
  - recurring gap records,
  - revisit labels,
  - export bundles with evidence refs.
- deterministic memory compaction policy (daily or manual export).

Acceptance:

- all attempt outcomes are appended, not replaced;
- repeated gaps are tracked and referenced in future boundary reads;
- exports always include `evidence_refs` for each recorded boundary state.

## Slice 9 - Cognitive Debt and Cognitive Load Metrics + Daily Readout

Goal: surface practical ownership signals and avoid pseudo-mastery claims.

Deliverables:

- `cognitive_debt_metric` definition:
  - `boundary_gap_density`,
  - `readiness_debt`,
  - `calibration_gap`,
  - `attempt_variance`;
- `cognitive_load_metric` definition:
  - boundary fan-out,
  - dependency depth,
  - repair retry count.
- daily learning readout schema:
  - ready_count,
  - unresolved gaps,
  - transfer attempts and results,
  - load hotspots,
  - top 3 follow-up actions.

Acceptance:

- every metric has deterministic derivation from recorded attempts/evidence;
- no metric is shown as mastery proof by itself;
- daily readout updates predictably from persisted state and can be rendered in lab mode.

## Slice 10 - Agent-Flow and Playwright Manifest

Goal: give agents explicit operating limits and runnable assertions.

Deliverables:

- Playwright report ingestion format and runtime-normalized manifest;
- action manifest:
  - allowed action,
  - required evidence,
  - required state precondition,
  - allowed actor,
  - required postcondition;
- manifest-to-flow mapping for browser automation paths and fallback conditions.

Acceptance:

- every agent action has one manifest entry before execution;
- manifest mismatch blocks action and generates actionable diagnostic;
- same manifest can be replayed from captured Playwright trace.

## Slice 11 - UI Control Surface Authorization

Goal: define explicit and auditable control boundaries for manual, automated, and experimental interactions.

Deliverables:

- control-surface registry:
  - control id, owner, mode, allowed payloads, safe preconditions;
- explicit policy for experimental channels:
  - default deny for `voice` and `Jarvis`;
  - requires `post-v0.1` + explicit policy opt-in.

Acceptance:

- no action executes outside declared control surface;
- control claims are testable by Playwright IDs and agent manifest;
- post-v0.1 experimental channels remain disabled by default.

## Slice 12 - Gemini Evidence Extractor

Goal: add provider evidence extraction only under strict contracts.

Deliverables:

- AI SDK provider abstraction with Gemini-first integration;
- JSON schema validation for evidence reports;
- runtime verification of cited files/lines/symbols;
- conflict and downgrade behavior for unsupported claims.

Acceptance:

- invented files or lines are rejected;
- inferred claims cannot update ownership facts;
- model output can propose questions but not readiness.
- provider output remains tentative until contract-verifiable evidence passes.

## Open Questions

- What minimum transfer depth (single related boundary vs two adjacent artifacts) is required before a boundary moves to `transfer_ready`?
- Should voice/Jarvis be compile-time disabled or runtime-flagged when `post-v0.1` is enabled?

## Build Recommendation

After the current baseline:

- 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12.
- Keep Slice 0/1 as baseline and keep subsequent slices split by contract boundary.
- Do not merge product-semantic slices that do not have both Playwright and manifest validation.

## Verification Commands

Use the smallest meaningful command for the touched surface:

```text
pnpm -s sibi:test
pnpm -s sibi:build
pnpm -s sibi:e2e
```

`pnpm -s typecheck` is not a Slice 0 PR gate while the root project still has
pre-existing non-Sibi type errors under `src/**` and parent `Tests/**`. Do not use
those parent errors to block this slice unless the root typecheck is fixed in a
separate cleanup slice.

For docs-only changes, `git diff --check` is sufficient.
