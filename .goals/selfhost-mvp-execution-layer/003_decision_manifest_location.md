# 003 - Decision Brief: Manifest Location

## Decision Needed

Choose where the first concrete `sibar.selfhost.manifest.json` should live.

This decision should be resolved before assigning the manifest/mastery-check
worker slice.

## Option A - Repo Root Manifest

Place the first concrete manifest at:

```text
sibar.selfhost.manifest.json
```

### Benefits

1. Treats the manifest as an executable project artifact.
2. Makes future runtime/eval loading simple and stable.
3. Matches the filename already named in `01_selfhost_boundary.md`.
4. Avoids burying the active manifest inside docs.

### Cost

It creates a root-level product artifact before a loader exists.

### Required Follow-Up If Chosen

1. Worker creates the root manifest.
2. Worker may create docs/examples only if explicitly assigned.
3. Verifier checks every manifest path exists and stays inside the chosen
   boundary.

## Option B - Selfhost Docs Draft Manifest

Place the first draft manifest at:

```text
docs/specs/selfhost/sibar.selfhost.manifest.example.json
```

### Benefits

1. Keeps the first pass purely documentary.
2. Avoids implying runtime support before a loader exists.
3. Allows schema iteration before promoting to repo root.

### Cost

It is weaker as an MVP artifact because the README gate says new work should
produce a manifest, not only an example.

### Required Follow-Up If Chosen

1. Worker creates the example manifest only.
2. Later worker promotes it to root when loader/eval support begins.
3. Verifier must mark it as draft evidence, not executable evidence.

## Recommendation

Choose Option A.

Reason: the active MVP gate is intentionally artifact-driven. The first manifest
should be a real root-level project artifact even before code loads it. The
worker can still be constrained to create no product code.

## Decision Status

Accepted: Option A.

The first concrete manifest should live at repo root as
`sibar.selfhost.manifest.json`.
