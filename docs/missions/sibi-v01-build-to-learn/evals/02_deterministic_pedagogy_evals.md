# Eval Spec 02: Deterministic Pedagogy Evals

## Goal

Evaluate Sibi's pedagogy runtime without any LLM dependency.

## Scope

The deterministic dataset and generated reports live in
`evals/pedagogy-layers/`; this document describes the validation contract.

Use `EvalCase` fixtures to test:

1. layer classification
2. gap and misconception detection
3. ownership question policy
4. practice challenge generation
5. understanding memory updates
6. readiness report claims

## Required Behavior

- The eval runner must be deterministic for the same fixture input.
- Results must explain mismatches by field, not only pass/fail.
- No model runner may be called.
- The eval report must include per-case output and aggregate counts.

## Verification

The deterministic eval command or test suite must pass against the canonical
dataset and produce an inspectable report.
