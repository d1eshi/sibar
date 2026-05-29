# Workspace Plan Adapter Evals

This directory is the declarative catalog for evals that protect WorkspacePlan
generation adapters.

The catalog says what each eval is for and which WorkspacePlan boundary it
protects. Generated report output lives in this tree under `reports/`, so
adapter eval intent, fixtures, and run results are discoverable together without
using historical spec names.

## Layout

- `index.json`: catalog of eval suites, commands, report outputs, and tags.
- `eval-suite.json`: root suite manifest that connects adapter evals, commands,
  README context, and generated reports.
- `reports/`: generated eval reports for the current adapter suites.
- `workspace-intent-compiler.eval.json`: PR #10 parser/schema/pedagogy adapter
  evals for `WorkspaceIntent` to `WorkspacePlan`.

## Current Architecture

The current suite keeps responsibility narrow: deterministic `WorkspaceIntent`
compiler evals verify that source and ambition inputs become bounded
WorkspacePlan state through parser, schema, and pedagogy checks.

The contract now is:

```text
evals/workspace-plan-adapters/*.eval.json
  declarative intent and case classes

engine/evals/*.ts
  executable adapter that turns declared cases into observations

evals/workspace-plan-adapters/reports/*.json
  generated report output only
```

## Runner Boundaries

- `fixture`: deterministic, runs offline, suitable for committed eval reports.
- External execution stays outside this committed eval surface. WorkspacePlan
  state should come from the shared TypeScript engine unless a future adapter is
  added intentionally.

Run `pnpm eval:catalog` from the repo root to see the suite purpose, protected
contracts, eval commands, and generated reports.
