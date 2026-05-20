# Workspace Tauri UI Iteration Flow

## Goal

Use this directory like a lightweight Figma board for the Tauri workspace:
screen-by-screen, state-by-state, with visual references and acceptance notes
before implementation changes.

## Screen Order

```text
0. Workspace Home
1. Create Workspace
2. Review Workspace Plan
3. Workspace Study Path Overview
4. Active Learning Node
5. Active Learning Material Surface
6. Evidence / Readiness Review
```

## Step 0: Workspace Home

The app opens to the user's workspace home when work already exists. This screen
answers "what can I continue?" before asking the user to create more work.

Visible elements:

1. continue queue for pending sessions,
2. existing workspaces with progress and next session,
3. blocked or draft intent attempts when present,
4. compact `New workspace` entry.

Success means the user sees tracking, continuity, and resume paths. This screen
must not show a `Study Path` rail, `Read / Build / Recall`, tutor, readiness
rail, or compiler payload.

## Step 1: Create Workspace

The user reaches this screen from `New workspace`. They see one native-feeling
window with:

1. intent field
2. source field
3. one constraint/reason field
4. optional background collapsed
5. persistent preview column

Success means the user understands that Sibar will create one bounded workspace,
not a broad learning dashboard.

## Step 2: Review Workspace Plan

The preview shows:

1. proposed workspace title
2. first session
3. three expected outputs
4. plan status
5. `Open workspace`

Success means the user can reject or proceed from a compact summary.

## Step 3: Workspace Study Path Overview

The workspace opens to a bounded study-path overview, not directly to the active
node session. This is inside one selected workspace, not the global app home.
The visual reference language is the study-path surface:

1. left rail with study path progress, nodes, and selected mini-node
2. center panel with current-study headline, next recommended node/session, and
   evidence from sources
3. optional right summary rail with focus/readiness context if it does not
   compete with navigation
4. no generic dashboard cards or oversized CTA block
5. one primary `Open node` or `Resume session` action opens the active node
   session

Recall and its checks are not app-level actions. They are internal pedagogy
follow-up states that appear in session guidance and readiness.

Success means the user understands the route before committing to an active
study session.

## Step 4: Active Learning Node

The selected node opens to the study surface. The session panel is primary even
on narrow responsive layouts. It should read as the third screen in the same
Workspace Overview / Study Path product language: left study-path rail, warm
ivory central reading/artifact panel, and right guide/readiness rail with thin
dividers and low-radius surfaces.

Visible elements:

1. current study node
2. current mini-node
3. current material mode and surface content
4. guide state
5. compact evidence/artifact ledger
6. recall/gap status

## Step 5: Active Learning Material Surface

The selected node opens to the active material panel in a bounded layout.
The surface shows the selected material by render mode (paper / note / artifact / code / equation)
with source context in the same railed layout.

## Step 6: Evidence / Readiness Review

Evidence and readiness summarize what the session proved. They should not claim
global mastery.

## Visual Verification

Every meaningful UI iteration should update or add screenshots under `assets/`
and record:

1. viewport size
2. state shown
3. key acceptance check
4. known rough edges
