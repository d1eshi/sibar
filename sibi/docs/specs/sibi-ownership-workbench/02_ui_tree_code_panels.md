# UI Spec: Tree, Code View, And Ownership Panels

## Layout

The first workbench is a web app with four regions:

```text
┌──────────────┬──────────────────────────────┬──────────────────────┐
│ File tree    │ Code / diff view             │ Ownership harness    │
│ ownership    │ selection-aware              │ attempt-first loop   │
│ map          │                              │                      │
├──────────────┴──────────────────────────────┴──────────────────────┤
│ Evidence drawer: imports, exports, callers, tests, docs, conflicts │
└────────────────────────────────────────────────────────────────────┘
```

Use dense, work-focused UI. Avoid marketing sections, chat-first composition,
decorative cards, and feature tours inside the app.

## File Tree

The file tree is not just navigation. It is a cognitive ownership map.

Each node should show:

- path;
- file kind;
- change count when diff mode is active;
- ownership state;
- one short reason for non-owned states;
- evidence density when available.

Valid states:

- `unvisited`
- `attempted`
- `owned`
- `partial`
- `gap`
- `blocked`
- `questionable`

Example labels:

```text
runtime-deep-ownership.ts        gap: boundary vs validation
ownership-validation-evidence.ts partial: missing caller trace
prompt-generator.ts              owned
evals/                           unvisited
```

Directory state is a rollup, not an independent truth. A directory can be
`partial` because some child boundaries remain partial.

## Code / Diff View

The center panel must support:

1. file mode for reading current code,
2. diff mode for changed lines,
3. stable line numbers,
4. line/range selection,
5. highlighted evidence refs,
6. highlighted current ownership boundary,
7. virtualized or pre-rendered code for speed.

Preferred direction:

- use `@pierre/trees` and `@pierre/trees/react` in Slice 0:
  `useFileTree(...)` + `<FileTree model={model} />`;
- use `@pierre/diffs` for code/diff rendering:
  `CodeView`, `parsePatchFiles`, `CodeViewFileItem`, `CodeViewDiffItem`, and
  line/selection annotations (`LineAnnotation`, `DiffLineAnnotation`, `CodeViewLineSelection`) in Slice 0;
- keep an explicit adapter boundary from fixtures to package inputs so library migration can
  be removed behind a single module later.

Slice 0 fixture adapter outputs should align to package shapes:

`parsePatchFiles` -> file-diff file collection, then
`CodeViewFileItem` / `CodeViewDiffItem` maps keyed by file path for the `CodeView`.

Slice 0 fixture data is intentionally demo-only, demo-selected by default, and should not be treated as
canonical source-of-truth for architecture, evidence, or evaluation contracts.

## Ownership Harness Panel

The right panel is not chat. It is a finite loop:

```text
Current Boundary
  -> Why this boundary matters
  -> Evidence available
  -> Ownership prompt
  -> User attempt
  -> Submit / Hint / Mark unknown
  -> Diagnosis
  -> Smallest repair
  -> Re-attempt
```

The panel must never open with "Here is what this file does." It may show
evidence context, but the user must attempt the ownership operation before the
system explains the gap.

Prompt shape:

```text
Explain this boundary in your own words:
1. What is being controlled?
2. Which evidence proves it?
3. What would break if this boundary disappeared?
```

Diagnosis shape:

```text
State: partial
Gap: confused validation with evaluation
Evidence missed: runtime-deep-ownership.ts:42-69
Smallest repair: distinguish "checking an answer" from "proving ownership"
Return condition: re-answer the original boundary prompt
```

## Evidence Drawer

The bottom drawer shows facts and conflicts without taking over the app:

- imports;
- exports;
- possible callers;
- tests;
- docs/spec references;
- git diff touched files;
- unverified claims;
- confidence labels;
- verifier conflicts.

Evidence display must distinguish:

- `observed`;
- `inferred`;
- `unverified`;
- `conflict`.

## Empty States

Empty states should drive the user into the loop:

- "Load a diff or bounded directory."
- "Select a boundary to prove ownership."
- "Submit an attempt before Sibi diagnoses this gap."

Once `load`/`select-empty` states exist, these messages become required and should replace generic fallback text.
While fallback rendering remains fixture-bound, avoid empty-state copy that invites open-ended chat.
