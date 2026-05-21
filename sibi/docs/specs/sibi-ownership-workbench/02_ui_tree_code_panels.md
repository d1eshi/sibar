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

- use a proven file tree renderer such as the `trees.software` React FileTree API
  if licensing and package fit are acceptable;
- use a proven code/diff renderer such as `diffs.com` CodeView if licensing and
  package fit are acceptable;
- otherwise keep the renderer interface compatible with replacing the local
  prototype later.

Renderer abstraction:

```ts
type CodeSelection = {
  file_path: string;
  start_line: number;
  end_line: number;
};

type CodeViewInput = {
  file_path: string;
  language: string;
  content: string;
  diff?: string;
  evidence_refs: EvidenceRef[];
  selected_boundary_id?: string;
};
```

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

Do not use empty states that invite open-ended chat.
