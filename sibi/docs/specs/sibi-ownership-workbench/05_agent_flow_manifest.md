# Spec: Agent-Flow Manifest and Playwright Alignment

## Purpose

This spec defines how an LLM/agent can operate inside the workbench without
unsafe assumptions. It converts observed runtime contracts and Playwright output
into an explicit action manifest that can be consumed by automation and manual
agents.

The product rule remains the same: agents only assist ownership verification.
They do not decide readiness, own claims, or bypass evidence gates.

## Goal

Create a deterministic manifest that lets an agent discover:

- what actions are allowed;
- what proof is required before each action;
- what state changes are legal;
- what to do when checks fail.

## Manifest Inputs

The manifest is derived from:

- current runtime contracts (`runtime`, `evidence`, `attempt/readiness`, `metrics`);
- current Playwright/agent-flow report;
- current UI state source graph.

## Data Shapes

### `ActionManifest`

```ts
type ActionManifest = {
  manifestId: string;
  version: string;
  generatedAt: string;
  scope: string; // workbench artifact/session id
  allowedActions: ActionDescriptor[];
  controlSurface: ControlSurfaceEntry[];
  restrictions: ManifestRestriction[];
};
```

### `ActionDescriptor`

```ts
type ActionDescriptor = {
  id: string;
  actor: "agent" | "human";
  preconditions: Array<{
    key: "state" | "scope" | "readiness" | "evidence_refs" | "open_questions";
    op: "eq" | "in" | "exists";
    value: string | string[] | boolean;
  }>;
  requiredEvidenceKinds: Array<"observed" | "inferred" | "unverified" | "conflict">;
  requiredArtifacts: string[];
  allowedInputs: string[];
  outputs: string[];
  playwrightLinkage: PlaywrightLinkage;
  safeFallback?: "none" | "ask" | "mark_unknown" | "request_human_review";
  postconditions: string[];
};
```

### `ControlSurfaceEntry`

```ts
type ControlSurfaceEntry = {
  controlId: string;
  path: string;
  mode: "user" | "agent" | "agent_readonly";
  allowedPayloads: string[];
  safetyMode: "strict" | "bounded" | "experimental";
};
```

### `ManifestRestriction`

```ts
type ManifestRestriction = {
  id: string;
  kind: "no_auto_readiness" | "no_private_action" | "no_explain_first";
  description: string;
};

```

### `PlaywrightLinkage`

```ts
type PlaywrightLinkage = {
  playwrightTraceId: string;
  actionScenarioId: string;
  assertions: {
    minimum: string[];
    required: string[];
  };
  recovery: {
    fallbackScenarioId: string;
    fallbackAction: string;
    recoveryAssertions: string[];
  };
};
```

## Playwright Linkage

The manifest must include references to one or more Playwright fixtures that are
authoritative for each action:

- `playwrightTraceId`
- `actionScenarioId`
- expected `assertions` (minimum and required)
- `recovery` flow when assertion fails

For every allowed action:

- at least one passing Playwright assertion must match the action contract;
- one failing assertion in the same scenario must map to the recovery action.

## Runtime Behavior

An agent should:

1. Load manifest.
2. Filter actions by actor and current state.
3. Select an action with all preconditions satisfied.
4. Execute only allowed payloads on declared control IDs.
5. Return evidence refs and state changes consistent with action postconditions.
6. On mismatch, stop and emit `agent_action_rejected`.

If an action attempts to:

- set readiness,
- alter ownership facts,
- call UI private control,
- use unlisted input types,

it must be blocked and logged as a manifest violation.

## Acceptance

For each manifest slice:

- every action the agent executes maps to one `ActionDescriptor`;
- no action can execute without all preconditions and required evidence coverage;
- failure to satisfy manifest constraints produces deterministic `agent_action_rejected`;
- action execution and rejection can be replayed from captured Playwright scenario IDs.
- `browser-skill` replay and Playwright coverage cover one happy path and one blocked-path path for each new action.

## Gates and Validation

- Cross-check `manifestId` against the latest contract snapshot before execution.
- Diff between manifest versions is required whenever runtime contracts change; stale
  manifest must be rejected.
- If Playwright evidence is unavailable, action execution is denied for that
  session.

## Open Question

- Should manifest versioning be globally shared across workbench sessions, or
  scoped per session to minimize stale-state risk?
