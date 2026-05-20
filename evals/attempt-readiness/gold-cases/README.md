# Self-Hosted MVP Gold Cases

This folder contains the 40-case deterministic gold dataset for the first-slice
self-hosted MVP benchmark.

Scope:

- 5 concepts from the first slice
- 8 answer classes per concept
- 40 JSON case artifacts under `cases/`
- No evaluator/runtime code in this layer

The dataset includes:

- This index
- `index.json` with deterministic manifest metadata and case pointers
- `cases/*.json` for each `(concept_id, answer_class)` pair

Required concepts:

- `artifact_boundary`
- `concept_graph_generation`
- `gap_detection`
- `repair_practice_generation`
- `readiness_report_generation`

Required answer classes:

1. `correct_grounded`
2. `correct_uncited`
3. `partial`
4. `wrong_responsibility`
5. `wrong_flow`
6. `overconfident_wrong`
7. `declared_uncertainty`
8. `design_induced_confusion`

Use this file for manual review and `index.json` for machine processing.
