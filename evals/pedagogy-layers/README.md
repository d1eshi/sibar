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
  answer classes, gap labels, operations, evidence conditions, and loop stages;
  exits non-zero when critical semantic coverage gaps remain.
- `pnpm eval:pedagogy-coverage -- --allow-coverage-gaps`: writes the same
  report in exploratory mode and leaves missing coverage as `report_only`.
- `pnpm eval:llm-runtime-trace`: runs paired fixture model traces over the same
  dataset without live LLM calls.

The default coverage command is fail-closed for critical dimensions. At the
moment it exits `1` because `observed_L5_gap` is intentionally still missing
from `gap_labels`; the override is for local exploration, not readiness.
