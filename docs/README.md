# Sibi Clean Foundation

This folder is the cleaned planning base for a focused Sibi v0.1.

The decision in this pass is simple: Sibi should not start as a generic repo chat, a coding agent, a desktop memory recorder, or a macOS observer dashboard. Those can exist later. The v0.1 foundation is:

> Sibi turns real software artifacts into verifiable technical understanding.

The primary source inputs for this cleanup were:

1. `agent-chat-1.md`
2. `agent-chat-2.md`
3. the active `sibar-agent/docs/product` contracts
4. the active `sibar-agent/docs/iterations` queue
5. active research notes around pedagogy, memory, code ownership, and validation
6. the current pedagogy mission pack, used as implementation evidence rather than product north star

## Reading Order

1. `product/00_foundation.md`
2. `product/01_moat.md`
3. `product/02_v01_scope.md`
4. `specs/README.md`
5. the individual foundation specs under `specs/`
6. `missions/sibi-v01-build-to-learn/mission.md`
7. `missions/sibi-v01-build-to-learn/validation-contract.md`
8. `missions/sibi-v01-build-to-learn/library/orchestration.md`
9. `missions/sibi-v01-build-to-learn/features.json`
10. `missions/sibi-v01-build-to-learn/execute_prompt.md`
11. `iterations/README.md`
12. `triage/source-triage.md`
13. `triage/iteration-spec-adaptation.md`

## Foundation Decision

There are 10 foundation specs for v0.1:

1. Artifact Intake
2. Concept Graph
3. Learning Autopsy
4. Ownership Question Policy
5. Gap And Misconception Detection
6. Practice Challenges
7. Understanding Memory
8. Readiness And Export
9. Project Learning Agent
10. Study Panel UI

The active implementation contract is the mission pack under
`missions/sibi-v01-build-to-learn/`. Everything else is either supporting
research, later surface work, or old implementation context.

## Rule

Until v0.1 is reproducible, new work should attach to one of the 10 foundation
specs or the active mission pack. If a proposed feature does not strengthen the
Build-to-Learn loop, evals, or study panel, it goes to later.
