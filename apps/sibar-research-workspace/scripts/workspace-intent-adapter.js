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

function dedupe(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const key = String(value || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slug(value = "workspace") {
  return String(value || "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .replace(/-+/g, "-") || "workspace";
}

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

function getTauriInvoke() {
  return globalThis.window?.__TAURI__?.core?.invoke || globalThis.__TAURI__?.core?.invoke || null;
}

function inferArtifactKindFromRustNode(node = {}) {
  const source = [
    node.title,
    ...(node.prerequisites || []),
    ...(node.concepts || []),
    node.artifact_requirement?.requires,
  ].join(" ").toLowerCase();
  if (source.includes("benchmark")) return "benchmark";
  if (source.includes("notebook")) return "notebook";
  if (source.includes("note")) return "notes";
  if (source.includes("repo") || source.includes("code")) return "repo";
  if (source.includes("writeup") || source.includes("publish")) return "writeup";
  return "source";
}

function inferOperationFromRustNode(node = {}) {
  const context = [
    node.title,
    ...(node.concepts || []),
    node.artifact_requirement?.requires,
  ].join(" ").toLowerCase();
  if (/(explain|understand|entender)/.test(context)) return "explain";
  if (/(benchmark|measure|profile|evaluar)/.test(context)) return "benchmark";
  if (/(publish|writeup|publicar)/.test(context)) return "publish";
  if (/(build|implement|create|generate|patch|compile|code|construir)/.test(context)) return "build";
  return "read";
}

function mapRustNodeToWorkspaceNode(node = {}) {
  const evidenceOutputs = dedupe((node.source_links || []).map((link) => link.evidence_id));
  return {
    schema: "WorkspaceNodePlan",
    node_id: node.id,
    title: node.title?.trim() || node.id,
    focus: `Integrar ${node.title || node.id} desde evidencia del compilador nativo.`,
    operation_target: inferOperationFromRustNode(node),
    prerequisite_node_ids: dedupe(node.prerequisites || []),
    session_ids: ["session-01"],
    evidence_outputs: evidenceOutputs.length ? evidenceOutputs : ["source-evidence"],
    mini_nodes: [
      {
        id: `${node.id}-mini-01`,
        title: "Ruta de evidencia",
        goal: `Vincular evidencia del nodo ${node.id} con una evidencia accionable.`,
        reader_prompt: "Lee la evidencia y define la siguiente acción mínima del workspace.",
        resources: evidenceOutputs.map((evidenceId) => ({
          kind: "source",
          title: evidenceId,
          source: `Evidence ${evidenceId}`,
          action: "Use this evidence for workspace execution.",
        })),
      },
    ],
  };
}

function buildEvidencePlanFromRust(workspaceIntent, rustPlan, workspaceId) {
  const fallback = compileWorkspacePlanFromIntent(workspaceIntent).evidence_plan;
  const evidenceById = new Map();
  for (const node of rustPlan.nodes || []) {
    for (const source of node.source_links || []) {
      if (!evidenceById.has(source.evidence_id)) {
        evidenceById.set(source.evidence_id, {
          rationale: source.rationale,
          node,
        });
      }
    }
  }

  const requiredEvidence = Array.from(evidenceById.entries()).map(([id, entry]) => {
    const existing = fallback.required_evidence.find((candidate) => candidate.id === id);
    if (existing) return existing;
    return {
      id,
      label: entry.rationale || `Native compiler evidence: ${id}`,
      artifact_kind: inferArtifactKindFromRustNode(entry.node),
      acceptance_criteria: [
        "La evidencia se usa para acotar el primer nodo del plan.",
        "La evidencia debe ser trazable desde el workspace.",
      ],
    };
  });

  return {
    ...fallback,
    workspace_id: workspaceId,
    required_evidence: requiredEvidence.length ? requiredEvidence : fallback.required_evidence,
    minimum_evidence_count: Math.min(3, requiredEvidence.length || fallback.required_evidence.length),
  };
}

function rustWorkspacePlanToWorkspacePlan(workspaceIntent, rustPlan) {
  const basePlan = compileWorkspacePlanFromIntent(workspaceIntent);
  if (!rustPlan?.nodes?.length) {
    return { ...basePlan, compiled_by: "llm" };
  }

  const workspaceId = `workspace-${slug(workspaceIntent.workspace_title)}`;
  const nodes = rustPlan.nodes.map(mapRustNodeToWorkspaceNode);
  const first = rustPlan.nodes[0];
  const evidenceOutputs = dedupe((first.source_links || []).map((source) => source.evidence_id));
  const sessionPlan = {
    ...basePlan.session_plan,
    node_id: first.id,
    title: first.title?.trim() || `Session for ${first.id}`,
    focus: first.title?.trim() || first.id,
    operation_target: inferOperationFromRustNode(first),
    outputs: evidenceOutputs.length ? evidenceOutputs : basePlan.session_plan.outputs,
    required_evidence: evidenceOutputs.length ? evidenceOutputs : basePlan.session_plan.required_evidence,
    success_criteria: [
      "La sesión inicial opera sobre evidencia citada por el compilador nativo.",
      "La ejecución queda acotada al objetivo compilado.",
    ],
  };
  const nodeEvidenceIds = dedupe(
    rustPlan.nodes.flatMap((node) => (node.source_links || []).map((source) => source.evidence_id)),
  );

  return {
    ...basePlan,
    workspace: {
      ...basePlan.workspace,
      intent: rustPlan.objective || basePlan.workspace.intent,
    },
    outputs: nodeEvidenceIds.length ? nodeEvidenceIds : basePlan.outputs,
    nodes,
    session_plan: sessionPlan,
    evidence_plan: buildEvidencePlanFromRust(workspaceIntent, rustPlan, workspaceId),
    compiled_by: "llm",
  };
}

function compileWorkspaceIntentFromNativeResult(input, result, adapter) {
  const workspaceIntent = buildWorkspaceIntent(input);
  if (!result?.rust_workspace_plan || result?.runner?.status !== "completed") {
    return buildWorkspaceIntentRunnerFallback(
      input,
      result?.runner?.blocked_reason || "Native compiler did not produce an accepted plan.",
      adapter,
    );
  }

  const workspacePlan = rustWorkspacePlanToWorkspacePlan(workspaceIntent, result.rust_workspace_plan);
  return {
    adapter_kind: WORKSPACE_INTENT_ADAPTER_KIND,
    core_entrypoint: WORKSPACE_INTENT_RUNNER_ENTRYPOINT,
    workspace_intent: workspaceIntent,
    workspace_plan: workspacePlan,
    preview: formatWorkspacePlanPreview(workspacePlan),
    runner: result.runner,
    job: result.job,
    rust_intent: result.rust_intent,
    rust_workspace_plan: result.rust_workspace_plan,
    validation: validateWorkspacePlan(workspacePlan),
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

  const nativeInvoke = getTauriInvoke();
  if (nativeInvoke) {
    try {
      const nativeResult = await nativeInvoke("compile_workspace_intent", {
        payload: {
          input,
          adapter,
          runCodex: true,
        },
      });
      return compileWorkspaceIntentFromNativeResult(input, nativeResult, adapter);
    } catch (error) {
      return buildWorkspaceIntentRunnerFallback(
        input,
        error instanceof Error ? error.message : "Native workspace compiler failed.",
        adapter,
      );
    }
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
