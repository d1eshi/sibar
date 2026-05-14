# Foundation Specs

v0.1 has 10 foundation specs. Specs 01-08 define the Build-to-Learn loop.
Specs 09-10 add the bounded project-learning agent and the reusable study UI.
Treat these as the specs that govern the launch track.

## Spec-Driven Development Map

Sibi uses spec-driven development with three spec layers:

1. `docs/specs/`: Foundation specs. These are product and architecture
   contracts. They define what Sibi promises, what it refuses to do, and which
   invariants must survive implementation.
2. `docs/specs/selfhost/`: Executable MVP specs. These are the active specs for
   building, testing, and iterating self-hosted MVP features.
3. `docs/specs/selfhost/pilot/`: Harness artifacts. These contain mastery
   checks, gold cases, reports, and fixtures that prove executable specs.

A developer should read the foundation specs as conceptual contracts and the
self-hosted specs as live implementation gates. The self-hosted specs record
what the user receives, how to test it manually, what eval coverage exists,
what failed in the last iteration, and what must change next.

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

## Self-Hosted Feature Rule

Do not create `docs/specs/selfhost/features/`. Iterate inside the existing
self-hosted specs unless a feature has all of these:

1. an independent user-visible outcome
2. its own input/output contract
3. its own manual harness
4. its own eval gate
5. no clean home inside one of the current self-hosted specs

Start with the live self-hosted execution specs. Move toward ten only when a new
spec prevents mixed outcomes inside an existing spec or translates the execution
layer into a distinct public demo outcome.

## Living Spec Sections

Every live self-hosted spec should keep these sections current:

1. `Feature Outcome`: what the user receives.
2. `Manual Harness`: how to test the feature by hand.
3. `Prototype Artifact`: how a human reviews the iteration when logic,
   interaction, or UI needs to be understood before production work.
4. `Eval Coverage`: which tests, evals, reports, or fixtures protect it.
5. `Iteration Log`: input used, expected outcome, actual outcome, what worked,
   what failed, and what changed.
6. `Acceptance Gate`: when the feature is MVP-ready.
7. `Next Iteration`: the next narrow improvement.

An iteration is valid only when it records:

1. input used
2. expected outcome
3. actual outcome
4. what worked
5. what failed
6. coverage added or still missing
7. prototype feedback when a prototype was required
8. the decision for the next iteration

## Prototype Artifact Rule

Use `pnpm dlx lavish-axi@0.1.10` for self-hosted iteration prototypes. These prototypes are
local HTML review artifacts, not product code, runtime dependencies, or
substitutes for eval coverage. They exist so the user can inspect the logic,
interaction, or UI of an iteration before it is translated into production code
or SwiftUI.

A prototype is required when an iteration needs human review of:

1. logic or state transitions
2. interaction flow
3. UI structure
4. evidence/readiness presentation
5. benchmark or report interpretation

Prototype files live under:

```text
docs/specs/selfhost/pilot/prototypes/<spec-id>/<iteration-id>.html
```

Every prototype HTML must be self-contained and begin with this visible header:

```text
PROTOTYPE - throwaway review artifact
Spec: docs/specs/selfhost/<spec-file>.md
Iteration: <iteration-id>
Question answered: <what this prototype helps the user review>
```

Review commands:

```sh
pnpm dlx lavish-axi@0.1.10 docs/specs/selfhost/pilot/prototypes/<spec-id>/<iteration-id>.html
pnpm dlx lavish-axi@0.1.10 poll docs/specs/selfhost/pilot/prototypes/<spec-id>/<iteration-id>.html
pnpm dlx lavish-axi@0.1.10 end docs/specs/selfhost/pilot/prototypes/<spec-id>/<iteration-id>.html
```

Do not add `lavish-axi` as a package dependency. Do not commit `.lavish-axi/`.
When the review is complete, record the feedback and decision in the owning
self-hosted spec's `Prototype Artifact` and `Iteration Log` sections.

## Valid MVP Outcomes

A self-hosted feature is valid only when it produces at least one of these
outcomes:

1. the user can answer an ownership question
2. SIBI can evaluate a freeform answer with evidence
3. SIBI can detect a typed gap
4. SIBI can generate actionable repair
5. SIBI can re-evaluate without repeating the prompt
6. SIBI can emit bounded readiness with citations
7. the benchmark demonstrates improvement over generic chat
