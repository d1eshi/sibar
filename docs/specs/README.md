# Foundation Specs

v0.1 has 8 foundation specs. Treat these as the only specs that govern the launch track.

| # | Spec | Purpose |
|---|------|---------|
| 1 | `01_artifact_intake.md` | Define how a real repo, folder, or file set enters Sibi. |
| 2 | `02_concept_graph.md` | Map artifact structure into technical concepts and flows. |
| 3 | `03_learning_autopsy.md` | Define the guided reverse-engineering loop. |
| 4 | `04_ownership_question_policy.md` | Define attempt-first questions, hints, and answer rules. |
| 5 | `05_gap_and_misconception_detection.md` | Detect the difference between the user's model and the artifact. |
| 6 | `06_practice_challenges.md` | Turn gaps into modification, recall, and transfer tasks. |
| 7 | `07_understanding_memory.md` | Persist concept state, answers, evidence, decay, and repair history. |
| 8 | `08_readiness_export.md` | Produce reviewable readiness output and future ingestion packages. |

## Build Order

The implementation order should follow the evidence loop:

```text
Artifact Intake
  -> Concept Graph
  -> Learning Autopsy
  -> Ownership Questions
  -> Gap Detection
  -> Practice Challenges
  -> Understanding Memory
  -> Readiness Export
```

## Rule

New feature ideas can be accepted only if they strengthen one of these specs for v0.1.
Otherwise they go to later.

