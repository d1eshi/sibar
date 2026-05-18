# Sibi Explain A-Z Flow Gap

Date: 2026-05-18
Status: temporary review report
Scope: `Explain this project A-Z` in the native Sibi panel

## Why This Report Exists

The current product direction is no longer “open a web workspace and read code”.
For dogfood, Sibi should run locally as a native study surface: it starts a
runtime session, chooses a bounded slice, shows the code/evidence it will judge,
captures the user's attempt, evaluates gaps, and reports scoped readiness.

This report summarizes what exists, what the user should expect, and what is
still missing before the flow satisfies the product moat.

## Product Bar From The Moat

`docs/product/01_moat.md` defines Sibi as the comprehension layer for
AI-generated software. The key distinction is incentive:

- Coding agents optimize for output.
- Sibi optimizes for ownership: attempt first, explain in your own words, detect
  misconceptions, repair concepts, verify retention, and decide readiness.

`docs/product/02_v01_scope.md` says the v0.1 golden path is:

1. User selects/imports one real artifact.
2. Sibi creates an artifact map.
3. Sibi creates a concept map.
4. Sibi runs a guided autopsy.
5. User answers ownership questions.
6. Sibi detects gaps and misconceptions.
7. Sibi assigns practice.
8. Sibi stores evidence and emits readiness.

The minimum useful demo is not “Sibi explains a file”. It is:

```text
artifact -> prediction -> wrong/incomplete answer -> detected misconception
-> hint -> retry -> updated understanding memory -> readiness report
```

## Expected User Flow

When the user starts with `Explain this project A-Z`, Sibi should not answer with
a long explanation. It should convert the broad request into the first bounded
ownership loop:

1. **Start**
   - User clicks `Start` or runs `sibi explain "Explain this project A-Z"`.
   - Sibi shows that it is reading a local repo boundary and source-control
     context.

2. **Narrow**
   - Sibi says: “A-Z is too broad for readiness. I will start with this first
     slice.”
   - It shows included/excluded sources, unknown zones, and why this slice was
     chosen.

3. **Show The Judgement Target**
   - Sibi opens a local Swift artifact panel, not a browser.
   - The panel shows:
     - the active operation
     - the code slice or artifact excerpt
     - required evidence
     - success criteria
     - what is intentionally not being answered yet

4. **Attempt First**
   - User writes an answer in Sibi.
   - User selects evidence.
   - User declares confidence and unknowns.
   - “I do not know” is a valid action.

5. **Evaluate**
   - Swift calls runtime `submit_workspace_attempt`.
   - Runtime performs deterministic evidence checks.
   - Sibi shows confirmed, partial, unsupported, contradicted, or gap state.

6. **Repair**
   - If the answer is shallow or wrong, Sibi gives a repair action, not a full
     answer dump.
   - It asks a nearby re-evaluation prompt.

7. **Readiness**
   - Sibi emits scoped readiness only.
   - Good: “You are ready to trace this runtime dispatch slice.”
   - Bad: “You understand the repo.”

## What Exists Now

Runtime:

- `start_workspace_session` creates an artifact session, inventories repo files,
  includes source-control context, calls the project learning agent, and builds
  a `DeepOwnershipLoop`.
- Codex CLI `auto` is the default runner path for `sibi explain`.
- Accepted LLM signals must be cited and in-bound.
- `submit_workspace_attempt` exists and evaluates an answer against runtime
  evidence.

Swift:

- `SibiStudyApp` opens a native `NSPanel`.
- The panel no longer opens `workspace.html`.
- The panel can call `startWorkspaceSession`.
- `LiveWorkspaceSessionView` can render:
  - session id
  - runner status
  - active operation
  - success criteria
  - first artifact code lines
  - evidence list

Web cleanup:

- Static workspace fixtures and old desktop-shell browser path were removed.
- The browser is no longer the intended product path for reading code.

## Current Gap

The missing connection is the **attempt bridge** for the live workspace loop.

Swift can start `start_workspace_session`, but it does not yet let the user
complete the active operation in the native panel. The live view does not expose:

- answer text area for `active_operation`
- evidence selection
- confidence selector
- declared unknowns
- `I do not know`
- submit action wired to `submit_workspace_attempt`
- post-attempt rendering of evidence check, gap, repair, and readiness

The old `StudyPanelView` still belongs to the older study snapshot/autopsy path:
it submits through `answer_question`, not through `submit_workspace_attempt`.
That means there are currently two partially overlapping loops.

## Product Risk

If this remains unresolved, the user sees something like:

```text
Artifact session ...
No concept graph yet.
No active autopsy step.
No evidence indexed yet.
```

That does not match the moat. It makes Sibi feel like a status dashboard instead
of an ownership verifier.

The first screen after `Start` should instead answer:

```text
What am I being asked to do?
Which code/artifact am I looking at?
Which evidence must I use?
What answer does Sibi expect from me before it explains?
What will happen after I submit?
```

## Recommended Next Implementation Cut

Implement one native live-loop slice:

1. Add `RuntimeClient.submitWorkspaceAttempt`.
2. Add Swift models for `submit_workspace_attempt` response.
3. Add an attempt composer inside `LiveWorkspaceSessionView`.
4. Let the user select required evidence from the rendered evidence list.
5. Capture confidence and declared unknowns.
6. Submit to runtime and replace `liveWorkspaceSession` with the returned state.
7. Render post-attempt:
   - evidence check result
   - missing/unsupported claims
   - detected gap
   - repair action
   - scoped readiness

This should be one feature commit, with Swift bridge tests and model tests.

## Decisions To Resolve

1. **Primary v0.1 loop**
   - Is the new `DeepOwnershipLoop` the product path, with old autopsy snapshot
     treated as legacy/supporting state?
   - Recommendation: yes. Use `DeepOwnershipLoop` for `Explain this project A-Z`.

2. **A-Z semantics**
   - Does “Explain this project A-Z” mean whole-repo explanation?
   - Recommendation: no. It means “build a progressive route to A-Z ownership,
     starting with the first bounded slice.”

3. **Swift panel scope**
   - Is Swift only Lens, or also the first workspace?
   - Current user direction: Swift should render the artifact/code/judgement
     locally. That makes Swift the first local workspace, at least for v0.1.

4. **Readiness scope**
   - What can readiness claim after the first attempt?
   - Recommendation: only operation/slice readiness, never repo mastery.

5. **Explanation timing**
   - When can Sibi explain?
   - Recommendation: after an attempt, as contrast against cited evidence and
     only within the current slice.

## Concrete Acceptance For The Next Build

The next build is acceptable if a user can:

1. launch `swift run SibiStudyApp`
2. click `Start`
3. see a local code/artifact panel for the first selected slice
4. read the active operation and success criteria
5. submit an answer with selected evidence, confidence, and unknowns
6. see a deterministic gap/readiness result in the same Swift panel
7. understand the next repair step without opening a browser

## Open Question For Review

Should the old `StudyPanelSnapshot` UI stay visible below the live workspace, or
should the native app switch entirely to the live loop once `Start` is clicked?

Recommendation: switch entirely to the live loop after `Start`, then reintroduce
memory/readiness panels only after they are backed by the live workspace result.
