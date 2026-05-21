# 11: Open Decisions

## Purpose

List decisions that remain open after creating this spec pack.

These should not block the first morning prototype unless explicitly marked as a
blocker.

## Naming

### Decision: Public Name For The Large Surface

Options:

1. `Sibi Workspace`
2. `Sibi Lab`
3. `Sibi Studio`
4. `Sibi Workbench`

Recommendation:

Use `Sibi Workspace` in specs and implementation for now. Consider `Sibi Lab`
for user-facing AI research positioning later.

Status: open, not blocking.

### Decision: Internal Name For Loops

Options:

1. `DeepOwnershipLoop`
2. `OwnershipLoop`
3. `BuildToUnderstandLoop`
4. `ResearchLoop`

Recommendation:

Use `DeepOwnershipLoop` internally for this track. It preserves the ambition and
does not copy external orchestration language.

Status: accepted by this spec pack unless changed later.

## UI Stack

### Decision: Tauri vs Pure Web vs Swift-Only Workspace

Options:

1. Web prototype first, Tauri later.
2. Tauri immediately.
3. SwiftUI-only workspace.
4. VS Code extension first.

Recommendation:

Web prototype first, Tauri later.

Reason:

The interaction model is still being discovered. Web UI is fastest for panels,
code rendering, diagrams, and fixture review. Tauri can package it once the
surface is proven. SwiftUI remains ideal for the small Lens, not the large
artifact workspace.

Status: open but strongly recommended.

### Decision: Code Editor Inside Sibi

Options:

1. read-only code viewer first
2. scratch editor only
3. full product-code editor
4. external editor only

Recommendation:

Read-only code viewer plus scratch artifacts first. Add external editor links.
Do not build a full editor until product usage proves it is necessary.

Status: open, not blocking.

## Artifact Generation

### Decision: Deterministic First Or Model-Assisted First

Options:

1. deterministic fixture and generator first
2. model-assisted artifact proposal first
3. hybrid from day one

Recommendation:

Deterministic fixture first. Model-assisted proposals later, under validation.

Reason:

The product risk is not whether a model can draw something. The risk is whether
the generated artifact forces useful thinking and cites evidence.

Status: open, not blocking.

### Decision: Diagram Renderer

Options:

1. simple HTML/CSS/SVG
2. Mermaid-like syntax
3. Excalidraw export
4. React Flow or similar graph library
5. custom canvas

Recommendation:

Start with simple HTML/CSS/SVG in the prototype. Upgrade to a graph library only
when interaction demands it.

Status: open, not blocking.

## Evidence And Indexing

### Decision: Tree-Sitter Timeline

Options:

1. add language-aware parsing immediately
2. start with heuristics and line citations
3. use external tools per language

Recommendation:

Start with heuristics and line citations. Add Tree-sitter or language-aware
parsing when deterministic artifacts become too shallow.

Status: open, not blocking.

### Decision: Storage Backend

Options:

1. existing JSON state
2. SQLite
3. hybrid JSON fixtures plus SQLite app storage

Recommendation:

Use existing JSON/fixture state for first slice. Move to SQLite when the
Workspace needs search, history, and persistent memory at scale.

Status: open, not blocking.

## Commands And Mutation

### Decision: When To Allow Product Mutation

Options:

1. never in this track
2. only after readiness
3. explicit override always allowed
4. allow patch previews but block apply

Recommendation:

Allow study mutation and patch previews early. Product mutation requires
readiness or explicit override.

Status: open, not blocking for prototype.

### Decision: Read-Only Commands In First Prototype

Options:

1. no command execution
2. fixture command outputs only
3. real read-only commands

Recommendation:

Use fixture command outputs in the first prototype. Add real read-only command
execution after the UI and contracts are stable.

Status: open, not blocking.

## Product Scope

### Decision: First External Learning Domain

Options:

1. Sibi self-hosted repo ownership
2. RL toy repo
3. LLM-from-scratch repo
4. Rust systems repo
5. paper-to-implementation artifact

Recommendation:

Dogfood with Sibi first, then add an RL toy repo because it exercises code,
math, experiments, and parameter reasoning.

Status: open.

### Decision: Mission Language For Goal-Driven Study

Options:

1. `Mission -> Track -> Session -> Artifact`
2. nested workspace objects
3. source documentation tree
4. course/module/lesson vocabulary

Recommendation:

Use `Mission -> Track -> Session -> Artifact` for user-facing goal-driven study.
Keep `Workspace*` names internally where already established.

Reason:

The frontier lab readiness case starts from a career goal and source-backed
conversation context. Calling the JAX docs a workspace inside another workspace
obscures the relationship. A mission can own tracks, and tracks can own sessions
without making the user navigate a deep tree.

Status: accepted for new mission-oriented UI unless changed later.

### Decision: Full Source Trees In Track UI

Options:

1. show the full source tree as the default navigation
2. show a curated queue and keep the source tree in an advanced Source Map
3. hide source structure entirely

Recommendation:

Show a curated queue by default and expose the full source tree only as Source
Map.

Reason:

Documentation sidebars with dozens of topics create the same overwhelm as
generic learning platforms. The product value is the selected next operation and
artifact evidence, not raw topic enumeration.

Status: accepted for Tauri mission-track UI.

## Blockers

No open decision blocks the first morning prototype.

The first prototype can proceed with:

1. static web UI
2. deterministic fixture
3. this repo as source
4. read-only evidence
5. no product mutation
6. no editor dependency
