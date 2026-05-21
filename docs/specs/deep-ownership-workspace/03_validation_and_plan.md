# 03: Validation And Plan

## Accepted Decisions

1. The current MVP is source-driven mission creation.
2. First input is URL or pasted source plus one short user reason.
3. Product hierarchy is `Mission -> Track -> Session -> Artifact`.
4. Source Map is secondary/advanced, not the primary UI.
5. Frontier lab blog is the first static fixture.
6. Sibi-repo ownership remains internal regression context, not the first
   product-facing MVP path.
7. Pedagogy intelligence is fixture first, deterministic gates second, explicit
   path mutation third, LLM-assisted recommendations later.

## Open Decisions

1. Public surface name: `Sibi Workspace` vs `Sibi Lab`.
2. UI stack sequence after fixture: web-first only vs Tauri packaging.
3. Diagram renderer: simple HTML/CSS/SVG vs graph library.
4. Storage backend: JSON fixtures first vs SQLite when history/search grows.
5. Timing for real read-only command execution.
6. Timing and guardrails for product-code mutation after readiness.

None of these block the current source-driven MVP.

## Validation Assertions

### VAL-SOURCE-001: Source Intent Creates A Preview

A URL or pasted source plus one user reason produces a reviewable
`MissionPreview` before mission creation.

Evidence:

1. `SourceIntentInput`,
2. `SourceIntakeResult`,
3. extracted `SourceSignal` records,
4. `MissionPreview`.

### VAL-SOURCE-002: Signals Are Not Sessions

Source signals remain separate from proposed tracks and sessions. A signal needs
source evidence plus compiler rationale or user selection before it becomes a
session.

### VAL-MISSION-001: Product Hierarchy Is Mission-Based

User-facing UI uses `Mission -> Track -> Session -> Artifact`, not nested
workspaces, source documentation trees, or course/module/lesson language.

### VAL-QUEUE-001: Track Queues Are Curated

The primary track UI shows a small focused queue with rationale, deferred
sessions, locked sessions, and Source Map reference.

### VAL-ARTIFACT-001: Artifacts Are Operation-Scoped

Recommended artifacts are derived from session operation and source type. The UI
does not present every artifact type as equally relevant.

### VAL-PED-001: Attempt-First Rule Holds

Sibi does not show final answers before the user attempts the session operation.
Hints may appear before an attempt, but complete explanations are gated.

### VAL-READY-001: Readiness Is Scoped

Readiness claims are limited to the active session operation and cited artifact
evidence. The system must not claim whole-mission mastery.

### VAL-RUNTIME-001: Adapter Output Is Never Direct State

Raw model output is parsed, schema-checked, source/evidence-validated, and
pedagogy-validated before projection.

### VAL-TRACE-001: Failed Attempts Are Preserved

Blocked, failed, cancelled, and repair-needed source-intent attempts are stored
as trace records.

## Implementation Plan

### Phase 1: Static Source Fixture

Create the frontier lab fixture with:

1. source metadata,
2. source text reference,
3. extracted source signals,
4. mission preview,
5. proposed tracks,
6. first three to five sessions,
7. artifact recommendations,
8. open questions and deferred signals.

### Phase 2: Source Intake And Preview UI

Render:

1. URL or pasted text input,
2. user reason input,
3. Preview mission action,
4. source signals,
5. mission preview,
6. create action.

### Phase 3: Mission Study Surface

Render:

1. Mission Brief,
2. Focused Track Queue,
3. Active Session,
4. artifact requirements,
5. readiness scope,
6. Source Map as secondary/advanced view.

### Phase 4: Deterministic Pedagogy

Add deterministic:

1. readiness gates,
2. artifact recommendations,
3. locked/deferred session reasons,
4. explicit path mutation proposals.

### Phase 5: Runtime And Trace Hardening

Add:

1. execution job state,
2. fixture-first adapter boundary,
3. validation/repair/reject classification,
4. durable trace records.

### Phase 6: Model-Assisted Recommendations

Only after deterministic behavior is stable, allow an LLM to propose:

1. missing prerequisites,
2. inserted repair sessions,
3. artifact recommendations,
4. source-slice session splits.

## Verification Commands

Minimum docs verification:

```text
git diff --check
```

Relevant test target when source-driven docs affect workspace-intent expectations:

```text
pnpm test -- Tests/pedagogoai-workspace-intent.test.ts
```
