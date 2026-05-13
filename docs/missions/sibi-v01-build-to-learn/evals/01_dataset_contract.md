# Eval Spec 01: Dataset Contract

## Goal

Define canonical datasets for measuring Sibi's pedagogy, boundaries, and moat.

## Contract

```text
EvalCase
  id
  title
  artifact_fixture
  artifact_boundary
  learning_goal
  concept_under_test
  user_answer
  expected_layer
  expected_gap
  expected_misconception
  expected_challenge
  expected_readiness
  required_evidence
  forbidden_evidence
```

## Required Case Classes

1. correct answer
2. partial answer
3. declared uncertainty
4. wrong misconception
5. missing evidence
6. boundary violation
7. overconfident LLM output

## Rules

- Fixtures must be small enough to inspect manually.
- Expected outputs must cite the reason they are expected.
- Boundary cases must include allowed and forbidden paths.
- LLM cases must be expressible with recorded fixture responses so evals can run offline.
- Benchmark-size claims require a dataset sizing research artifact. Do not invent a fixed size before that research.

## Dataset Size Research

The E01 worker must discover the right pilot and scale dataset sizes for Sibi's
quality benchmarks. The output must include:

1. what benchmark quality means for Sibi pedagogy
2. candidate dataset sizes for pilot and scale runs
3. stratification across L1-L5, answer quality, misconceptions, boundary cases, and model behavior
4. confidence or variance rationale
5. cost/runtime tradeoff
6. recommendation for the first benchmarkable dataset

## Verification

Dataset validation passes when every required case class exists and all cases
declare expected layer, evidence, gap/challenge/readiness expectations, and
forbidden evidence when relevant.
