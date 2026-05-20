# Workspace Plan Adapter Evals

This directory is the declarative catalog for evals that protect WorkspacePlan
generation adapters.

The catalog says what each eval is for, which adapter or runner it covers, and
which WorkspacePlan boundary it protects. Generated report output lives in this
tree under `reports/`, so adapter eval intent, fixtures, and run results are
discoverable together without using historical spec names.

## Layout

- `index.json`: catalog of eval suites, commands, report outputs, and tags.
- `reports/`: generated eval reports for the current adapter suites.
- `workspace-intent-compiler.eval.json`: PR #10 parser/schema/pedagogy adapter
  evals for `WorkspaceIntent` to `WorkspacePlan`.
- `workspace-runner-adapter.eval.json`: PR #11 Rust runner and Codex runner
  adapter evals.

## Current Architecture

The latest two PRs split responsibility but did not make that split visible in
the eval surface:

1. PR #10 added deterministic `WorkspaceIntent` compiler evals, but the cases
   lived in TypeScript and the only committed artifact was a report under
   `reports/`.
2. PR #11 added the Rust workspace compiler runner plus `codex-exec` command
   metadata, but the runner path was covered as bridge tests rather than an
   explicit adapter eval.

The contract now is:

```text
evals/workspace-plan-adapters/*.eval.json
  declarative intent, case classes, runner/adapter coverage

src/evals/*.ts
  executable adapter that turns declared cases into observations

evals/workspace-plan-adapters/reports/*.json
  generated report output only
```

## Runner Boundaries

- `fixture`: deterministic, runs offline, suitable for committed eval reports.
- `codex-exec`: production runner surface for local Codex execution. Offline
  evals must assert command metadata and blocked status unless live execution is
  explicitly enabled.
- Rust process: owned by `sibi-workspace-compiler`; TypeScript evals only
  verify runner invocation, adapter status, fallback behavior, and plan mapping.
