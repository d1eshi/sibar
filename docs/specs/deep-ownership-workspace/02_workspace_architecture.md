# 02: Workspace Architecture

## Goal

Define the architecture that lets Sibi read real artifacts, generate thinking
artifacts, render a deep workspace, and preserve attempt-first pedagogy without
requiring a custom editor on day one.

## Architectural Decision

Build Sibi as:

```text
Headless Ownership Core
  + Sibi Workspace / Lab
  + Sibi Lens
  + optional editor adapters
```

Do not build a full IDE first.

## Components

```text
Artifact Connectors
  -> Evidence Index
  -> Concept/Flow/Risk Projections
  -> Thinking Artifact Generator
  -> Pedagogy Runtime
  -> Memory Store
  -> Readiness Runtime
  -> UI Projection API
  -> Desktop Surfaces
```

## Headless Ownership Core

The headless core owns:

1. artifact boundaries
2. evidence indexing
3. concept slices
4. generated thinking artifacts
5. user operations
6. answer evaluation
7. gap detection
8. repair actions
9. re-evaluation
10. understanding memory
11. readiness

The core must not depend on any specific UI, editor, or desktop framework.

Initial implementation can reuse the current TypeScript runtime. Longer-term,
filesystem indexing and desktop integration may move to Rust if the Tauri path
is adopted.

## Sibi Workspace / Lab

The Workspace is the large surface where the user studies and builds.

Recommended first implementation path:

```text
Web UI prototype
  -> Tauri shell
  -> Rust filesystem/indexing bridge as needed
```

Why:

1. split panes, code viewers, diagrams, canvases, tables, and interactive
   artifacts are faster to build with web UI primitives
2. Tauri can package the workspace as a desktop app without forcing a browser
   tab product
3. Rust is a good fit for future indexing, filesystem safety, search, and local
   storage
4. the current TypeScript core can remain the product logic authority while the
   surface evolves

## Sibi Lens

The Lens is the small, fast, ambient surface.

Recommended first implementation path:

```text
SwiftUI + accessory NSPanel
```

Why:

1. the repo already has Swift study panel work
2. the Lens should feel native on macOS
3. the Lens should behave like a quick command/prompt surface, similar in spirit
   to Raycast, not like a document window
4. the Lens can open the full Workspace when the user needs a larger artifact
   surface

Lens responsibilities:

1. capture the user's current learning goal
2. select or resume a loop
3. show one active prompt
4. show readiness/gap status
5. send selected context to the Workspace
6. open the larger Workspace

Lens non-responsibilities:

1. no full graph editing
2. no long-form code browsing
3. no durable pedagogy logic
4. no direct product-code mutation
5. no full memory management UI

## Editor Adapters

Editor adapters are optional bridges, not the core product.

Potential adapters:

1. VS Code extension
2. Cursor-compatible extension if feasible
3. command-line bridge
4. file URL/deep link opener
5. Git worktree bridge

Initial adapter behavior:

1. open file at line in the user's editor
2. send active selection to Sibi
3. send current repo root
4. read current branch and diff metadata
5. never own pedagogy state

The user may continue editing in VS Code, Cursor, Neovim, Xcode, or another
tool. Sibi should render and reason about code without forcing code editing
inside Sibi.

## Storage

Sibi needs local durable storage for understanding memory and artifact history.

Initial storage may remain JSON-backed if it is already used by the runtime.
The architecture should allow migration to SQLite.

Recommended long-term stores:

1. `sessions`: loops, artifact boundaries, active operations
2. `evidence`: source references, excerpts, file hashes, command outputs
3. `artifacts`: generated thinking artifacts and renderer payloads
4. `attempts`: user attempts, selected evidence, confidence
5. `gaps`: detected gaps, repair actions, re-evaluation state
6. `memory`: concept mastery, misconception history, retention, transfer
7. `readiness`: scoped readiness reports

## Evidence Identity

Every evidence citation should be stable enough to survive ordinary edits.

Minimum:

```text
EvidenceRef
  source_id
  path_or_uri
  start_line
  end_line
  excerpt
  content_hash
  role
```

Longer-term:

1. symbol identity
2. AST range
3. paper paragraph identity
4. notebook cell identity
5. command output id
6. experiment run id

## Large Repo Strategy

Large codebases must be handled progressively.

Architecture requirements:

1. index file metadata before content
2. classify evidence roles before deep reading
3. build concept slices, not whole-repo certainty
4. summarize only with links back to source evidence
5. re-open source evidence when validating user claims
6. store compressed projections but not treat them as truth
7. preserve unknown zones explicitly

Sibi may say:

```text
This directory has not been studied yet.
This flow is inferred from imports and tests, not confirmed by execution.
This diagram is a hypothesis until the user traces it.
```

## Trust Boundaries

Allowed early:

1. read declared files and directories
2. read tests and docs inside boundary
3. run safe read-only commands when explicitly configured
4. create study artifacts in a Sibi-owned directory
5. open files in an external editor

Blocked early:

1. edit product source files automatically
2. install dependencies without explicit permission
3. run destructive commands
4. scan outside declared boundaries
5. claim readiness without user evidence
6. explain the answer before the attempt-first operation

## UI Projection API

The UI should receive projections, not raw internal state dumps.

```text
WorkspaceSnapshot
  loop
  artifact_boundary
  evidence_inventory
  active_concept_slice
  generated_artifacts
  active_operation
  attempt_state
  gap_state
  repair_queue
  readiness_state
  memory_summary
  operation_state
```

The UI can render:

1. repo tree
2. evidence board
3. code viewer
4. artifact canvas
5. operation panel
6. readiness panel
7. memory panel

The UI must not infer pedagogy, grade answers, or mutate readiness directly.

