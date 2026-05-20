# Workspace Tauri UI Iteration Flow

## Goal

Use this directory like a lightweight Figma board for the Tauri workspace:
screen-by-screen, state-by-state, with visual references and acceptance notes
before implementation changes.

## Screen Order

```text
1. Create Workspace
2. Review Workspace Plan
3. First Session
4. Read Action
5. Code Action
6. Recall Action
7. Evidence / Readiness Review
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
5. `Open first session`

Success means the user can reject or proceed from a compact summary.

## Step 3: First Session

The session opens directly to the study surface. The session panel is primary
even on narrow responsive layouts.

Visible elements:

1. current source
2. current study node
3. objective
4. session output contract
5. Read / Code / Recall
6. guide state
7. compact evidence/artifact ledger

## Step 4: Read Action

The `Read` action focuses the smallest source slice and asks for reconstruction
before hints.

## Step 5: Code Action

The `Code` action scopes the artifact to build. The UI should not imply a full
editor until a patch/readiness flow exists.

## Step 6: Recall Action

The `Recall` action tests memory without notes. It should route to attempt-first
behavior rather than showing an explanation first.

## Step 7: Evidence / Readiness Review

Evidence and readiness summarize what the session proved. They should not claim
global mastery.

## Visual Verification

Every meaningful UI iteration should update or add screenshots under `assets/`
and record:

1. viewport size
2. state shown
3. key acceptance check
4. known rough edges
