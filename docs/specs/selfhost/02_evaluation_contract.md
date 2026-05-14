# Self-Hosted Evaluation Contract

## Goal

Define how SIBI decides whether the user understands a bounded SIBAR concept.

The contract is stricter than chat feedback. SIBI may not declare a gap,
misconception, or readiness claim without both user evidence and repo evidence.

## Hard Rule

```text
No gap without user evidence plus repo evidence.
```

User evidence is what the user answered, predicted, omitted, contradicted, or
declared uncertain.

Repo evidence is an accepted citation from inside the self-hosted artifact
boundary.

## Expected Operations

Every mastery check must evaluate exactly one primary operation:

1. `explain`: describe responsibility and why it exists
2. `trace`: walk a flow across files or functions
3. `predict`: state what should happen for a concrete input or change
4. `modify`: describe a safe bounded change and its guardrails
5. `debug`: identify likely failure mode and evidence
6. `transfer`: apply the same concept to a nearby concept or flow

## Contract Types

```text
MasteryCheck
  id
  concept_id
  operation
  prompt
  expected_answer_shape
  required_repo_evidence
  forbidden_claims
  minimum_readiness
  repair_when_failed
  reevaluation_prompt
```

```text
GapFinding
  id
  mastery_check_id
  concept_id
  operation
  user_evidence
  repo_evidence
  contradiction_or_insufficiency
  missing_reasoning_step
  gap_type
  severity
  confidence
  repair_task_id
  issue_candidate_ids
```

```text
RepairTask
  id
  gap_finding_id
  concept_id
  task_type
  prompt
  expected_output
  required_repo_evidence
  due_after
```

```text
ReevaluationPrompt
  id
  repair_task_id
  concept_id
  operation
  prompt
  required_repo_evidence
  must_not_repeat_original_answer
```

## Readiness Constraints

Readiness claims are bounded to the manifest scope and use only these labels:

1. ready to inspect
2. ready to explain
3. ready to modify with guardrails
4. ready to own
5. not ready yet

SIBI must not claim whole-repo mastery from one slice.

SIBI must not infer durable ownership from one correct answer. Durable ownership
requires at least one repaired or transferred check.

## Gap Types

The self-hosted evaluator must support these gap labels:

1. `surface_gap`
2. `flow_gap`
3. `boundary_gap`
4. `responsibility_gap`
5. `evidence_gap`
6. `causal_gap`
7. `test_oracle_gap`
8. `product_gap`
9. `false_confidence_gap`
10. `design_induced_gap`

## Valid Gap Checklist

A valid `GapFinding` must answer:

1. what concept was evaluated?
2. what operation was expected?
3. what did the user say or fail to say?
4. what does the repo show?
5. where is the contradiction or insufficiency?
6. what reasoning step is missing?
7. what repair task comes next?
8. what re-evaluation prompt will test the repaired skill?

## Invalid Findings

The evaluator must reject:

1. gaps based only on model opinion
2. gaps based only on repo evidence with no user answer
3. gaps based only on user uncertainty with no concept evidence
4. readiness claims without citations
5. claims using evidence outside the artifact boundary
6. "you understand this" claims that skip re-evaluation

## Verification

This contract is proven when deterministic cases show:

1. correct grounded answers can produce bounded readiness
2. correct but uncited answers produce evidence gaps
3. partial answers produce flow or causal gaps
4. wrong responsibility answers produce responsibility gaps
5. overconfident wrong answers produce false confidence gaps
6. plausible confusion can become a product/design issue instead of a user gap

## Feature Outcome

The user receives an evidence-backed evaluation of a freeform ownership answer.
Given a `MasteryCheck`, the user's answer, and bounded repo evidence, SIBI emits
either a bounded readiness finding or a `GapFinding` with user evidence, repo
evidence, typed insufficiency, missing reasoning step, repair linkage, and no
whole-repo overclaim.

This spec owns three feature outcomes:

1. freeform answer evaluator
2. evidence index for user plus repo evidence
3. typed gap classification

## Manual Harness

Use one mastery check from `docs/specs/selfhost/pilot/mastery-checks/` and test
the following freeform answers manually:

| Case | Input answer shape | Expected outcome |
|---|---|---|
| grounded | cites the required paths and explains the required operation | bounded readiness only |
| uncited | gives the right explanation without repo evidence | `evidence_gap` |
| partial | names the concept but skips the required reasoning step | `flow_gap` or `causal_gap` |
| overconfident wrong | declares high confidence while contradicting evidence | `false_confidence_gap` |
| design confusion | gives a reasonable answer that fails because the product hides the evidence | `design_induced_gap` plus `DesignIssue` |

Manual testers should record:

1. the `MasteryCheck` used
2. the user answer text
3. expected finding
4. actual finding
5. user evidence excerpt
6. repo evidence citation
7. repair or readiness result


## Eval Coverage

Current coverage:

1. `npm run eval:selfhost-pilot` validates the manifest, mastery checks, gold
   cases, required fields, and evidence boundaries.
2. `npm run eval:selfhost-benchmark` reports deterministic precision, recall,
   gap type accuracy, evidence quality, false-confidence detection, and
   design-issue detection over 40 gold cases.
3. `npm run eval:selfhost-freeform` runs the first freeform evaluator slice over
   five artifact-boundary answers: grounded, uncited, partial, overconfident
   wrong, and design-induced confusion. It reports the observed finding type and
   whether user plus repo evidence were attached.
4. `Tests/selfhost-pilot-evals.test.ts`, `Tests/selfhost-benchmark.test.ts`, and
   `Tests/selfhost-freeform.test.ts` protect validator, benchmark, and first
   freeform-slice regressions.

Missing coverage:

1. broad freeform evaluation across all 40 gold cases instead of the first five
   artifact-boundary cases
2. richer repo-evidence extraction than first matching bounded source excerpts
3. model-signal validation for natural answers outside the deterministic first
   slice

## Iteration Log

### 2026-05-14: First freeform evaluator spec iteration

Input used:

- existing mastery checks
- 40 gold cases with simulated user answers
- deterministic self-hosted benchmark report

Expected outcome:

- Define the first feature iteration that moves from labeled fixtures toward
  freeform answer evaluation.

Actual outcome:

- This spec now names the freeform evaluator as the next executable feature and
  defines manual cases, expected findings, missing coverage, and acceptance
  criteria.

What worked:

- The existing gold cases already contain simulated freeform answer text.
- The current gap labels map cleanly to the five required manual cases.

What failed or remains weak:

- The benchmark currently derives observations from `answer_class`, so it proves
  schema discipline more than answer understanding.
- Evidence quality is scored deterministically instead of from actual extracted
  user and repo evidence.

Coverage added or missing:

- Added documentation coverage for manual freeform cases.
- Missing evaluator behavior and regression tests for freeform answers.

Decision:

- Implement freeform answer evaluation here before adding model-signal
  validation, UI, full RAG, or new spec directories.

### 2026-05-14: First freeform evaluator slice implementation

Input used:

- `SC-001-artifact-boundary`
- five artifact-boundary gold answers: `GC-001`, `GC-002`, `GC-003`, `GC-006`,
  and `GC-008`
- bounded repo evidence loaded from the mastery check's `required_repo_evidence`

Expected outcome:

- Build the first executable slice inside the existing eval/runtime surface.
- Infer outcomes from `simulated_user_answer` plus bounded repo evidence instead
  of trusting `answer_class` as evaluator authority.
- Report observed finding type and whether user plus repo evidence were attached.

Actual outcome:

- Added `src/evals/selfhost-freeform.ts` and `npm run eval:selfhost-freeform`.
- Added `Tests/selfhost-freeform.test.ts` for grounded, uncited, partial,
  overconfident wrong, and design-induced answers.
- Wrote the first-slice report to
  `docs/specs/selfhost/pilot/reports/VAL-EVAL-008-selfhost-freeform-first-slice.json`.

Observed results:

| Case | Expected | Observed | User evidence | Repo evidence |
|---|---|---|---|---|
| `GC-001` | readiness | readiness | attached | attached |
| `GC-002` | `evidence_gap` | `evidence_gap` | attached | attached |
| `GC-003` | `flow_gap` | `flow_gap` | attached | attached |
| `GC-006` | `false_confidence_gap` | `false_confidence_gap` | attached | attached |
| `GC-008` | `design_induced_gap` | `design_induced_gap` | attached | attached |

What worked:

- The evaluator consumes `MasteryCheck + user_answer + bounded repo evidence`.
- The first slice separates readiness, evidence gaps, flow gaps, false
  confidence, and design-induced confusion without using `answer_class` to make
  the observation.
- Every observed finding includes a user evidence excerpt and bounded repo
  evidence citations.
- A verifier run with `pi --provider openai-codex --model gpt-5.2 --thinking high`
  found the slice congruent with the first-slice scope and confirmed that
  `answer_class` is not used as evaluator authority.

What failed or remains weak:

- Classification is deterministic and narrow to the artifact-boundary first
  slice.
- Repo excerpts are exact bounded excerpts, but still shallow line selection.
- Negative generic-output checks are not broad enough to prove robustness across
  all concepts.
- The verifier flagged two follow-ups: hard-enforce the no-gap-without-evidence
  rule and clarify future readiness derivation. The implementation now rejects
  gap/readiness findings when user or repo evidence is missing; readiness remains
  a fixed first-slice output pending the next breadth iteration.

Coverage added or missing:

- Added CLI, report, and regression tests for the first five freeform cases.
- Added a negative regression that rejects findings without user or repo
  evidence.
- Missing full 40-case freeform coverage and model-signal validation.

Decision:

- Treat this as the completed first freeform evaluator slice and expand breadth
  in the next iteration before adding UI or full RAG behavior.

## Acceptance Gate

This feature is MVP-ready when:

1. the evaluator accepts `MasteryCheck + user_answer + bounded repo evidence`
2. it emits `GapFinding | ReadinessFinding` without using `answer_class` as the
   authority
3. every gap includes both user evidence and repo evidence
4. grounded answers can produce bounded readiness
5. uncited answers produce evidence gaps
6. partial answers produce flow or causal gaps
7. high-confidence contradictions produce false-confidence gaps
8. plausible product-caused confusion can produce a design issue
9. tests fail when output is generic, uncited, or overconfident

First-slice status: items 1-8 are covered for the artifact-boundary five-case
manual harness by `src/evals/selfhost-freeform.ts` and
`Tests/selfhost-freeform.test.ts`. Item 9 is partially covered by regression
assertions for uncited and overconfident classifications, but still needs richer
negative cases for generic outputs across all concepts.

## Next Iteration

Expand the freeform evaluator from the first five artifact-boundary cases to the
full 40-case pilot set. Keep `answer_class` available only as expected fixture
metadata, not as evaluator authority, and add negative tests for generic answers
that attach no usable user excerpt or repo citation.
