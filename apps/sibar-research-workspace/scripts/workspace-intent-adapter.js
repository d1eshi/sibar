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

function valueFrom(node, fallback = "") {
  return typeof node?.value === "string" && node.value.trim() ? node.value.trim() : fallback;
}

function setValueIfEmpty(node, value) {
  if (!node || typeof node.value !== "string") return;
  if (!node.value.trim()) node.value = value;
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

export function hydrateWorkspaceIntentForm(root = {}) {
  setValueIfEmpty(root.workspaceIntentBuild, DEFAULT_WORKSPACE_INTENT_INPUT.tryingToBuildOrUnderstand);
  setValueIfEmpty(root.workspaceIntentSource, DEFAULT_WORKSPACE_INTENT_INPUT.sourceInput);
  setValueIfEmpty(root.workspaceIntentWhy, DEFAULT_WORKSPACE_INTENT_INPUT.whyItMatters);
  setValueIfEmpty(root.workspaceIntentKnown, DEFAULT_WORKSPACE_INTENT_INPUT.alreadyKnow);
  setValueIfEmpty(root.workspaceIntentUnknown, DEFAULT_WORKSPACE_INTENT_INPUT.notKnowYet);
  setValueIfEmpty(root.workspaceIntentDesiredOutput, DEFAULT_WORKSPACE_INTENT_INPUT.desiredOutput);
  if (root.openWorkspaceSession) root.openWorkspaceSession.disabled = true;
}

export function readWorkspaceIntentForm(root = {}) {
  return {
    userAmbition: DEFAULT_WORKSPACE_INTENT_INPUT.userAmbition,
    tryingToBuildOrUnderstand: valueFrom(root.workspaceIntentBuild, DEFAULT_WORKSPACE_INTENT_INPUT.tryingToBuildOrUnderstand),
    sourceInput: valueFrom(root.workspaceIntentSource, DEFAULT_WORKSPACE_INTENT_INPUT.sourceInput),
    whyItMatters: valueFrom(root.workspaceIntentWhy, DEFAULT_WORKSPACE_INTENT_INPUT.whyItMatters),
    alreadyKnow: valueFrom(root.workspaceIntentKnown, DEFAULT_WORKSPACE_INTENT_INPUT.alreadyKnow),
    notKnowYet: valueFrom(root.workspaceIntentUnknown, DEFAULT_WORKSPACE_INTENT_INPUT.notKnowYet),
    desiredOutput: valueFrom(root.workspaceIntentDesiredOutput, DEFAULT_WORKSPACE_INTENT_INPUT.desiredOutput),
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
  };
}

export async function compileWorkspaceIntentWithRunner(input, options = {}) {
  const response = await fetch("/api/workspace-intent/compiler", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input,
      adapter: options.adapter || "codex-exec",
      runCodex: options.runCodex === true,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    const reason = result?.runner?.blocked_reason || result?.error || `Workspace compiler request failed with ${response.status}.`;
    throw new Error(reason);
  }

  return {
    adapter_kind: result.runner?.adapter || "rust-workspace-compiler",
    core_entrypoint: WORKSPACE_INTENT_RUNNER_ENTRYPOINT,
    workspace_intent: result.workspace_intent,
    workspace_plan: result.workspace_plan,
    preview: result.preview,
    runner: result.runner,
    rust_intent: result.rust_intent,
    rust_workspace_plan: result.rust_workspace_plan,
    validation: result.validation,
  };
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
      ? `Runner ${compiled.runner.adapter}: ${compiled.runner.status}. ${preview.validation.valid ? "Workspace plan ready." : "Workspace plan needs input repair."}`
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
