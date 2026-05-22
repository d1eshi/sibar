import type {
  BoundaryState,
  EvidenceConfidence,
  EvidenceRef,
  OwnershipBoundary,
  OwnershipSessionState,
  ReadinessGate,
} from "./types";

export const AGENT_FLOW_MANIFEST_VERSION = "10.0.0";

export const AGENT_FLOW_VALID_ACTIONS = [
  "submit_guided_attempt",
  "mark_unknown",
] as const;

export const AGENT_FLOW_READONLY_ACTION = "read_manifest";

export type AllowedActor = "agent" | "human";

export type ManifestRestrictionKind = "no_auto_readiness" | "no_private_action" | "no_explain_first";

export type ManifestPreconditionKey = "state" | "scope" | "readiness" | "evidence_refs" | "open_questions";

export type ManifestConditionOperator = "eq" | "in" | "exists";

export type ActionManifestPrecondition = {
  key: ManifestPreconditionKey;
  op: ManifestConditionOperator;
  value: string | string[] | boolean;
};

export type PlaywrightLinkage = {
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

export type ActionDescriptor = {
  id: string;
  actor: AllowedActor;
  controlId: string;
  preconditions: ActionManifestPrecondition[];
  requiredEvidenceKinds: EvidenceConfidence[];
  requiredArtifacts: string[];
  allowedInputs: string[];
  outputs: string[];
  postconditions: string[];
  playwrightLinkage: PlaywrightLinkage;
  safeFallback: "none" | "ask" | "mark_unknown" | "request_human_review";
};

export type ControlSurfaceEntry = {
  controlId: string;
  path: string;
  mode: "user" | "agent" | "agent_readonly";
  allowedPayloads: string[];
  safetyMode: "strict" | "bounded" | "experimental";
};

export type ManifestRestriction = {
  id: string;
  kind: ManifestRestrictionKind;
  description: string;
};

export type AgentFlowManifest = {
  manifestId: string;
  version: string;
  generatedAt: string;
  scope: string;
  allowedActions: ActionDescriptor[];
  controlSurface: ControlSurfaceEntry[];
  restrictions: ManifestRestriction[];
};

export type AgentActionRuntime = {
  scope: string;
  boundaryState: BoundaryState;
  readiness: ReadinessGate | "not_attempted";
  evidenceRefs: EvidenceRef[];
  openQuestions: number;
  availableArtifacts: string[];
};

export type AgentActionRequest = {
  actionId: string;
  actor: AllowedActor;
  controlId: string;
  payload: string;
};

export type ValidateAgentActionInput = {
  manifest: AgentFlowManifest;
  runtime: AgentActionRuntime;
  request: AgentActionRequest;
  expectedScope?: string;
  now?: () => number;
};

export type AgentActionAllowed = {
  kind: "agent_action_allowed";
  decisionId: string;
  manifestId: string;
  actionId: string;
  controlId: string;
  actor: AllowedActor;
  payload: string;
  scenario: {
    playwrightTraceId: string;
    actionScenarioId: string;
    assertions: {
      minimum: string[];
      required: string[];
    };
    outputs: string[];
  };
  fallback: {
    strategy: "none" | "ask" | "mark_unknown" | "request_human_review";
    rationale: string;
  };
};

export type AgentActionRejectionCode =
  | "manifest_stale"
  | "action_not_listed"
  | "actor_not_authorized"
  | "control_not_listed"
  | "control_mode_restricted"
  | "payload_not_listed"
  | "private_action_blocked"
  | "precondition_missing"
  | "missing_evidence"
  | "missing_artifacts";

export type AgentActionRejection = {
  kind: "agent_action_rejected";
  decisionId: string;
  manifestId: string;
  actionId: string;
  controlId: string;
  actor: AllowedActor;
  payload: string;
  reasonCode: AgentActionRejectionCode;
  reason: string;
  scope: string;
  expectedActionHint?: string;
  recoveryAction?: {
    actionId: string;
    rationale: string;
    fallbackScenarioId: string;
  };
};

export type AgentActionValidationResult = AgentActionAllowed | AgentActionRejection;

export type AgentFlowBuildInput = {
  boundary: OwnershipBoundary;
  boundaryState: BoundaryState;
  readiness: ReadinessGate | "not_attempted";
  selectedFile: string;
  sessionState: OwnershipSessionState;
  evidenceRefs: EvidenceRef[];
  availableArtifacts?: string[];
  now?: () => number;
};

export type AgentFlowRuntimeInput = {
  boundary: OwnershipBoundary;
  boundaryState: BoundaryState;
  readiness: ReadinessGate | "not_attempted";
  selectedFile: string;
  evidenceRefs: EvidenceRef[];
  sessionState: OwnershipSessionState;
};

const FALLBACK_ALLOWED_ARTIFACTS = ["guided_attempt_text", "mark_unknown_text", "readiness_attempt_text"];
const AGENT_FLOW_MANIFEST_EPOCH_MS = 1_700_000_000_000;
const AGENT_FLOW_DECISION_TTL_MS = 31_536_000_000;

function deterministicClock(seed: string, fallbackNow: () => number): number {
  const seededHash = parseInt(hash32(seed), 16);
  return AGENT_FLOW_MANIFEST_EPOCH_MS + (seededHash % AGENT_FLOW_DECISION_TTL_MS) + fallbackNow();
}

export function calculateOpenQuestions(boundary: OwnershipBoundary, sessionState: OwnershipSessionState): number {
  if (sessionState.isComplete) {
    return 0;
  }

  const rawRemaining = boundary.open_questions.length - sessionState.currentIndex;
  return Math.max(0, rawRemaining);
}

function stableSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function hash32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

function makeId(prefix: string, seed: string): string {
  return `${prefix}-${hash32(seed)}`;
}

function normalizePayload(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isPrivateActionId(value: string): boolean {
  return /(^|_)(set_|write_|delete_|readiness|ownership|fact)/i.test(value);
}

function evidenceKindsFromRefs(evidenceRefs: EvidenceRef[]): EvidenceConfidence[] {
  const ordered: EvidenceConfidence[] = ["observed", "inferred", "unverified", "conflict"];
  const byKind = new Set<EvidenceConfidence>(evidenceRefs.map((entry) => entry.confidence));
  return ordered.filter((kind) => byKind.has(kind));
}

function pickRequiredEvidenceKinds(evidenceRefs: EvidenceRef[]): EvidenceConfidence[] {
  return evidenceKindsFromRefs(evidenceRefs).slice(0, 1);
}

export function buildAgentFlowScope(input: {
  boundary: OwnershipBoundary;
  boundaryState: BoundaryState;
  readiness: ReadinessGate | "not_attempted";
  selectedFile: string;
  evidenceRefs: EvidenceRef[];
  sessionState: OwnershipSessionState;
}): string {
  const openQuestions = calculateOpenQuestions(input.boundary, input.sessionState);
  const evidenceIds = stableSorted(input.evidenceRefs.map((entry) => entry.id));
  const selectedBoundaryId = input.boundary.id;
  return [
    `boundary=${selectedBoundaryId}`,
    `file=${input.selectedFile}`,
    `state=${input.boundaryState}`,
    `readiness=${input.readiness}`,
    `openQuestions=${openQuestions}`,
    `evidence=${evidenceIds.join("|")}`,
  ].join(";");
}

export function buildAgentFlowRuntime(input: AgentFlowRuntimeInput): AgentActionRuntime {
  const openQuestions = calculateOpenQuestions(input.boundary, input.sessionState);
  return {
    scope: buildAgentFlowScope({
      boundary: input.boundary,
      boundaryState: input.boundaryState,
      readiness: input.readiness,
      selectedFile: input.selectedFile,
      evidenceRefs: input.evidenceRefs,
      sessionState: input.sessionState,
    }),
    boundaryState: input.boundaryState,
    readiness: input.readiness,
    evidenceRefs: input.evidenceRefs,
    openQuestions,
    availableArtifacts: FALLBACK_ALLOWED_ARTIFACTS,
  };
}

function buildAllowedActions(input: {
  scope: string;
  requiredEvidenceKinds: EvidenceConfidence[];
}): ActionDescriptor[] {
  return [
    {
      id: AGENT_FLOW_VALID_ACTIONS[0],
      actor: "agent",
      controlId: "agent-flow-control-submit-guided-attempt",
      preconditions: [
        {
          key: "scope",
          op: "eq",
          value: input.scope,
        },
        {
          key: "state",
          op: "in",
          value: ["gap", "partial", "questionable", "blocked", "attempted", "unvisited"],
        },
        {
          key: "readiness",
          op: "in",
          value: ["not_attempted", "repair-needed", "blocked", "ready"],
        },
        {
          key: "evidence_refs",
          op: "exists",
          value: true,
        },
      ],
      requiredEvidenceKinds: input.requiredEvidenceKinds,
      requiredArtifacts: ["guided_attempt_text"],
      allowedInputs: ["guided-attempt-attempt-text"],
      outputs: ["session_step_advancement", "guided_attempt_observation"],
      postconditions: ["question_hierarchy_updated", "non_ready_or_ready_progress"],
      safeFallback: "ask",
      playwrightLinkage: {
        playwrightTraceId: "sibi-ownership-workbench.slice10",
        actionScenarioId: "agent-action.submit-guided-attempt",
        assertions: {
          minimum: ["Guided question rendered", "Submit attempt control available"],
          required: ["step advances or a guided observation is recorded"],
        },
        recovery: {
          fallbackScenarioId: "agent-action.submit-guided-attempt.recovery",
          fallbackAction: "mark_unknown",
          recoveryAssertions: [
            "Use mark_unknown control as fallback",
            "Keep manifest-defined action scope",
          ],
        },
      },
    },
    {
      id: AGENT_FLOW_VALID_ACTIONS[1],
      actor: "human",
      controlId: "agent-flow-control-mark-unknown",
      preconditions: [
        {
          key: "scope",
          op: "eq",
          value: input.scope,
        },
        {
          key: "state",
          op: "in",
          value: ["gap", "partial", "questionable", "attempted", "blocked", "unvisited"],
        },
        {
          key: "evidence_refs",
          op: "exists",
          value: true,
        },
      ],
      requiredEvidenceKinds: input.requiredEvidenceKinds,
      requiredArtifacts: ["mark_unknown_text"],
      allowedInputs: ["mark-unknown-action"],
      outputs: ["question_marked_unknown", "session_gap_diagnostics_recorded"],
      postconditions: ["session_step_advancement", "gap_recorded"],
      safeFallback: "mark_unknown",
      playwrightLinkage: {
        playwrightTraceId: "sibi-ownership-workbench.slice10",
        actionScenarioId: "agent-action.mark-unknown",
        assertions: {
          minimum: ["Question currently visible", "Mark-unknown control available"],
          required: ["Step advances and observation is recorded"],
        },
        recovery: {
          fallbackScenarioId: "agent-action.mark-unknown.recovery",
          fallbackAction: "mark_unknown",
          recoveryAssertions: ["Repeat as manifest-listed human control", "No private control usage"],
        },
      },
    },
    {
      id: AGENT_FLOW_READONLY_ACTION,
      actor: "agent",
      controlId: "agent-flow-control-read-manifest",
      preconditions: [
        {
          key: "scope",
          op: "eq",
          value: input.scope,
        },
        {
          key: "state",
          op: "in",
          value: ["gap", "partial", "questionable", "attempted", "owned", "blocked", "unvisited"],
        },
        {
          key: "readiness",
          op: "in",
          value: ["not_attempted", "repair-needed", "blocked", "ready"],
        },
      ],
      requiredEvidenceKinds: [],
      requiredArtifacts: [],
      allowedInputs: ["inspect-manifest"],
      outputs: ["manifest_projection", "readonly_introspection"],
      postconditions: ["manifest_projection_logged", "no_state_mutation"],
      safeFallback: "none",
      playwrightLinkage: {
        playwrightTraceId: "sibi-ownership-workbench.slice10",
        actionScenarioId: "agent-action.read-manifest",
        assertions: {
          minimum: ["Manifest data available", "Current session scope is visible"],
          required: ["Manifest shape is parseable and deterministic"],
        },
        recovery: {
          fallbackScenarioId: "agent-action.read-manifest.recovery",
          fallbackAction: "read_manifest",
          recoveryAssertions: ["Keep diagnostic read-only", "Do not attempt state mutation"],
        },
      },
    },
  ];
}

function buildControlSurface(): ControlSurfaceEntry[] {
  return [
    {
      controlId: "agent-flow-control-submit-guided-attempt",
      path: "ownership-harness.submit-guided-attempt",
      mode: "agent",
      allowedPayloads: ["guided-attempt-attempt-text"],
      safetyMode: "strict",
    },
    {
      controlId: "agent-flow-control-mark-unknown",
      path: "ownership-harness.mark-unknown",
      mode: "user",
      allowedPayloads: ["mark-unknown-action"],
      safetyMode: "bounded",
    },
    {
      controlId: "agent-flow-control-read-manifest",
      path: "ownership-harness.read-manifest",
      mode: "agent_readonly",
      allowedPayloads: ["inspect-manifest"],
      safetyMode: "bounded",
    },
  ];
}

function buildRestrictions(): ManifestRestriction[] {
  return [
    {
      id: "restriction-no-auto-readiness",
      kind: "no_auto_readiness",
      description: "No action may set readiness directly; readiness depends on a validated final attempt.",
    },
    {
      id: "restriction-no-private-action",
      kind: "no_private_action",
      description:
        "Actions that mutate control, ownership facts, or readiness are denied unless explicitly listed in manifest.",
    },
    {
      id: "restriction-no-explain-first",
      kind: "no_explain_first",
      description: "No explanatory output can be emitted before manifest-constrained action execution.",
    },
  ];
}

export function buildAgentFlowManifest(input: AgentFlowBuildInput): AgentFlowManifest {
  const scope = buildAgentFlowScope({
    boundary: input.boundary,
    boundaryState: input.boundaryState,
    readiness: input.readiness,
    selectedFile: input.selectedFile,
    evidenceRefs: input.evidenceRefs,
    sessionState: input.sessionState,
    });
  const generatedAtSeed = `${AGENT_FLOW_MANIFEST_VERSION}|${scope}|${input.boundary.id}|${input.boundaryState}|${input.readiness}`;
  const generatedAt = new Date(
    deterministicClock(
      generatedAtSeed,
      () => input.now == null ? 0 : input.now(),
    ),
  ).toISOString();
  const requiredEvidenceKinds = pickRequiredEvidenceKinds(input.evidenceRefs);
  const manifestSeed = `${AGENT_FLOW_MANIFEST_VERSION}|${scope}|${input.boundary.id}|${input.boundaryState}|${input.readiness}`;

  return {
    manifestId: makeId("agent-flow-manifest", manifestSeed),
    version: AGENT_FLOW_MANIFEST_VERSION,
    generatedAt,
    scope,
    allowedActions: buildAllowedActions({
      scope,
      requiredEvidenceKinds,
    }),
    controlSurface: buildControlSurface(),
    restrictions: buildRestrictions(),
  };
}

function findAction(manifest: AgentFlowManifest, actionId: string): ActionDescriptor | undefined {
  return manifest.allowedActions.find((entry) => entry.id === actionId);
}

function findControl(manifest: AgentFlowManifest, controlId: string): ControlSurfaceEntry | undefined {
  return manifest.controlSurface.find((entry) => entry.controlId === controlId);
}

function evalPrecondition(context: AgentActionRuntime, condition: ActionManifestPrecondition): boolean {
  if (condition.key === "scope") {
    const values = typeof condition.value === "string" ? [condition.value] : condition.value;
    if (condition.op === "exists") return context.scope.length > 0;
    if (condition.op === "eq") return context.scope === String(condition.value);
    return Array.isArray(values) && values.includes(context.scope);
  }

  if (condition.key === "state") {
    const values = typeof condition.value === "string" ? [condition.value] : condition.value;
    if (condition.op === "exists") return context.boundaryState.length > 0;
    if (condition.op === "eq") return context.boundaryState === String(condition.value);
    return Array.isArray(values) && values.includes(context.boundaryState);
  }

  if (condition.key === "readiness") {
    const values = typeof condition.value === "string" ? [condition.value] : condition.value;
    if (condition.op === "exists") return context.readiness.length > 0;
    if (condition.op === "eq") return context.readiness === String(condition.value);
    return Array.isArray(values) && values.includes(context.readiness);
  }

  if (condition.key === "evidence_refs") {
    if (condition.op === "exists") {
      return context.evidenceRefs.length > 0 === (condition.value as boolean);
    }
    const values = typeof condition.value === "string" ? [condition.value] : condition.value;
    if (condition.op === "eq" && typeof condition.value === "string") {
      return context.evidenceRefs.some((entry) => entry.id === condition.value);
    }
    if (condition.op === "in") return context.evidenceRefs.some((entry) => values.includes(entry.id));
    return false;
  }

  if (condition.key === "open_questions") {
    const isOpen = context.openQuestions > 0;
    if (condition.op === "exists") return isOpen === (condition.value as boolean);
    if (condition.op === "eq") return context.openQuestions === Number(condition.value);
    if (condition.op === "in" && Array.isArray(condition.value)) {
      return condition.value.some((entry) => context.openQuestions === Number(entry));
    }
  }

  return false;
}

function checkPreconditions(runtime: AgentActionRuntime, preconditions: ActionManifestPrecondition[]): string[] {
  return preconditions.flatMap((precondition) => {
    if (evalPrecondition(runtime, precondition)) {
      return [];
    }

    const value =
      precondition.key === "open_questions" || precondition.key === "evidence_refs"
        ? JSON.stringify(precondition.value)
        : precondition.value;

    return [`${precondition.key} failed for op=${precondition.op} expected=${String(value)}`];
  });
}

function checkEvidence(runtime: AgentActionRuntime, action: ActionDescriptor): string[] {
  return action.requiredEvidenceKinds
    .filter((kind) => !runtime.evidenceRefs.some((entry) => entry.confidence === kind))
    .map((kind) => `missing required evidence kind: ${kind}`);
}

function checkArtifacts(runtime: AgentActionRuntime, action: ActionDescriptor): string[] {
  return action.requiredArtifacts.filter((artifact) => !runtime.availableArtifacts.includes(artifact)).map(
    (artifact) => `missing required artifact: ${artifact}`,
  );
}

function makeDecisionId(
  manifestId: string,
  actionId: string,
  controlId: string,
  actor: string,
  payload: string,
  runtimeScope: string,
  openQuestions: number,
  decisionCode: string,
  nowSeed: string,
): string {
  return makeId(
    "agent-decision",
    `${manifestId}|${actionId}|${controlId}|${actor}|${payload}|${runtimeScope}|${openQuestions}|${decisionCode}|${nowSeed}`,
  );
}

function resolveRecoveryActionId(
  manifest: AgentFlowManifest,
  runtime: AgentActionRuntime,
  actor: AllowedActor,
  fallbackAction: string | undefined,
): string | undefined {
  if (fallbackAction == null || fallbackAction === "none") {
    return undefined;
  }

  const candidates = [
    mapRecoveryActionAlias(fallbackAction),
    AGENT_FLOW_READONLY_ACTION,
    AGENT_FLOW_VALID_ACTIONS[1],
    AGENT_FLOW_VALID_ACTIONS[0],
  ];

  for (const candidate of candidates) {
    if (candidate == null || candidate === "none") {
      continue;
    }

    const candidateAction = manifest.allowedActions.find((entry) => entry.id === candidate);
    if (candidateAction == null) {
      continue;
    }

    if (isRecoveryActionExecutable(manifest, runtime, actor, candidateAction)) {
      return candidateAction.id;
    }
  }

  return manifest.allowedActions.find(
    (action) => isRecoveryActionExecutable(manifest, runtime, actor, action),
  )?.id;
}

function mapRecoveryActionAlias(fallbackAction: string): string {
  if (fallbackAction === "ask" || fallbackAction === "request_human_review") {
    return AGENT_FLOW_READONLY_ACTION;
  }

  return fallbackAction;
}

function isRecoveryActionExecutable(
  manifest: AgentFlowManifest,
  runtime: AgentActionRuntime,
  actor: AllowedActor,
  action: ActionDescriptor,
): boolean {
  if (action.actor !== actor) {
    return false;
  }

  const control = manifest.controlSurface.find((entry) => entry.controlId === action.controlId);
  if (control == null) {
    return false;
  }

  if (actor === "agent" && control.mode !== "agent" && control.mode !== "agent_readonly") {
    return false;
  }

  if (actor === "human" && control.mode !== "user") {
    return false;
  }

  if (action.allowedInputs.length === 0) {
    return false;
  }

  const preconditionFailures = checkPreconditions(runtime, action.preconditions);
  if (preconditionFailures.length > 0) {
    return false;
  }

  if (checkEvidence(runtime, action).length > 0) {
    return false;
  }

  if (checkArtifacts(runtime, action).length > 0) {
    return false;
  }

  return true;
}

function buildRejected(
  input: ValidateAgentActionInput,
  now: () => number,
  details: {
    reasonCode: AgentActionRejectionCode;
    actionId: string;
    controlId: string;
    actor: AllowedActor;
    payload: string;
    reason: string;
    expectedActionHint?: string;
    fallbackAction?: string;
    fallbackScenarioId?: string;
  },
): AgentActionRejection {
  const decisionId = makeDecisionId(
    input.manifest.manifestId,
    details.actionId,
    details.controlId,
    details.actor,
    details.payload,
    input.runtime.scope,
    input.runtime.openQuestions,
    details.reasonCode,
    String(now()),
  );
  const fallbackAction = resolveRecoveryActionId(input.manifest, input.runtime, details.actor, details.fallbackAction);

  return {
    kind: "agent_action_rejected",
    decisionId,
    manifestId: input.manifest.manifestId,
    actionId: details.actionId,
    controlId: details.controlId,
    actor: details.actor,
    payload: details.payload,
    reasonCode: details.reasonCode,
    reason: details.reason,
    scope: input.runtime.scope,
    expectedActionHint: details.expectedActionHint,
    recoveryAction:
      fallbackAction == null
        ? undefined
        : {
            actionId: fallbackAction,
            rationale: "Use a listed fallback action from control-surface manifest.",
            fallbackScenarioId: details.fallbackScenarioId ?? `${input.manifest.scope}.recovery`,
          },
  };
}

export function validateAgentAction(input: ValidateAgentActionInput): AgentActionValidationResult {
  const runtime = input.runtime;
  const request = {
    actionId: input.request.actionId,
    controlId: input.request.controlId,
    actor: input.request.actor,
    payload: normalizePayload(input.request.payload),
  };
  const decisionSeed = `${input.manifest.manifestId}|${request.actionId}|${request.controlId}|${request.actor}|${request.payload}|${runtime.scope}|${runtime.openQuestions}`;
  const now = input.now ?? (() => deterministicClock(decisionSeed, () => 0));

  if (input.manifest.scope !== runtime.scope || (input.expectedScope != null && input.expectedScope !== runtime.scope)) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "manifest_stale",
      reason: `Manifest scope mismatch: expected ${input.expectedScope ?? input.manifest.scope}, runtime scope is ${runtime.scope}`,
      expectedActionHint: AGENT_FLOW_VALID_ACTIONS[0],
      fallbackAction: "mark_unknown",
      fallbackScenarioId: "agent-action.mark-unknown.recovery",
    });
  }

  if (input.manifest.version !== AGENT_FLOW_MANIFEST_VERSION) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "manifest_stale",
      reason: `Manifest version mismatch: ${input.manifest.version} is not ${AGENT_FLOW_MANIFEST_VERSION}`,
      expectedActionHint: AGENT_FLOW_VALID_ACTIONS[0],
      fallbackAction: "mark_unknown",
      fallbackScenarioId: "agent-action.mark-unknown.recovery",
    });
  }

  if (isPrivateActionId(request.actionId) && request.actor === "agent") {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "private_action_blocked",
      reason: `Private action ${request.actionId} is blocked by no_private_action restriction.`,
      expectedActionHint: AGENT_FLOW_VALID_ACTIONS[0],
      fallbackAction: "submit_guided_attempt",
      fallbackScenarioId: "agent-action.submit-guided-attempt.recovery",
    });
  }

  const action = findAction(input.manifest, request.actionId);
  if (action == null) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "action_not_listed",
      reason: `Action ${request.actionId} is not listed in allowed manifest actions.`,
      expectedActionHint: input.manifest.allowedActions[0]?.id ?? AGENT_FLOW_VALID_ACTIONS[0],
      fallbackAction: "mark_unknown",
      fallbackScenarioId: "agent-action.mark-unknown.recovery",
    });
  }

  const control = findControl(input.manifest, request.controlId);
  if (control == null) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "control_not_listed",
      reason: `Control ${request.controlId} is not listed in the manifest control surface.`,
      expectedActionHint: action.id,
      fallbackAction: action.safeFallback === "none" ? "mark_unknown" : action.safeFallback,
      fallbackScenarioId: action.playwrightLinkage.recovery.fallbackScenarioId,
    });
  }

  if (request.actor === "agent" && control.mode !== "agent" && control.mode !== "agent_readonly") {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "control_mode_restricted",
      reason: `Agent actions cannot use control mode ${control.mode}.`,
      expectedActionHint: action.id,
      fallbackAction: action.safeFallback,
      fallbackScenarioId: action.playwrightLinkage.recovery.fallbackScenarioId,
    });
  }

  if (action.actor !== request.actor) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "actor_not_authorized",
      reason: `Actor ${request.actor} is not authorized for action ${request.actionId}.`,
      expectedActionHint: action.id,
      fallbackAction: action.safeFallback,
      fallbackScenarioId: action.playwrightLinkage.recovery.fallbackScenarioId,
    });
  }

  if (!control.allowedPayloads.includes(request.payload)) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "payload_not_listed",
      reason: `Payload ${request.payload} is not listed for control ${request.controlId}.`,
      expectedActionHint: action.id,
      fallbackAction: action.safeFallback,
      fallbackScenarioId: action.playwrightLinkage.recovery.fallbackScenarioId,
    });
  }

  const preconditionFailures = checkPreconditions(runtime, action.preconditions);
  if (preconditionFailures.length > 0) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "precondition_missing",
      reason: `Preconditions failed: ${preconditionFailures.join(" | ")}`,
      expectedActionHint: action.id,
      fallbackAction: action.safeFallback,
      fallbackScenarioId: action.playwrightLinkage.recovery.fallbackScenarioId,
    });
  }

  const evidenceFailures = checkEvidence(runtime, action);
  if (evidenceFailures.length > 0) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "missing_evidence",
      reason: `Evidence failures: ${evidenceFailures.join(", ")}`,
      expectedActionHint: action.id,
      fallbackAction: action.safeFallback,
      fallbackScenarioId: action.playwrightLinkage.recovery.fallbackScenarioId,
    });
  }

  const artifactFailures = checkArtifacts(runtime, action);
  if (artifactFailures.length > 0) {
    return buildRejected(input, now, {
      actionId: request.actionId,
      controlId: request.controlId,
      actor: request.actor,
      payload: request.payload,
      reasonCode: "missing_artifacts",
      reason: `Artifact failures: ${artifactFailures.join(", ")}`,
      expectedActionHint: action.id,
      fallbackAction: action.safeFallback,
      fallbackScenarioId: action.playwrightLinkage.recovery.fallbackScenarioId,
    });
  }

  return {
    kind: "agent_action_allowed",
    decisionId: makeDecisionId(
      input.manifest.manifestId,
      request.actionId,
      request.controlId,
      request.actor,
      request.payload,
      runtime.scope,
      runtime.openQuestions,
      "allowed",
      String(now()),
    ),
    manifestId: input.manifest.manifestId,
    actionId: action.id,
    controlId: request.controlId,
    actor: request.actor,
    payload: request.payload,
    scenario: {
      playwrightTraceId: action.playwrightLinkage.playwrightTraceId,
      actionScenarioId: action.playwrightLinkage.actionScenarioId,
      assertions: {
        minimum: action.playwrightLinkage.assertions.minimum,
        required: action.playwrightLinkage.assertions.required,
      },
      outputs: action.postconditions,
    },
    fallback: {
      strategy: action.safeFallback,
      rationale: `Fallback policy from action descriptor ${action.id}.`,
    },
  };
}
