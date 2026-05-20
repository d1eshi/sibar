import {
  DEFAULT_WORKSPACE_INTENT_INPUT,
  buildWorkspaceIntent,
  compileWorkspacePlanFromIntent,
  formatWorkspacePlanPreview,
  validateWorkspacePlan,
} from "../../../src/pedagogoai/workspace-intent-runtime.js";
import { ANTI_OVERLOAD, ARC_ID, MISSION_ID } from "./workspace-data.js";

export const WORKSPACE_INTENT_ADAPTER_KIND = "workspace-intent-ui-adapter";
export const WORKSPACE_INTENT_CORE_ENTRYPOINT = "src/pedagogoai/workspace-intent.ts";
export const WORKSPACE_INTENT_RUNNER_ENTRYPOINT = "src/pedagogoai/workspace-compiler-runner.ts";
const WORKSPACE_COMPILER_ENDPOINT = "/api/workspace-intent/compiler";
const DEFAULT_COMPILER_ADAPTER = "codex-exec";
const FALLBACK_COMPILER_RUNNER = {
  status: "blocked",
  args: [],
};
const WORKSPACE_INTENT_FORM_DEFAULTS = {
  userAmbition: DEFAULT_WORKSPACE_INTENT_INPUT.userAmbition,
  tryingToBuildOrUnderstand: "I want to learn one bounded research topic and complete a short, evidence-first session.",
  whyItMatters: "Build a bounded evidence-first workspace from this intent.",
  alreadyKnow: "",
  notKnowYet: "",
  desiredOutput: "notes, artifact, next session",
  createdAt: DEFAULT_WORKSPACE_INTENT_INPUT.createdAt,
};

function valueFrom(node, fallback = "") {
  return typeof node?.value === "string" && node.value.trim() ? node.value.trim() : fallback;
}

function setText(node, value) {
  if (node) node.textContent = value;
}

function setHidden(node, hidden) {
  if (!node) return;
  node.hidden = hidden;
  if (hidden) {
    node.setAttribute?.("hidden", "");
  } else {
    node.removeAttribute?.("hidden");
  }
}

function normalizeRunnerCommand(input = "") {
  if (typeof input === "string" && input.trim()) return input.trim();
  return `POST ${WORKSPACE_COMPILER_ENDPOINT}`;
}

function buildWorkspaceIntentRunnerFallback(input, reason, adapter = DEFAULT_COMPILER_ADAPTER) {
  const preview = compileWorkspaceIntentPreview(input);
  return {
    adapter_kind: WORKSPACE_INTENT_ADAPTER_KIND,
    core_entrypoint: WORKSPACE_INTENT_RUNNER_ENTRYPOINT,
    workspace_intent: preview.workspace_intent,
    workspace_plan: preview.workspace_plan,
    preview: preview.preview,
    runner: {
      ...FALLBACK_COMPILER_RUNNER,
      adapter,
      command: normalizeRunnerCommand(WORKSPACE_COMPILER_ENDPOINT),
      blocked_reason: reason || "Live compiler unavailable; local compiler generated the workspace plan.",
    },
    rust_intent: null,
    rust_workspace_plan: null,
    validation: preview.validation,
  };
}

export function hydrateWorkspaceIntentForm(root = {}) {
  if (root.openWorkspaceSession) root.openWorkspaceSession.disabled = true;
}

export function readWorkspaceIntentForm(root = {}) {
  const tryingToBuildOrUnderstand = valueFrom(
    root.workspaceIntentBuild,
    WORKSPACE_INTENT_FORM_DEFAULTS.tryingToBuildOrUnderstand,
  );
  return {
    userAmbition: WORKSPACE_INTENT_FORM_DEFAULTS.userAmbition,
    tryingToBuildOrUnderstand,
    sourceInput: valueFrom(root.workspaceIntentSource, tryingToBuildOrUnderstand),
    whyItMatters: valueFrom(root.workspaceIntentWhy, WORKSPACE_INTENT_FORM_DEFAULTS.whyItMatters),
    alreadyKnow: valueFrom(root.workspaceIntentKnown, WORKSPACE_INTENT_FORM_DEFAULTS.alreadyKnow),
    notKnowYet: valueFrom(root.workspaceIntentUnknown, WORKSPACE_INTENT_FORM_DEFAULTS.notKnowYet),
    desiredOutput: valueFrom(root.workspaceIntentDesiredOutput, WORKSPACE_INTENT_FORM_DEFAULTS.desiredOutput),
  };
}

export function compileWorkspaceIntentPreview(input) {
  const workspaceIntent = buildWorkspaceIntent(input);
  const workspacePlan = compileWorkspacePlanFromIntent(workspaceIntent);
  return {
    adapter_kind: WORKSPACE_INTENT_ADAPTER_KIND,
    core_entrypoint: WORKSPACE_INTENT_CORE_ENTRYPOINT,
    workspace_intent: workspaceIntent,
    workspace_plan: workspacePlan,
    preview: formatWorkspacePlanPreview(workspacePlan),
    validation: validateWorkspacePlan(workspacePlan),
  };
}

export async function compileWorkspaceIntentWithRunner(input, options = {}) {
  const adapter = options.adapter || DEFAULT_COMPILER_ADAPTER;
  if (options.runCodex !== true) {
    return compileWorkspaceIntentPreview(input);
  }

  try {
    const response = await fetch(WORKSPACE_COMPILER_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input,
        adapter,
        runCodex: true,
      }),
    });

    if (!response.ok) {
      let failed;
      try {
        failed = await response.json();
      } catch {
        failed = null;
      }
      return buildWorkspaceIntentRunnerFallback(
        input,
        failed?.runner?.blocked_reason || failed?.error || `Workspace compiler request failed with ${response.status}.`,
        adapter,
      );
    }

    const result = await response.json();
    if (!result || typeof result !== "object") {
      return buildWorkspaceIntentRunnerFallback(
        input,
        "Workspace compiler response was malformed JSON.",
        adapter,
      );
    }

    if (!result.workspace_plan || !result.preview || !result.workspace_intent) {
      return buildWorkspaceIntentRunnerFallback(
        input,
        "Workspace compiler returned an incomplete response.",
        adapter,
      );
    }

    return {
      adapter_kind: WORKSPACE_INTENT_ADAPTER_KIND,
      core_entrypoint: WORKSPACE_INTENT_RUNNER_ENTRYPOINT,
      workspace_intent: result.workspace_intent,
      workspace_plan: result.workspace_plan,
      preview: result.preview,
      runner: result.runner || {
        ...FALLBACK_COMPILER_RUNNER,
        adapter,
        command: normalizeRunnerCommand(WORKSPACE_COMPILER_ENDPOINT),
        blocked_reason: "Workspace compiler did not return a runner entry.",
      },
      rust_intent: result.rust_intent || null,
      rust_workspace_plan: result.rust_workspace_plan || null,
      validation: result.validation || null,
    };
  } catch (error) {
    return buildWorkspaceIntentRunnerFallback(
      input,
      error instanceof Error ? error.message : "Workspace compiler endpoint is unreachable.",
      adapter,
    );
  }
}

export function renderWorkspaceIntentPreview(root = {}, compiled = null) {
  if (!compiled?.preview) return;
  const preview = compiled.preview;
  setHidden(root.workspaceIntentPreview, false);
  setText(root.workspaceIntentPreviewTitle, `Proposed Workspace: ${preview.proposed_workspace}`);
  if (root.workspaceIntentOutputs) {
    root.workspaceIntentOutputs.innerHTML = preview.outputs.map((output) => `<li>${output}</li>`).join("");
  }
  setText(root.workspaceIntentFirstSession, preview.first_session);
  setText(
    root.workspaceIntentStatus,
    compiled.runner?.status
      ? `${preview.validation.valid ? "Workspace plan ready." : "Workspace plan needs input repair."}`
      : preview.validation.valid ? "Workspace plan ready. Open the first session when you want the focused workspace." : "Workspace plan needs input repair.",
  );
  if (root.openWorkspaceSession) root.openWorkspaceSession.disabled = !preview.validation.valid;
}

function mapWorkspaceNodeToRoadmapNode(node, index) {
  return {
    id: node.node_id,
    title: node.title,
    status: index === 0 ? "in_progress" : "unseen",
    track_id: "track-workspace-intent",
    mission_id: MISSION_ID,
    prerequisites: [...(node.prerequisite_node_ids || [])],
    locked_reasons: [],
    focus: node.focus,
    recommended_decision: index === 0
      ? "Start with the first session and produce evidence before attention implementation."
      : "Unlock this after the prerequisite session has evidence.",
    reader_move: "Read the selected resource and write a reconstruction before hints.",
    mini_nodes: (node.mini_nodes || []).map((miniNode) => ({
      schema: "MiniNode",
      id: `${node.node_id}::${miniNode.id}`,
      node_id: node.node_id,
      title: miniNode.title,
      goal: miniNode.goal,
      reader_prompt: miniNode.reader_prompt,
      resources: (miniNode.resources || []).map((resource) => ({ ...resource })),
    })),
    sources: (node.mini_nodes || []).flatMap((miniNode, miniIndex) =>
      (miniNode.resources || []).map((resource, sourceIndex) => ({
        schema: "Source",
        id: `${node.node_id}::${miniNode.id}::source-${sourceIndex}`,
        mini_node_id: miniNode.id,
        display_order: miniIndex,
        title: resource.title,
        source: resource.source,
        medium: resource.kind,
        action: resource.action,
      })),
    ),
  };
}

export function workspacePlanToRoadmap(plan) {
  return (plan.nodes || []).map(mapWorkspaceNodeToRoadmapNode);
}

export function applyWorkspacePlanPreviewToState(state, plan) {
  const validation = validateWorkspacePlan(plan);
  if (!validation.valid) {
    state.workspaceIntentValidation = validation;
    return { applied: false, validation };
  }

  const roadmap = workspacePlanToRoadmap(plan);
  const firstNode = roadmap.find((node) => node.id === plan.session_plan.node_id) || roadmap[0];

  state.todayMission = plan.user_ambition.statement;
  state.todayArc = plan.workspace.title;
  state.roadmap = roadmap;
  state.tracks = [
    {
      id: "track-workspace-intent",
      title: plan.workspace.title,
      nodes: roadmap.map((node) => node.id),
      status: "ready",
    },
  ];
  state.artifacts = plan.outputs.map((output) => `Workspace output: ${output}`);
  state.evidence = plan.evidence_plan.required_evidence.map((entry) => `Evidence required: ${entry.label}`);
  state.activeNodeId = firstNode?.id || plan.session_plan.node_id;
  state.activeMiniNodeId = firstNode?.mini_nodes?.[0]?.id?.split("::").pop() || "array-semantics";
  state.activeSourceSelection = null;
  state.activeSessionId = plan.session_plan.session_id;
  state.maxActiveSessions = ANTI_OVERLOAD.max_active_sessions;
  state.maxVisibleChoices = ANTI_OVERLOAD.max_visible_choices;
  state.sessionPlan = {
    sessions: [
      {
        id: plan.session_plan.session_id,
        status: "active",
        selected_node_id: state.activeNodeId,
        visible_choices: roadmap.slice(0, ANTI_OVERLOAD.max_visible_choices).map((node) => node.id),
        locked_reasons: [],
      },
    ],
    max_active_sessions: ANTI_OVERLOAD.max_active_sessions,
    max_visible_choices: ANTI_OVERLOAD.max_visible_choices,
    active_session_id: plan.session_plan.session_id,
  };
  state.expandedTreeNodes = {
    [MISSION_ID]: true,
    [ARC_ID]: true,
    "track-workspace-intent": true,
    [state.activeNodeId]: true,
  };
  state.workspaceIntentPlan = plan;
  state.workspaceIntentValidation = validation;
  state.readinessLabel = "Workspace plan proposed";
  state.detectedGap = "No session evidence yet";
  state.repairAction = `Start with ${plan.session_plan.title}`;
  return { applied: true, validation };
}
