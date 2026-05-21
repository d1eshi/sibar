# 08: Validation Contract

## Goal

Define the assertions that prove the Deep Ownership Workspace is real.

These `VAL-*` assertions are written so an implementation agent can convert them
into tests, evals, prototypes, and manual review checklists.

## Product Loop Assertions

### VAL-LOOP-001: A Loop Starts From A Concrete Goal

Given a repo or folder and a user goal, Sibi creates a loop with:

1. goal
2. artifact boundary
3. concept slice
4. active operation
5. evidence list

Evidence expected:

1. serialized `DeepOwnershipLoop`
2. visible UI state
3. boundary paths

### VAL-LOOP-002: Sibi Does Not Explain First

Before the user attempts the active operation, the UI must not show the full
answer, final derivation, or completed solution.

Evidence expected:

1. UI screenshot or DOM snapshot
2. fixture proving hidden solution state
3. test that answer content is gated

### VAL-LOOP-003: User Attempts Are Stored As Evidence

After a user attempt, Sibi stores answer text, selected evidence, declared
confidence, and declared unknowns.

Evidence expected:

1. stored attempt object
2. visible attempt history
3. readiness report citing the attempt when relevant

## Artifact Assertions

### VAL-ARTIFACT-001: Sibi Generates A Thinking Artifact

For a selected concept slice, Sibi generates at least one structured artifact
with kind, purpose, source evidence, active operation, renderer payload, and
success criteria.

Evidence expected:

1. `ThinkingArtifact` JSON
2. rendered UI artifact
3. citations visible in the UI

### VAL-ARTIFACT-002: Artifacts Are Grounded

Every important node, code range, equation term, or paper claim in a generated
artifact must cite evidence or be marked as inferred/unknown.

Evidence expected:

1. artifact payload with evidence refs
2. validation failures for uncited claims
3. UI marker for inferred nodes

### VAL-ARTIFACT-003: The Artifact Forces An Operation

The artifact must ask the user to explain, trace, derive, predict, build,
modify, debug, transfer, or teach.

Evidence expected:

1. artifact operation field
2. visible prompt
3. blocked passive-completion state

## UI Assertions

### VAL-UI-001: Workspace Shows Four Essential Regions

The Workspace must show:

1. boundary/navigation
2. active artifact canvas
3. Sibi loop panel
4. evidence/signals panel

Evidence expected:

1. screenshot
2. accessibility or DOM region labels
3. fixture render test

### VAL-UI-002: Code Ranges Are Inspectable

When the active artifact is code-based, the user can inspect code ranges with
line numbers, evidence role, and open-in-editor metadata.

Evidence expected:

1. rendered code slice
2. citation path/line data
3. open-in-editor action payload

### VAL-UI-003: The UI Does Not Pretend Whole-Repo Ownership

For a large or partially indexed repo, the UI shows unknown zones and scoped
readiness instead of a whole-repo mastery claim.

Evidence expected:

1. unknown zone list
2. readiness scope string
3. no whole-repo readiness claim

### VAL-UI-004: Reference Components Are Reproducible

When the implementation builds Lens, code workbench, derivation, patch
readiness, or repo overview behavior, it must map the UI to the component
contracts in `12_ui_reference_components.md`.

Evidence expected:

1. component name in the implementation or prototype review note
2. source data contract for the component
3. screenshot or rendered prototype matching the component purpose
4. evidence, gated state, and readiness/next action visible where required

## Intelligence Assertions

### VAL-INTEL-001: Tests And Docs Are Evidence

When tests or docs are inside the boundary, Sibi classifies them as behavior
oracle, intent, example, or historical rationale evidence where appropriate.

Evidence expected:

1. evidence inventory
2. role classification
3. at least one concept slice using tests or docs when relevant

### VAL-INTEL-002: Large Repos Are Progressive

For a large repo fixture, Sibi inventories sources, proposes a slice, and marks
unknown zones without loading all files into a single prompt.

Evidence expected:

1. inventory count
2. skipped/unknown zone records
3. selected concept slice
4. no fake complete summary

### VAL-INTEL-003: Research Artifacts Connect To Construction

For a paper or math artifact, Sibi can create an operation that connects a claim
or equation to a prediction, minimal implementation, or experiment.

Evidence expected:

1. paper/equation artifact payload
2. implementation or experiment bridge
3. user operation prompt

## Pedagogy Assertions

### VAL-PED-001: Gaps Require User And Artifact Evidence

A detected gap must cite both the user's attempt and artifact evidence or
counterevidence.

Evidence expected:

1. gap object
2. user attempt reference
3. artifact evidence reference

### VAL-PED-002: Repair Actions Are Concrete

Every gap-bearing result must produce a repair action that asks the user to
perform a concrete operation.

Evidence expected:

1. repair action object
2. operation kind
3. required evidence

### VAL-PED-003: Readiness Is Scoped

Readiness must be scoped to an operation and concept slice.

Evidence expected:

1. readiness claim
2. operation field
3. blocked whole-repo/global claims

### VAL-PED-004: Track Queues Are Curated With Rationale

For a mission track with many possible source topics, Sibi shows a small
curated queue by default and stores a rationale for session placement.

Evidence expected:

1. `CuratedTrackQueue` projection
2. placement signals for visible, locked, deferred, or inserted sessions
3. advanced source map separated from the primary queue

### VAL-PED-005: Artifact Recommendations Are Operation-Scoped

For a session, recommended artifacts must follow from the active operation,
source type, and evidence requirements.

Evidence expected:

1. `ArtifactRecommendation` object
2. recommended, optional, and blocked artifact groups
3. visible rationale for the primary recommended artifact

### VAL-PED-006: User Path Mutation Is Explicit

When a user says a session is too hard, too easy, or requests a session from a
selected source slice, Sibi emits a bounded path mutation proposal instead of
silently rewriting the mission.

Evidence expected:

1. `PathMutationProposal`
2. affected sessions
3. return condition
4. user confirmation state when the mutation changes the track

## Command And Mutation Assertions

### VAL-CMD-001: Read-Only Commands Become Evidence

When Sibi runs a configured read-only command, the output is stored as evidence
with command, cwd, timestamp, and result.

Evidence expected:

1. command record
2. output evidence ref
3. UI signal row

### VAL-CMD-002: Study Mutation Is Separate From Product Mutation

Generated scratch artifacts must be marked as study-only and written outside
product source paths.

Evidence expected:

1. study artifact path
2. source evidence citations
3. no product file changes

### VAL-CMD-003: Product Mutation Requires Guardrails

Before applying a product-code change, Sibi must show affected files, readiness
state, expected verification, and explicit user intent.

Evidence expected:

1. mutation gate object
2. patch preview
3. readiness or override record

## Morning Demo Assertions

### VAL-DEMO-001: This Repo Can Produce A First Deep Ownership Workspace

Given this repository and a goal about understanding Sibi's pedagogy runtime,
the system can render:

1. boundary
2. evidence inventory
3. concept slice
4. thinking artifact
5. active operation
6. evidence panel
7. gap/readiness panel
8. repair action

Evidence expected:

1. fixture file
2. local UI prototype
3. screenshot or manual review note

### VAL-DEMO-002: The Demo Uses Attempt-First UX

The demo must make the user attempt before revealing the final explanation.

Evidence expected:

1. hidden answer state
2. answer composer
3. result state after fixture attempt
