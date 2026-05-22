import {
  ANTI_OVERLOAD,
  ARC_ID,
  CONTRACT_NAMESPACE,
  DEFAULT_ROADMAP,
  MISSION_ID,
  NODE_PREREQUISITES,
  ROADMAP_CONTRACT_VERSION,
  ROADMAP_SIGNALS,
  TRACKS,
} from "./workspace-data.js";
import { dedupe, normalizeId, normalizeText, roadmapDeltas, titleFromSource } from "./workspace-utils.js";
import { buildNodeStudyPlan, getNodeLockedReasons, lockReasonForNode } from "./workspace-study-plans.js";

function detectSignalsFromSource(sourceText) {
  const normalized = normalizeText(sourceText);
  if (!normalized) return [];
  return ROADMAP_SIGNALS.filter((signal) => signal.match.some((term) => normalized.includes(term)));
}

export function buildRoadmapCompilerRequest({
  learnerIntent = {},
  sourceBundle = {},
  learnerState = {},
  policy = {},
  roadmap = DEFAULT_ROADMAP,
}) {
  const requestId = `req_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  return {
    schema: `${CONTRACT_NAMESPACE}.RoadmapCompilerRequest`,
    version: ROADMAP_CONTRACT_VERSION,
    request_id: requestId,
    generated_at: new Date().toISOString(),
    learner_intent: {
      mission: learnerIntent.mission || learnerState.mission || "Frontier AI researcher",
      arc: learnerIntent.arc || learnerState.arc || "Neural Nets from Scratch",
      objective: learnerIntent.objective || "Deep ownership of learning roadmap",
      horizon: learnerIntent.horizon || "session-level",
    },
    source_bundle: {
      id: sourceBundle.id || normalizeId(sourceBundle.title || sourceBundle.url || "source-input"),
      title: sourceBundle.title || "Source / research intake",
      url: sourceBundle.url || "",
      raw_text: sourceBundle.raw_text || sourceBundle.text || "",
      extracted_signals: sourceBundle.extracted_signals || [],
      roadmap_snapshot: roadmap.map((node) => ({ id: node.id, title: node.title, status: node.status })),
    },
    learner_state: {
      mission: learnerState.mission || learnerIntent.mission,
      arc: learnerState.arc || learnerIntent.arc,
      active_node_id: learnerState.activeNodeId || "backprop",
      active_session_id: learnerState.activeSessionId || "session-1",
      active_mini_node_id: learnerState.activeMiniNodeId,
      max_active_sessions: learnerState.maxActiveSessions || ANTI_OVERLOAD.max_active_sessions,
      max_visible_choices: learnerState.maxVisibleChoices || ANTI_OVERLOAD.max_visible_choices,
      active: true,
    },
    policy: {
      max_active_sessions: policy.maxActiveSessions || ANTI_OVERLOAD.max_active_sessions,
      max_visible_choices: policy.maxVisibleChoices || ANTI_OVERLOAD.max_visible_choices,
      locked_reasons_required: true,
      prerequisites_required: true,
      provenance: policy.provenance || "ui-static-roadmap-contract",
    },
    provenance: {
      source: "client-static-workspace",
      generated_by: "buildRoadmapCompilerRequest",
    },
  };
}

function defaultArtifactProvenance(requestId) {
  return {
    source: "client-static-workspace",
    generated_by: "buildRoadmapArtifactFromRequest",
    generated_at: new Date().toISOString(),
    request_id: requestId,
  };
}

function mapRoadmapToLearningNodes(roadmap, artifactOptions = {}) {
  return roadmap.map((node) => {
    const plan = buildNodeStudyPlan(node.id, roadmap);
    return {
      schema: "LearningNode",
      version: ROADMAP_CONTRACT_VERSION,
      id: plan.nodeId,
      title: plan.displayTitle || node.title,
      status: node.status || "unseen",
      track_id: plan.trackId || "track-unknown",
      mission_id: MISSION_ID,
      prerequisites: plan.prerequisites,
      locked_reasons: plan.lockedReasons,
      mini_nodes: (plan.miniNodes || []).map((miniNode, index) => ({
        schema: "MiniNode",
        id: `${node.id}::${miniNode.id}`,
        node_id: plan.nodeId,
        title: miniNode.title,
        goal: miniNode.goal,
        resources: (miniNode.resources || []).map((resource) => ({
          kind: resource.kind,
          title: resource.title,
          source: resource.source,
          action: resource.action,
        })),
        display_order: index,
      })),
      sources: (plan.miniNodes || []).flatMap((miniNode) =>
        (miniNode.resources || []).map((resource, index) => ({
          schema: "Source",
          id: `${node.id}::${miniNode.id}::source-${index}`,
          title: resource.title,
          source: resource.source,
          medium: resource.kind || "direct-reading",
          action: resource.action,
        })),
      ),
      updated_at: new Date().toISOString(),
    };
  });
}

function buildSessionPlanFromRoadmap(roadmap, policy = {}) {
  const nodeById = new Map(roadmap.map((item) => [item.id, item]));
  const candidate = roadmap.find((item) => item.status === "in_progress") || roadmap[0];
  const maxVisibleChoices = Math.min(
    policy.max_visible_choices || ANTI_OVERLOAD.max_visible_choices,
    ANTI_OVERLOAD.max_visible_choices,
  );
  const sessions = [
    {
      schema: "Session",
      id: "session-1",
      status: "active",
      selected_node_id: candidate?.id || "backprop",
      visible_choices: roadmap
        .filter((node) => node.id !== "kernels")
        .slice(0, maxVisibleChoices)
        .map((node) => node.id),
      locked_reasons: [],
    },
  ];
  return {
    schema: "SessionPlan",
    version: ROADMAP_CONTRACT_VERSION,
    max_active_sessions: ANTI_OVERLOAD.max_active_sessions,
    max_visible_choices: maxVisibleChoices,
    sessions,
    active_session_id: sessions[0].id,
  };
}

export function buildDecisionFromRoadmap(roadmap, state = {}) {
  const maxVisibleChoices = Math.min(
    state.maxVisibleChoices || ANTI_OVERLOAD.max_visible_choices,
    ANTI_OVERLOAD.max_visible_choices,
  );
  const unlocked = [];
  const locked = [];
  for (const item of roadmap) {
    const lock = getNodeLockedReasons(item, roadmap);
    if (!lock.length) {
      unlocked.push(item);
    } else {
      locked.push({ id: item.id, title: item.title, reasons: lock });
    }
  }
  const recommended = unlocked.find((item) => item.id === state.activeNodeId) || unlocked[0] || roadmap[0] || null;
  const alternatives = unlocked
    .filter((item) => item.id !== recommended?.id)
    .slice(0, maxVisibleChoices)
    .map((item) => ({ id: item.id, title: item.title, reason: `${item.id} is available and unlocked` }));
  return {
    schema: "Decision",
    version: ROADMAP_CONTRACT_VERSION,
    active_session_id: state.activeSessionId || "session-1",
    max_visible_choices: maxVisibleChoices,
    recommended_next_node_id: recommended?.id || null,
    alternatives: alternatives.map((entry) => ({
      node_id: entry.id,
      title: entry.title,
      why_recommended: entry.reason,
      why_not_recommended: lockReasonForNode(entry.id, roadmap),
    })),
    why_not_others: locked.map((item) => `${item.title}: ${item.reasons.join("; ")}`),
  };
}

export function buildRoadmapArtifactFromRequest(request, roadmapTemplate = DEFAULT_ROADMAP) {
  const roadmap = roadmapTemplate.map((node) => ({ ...node }));
  const learningNodes = mapRoadmapToLearningNodes(roadmap);
  const sessionPlan = buildSessionPlanFromRoadmap(roadmap, request.policy || {});
  const decision = buildDecisionFromRoadmap(roadmap, {
    activeNodeId: request.learner_state?.active_node_id || "backprop",
    maxVisibleChoices: request.policy?.max_visible_choices || ANTI_OVERLOAD.max_visible_choices,
  });
  return {
    schema: "RoadmapArtifact",
    version: ROADMAP_CONTRACT_VERSION,
    artifact_id: `artifact_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    mission: {
      schema: "Mission",
      id: MISSION_ID,
      title: request.learner_intent?.mission || "Frontier AI researcher",
      arc_id: ARC_ID,
    },
    arcs: [
      {
        schema: "Arc",
        id: ARC_ID,
        mission_id: MISSION_ID,
        title: request.learner_intent?.arc || "Neural Nets from Scratch",
      },
    ],
    tracks: TRACKS.map((track) => ({
      schema: "Track",
      id: track.id,
      arc_id: ARC_ID,
      title: track.title,
      node_ids: track.nodes,
    })),
    learning_nodes: learningNodes,
    session_plan: sessionPlan,
    decision,
    request_id: request.request_id,
    generated_at: new Date().toISOString(),
    provenance: defaultArtifactProvenance(request.request_id),
    imported_from: request.source_bundle?.id || "source-blob",
  };
}

export function validateRoadmapArtifact(artifact = null, request = null) {
  const report = {
    schema: "ValidationReport",
    version: ROADMAP_CONTRACT_VERSION,
    valid: true,
    errors: [],
    warnings: [],
    provenance: {
      generated_at: new Date().toISOString(),
      source: "client-static-roadmap-artifact-validator",
      request_id: request?.request_id || artifact?.request_id || null,
    },
  };

  if (!artifact || typeof artifact !== "object") {
    report.valid = false;
    report.errors.push({
      code: "artifact_invalid",
      message: "Artifact must be an object.",
      path: "artifact",
    });
    return report;
  }

  if (artifact.schema !== "RoadmapArtifact") {
    report.valid = false;
    report.errors.push({ code: "artifact_schema", message: "artifact.schema must be RoadmapArtifact.", path: "artifact.schema" });
  }

  if (artifact.version !== ROADMAP_CONTRACT_VERSION) {
    report.valid = false;
    report.errors.push({ code: "artifact_version", message: "Unsupported artifact version.", path: "artifact.version" });
  }

  const mission = artifact.mission || {};
  if (!mission.id || !mission.title || !mission.arc_id) {
    report.valid = false;
    report.errors.push({
      code: "mission_shape",
      message: "Mission block must include id, title, and arc_id.",
      path: "artifact.mission",
    });
  }

  if (!Array.isArray(artifact.learning_nodes)) {
    report.valid = false;
    report.errors.push({
      code: "learning_nodes_type",
      message: "artifact.learning_nodes must be an array.",
      path: "artifact.learning_nodes",
    });
    return report;
  }

  if (!Array.isArray(artifact.session_plan?.sessions)) {
    report.errors.push({
      code: "session_plan_type",
      message: "artifact.session_plan.sessions should be an array.",
      path: "artifact.session_plan.sessions",
    });
    report.valid = false;
  }

  if (artifact.session_plan?.sessions) {
    const active = artifact.session_plan.sessions.filter((session) => session.status === "active");
    const maxActive = Math.min(artifact.session_plan.max_active_sessions || ANTI_OVERLOAD.max_active_sessions, ANTI_OVERLOAD.max_active_sessions);
    if (active.length > maxActive) {
      report.errors.push({
        code: "session_overload",
        message: `Artifact defines ${active.length} active sessions; max is ${maxActive}.`,
        path: "artifact.session_plan.sessions",
      });
      report.valid = false;
    }

    for (const session of artifact.session_plan.sessions) {
      const visible = session.visible_choices || [];
      if (!Array.isArray(visible)) {
        report.errors.push({
          code: "session_visible_choices_type",
          message: "session.visible_choices must be array.",
          path: "artifact.session_plan.sessions.visible_choices",
        });
        report.valid = false;
      } else if (visible.length > ANTI_OVERLOAD.max_visible_choices) {
        report.warnings.push({
          code: "visible_choices_limit",
          message: `Visible choices (${visible.length}) exceed configured maximum of ${ANTI_OVERLOAD.max_visible_choices}.`,
          path: "artifact.session_plan.sessions.visible_choices",
        });
      }
    }
  }

  const nodeIds = new Set();
  for (const node of artifact.learning_nodes) {
    if (!node.id) {
      report.valid = false;
      report.errors.push({ code: "learning_node_missing_id", message: "Each learning node needs id.", path: "artifact.learning_nodes.id" });
      continue;
    }
    if (nodeIds.has(node.id)) {
      report.warnings.push({ code: "learning_node_duplicate", message: `Duplicate node id: ${node.id}`, path: `artifact.learning_nodes(${node.id})` });
    }
    nodeIds.add(node.id);

    if (!node.schema || node.schema !== "LearningNode") {
      report.warnings.push({ code: "learning_node_schema", message: `Node ${node.id} lacks schema LearningNode.`, path: `artifact.learning_nodes(${node.id}).schema` });
    }
  }

  return report;
}

export function importRoadmapArtifact(rawArtifact) {
  if (typeof rawArtifact === "string") {
    try {
      return { artifact: JSON.parse(rawArtifact), validation: null };
    } catch {
      return {
        artifact: null,
        validation: {
          schema: "ValidationReport",
          version: ROADMAP_CONTRACT_VERSION,
          valid: false,
          errors: [{ code: "invalid_json", message: "Could not parse artifact JSON payload.", path: "payload" }],
          warnings: [],
          provenance: { generated_at: new Date().toISOString(), source: "client-static-roadmap-artifact-validator", request_id: null },
        },
      };
    }
  }
  return { artifact: rawArtifact ?? null, validation: null };
}

function validateArtifactForApply(artifact) {
  const validation = validateRoadmapArtifact(artifact);
  if (!validation.valid) {
    return validation;
  }
  return validation;
}

function cloneArtifactResource(resource) {
  return typeof resource === "object" && resource !== null ? { ...resource } : resource;
}

function cloneArtifactMiniNode(miniNode) {
  return {
    ...miniNode,
    resources: Array.isArray(miniNode?.resources) ? miniNode.resources.map(cloneArtifactResource) : [],
  };
}

export function applyRoadmapArtifact(state, rawArtifact) {
  const importResult = importRoadmapArtifact(rawArtifact);
  if (!importResult.artifact) {
    return {
      applied: false,
      artifact: null,
      validation: importResult.validation,
      state,
    };
  }

  const validation = validateArtifactForApply(importResult.artifact);
  if (!validation.valid) {
    return {
      applied: false,
      artifact: importResult.artifact,
      validation,
      state,
    };
  }

  const artifact = importResult.artifact;
  const nextRoadmap = (artifact.learning_nodes || [])
    .map((node) => ({
      id: node.id,
      title: node.title,
      status: node.status || "unseen",
      track_id: node.track_id,
      mission_id: node.mission_id,
      prerequisites: Array.isArray(node.prerequisites) ? [...node.prerequisites] : [],
      locked_reasons: Array.isArray(node.locked_reasons) ? [...node.locked_reasons] : [],
      mini_nodes: Array.isArray(node.mini_nodes) ? node.mini_nodes.map(cloneArtifactMiniNode) : [],
      sources: Array.isArray(node.sources) ? node.sources.map(cloneArtifactResource) : [],
      focus: node.focus || "",
      why_it_matters: node.why_it_matters || node.whyItMatters || "",
      recommended_decision: node.recommended_decision || "",
      reader_move: node.reader_move || "",
      updated_at: node.updated_at || null,
    }))
    .filter((node) => node.id && node.title);

  if (artifact.session_plan?.active_session_id) {
    state.activeSessionId = artifact.session_plan.active_session_id;
  } else if (artifact.session_plan?.sessions?.length) {
    state.activeSessionId = artifact.session_plan.sessions.find((session) => session.status === "active")?.id || artifact.session_plan.sessions[0].id;
  }

  state.maxActiveSessions = Math.min(
    artifact.session_plan?.max_active_sessions || ANTI_OVERLOAD.max_active_sessions,
    ANTI_OVERLOAD.max_active_sessions,
  );
  state.maxVisibleChoices = Math.min(
    artifact.session_plan?.max_visible_choices || ANTI_OVERLOAD.max_visible_choices,
    ANTI_OVERLOAD.max_visible_choices,
  );
  state.sessionPlan = artifact.session_plan || state.sessionPlan;

  state.roadmap = nextRoadmap.length ? nextRoadmap : state.roadmap;
  state.todayMission = artifact.mission?.title || state.todayMission;
  state.todayArc = artifact.arcs?.[0]?.title || state.todayArc;
  state.tracks = Array.isArray(artifact.tracks) && artifact.tracks.length
    ? artifact.tracks.map((track) => ({ ...track, nodes: track.nodes || track.node_ids || [] }))
    : TRACKS.map((track) => ({ ...track, nodes: [...track.nodes] }));
  state.roadmapSource = artifact.request_id ? "artifact" : "contract-payload";
  state.lastArtifactImport = {
    artifact_id: artifact.artifact_id || null,
    request_id: artifact.request_id || null,
    imported_at: new Date().toISOString(),
    provenance: artifact.provenance || validation.provenance,
  };
  state.lastAppliedDecision = buildDecisionFromRoadmap(state.roadmap, {
    activeNodeId: state.activeNodeId || (state.roadmap[0] && state.roadmap[0].id),
    activeSessionId: state.activeSessionId,
    maxVisibleChoices: state.maxVisibleChoices,
  });
  state.activeNodeId = state.activeNodeId || "backprop";
  if (!state.roadmap.find((node) => node.id === state.activeNodeId)) {
    state.activeNodeId = state.roadmap[0]?.id || "backprop";
  }
  const activePlan = buildNodeStudyPlan(state.activeNodeId, state.roadmap);
  state.activeMiniNodeId = activePlan.defaultMiniNodeId;
  state.lastContractValidation = validation;
  state.artifactPlan = artifact;
  return {
    applied: true,
    artifact,
    validation,
    state,
  };
}

export function compileSourceToRoadmap(sourceText, roadmapTemplate = DEFAULT_ROADMAP) {
  const normalized = normalizeText(sourceText);
  const roadmap = roadmapTemplate.map((node) => ({ ...node }));
  const priorStatus = roadmapTemplate.map((node) => ({ ...node }));
  const matchedSignals = ROADMAP_SIGNALS.filter((signal) => signal.match.some((term) => normalized.includes(term)));
  const claims = matchedSignals.flatMap((signal) => signal.claims);
  const suggestedNodeTitles = [];
  const nextSessionOutputs = [];
  const unlocked = [];

  for (const signal of matchedSignals) {
    for (const output of signal.outputs) {
      nextSessionOutputs.push(output);
    }
    for (const nodeId of signal.nodes) {
      const node = roadmap.find((item) => item.id === nodeId);
      if (!node) continue;
      const nodeTitle = node.title;
      if (!suggestedNodeTitles.includes(nodeTitle)) {
        suggestedNodeTitles.push(nodeTitle);
      }
      if (node.status === "unseen") {
        node.status = "in_progress";
        unlocked.push(nodeTitle);
      }
    }
  }

  const fallback = matchedSignals.length === 0
    ? [
        "No deterministic claim cluster matched exactly.",
        "Add explicit source terms: tokenization, attention, backprop, scaling.",
      ]
    : [];

  const inProgressCount = roadmap.filter((node) => node.status === "in_progress").length;
  return {
    roadmap,
    sourceCard: {
      title: titleFromSource(sourceText),
      claims: dedupe((claims.length ? claims : fallback).map((claim) => claim.trim())),
      suggestedNodes: dedupe(suggestedNodeTitles),
      nextSessionOutputs: dedupe(nextSessionOutputs),
    },
    unlockedNodes: dedupe(unlocked),
    roadmapDeltas: roadmapDeltas(priorStatus, roadmap),
    inProgressCount,
  };
}

export function compileCurrentStateArtifact(state, sourceText = "") {
  const request = buildRoadmapCompilerRequest({
    learnerIntent: { mission: state.todayMission, arc: state.todayArc },
    sourceBundle: {
      id: normalizeId(state.todayMission + "-" + state.todayArc),
      title: "Current source card",
      raw_text: sourceText,
      extracted_signals: detectSignalsFromSource(sourceText).map((signal) => signal.phrase),
    },
    learnerState: {
      mission: state.todayMission,
      arc: state.todayArc,
      activeNodeId: state.activeNodeId,
      activeSessionId: state.activeSessionId,
      activeMiniNodeId: state.activeMiniNodeId,
      maxActiveSessions: state.maxActiveSessions,
      maxVisibleChoices: state.maxVisibleChoices,
    },
    policy: {
      maxActiveSessions: state.maxActiveSessions,
      maxVisibleChoices: state.maxVisibleChoices,
    },
    roadmap: state.roadmap,
  });
  const artifact = buildRoadmapArtifactFromRequest(request, state.roadmap);
  const validation = validateRoadmapArtifact(artifact, request);
  return { request, artifact, validation };
}

export const SAMPLE_VALIDATED_ARTIFACT = {
  schema: "RoadmapArtifact",
  version: ROADMAP_CONTRACT_VERSION,
  artifact_id: "artifact_sample_static_001",
  mission: { schema: "Mission", id: MISSION_ID, title: "Frontier AI researcher", arc_id: ARC_ID },
  arcs: [{ schema: "Arc", id: ARC_ID, mission_id: MISSION_ID, title: "Neural Nets from Scratch" }],
  tracks: TRACKS.map((track) => ({ schema: "Track", ...track })),
  learning_nodes: [
    {
      schema: "LearningNode",
      id: "foundations",
      title: "Math for ML",
      status: "understood",
      track_id: "track-foundations",
      mission_id: MISSION_ID,
      prerequisites: [],
      locked_reasons: [],
      mini_nodes: [
        {
          schema: "MiniNode",
          id: "foundations::vector-space",
          node_id: "foundations",
          title: "Vector space review",
          goal: "Rebuild linear basics needed for ML.",
          resources: [{ kind: "direct-reading", title: "linear algebra primer", source: "current source", action: "read and rewrite in 5 lines" }],
        },
      ],
      sources: [{ schema: "Source", id: "foundations::vector-space::source-0", title: "linear algebra primer", source: "current source", medium: "direct-reading", action: "read and rewrite in 5 lines" }],
      updated_at: new Date().toISOString(),
    },
    {
      schema: "LearningNode",
      id: "micrograd",
      title: "Micrograd",
      status: "built",
      track_id: "track-foundations",
      mission_id: MISSION_ID,
      prerequisites: ["foundations"],
      locked_reasons: [],
      mini_nodes: [],
      sources: [],
      updated_at: new Date().toISOString(),
    },
    {
      schema: "LearningNode",
      id: "tokenization",
      title: "Tokenization",
      status: "in_progress",
      track_id: "track-sequence",
      mission_id: MISSION_ID,
      prerequisites: ["foundations"],
      locked_reasons: [],
      mini_nodes: [],
      sources: [],
      updated_at: new Date().toISOString(),
    },
    {
      schema: "LearningNode",
      id: "transformer",
      title: "Transformer block",
      status: "unseen",
      track_id: "track-sequence",
      mission_id: MISSION_ID,
      prerequisites: ["bigram"],
      locked_reasons: ["Requires Bigram LM to be ready."],
      mini_nodes: [],
      sources: [],
      updated_at: new Date().toISOString(),
    },
  ],
  session_plan: {
    schema: "SessionPlan",
    max_active_sessions: 1,
    max_visible_choices: 3,
    active_session_id: "session-1",
    sessions: [
      {
        schema: "Session",
        id: "session-1",
        status: "active",
        selected_node_id: "tokenization",
        visible_choices: ["micrograd", "backprop", "tokenization"],
        locked_reasons: [],
      },
    ],
  },
  decision: {
    schema: "Decision",
    recommended_next_node_id: "tokenization",
    alternatives: [
      { node_id: "micrograd", title: "Micrograd", why_recommended: "foundation path", why_not_recommended: "low priority now" },
      { node_id: "transformer", title: "Transformer block", why_recommended: "locked by prerequisites", why_not_recommended: "requires bigram prerequisite" },
    ],
    why_not_others: ["Transformer block: Requires Bigram LM to be ready."],
  },
  request_id: "req_sample_static_001",
  generated_at: new Date().toISOString(),
  provenance: {
    source: "client-static-workspace",
    generated_by: "sample-artifact",
    generated_at: new Date().toISOString(),
    request_id: "req_sample_static_001",
  },
  validation_report: {
    schema: "ValidationReport",
    version: ROADMAP_CONTRACT_VERSION,
    valid: true,
    errors: [],
    warnings: [],
    provenance: { source: "client-static-workspace", generated_at: new Date().toISOString(), request_id: "req_sample_static_001" },
  },
};

export function importSampleRoadmapArtifact() {
  return SAMPLE_VALIDATED_ARTIFACT;
}
