# Sibi Ownership Workbench

This spec pack turns the ownership manifesto into an implementation-ready web
project.

The workbench is not a generic repo chat, IDE clone, documentation generator, or
LLM explainer. It is the first product surface where Sibi makes cognitive debt
visible and asks the user to prove ownership over code boundaries.

## Product Shape

```text
repo / diff / directory
  -> deterministic evidence context
  -> ownership boundary map
  -> attempt-first question
  -> gap diagnosis
  -> smallest repair
  -> re-attempt
  -> scoped ownership state
```

The first UI should feel close to a fast code review surface:

```text
LEFT    ownership-aware file tree
CENTER  code / diff view
RIGHT   ownership harness panel
BOTTOM  evidence / trace drawer when needed
```

The product difference is the right panel: it is not a chat box. It is a guided
ownership loop.

## Canonical Files

1. `01_product_slice.md` defines the MVP wedge, non-goals, and public demo shape.
2. `02_ui_tree_code_panels.md` defines the workbench layout, tree states, code
   view, diff mode, and ownership panel behavior.
3. `03_runtime_evidence_contract.md` defines the evidence extraction layer,
   contracts, confidence rules, and LLM/runtime boundary.
4. `04_implementation_slices.md` defines build slices, verification gates, and
   the order to create the project.
5. `05_agent_flow_manifest.md` defines action-level manifest contracts for
   agents, control-surface safety, and Playwright replayable validation.
6. `06_cognitive_debt_metrics.md` defines debt/load signal derivation, transfer
   readout behavior, and daily learning readout outputs.

## Build Rule

Build slices in this order:

```text
static fixture workbench
  -> repo tree scanner
  -> code/diff viewer
  -> relation gap evidence contract
  -> attempt/certification harness
  -> ownership memory store
  -> transfer + workspace escalation
  -> cognitive debt/readout
  -> agent-flow manifest
  -> UI control surface
  -> experiment/channel gates
  -> LLM evidence extractor (post-gates)
```

Do not start with a full AST, live GitHub connector, whole-repo chat, broad
learning workspace, or post-v0.1 experimental channels (voice/Jarvis).

## Current Relationship To Existing Docs

This pack operationalizes:

- `sibi/docs/ownership-boundaries.md`
- `sibi/docs/ownership-wedge.md`
- parent runtime references such as `docs/specs/04_ownership_question_policy.md`
  and `docs/specs/05_gap_and_misconception_detection.md` only when a Sibi
  implementation needs the shared pedagogy contracts.

When these specs conflict, prefer this workbench pack for Sibi web product/UI
execution and prefer shared runtime docs only for cross-product invariants.
