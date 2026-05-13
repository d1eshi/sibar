# User Testing

## Dogfood Artifact

Use this repository as the first dogfood artifact:

```text
root: /Users/d1eshi/projects/startup/sibar
included_paths:
  - docs/specs
  - docs/product
  - src
  - Sources/SibiCore
  - Sources/SibiStudyShellKit
excluded_paths:
  - node_modules
  - .build
  - .git
learning_goal: entender que esta construyendo Sibi v0.1 y donde estan los gaps
```

## Manual Scenario

1. Create an artifact session with the dogfood boundary.
2. Build a concept graph with at least five evidence-cited concepts.
3. Select one runtime flow and prepare an autopsy step.
4. Answer partially or with uncertainty.
5. Confirm Sibi emits a gap and repair challenge.
6. Resume the session and inspect memory.
7. Export readiness.
8. Launch `swift run SibiStudyApp`.
9. Confirm the study surface opens as a floating panel, not a normal app window.
10. Collapse and restore the panel.
11. Open Canvas and confirm concept graph plus code/evidence preview render from
    the same session state.

## Evidence To Record

- Runtime command inputs and outputs.
- The concept node or flow selected.
- The user answer.
- The detected gap or confirmed concept state.
- The practice challenge.
- The readiness report.
- Panel and Graph + Code canvas screenshots or snapshot fixtures.
