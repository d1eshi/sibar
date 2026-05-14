# Self-Hosted Product Improvement Loop

## Goal

Turn evaluation findings into either user repair, product improvement, or both.

The self-hosted MVP is not complete if a gap only becomes feedback. A detected
gap must produce a next action and a re-evaluation path.

## Loop

```text
evaluation
  -> gap or readiness finding
  -> issue candidate
  -> repair task
  -> improvement
  -> re-evaluation
  -> updated readiness report
```

## Issue Candidate Types

```text
LearningGap
  user did not demonstrate the required operation for a concept
```

```text
ProductIssue
  SIBAR/SIBI does not make the concept, boundary, or flow visible enough
```

```text
DocsIssue
  documentation does not explain the concept, contract, or limitation clearly
```

```text
TestIssue
  no test or eval protects the behavior the user was expected to reason about
```

```text
DesignIssue
  the abstraction, naming, API shape, or flow reasonably induces confusion
```

## Classification Rules

Classify as a user `LearningGap` when:

1. the repo evidence exists inside the boundary
2. the expected operation is stated by the mastery check
3. the user's answer contradicts or omits a required reasoning step
4. the concept is reasonably discoverable from code, docs, or tests

Classify as a product, docs, test, or design issue when:

1. docs and implementation conflict
2. the relevant behavior has no test or eval oracle
3. naming points to the wrong responsibility
4. the concept requires hidden context outside the boundary
5. a reasonable answer fails because the product does not expose the evidence

When both are true, create both a `LearningGap` and a product-side issue
candidate.

## Issue Candidate Contract

```text
IssueCandidate
  id
  source_gap_finding_id
  type
  title
  evidence
  why_it_matters
  proposed_action
  blocks_readiness
```

Issue candidates are local planning artifacts in the MVP. They do not need to
open GitHub issues yet.

## Repair Contract

Every repair task must be narrow and evidence-producing.

Valid repair actions include:

1. trace a flow across cited files
2. restate a responsibility from cited lines
3. predict behavior for a concrete change
4. identify the test that should fail if a contract breaks
5. write a missing docs or test issue candidate
6. explain why a product/design issue caused confusion

Invalid repair actions include:

1. generic "review the docs"
2. generic "study this concept"
3. asking the model for a full explanation before the user retries
4. accepting a repeated answer as repaired understanding

## Re-Evaluation

Re-evaluation must test the same operation on a nearby prompt, not the exact
same wording.

Examples:

1. If the original check was trace gap detection into readiness, re-evaluate by
   tracing practice challenge generation into readiness.
2. If the original check was boundary validation, re-evaluate with a different
   included/excluded path.
3. If the original check was false confidence, re-evaluate with declared
   confidence and required citations.

## Verification

The loop is valid only when each detected gap produces:

1. at least one issue candidate
2. one repair task
3. one re-evaluation prompt
4. updated readiness output after re-evaluation

The MVP should fail closed: if no issue candidate or re-evaluation prompt can be
created, the gap remains unresolved and readiness stays limited.

## Feature Outcome

The user receives a concrete next action after evaluation. A detected gap becomes
at least one issue candidate, one narrow repair task, one nearby re-evaluation
prompt, and an updated readiness limitation until the repaired skill is shown.

This spec owns three feature outcomes:

1. actionable repair task generation
2. issue candidate generation
3. re-evaluation without repeated prompts

## Manual Harness

Use one failed mastery check result and inspect whether SIBI produces:

1. an issue candidate that names `LearningGap`, `ProductIssue`, `DocsIssue`,
   `TestIssue`, or `DesignIssue`
2. a repair task that asks the user to produce evidence
3. a re-evaluation prompt that tests the same operation with nearby wording
4. a readiness result that stays limited until the re-evaluation succeeds

Manual testers should reject outputs that say only:

1. "review the docs"
2. "study the concept"
3. "ask the model for an explanation"
4. "repeat the same answer"

## Eval Coverage

Current coverage:

1. gold cases require `acceptable_repair_task`
2. gold cases require `acceptable_issue_candidate_type`
3. the benchmark observes repair task and re-evaluation prompt presence for
   gap-bearing cases
4. practice challenge runtime tests cover gap-linked challenge generation

Missing coverage:

1. executable issue candidate objects for the self-hosted benchmark
2. quality checks for repair task specificity
3. proof that re-evaluation uses nearby wording instead of the same prompt
4. readiness update after an actual repaired answer

## Iteration Log

### 2026-05-14: Living improvement-loop spec

Input used:

- current product improvement loop contract
- current gold case repair and issue fields
- self-hosted benchmark observations

Expected outcome:

- Make repair and re-evaluation a feature outcome, not a note attached to gap
  detection.

Actual outcome:

- The spec now defines manual checks, current coverage, missing coverage, and
  the next executable loop after freeform evaluation.

What worked:

- The existing dataset already requires acceptable repair and issue candidate
  types.

What failed or remains weak:

- The benchmark currently checks presence, not repair usefulness or wording
  distance from the original prompt.
- Updated readiness after re-evaluation is specified but not yet executed.

Coverage added or missing:

- Added documentation coverage for manual repair and re-evaluation testing.
- Missing executable loop coverage over an actual repaired freeform answer.

Decision:

- Build this after the freeform evaluator can produce real `GapFinding`
  outputs.

## Acceptance Gate

This feature is MVP-ready when:

1. every gap-bearing freeform evaluation produces an issue candidate
2. every issue candidate includes evidence, proposed action, and readiness
   blocking state
3. every repair task asks for an evidence-producing action
4. every re-evaluation prompt tests the same operation with nearby wording
5. readiness remains limited until the re-evaluation passes

## Next Iteration

After the first freeform evaluator slice, add executable issue candidate and
repair task outputs to the self-hosted report, then test one failed answer
through repair and re-evaluation.
