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

Implementation note for this slice:

- `transfer.required` is true when the selected boundary has more than one file in-scope, and the related
  boundary is selected deterministically from `boundary.files` + `reviewQueue`, preferring `runtime` adjacency
  over test coverage when both exist.

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

Slice 7 deterministic thresholds for this iteration:

- relation-gap recurrence: at least 2 session observations with reason `could not connect caller/test`.
- repeated low calibration: last 2 readiness attempts with `readiness_gate != "ready"` and `calibration_score < 0.55`.
- transfer failure despite repair: 2 consecutive transfer fails where the latest two attempts are failures and the latest attempt is marked with escalation candidate.
- prerequisite-chain dependency: unfulfilled dependency/caller `reviewQueue` entries remain and at least 2 non-ready readiness attempts occurred.
- dependency churn: at least 2 non-ready readiness attempts with no readiness state progress and unchanged `state`.

Acceptance:

- escalation is explicit and visible;
- no automatic escalation without user authorization;
- handoff includes evidence summary and minimum viable context for Workspace intake.

## Slice 8 - Ownership Memory Store

Goal: persist attempt history needed by calibration, transfer, escalation, and metrics.

Status: implemented in current baseline.

Deliverables:

- `ownership-memory` event and boundary-state contracts:
  - append-only attempt records,
  - boundary state history,
  - recurring gap records,
  - revisit labels,
  - export bundles with evidence refs.
- deterministic memory compaction policy (daily or manual export).

Slice 8 deterministic policy for this iteration:

- durable memory is boundary-scoped and represented as append-only events only:
  `guided_observation`, `readiness_attempt`, `transfer_attempt`, and
  `handoff_artifact`; the in-app container may hold multiple boundaries, but
  projection/export reads are filtered to the selected `boundary_id`;
- boundary state history is a projection from events, not mutable durable truth;
  readiness events record the effective boundary state after transfer gating;
- recurring gaps are emitted when the same normalized gap key appears at least 2
  times:
  `relation-gap:caller-test`, `readiness-gap:low-calibration`, readiness gap
  reasons, or transfer fail/skip gap keys;
- revisit labels are deterministic projections:
  `revisit-transfer` for latest or recurring transfer fail/skip,
  `revisit-calibration` for repeated low-calibration readiness gaps,
  `revisit-relation-gap` for repeated caller/test relation gaps, and `stable`
  only when no revisit label applies;
- manual export compacts the whole append-only event set into the export read
  model, while daily export uses the UTC start of the export day as the cutoff
  and reports pre-cutoff events as compacted;
- compaction never drops boundary-state evidence: every projected boundary
  state record must include non-empty `evidence_refs`.

Acceptance:

- all attempt outcomes are appended, not replaced;
- repeated gaps are tracked and referenced in future boundary reads;
- exports always include `evidence_refs` for each recorded boundary state.

## Slice 9 - Cognitive Debt and Cognitive Load Metrics + Daily Readout

Goal: surface practical ownership signals and avoid pseudo-mastery claims.

Status: implemented in Slice 9 runtime+UI pass.

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

Policy for deterministic runtime derivation:

- `cognitive_debt_metric` derives only from persisted boundary-scoped signals in `OwnershipMemoryExportBundle` (readiness attempts, transfer attempts, guided observations) plus relation candidates from `extractCodeEvidence` where available.
- `boundary_gap_density = clamp01(relationGapSignals / max(1, candidateRelationItems.length))`, where `relationGapSignals` is derived from readiness non-ready gaps, relation-aware guided observations, and persisted relation recurrence gaps.
- `readiness_debt = clamp01(1 - average(local_readiness_signal))`, `local_readiness_signal = mean(1 for ready, 0.56 for repair-needed, 0.2 for blocked)`.
- `calibration_gap = clamp01(mean(abs(self_confidence - evidence_fit)))` over readiness attempts.
- `attempt_variance` is a bounded mix of confidence/fidelity/elapsed normalized variance for the same boundary.
- `cognitive_load_metric` computes `boundary_fanout` from relation candidates, `dependency_depth` from relation/runtime/test context + transfer outcomes, and `repair_retry_count = transfer_fail_count + readiness_attempt_count - 1`.
- readout and metric objects always include source inputs (`attemptIds`, `evidenceRefIds`, and transfer IDs when present).
- daily readout is recomputed from boundary memory state and rendered in lab mode only, with explicit follow-up actions as readable route guidance (never presented as mastery).

Acceptance:

- every metric has deterministic derivation from recorded attempts/evidence;
- no metric is shown as mastery proof by itself;
- daily readout updates predictably from persisted state and can be rendered in lab mode.

Implementation check for this slice:

- memory-driven inputs and derivations are in `src/ownershipWorkbench/cognitiveMetrics.ts`.
- metrics and readout are integrated into `src/App.tsx` and shown by `OwnershipHarnessPanel` in lab view.
- unit and Playwright coverage include derivation shape and update checks from attempt/transfer progression.

## Slice 10 - Agent-Flow and Playwright Manifest

Goal: give agents explicit operating limits and runnable assertions.

Status: implemented.

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

Implementation policy for this slice:

- Manifest is runtime-normalized and deterministic for the tuple (`boundary.id`,
  `selectedFile`, `boundaryState`, `readiness`, remaining `open_questions`,
  sorted evidence IDs).
- `agent_action_rejected` is mandatory for every blocked action and includes:
  `reasonCode` + `decisionId` + optional `expectedActionHint` + optional
  `recoveryAction`.
- Rejection order is deterministic:
  1. stale scope/version,
  2. private action restriction,
  3. action/control listing and ownership checks,
  4. control mode check,
  5. payload check,
  6. preconditions check,
  7. evidence + artifact check.
- Block lists are policy-based and explicit in manifest restrictions:
  - `no_auto_readiness` (readiness cannot be mutated by action),
  - `no_private_action` (no ownership/readiness/private control setters).
- Lab validation in UI must render manifest and one happy-path + one blocked-path
  diagnostic using deterministic sample requests.

## Slice 11 - UI Control Surface Authorization

Goal: define explicit and auditable control boundaries for manual, automated, and experimental interactions.

Status: implemented.

Deliverables:

- control-surface registry:
  - control id, owner, mode, allowed payloads, safe preconditions;
- explicit policy flags for experimental channels;
- manifest/UI visibility of control claims and policy status in lab mode.

Implementation policy for this slice:

- control surface now includes owner, mode, allowed payloads, safe preconditions,
  and explicit policy flags per control entry.
- `voice` and `Jarvis` controls are declared with `safetyMode: experimental`
  and are rejected unless both `post-v0.1` is enabled and the control id is
  opt-in listed.

Acceptance:

- no action executes outside declared control surface;
- control claims are testable by Playwright IDs and agent manifest;
- post-v0.1 experimental channels remain disabled by default;
- `post-v0.1` + explicit control opt-in is required for `voice` and `Jarvis` actions.

- lab view includes control claims with safety mode and opt-in status text.

## Slice 12 - Gemini Evidence Extractor

Goal: add provider evidence extraction only under strict contracts.

Status: implemented.

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

Implementation policy for this slice:

- Evidence extraction and verification live in `src/ownershipWorkbench/geminiEvidenceExtractor.ts`
  as pure functions with deterministic report normalization (`generated_at`, report
  schema, and sample request derivation).
- Provider adapters exposed by id (`gemini`, `gemini-first`) with `executionEnabledByDefault`
  defaulting to disabled to keep live provider calls out-of-band.
- Unsupported kinds, invalid citations, inferred ownership facts, readiness claims,
  invented files, or out-of-bounds ranges are rejected or downgraded per contract
  before any ownership mutation claim is accepted.
- Gemini diagnostics are rendered in lab mode under `OwnershipHarnessPanel` and
  are not shown in default workbench mode.

## Open Questions

- What minimum transfer depth (single related boundary vs two adjacent artifacts) is required before a boundary moves to `transfer_ready`?
- Slice 11 implemented explicit control-policy handling for `voice`/`Jarvis`; no extra runtime/compile-time question remains in this scope.

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
