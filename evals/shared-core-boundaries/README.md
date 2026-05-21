# Shared Core Boundary Guardrails

This suite protects the boundary defined in
`docs/specs/deep-ownership-workspace/04_shared_core_boundaries.md` before shared
core implementation is created or moved.

## Command

- `pnpm eval:shared-core-boundaries`: runs a deterministic no-LLM scanner and
  writes `reports/VAL-EVAL-014-shared-core-boundaries.json`.

## Checks

- `src/ownership-core`, `src/pedagogy-core`, and `src/memory-core`, when
  present, do not import host effects, UI surfaces, Sibi, workspace UI,
  workspace adapters, runtime state, workspace session/context, or stores.
- `sibi/src` does not import WorkspaceIntent, PedagogoAI workspace adapters,
  Sibar Workspace UI, or workspace adapters.
- The shared core boundary spec declares the evidence, attempt, operation,
  artifact, no whole mission/repo, taxonomy, repair, misconception, recall, and
  raw model output gates.
