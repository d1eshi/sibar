# Eval Catalog

This directory is the operational catalog for generated evals, fixtures,
datasets, and reports. It is separate from `docs/` so product specs remain
Markdown documentation while eval suites stay executable and machine-readable.

Start here:

- `index.json`: root catalog of eval suites.
- `attempt-readiness/eval-suite.json`: evals for the bounded attempt to
  readiness loop.
- `workspace-plan-adapters/eval-suite.json`: evals for WorkspacePlan LLM and
  runner adapters.

Use `pnpm eval:catalog` to list suites, inputs, commands, and report outputs.
The catalog test verifies that declared paths and commands stay valid.
