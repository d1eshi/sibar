# 13: Tauri Second App Product Plan

This plan defines the second Sibar app slice for a native desktop workspace shell.
It is intentionally separate from the existing Swift panel and follows the
Web-first workspace model while giving a Tauri-first runtime surface.

## Positioning

Sibar is not a chat app, and not a course player.
The second app should behave as an **AI-native research workspace**:

- Ambition
- Roadmap
- Learning Node
- Session / Reader
- Artifact
- Evidence
- Recall

The goal is to turn a broad objective into bounded, evidentiary progress and to
make learning output visible as artifacts before it is considered done.

## First visible slice: Today-first screen

The entry screen must prioritize what to work on now.

- `TODAY` shows the selected goal and current arc.
- `Current session` lists one concrete work item and required outputs.
- The view should not open with a generic chat area.

Required required-output model:

- one node reconstruction attempt
- one explanation artifact
- one evidence-backed recall item

## Workspace model (3-column)

The screen is a 3-column workspace plus a bottom evidence strip:

1. `ROADMAP`
2. `SESSION / READER`
3. `LM GUIDE`
4. `ARTIFACTS / EVIDENCE`

### ROADMAP

Display learning nodes with explicit statuses:

- `○` unseen
- `◐` in progress
- `●` understood
- `◆` built
- `★` published / evidence

The roadmap must be mutable only by bounded updates from user-authored session
activity or source ingestion.

### SESSION / READER

The center column is the working surface:

- Source card (title/url/excerpt)
- Source-to-roadmap compiler
- Workbench section for read → explain → build → critique → repair flow
- Attempt composer
- Attempt feedback / hint ladder

No complete answer is shown by default.

### LM GUIDE

Bounded tool modes replace free-form prompts. Minimum required commands:

- `/map`
- `/read`
- `/explain`
- `/test`
- `/critic`
- `/repair`
- `/build`
- `/publish`

Mode selection should only change tool scope, not open a generic chat log.

### ARTIFACTS / EVIDENCE strip

Bottom strip is the evidence ownership gate:

- required artifacts for the active node
- required evidence references for each artifact
- open gaps when evidence is missing

No mastery claim is accepted without evidence references tied to a node.

## Core behavioral rule: attempt-first reconstruction

The system must not display a finished explanation before the user produces an
attempt.

Flow:

1. user submits first attempt
2. system prompts with bounded hints if needed
3. user repairs and resubmits
4. evidence checklist updates
5. readiness remains scoped to one operation unless explicit proof exists

This is the anti-answer-first invariant.

## Source-to-roadmap behavior

In this slice the mapping is deterministic and bounded:

- source token/claim extraction is local and offline
- matched claims map to roadmap nodes
- unmapped source returns explicit "no new nodes" feedback
- no automatic broad roadmap replacement from source

## Acceptance gates for this slice

- Today-first screen exists and leads directly into the 3-column workspace.
- Roadmap node status states are visible and updated.
- At least one source-to-roadmap mapping is demonstrable.
- At least one attempt submission happens before any "final" answer text appears.
- Bottom strip includes both artifacts and evidence.
- App can run as static HTML without backend/network calls.
- Tauri shell points to the app frontend for desktop packaging.

## Implementation scope for this slice

- Static `apps/sibar-research-workspace/` HTML/CSS/JS
- Minimal `src-tauri` scaffold (`tauri.conf.json`, `Cargo.toml`, `src/main.rs`)
- Focused static-contract tests
- No runtime core mutation

## Continue / defer decisions

Keep Swift and other native surfaces intact for now.

Switch criteria if this slice proves insufficient:

- source/tool performance or memory pressure outside frontend capability
- repeated need for process-level integrations missing from desktop shell
- inability to keep evidence-first UX while staying deterministic and bounded
