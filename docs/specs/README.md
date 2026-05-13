# Foundation Specs

v0.1 has 10 foundation specs. Specs 01-08 define the Build-to-Learn loop.
Specs 09-10 add the bounded project-learning agent and the reusable study UI.
Treat these as the specs that govern the launch track.

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
| 9 | `09_project_learning_agent.md` | Use a bounded LLM/model runner to propose candidate learning signals under deterministic pedagogy rules. |
| 10 | `10_study_panel_ui.md` | Render the Build-to-Learn session in a reusable Swift study panel. |

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
  -> Project Learning Agent
  -> Study Panel UI
```

## Rule

For this MVP execution layer, active routing is explicit:

1. Self-hosted MVP artifacts must live under `docs/specs/selfhost/` and
   `docs/specs/selfhost/pilot/`.
2. Only an explicit later worker brief may revise this route.

Historical references to mission packs may remain in the repository, but they do
not define current artifact destinations for this layer.

New feature ideas can be accepted only if they strengthen one of these specs for
v0.1 or the current self-hosted execution layer target.

For the self-hosted MVP, new work must produce at least one of:

1. manifest
2. mastery check
3. dataset
4. evaluator
5. benchmark report
6. readiness evidence
