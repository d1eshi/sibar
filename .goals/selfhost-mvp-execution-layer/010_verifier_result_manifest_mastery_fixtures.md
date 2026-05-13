# 010 - Verifier Result: Manifest And Mastery-Check Fixtures

## Verifier 1 Recommendation

```text
REVISE
```

## Blocking Findings

1. `docs/missions` was ignored by `.gitignore`, so the selfhost-pilot fixtures
   were not trackable or committable.
2. Worker-slice scope could not be cleanly verified from git status because
   existing orchestrator documentation changes are present in the same working
   tree.

## Non-Blocking Findings

1. `sibar.selfhost.manifest.json` exists and matches the deterministic boundary.
2. The manifest includes the five first-slice concepts and excludes
   `model_signal_validation`.
3. Exactly five mastery-check fixtures exist on disk, one per concept.
4. Each mastery check includes required fields and in-bound repo evidence.
5. Issue candidate types match the product improvement loop.

## Orchestrator Decision

Superseded by user instruction.

The user rejected using `docs/missions/` for MVP artifacts. The selfhost-pilot
artifacts were moved to:

```text
docs/specs/selfhost/pilot/
```

Reason: keep `docs/missions/` ignored and place active MVP artifacts next to the
selfhost specs.

## Required Follow-Up

1. Re-run git status with untracked files.
2. Confirm selfhost-pilot files are visible to git at the new location.
3. Re-run verifier after this location fix.

## Status

Superseded by user instruction and Verifier 2 acceptance.

## Verifier 2 Recommendation

```text
ACCEPT
```

## Verifier 2 Summary

The prior blocker is resolved. Selfhost-pilot artifacts now live under:

```text
docs/specs/selfhost/pilot/
```

They are visible to git and no longer rely on ignored `docs/missions/`.

Accepted artifacts:

1. `sibar.selfhost.manifest.json`
2. `docs/specs/selfhost/pilot/README.md`
3. `docs/specs/selfhost/pilot/mastery-checks/index.json`
4. `docs/specs/selfhost/pilot/mastery-checks/SC-001-artifact-boundary.json`
5. `docs/specs/selfhost/pilot/mastery-checks/SC-002-concept-graph-generation.json`
6. `docs/specs/selfhost/pilot/mastery-checks/SC-003-gap-detection.json`
7. `docs/specs/selfhost/pilot/mastery-checks/SC-004-repair-practice-generation.json`
8. `docs/specs/selfhost/pilot/mastery-checks/SC-005-readiness-report-generation.json`

Remaining caveat: no runtime tests were required or run because this slice is
manifest/fixture-only.

## Final Status

Accepted.
