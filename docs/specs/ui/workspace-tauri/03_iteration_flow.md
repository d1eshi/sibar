# Workspace Tauri UI Iteration Flow

## Goal

Use this directory like a lightweight Figma board for the Tauri workspace:
screen-by-screen, state-by-state, with visual references and acceptance notes
before implementation changes.

## Screen Order

```text
1. Create Workspace
2. Review Workspace Plan
3. Workspace Overview
4. First Session
5. Read Action
6. Build Action
7. Recall Action
8. Evidence / Readiness Review
```

## Step 1: Create Workspace

The user sees one native-feeling window with:

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

## Step 3: Workspace Overview

The workspace opens to a bounded overview, not directly to a node. This screen
shows:

1. workspace title and scope
2. planned learning nodes
3. available first-session entry points
4. source/evidence readiness summary
5. a clear action to enter the selected learning node

Success means the user understands the route before committing to an active
study session.

## Step 4: First Session

The selected node opens to the study surface. The session panel is primary even
on narrow responsive layouts.

Visible elements:

1. current source
2. current study node
3. objective
4. session output contract
5. Read / Build / Recall
6. guide state
7. compact evidence/artifact ledger

## Step 5: Read Action

The `Read` action focuses the smallest source slice and asks for reconstruction
before hints.

## Step 6: Build Action

The `Build` action scopes the artifact to produce. The UI should not imply a full
editor until a patch/readiness flow exists.

## Step 7: Recall Action

The `Recall` action tests memory without notes. It should route to attempt-first
behavior rather than showing an explanation first.

## Step 8: Evidence / Readiness Review

Evidence and readiness summarize what the session proved. They should not claim
global mastery.

## Visual Verification

Every meaningful UI iteration should update or add screenshots under `assets/`
and record:

1. viewport size
2. state shown
3. key acceptance check
4. known rough edges
