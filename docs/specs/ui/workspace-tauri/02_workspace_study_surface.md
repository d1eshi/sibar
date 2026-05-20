# UI Spec 02: Workspace Study Surface

## Goal

Render the first workspace session as a focused study surface. The user should
know what they are studying now, why it matters, what evidence is attached, and
which single next action is recommended.

## Required Flow

1. The left rail shows the study path and current node.
2. The center surface shows the active source/session prompt.
3. The user chooses among Read, Build, and Recall.
4. The guide panel shows scoped guidance and readiness, not an open-ended chat
   as the dominant object.
5. Evidence and artifacts stay visible as a compact ledger.

## UI Contract

The first viewport should prioritize:

1. Current study question or node
2. Three next actions
3. Evidence from sources
4. Readiness/gap status
5. Attempt composer

Compiler payloads and raw contract debug controls may stay in a collapsible
drawer until the product requires a dedicated internal/debug mode.

## Non-Goals

1. No full editor clone.
2. No generic analytics dashboard.
3. No endless chat-first interface.
4. No more than one active session at a time.
5. No dense memory/readiness management screen in the first viewport.

## Acceptance

1. The UI reads as a native Tauri workspace, not a web layout boxed inside the
   shell.
2. The guide has bounded modes.
3. Read, Build, and Recall remain the only primary actions.
4. Evidence is scannable without competing with the current prompt.
5. The same deterministic fixture can run offline.
