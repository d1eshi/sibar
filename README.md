# Sibar

Sibar is an experimental learning system for turning real work into evidence-backed study loops. The repo currently keeps two product surfaces that explore the same pedagogy from different angles while sharing the same core engine.

## Product surfaces

### Sibar Workspace

`apps/sibar-research-workspace` is the study workspace. It focuses on source intake, mission planning, study sessions, notes, and gap detection for a learner working through a subject or project.

Use it when the primary job is to structure learning work: understand source material, create a path, ask ownership questions, and track where the user is blocked.

### Sibi

`sibi` is the code ownership surface. It focuses on reading, compiling, reviewing, and questioning code so the user can prove they understand what a change does and where their gaps are.

Use it when the primary job is code comprehension: inspect a repo slice, identify risky files, generate focused questions, and surface evidence-backed repair work.

## Shared engine

Both surfaces use the shared engine under `engine/`. The engine owns the reusable pedagogy primitives:

- evidence contracts
- artifact generation
- attempt evaluation
- gap and misconception detection
- readiness checks
- ownership question planning
- workspace/session projection

Product code should stay thin: Sibar Workspace and Sibi can present different workflows, but they should not fork the pedagogy model.

## Commands

```sh
pnpm install
pnpm test
pnpm run workspace:dev
pnpm run sibi:dev
```

## Repository shape

- `engine/`: shared learning and evidence engine.
- `apps/sibar-research-workspace/`: study workspace experiment.
- `sibi/`: code ownership and compile/review experiment.
- `web/`: public web entry points.
- `Tests/` and `sibi/Tests/`: regression coverage for shared engine and product surfaces.
