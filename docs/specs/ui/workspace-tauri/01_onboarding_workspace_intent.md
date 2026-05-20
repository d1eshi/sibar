# UI Spec 01: Onboarding Workspace Intent

## Goal

Help the user create one bounded study workspace from a plain-language intent.
The screen should answer: what will I study, what source constrains it, and what
will the first session produce?

## Required Flow

1. The user states what they want to study, understand, or build.
2. The user adds a source, repo, URL, note, or pasted material.
3. The user may add one constraint, such as time, depth, or expected output.
4. Sibar proposes a workspace title, first session, and three outputs.
5. The user opens the workspace overview.

## UI Contract

The first screen has two primary regions:

1. Intent input
2. Proposed workspace preview

The input region may expose optional background fields, but they must not create
the impression of a long intake form. The preview region should be visible from
the start so the user understands what will be produced.

## Non-Goals

1. No marketing hero.
2. No multi-step wizard that hides the next action.
3. No broad profile setup.
4. No feature tour.
5. No source management system in the first pass.

## Acceptance

1. The screen fits in a native desktop window without a floating web-card feel.
2. The primary button compiles or previews the workspace plan.
3. The preview shows first session and three outputs.
4. Optional fields are visually subordinate.
5. Opening the workspace moves to a bounded workspace overview with planned
   learning nodes and sessions, not to a generic dashboard.
