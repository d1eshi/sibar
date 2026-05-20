# Pedagogy Layer Evals

This suite keeps the deterministic pedagogy dataset and coverage reports under
`evals/` instead of `docs/`.

## Layout

- `dataset/`: migrated E01 deterministic pedagogy cases.
- `docs/`: evaluation contract and dataset sizing rationale for this suite.
- `reports/`: generated reports for deterministic pedagogy and coverage.
- `eval-suite.json`: catalog entry for commands, inputs, and reports.

## Commands

- `pnpm eval:pedagogy`: runs the deterministic no-LLM pedagogy cases.
- `pnpm eval:pedagogy-coverage`: reports semantic coverage across L1-L5,
  answer classes, gap labels, operations, evidence conditions, and loop stages.
- `pnpm eval:llm-runtime-trace`: runs paired fixture model traces over the same
  dataset without live LLM calls.

The coverage command is report-only for this slice. It writes
`coverage_passed: false` when contractual labels are missing, but does not fail
the command unless the report cannot be written.
