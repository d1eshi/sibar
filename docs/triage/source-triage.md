# Source Triage

This file separates useful foundation signal from noise in the previous docs.

## Keep As Foundation

### `agent-chat-1.md`

Keep the moat:

1. not repo chat
2. comprehension graph over repo graph
3. first 10 hours in a codebase
4. understanding memory
5. measurable readiness
6. team knowledge network later

### `agent-chat-2.md`

Keep the wedge:

1. Build-to-Learn session
2. generated artifact autopsy
3. reverse engineering before explanation
4. gap detection from user answers
5. shared understanding memory across Cyber, Sibi, and Complete
6. delayed recall and transfer tasks

### Existing product docs

Keep these ideas, but reframe them under Build-to-Learn:

1. explicit user-declared uncertainty
2. learning signals are candidates, not truth
3. ownership questions need evidence
4. ingestion/export must be reviewable
5. process metadata cannot prove mastery
6. local-first memory is useful

### Research docs

Keep:

1. L1-L5 pedagogical layers
2. signal-based gap detection
3. question adaptation rules
4. concept memory and signal history
5. strict evidence requirements
6. no hidden or punitive mastery claims

### Iteration 27

Keep the core pattern:

```text
bounded source fragment -> one ownership question -> answer -> evidence
```

This becomes a foundation behavior, not only a code-range UI feature.

### Iteration 30

Keep the reading-fragment extension. It supports learning from papers, docs, articles, and chats, but should come after the artifact autopsy loop.

## Keep As Implementation Background

### Iteration 17

The SPM core/shell boundary is useful if we continue the Swift app, but it is not the product foundation.

### Pedagogy mission pack

Useful as evidence that some local pedagogy runtime work exists. Too heavy as the new planning format. Extract validation ideas, not the full mission machinery.

### Architecture and E2E research

Useful for later engineering discipline:

1. split god files
2. keep deterministic tests
3. preserve package boundaries
4. validate storage and pure logic first

## Park For Later

These may become useful after v0.1 proves the Build-to-Learn loop:

1. macOS ambient observer
2. process detection
3. periodic observer notifications
4. overlay note widget
5. editor spotlight OCR
6. Vim/Neovim bridge
7. voice capture and transcription
8. Cyvi context capsules
9. SIBAR workspace sync
10. team dashboards

## Do Not Use As v0.1 North Star

### Pre-commit ownership check

It is a useful market insight, but not the current wedge. It validates after the fact and does not match the Build-to-Learn flow.

### Generic repo chat

This is too easy for coding assistants to absorb.

### Generic code explanation

Useful as a fallback, not defensible as product.

### Ambient memory recorder

Memory without verification becomes recall, not ownership.

### Desktop shell first

The shell can improve UX later, but the moat is the evidence loop and understanding memory.

## Clean Decision

The launch track needs 8 foundation specs.

Everything else should be judged by one question:

> Does this help a user turn a real artifact into verified understanding?

If yes, attach it to a foundation spec.
If not, park it.

