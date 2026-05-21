# 21: Curated Track Pedagogy Contract

## Goal

Separate the difficult product intelligence behind a focused track from the UI
presentation.

The UI can show a clean queue such as:

```text
Now
Next
Later
Locked / needs prerequisite
```

That presentation is only valid if the pedagogy system has contracts for:

1. why a session is next,
2. what prerequisite is missing,
3. what artifact type is appropriate,
4. when the user can move forward,
5. how the path changes when the user says "too easy", "too hard", or "I do not
   understand this slice".

## Core Decision

Do not expose a full documentation sidebar as the main track UI.

Use a curated queue. Keep the full source outline behind an advanced `Source
Map` view.

This is not just a visual decision. It requires a pedagogy contract because Sibi
must justify why the visible queue is small and why certain nodes are locked,
inserted, skipped, or returned to later.

## Curated Queue Contract

```text
CuratedTrackQueue
  mission_id
  track_id
  visible_sessions
  deferred_sessions
  locked_sessions
  source_map_ref
  rationale
```

Visible sessions should usually be limited to 3-5 items:

1. current session,
2. one or two next sessions,
3. one recovery or prerequisite option when relevant,
4. one later target for orientation.

The queue must preserve source traceability without showing the entire source
tree.

## Session Placement Signal

```text
SessionPlacementSignal
  session_id
  placement: now | next | later | locked | deferred | inserted_repair
  reason
  supporting_evidence
  confidence
  user_visible_summary
```

Allowed reasons:

1. source order
2. prerequisite needed
3. user selected focus
4. failed attempt
5. low confidence
6. overconfidence risk
7. artifact dependency
8. mission relevance
9. time budget
10. manual user override

The first implementation may use deterministic fixtures, but the contract must
represent the reason rather than silently ordering sessions.

## Prerequisite Routing

Prerequisite routing is a pedagogy feature, not a UI flourish.

When the user cannot proceed, Sibi should produce:

```text
PrerequisiteRoute
  blocked_session_id
  blocked_operation
  suspected_missing_concepts
  route_options
  recommended_start
  return_condition
  evidence
```

The route must answer:

1. what is blocked,
2. what the user appears to be missing,
3. what smaller session should be inserted,
4. what evidence lets the user return,
5. whether the recommendation is high-confidence or exploratory.

Examples:

1. User says "this is too hard" in `JAX memories and host offloading`.
   Sibi inserts a smaller session on host vs device memory vocabulary and a
   code-free diagram artifact.
2. User fails a benchmark interpretation attempt.
   Sibi inserts a profiling-basics session before returning to the benchmark.
3. User says "this is too easy".
   Sibi offers a skip/accelerate operation only if a quick check confirms the
   relevant readiness scope.

## Artifact Recommendation Policy

Artifact recommendation is also a pedagogy feature.

Do not present every artifact type equally in the primary UI.

Use this contract:

```text
ArtifactRecommendation
  session_id
  operation
  recommended_artifacts
  optional_artifacts
  blocked_artifacts
  rationale
  evidence_requirements
```

Recommended artifact examples:

1. conceptual source slice -> technical note + recall card
2. system mechanism -> systems diagram + technical note
3. performance claim -> code probe + benchmark report
4. mathematical claim -> derivation + check questions
5. research paper claim -> claim map + evidence table
6. implementation readiness -> code probe + transfer exercise

The `Add artifact` action may exist, but it should be secondary and should open a
guided choice that explains why a type is recommended, optional, or not useful
for the current operation.

## User-Initiated Path Mutation

The user can legitimately challenge the path.

Supported mutation requests:

1. "This is too easy."
2. "This is too hard."
3. "I do not understand this selected paragraph."
4. "Create a session only for this source slice."
5. "I want to prove this with code."
6. "I only want the conceptual version first."

Mutation output:

```text
PathMutationProposal
  request
  proposed_change: insert_session | skip_session | split_session | merge_sessions | change_artifact | defer_session
  affected_sessions
  rationale
  risk
  return_condition
  requires_user_confirmation
```

Sibi should not silently rewrite the whole mission. It proposes a bounded path
mutation with a visible rationale and preserves the original mission goal.

## Readiness Gates

A session can unlock or advance only through scoped evidence.

Readiness gate:

```text
SessionReadinessGate
  session_id
  operation
  required_attempts
  required_artifacts
  evidence_checks
  failure_routes
  status: unknown | blocked | limited | ready
```

Readiness does not mean "the user read the material." It means the user has
performed the operation that the session requires.

Examples:

1. ready to explain host offloading from a cited source slice,
2. ready to diagram host/device memory movement,
3. ready to run a minimal benchmark and interpret one bottleneck,
4. ready to transfer the concept to a nearby JAX topic.

## Implementation Sequence

### Slice 1: Static Mission Fixture

Build a fixture for the frontier lab mission that hard-codes:

1. mission brief,
2. tracks,
3. curated queue,
4. source map reference,
5. session artifact recommendations.

This proves the UI without pretending the pedagogy system is automatic.

### Slice 2: Deterministic Gate Evaluation

Add deterministic readiness gates for fixture sessions:

1. required artifact exists,
2. user attempt exists,
3. evidence citation exists,
4. completion status is scoped.

### Slice 3: User Mutation Proposal

Support explicit user requests such as "too hard" or "make a session from this
selection" by generating a visible `PathMutationProposal`.

The first version can be rule-based.

### Slice 4: Artifact Recommendation Engine

Map operation kind and source type to recommended artifact kinds.

The first version can be deterministic:

```text
source_type + operation -> recommended artifact set
```

### Slice 5: Model-Assisted Pedagogy

Only after deterministic contracts exist, allow an LLM to propose:

1. missing prerequisite concepts,
2. inserted repair sessions,
3. artifact recommendations,
4. source-slice session splits.

Every proposal must validate against the contracts above and expose rationale.

## Validation Requirements

1. A track view never needs to show more than 3-5 primary sessions to answer
   "what should I do next?"
2. A locked session shows a scoped prerequisite reason.
3. An inserted repair session has a return condition.
4. An artifact recommendation has a session operation and evidence requirement.
5. A user path mutation is explicit and reviewable.
6. The source map can show many source topics without becoming the default study
   path.

## Open Risks

1. Prerequisite detection may be low-confidence without enough user attempts.
2. Artifact recommendation can become vague if operation kinds are too broad.
3. User mutation can fragment a mission if return conditions are weak.
4. The UI may look clean while hiding too much rationale.

These risks should be handled as validation and product behavior, not as more
visible navigation.
