# Attempt Readiness Evals

This directory owns the operational eval assets for the attempt-readiness loop.

It covers the path from a bounded repo manifest and simulated user answer to:

- gap detection,
- issue candidate classification,
- repair task generation,
- re-evaluation prompting,
- scoped readiness labels.

## Layout

- `eval-suite.json`: declarative suite manifest for humans, agents, and
  validation tooling.
- `manifest.json`: bounded repo slice, concepts, included paths, and eval
  indexes.
- `mastery-checks/`: declarative prompts and evidence requirements.
- `gold-cases/`: deterministic simulated answers and expected classifications.
- `reports/`: generated reports from the deterministic and freeform eval
  runners.

The Markdown specs that explain the product contract remain under
`docs/specs/selfhost/`. Throwaway review prototypes live under
`prototypes/attempt-readiness/`.

Run `pnpm eval:catalog` from the repo root to see the suite purpose, protected
contracts, eval commands, and generated reports.
