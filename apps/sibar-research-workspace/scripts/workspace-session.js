import {
  ATTEMPT_SIGNAL_MAP,
  ANTI_OVERLOAD,
  DEFAULT_ARTIFACTS,
  DEFAULT_EVIDENCE,
  DEFAULT_ROADMAP,
  ARC_ID,
  MISSION_ID,
  HINTS,
  MODE_SCOPE_LABELS,
  NODE_HINTS,
  TRACKS,
} from "./workspace-data.js";
import { createInitialChecklist, normalizeText, formatAttempt } from "./workspace-utils.js";
import { buildDecisionFromRoadmap } from "./workspace-contract.js";
import { buildNodeStudyPlan, getNodeTitleById, getNodeLockedReasons } from "./workspace-study-plans.js";

function collectVisibleChoices(roadmap, maxChoices = ANTI_OVERLOAD.max_visible_choices) {
  const unlocked = roadmap.filter((node) => getNodeLockedReasons(node, roadmap).length === 0);
  return unlocked.slice(0, maxChoices).map((item) => item.id);
}

export function buildDecisionState(state) {
  const roadmap = state.roadmap || [];
  const decision = buildDecisionFromRoadmap(roadmap, {
    activeNodeId: state.activeNodeId || roadmap[0]?.id,
    maxVisibleChoices: state.maxVisibleChoices || ANTI_OVERLOAD.max_visible_choices,
  });
  const activeCount = state.sessionPlan?.sessions
    ? state.sessionPlan.sessions.filter((session) => session.status === "active").length
    : 1;

  decision.active_session_count = Math.min(activeCount, ANTI_OVERLOAD.max_active_sessions);
  decision.visible_choices = collectVisibleChoices(roadmap, state.maxVisibleChoices || ANTI_OVERLOAD.max_visible_choices);
  decision.locked_reasons = decision.why_not_others;
  decision.provenance = state.lastArtifactImport || {
    source: "static-workspace",
    policy: ANTI_OVERLOAD,
  };
  return decision;
}

export function activeRoadmapNode(state) {
  return (
    state.roadmap.find((node) => node.id === state.activeNodeId) ||
    state.roadmap.find((node) => node.status === "in_progress" || node.status === "built") ||
    state.roadmap[0]
  );
}

export function getStudyContext(state) {
  const node = activeRoadmapNode(state);
  const plan = buildNodeStudyPlan(node, state.roadmap);
  const miniNode = plan.miniNodes.find((item) => item.id === state.activeMiniNodeId) || plan.miniNodes[0];
  return { node, plan, miniNode, decision: buildDecisionState(state), roadmapLockReasons: plan.lockedReasons };
}

export function requestConceptHelpForState(state) {
  const context = getStudyContext(state);
  const resource = context.miniNode?.resources?.[0];
  state.activeNodeId = context.node?.id || context.plan.nodeId;
  state.activeMiniNodeId = context.miniNode?.id || context.plan.defaultMiniNodeId;
  state.conceptHelpRequested = true;
  state.repairAction = `Deepen ${context.miniNode.title}: ${resource?.action || "read the focused source and retry."}`;

  return {
    scope: MODE_SCOPE_LABELS["/read"],
    text: `Profundicemos mas en ${context.miniNode.title}: lee ${resource?.title || "the selected resource"}, escribe una reconstruccion de 3 lineas y repasemos el gap.`,
    readerFocus: context.miniNode.readerPrompt,
  };
}

function createAttemptHistoryItem(attempts, attemptText) {
  const attempt = normalizeText(attemptText);
  if (!attempt) return null;
  const full = attemptText.trim();
  attempts.push(full);
  return {
    index: attempts.length - 1,
    summary: formatAttempt(full, attempts.length - 1),
    full,
  };
}

function detectReadinessSignals(normalizedAttempt) {
  const signals = {};
  for (const [key, terms] of Object.entries(ATTEMPT_SIGNAL_MAP)) {
    signals[key] = terms.some((term) => normalizedAttempt.includes(term));
  }

  const missing = [];
  if (!signals.reconstruction) {
    missing.push("reconstruction not present");
  }
  if (!signals.explanation) {
    missing.push("explanation not present");
  }
  if (!signals.recall) {
    missing.push("recall not present");
  }

  return {
    ...signals,
    score: Object.values(signals).filter(Boolean).length,
    missing,
  };
}

function inferTargetNode(normalizedAttempt, roadmap) {
  for (const keyword of NODE_HINTS) {
    if (!normalizedAttempt.includes(keyword)) continue;
    const node = roadmap.find((item) => item.id === keyword);
    if (node) return node.id;
  }
  return roadmap.find((item) => item.status === "in_progress")?.id;
}

function readinessLabel(score) {
  if (score === 0) return "No evidence yet";
  if (score === 1) return "Attempt logged";
  if (score === 2) return "Ready for repair/build checks";
  return "Evidence-backed candidate";
}

function appendUnique(values, value) {
  if (!value) return;
  if (!values.includes(value)) values.push(value);
}

function applyAttemptEvaluation(state, attemptText, attempt) {
  const normalized = normalizeText(attemptText);
  const signals = detectReadinessSignals(normalized);
  const targetNodeId = inferTargetNode(normalized, state.roadmap);
  const targetNode = state.roadmap.find((item) => item.id === targetNodeId);

  state.detectedGap = signals.missing.join(", ") || "No immediate gap";
  state.readinessScore = signals.score;
  state.readinessLabel = readinessLabel(signals.score);
  state.lastDecision = buildDecisionState(state);

  for (const item of state.evidenceChecklist) {
    if (signals[item.id]) {
      item.complete = true;
    }
  }

  if (signals.reconstruction && !state.evidence.includes(`Attempt reconstruction: ${attempt.index + 1}`)) {
    state.evidence.push(`Attempt reconstruction: ${attempt.index + 1}`);
  }

  if (signals.explanation) {
    appendUnique(state.evidence, `Attempt explanation: ${attempt.index + 1}`);
  }

  if (targetNode && targetNode.status === "in_progress" && signals.score >= 2) {
    targetNode.status = "built";
    appendUnique(
      state.artifacts,
      `Build checkpoint: ${targetNode.title} (built from attempt ${attempt.index + 1})`,
    );
    state.repairAction = `Repair action ready for ${targetNode.title}: add a scalar failure test.`;
  }

  if (signals.score >= 3 && targetNode && targetNode.status === "built") {
    state.repairAction = `Repair complete for ${targetNode.title}: provide one concrete patch path.`;
    state.evidence.push(`Evidence package ready for ${targetNode.title}`);
  }

  return {
    targetNode,
    signals,
    detectedGap: state.detectedGap,
    readinessLabel: state.readinessLabel,
    readinessScore: state.readinessScore,
  };
}

export function evaluateAttemptForState(state, attemptText) {
  const entry = createAttemptHistoryItem(state.attempts, attemptText);
  if (!entry) return { entry: null, evaluation: null };
  return { entry, evaluation: applyAttemptEvaluation(state, attemptText, entry) };
}

function nextHint(attemptsCount) {
  return HINTS[Math.min(attemptsCount - 1, HINTS.length - 1)] || "Repair mode: create a smaller reconstruction and re-run attempt.";
}

export function makeModeAction(mode, state) {
  const context = getStudyContext(state);
  const targetNode = context.node;
  const targetTitle = context.plan.displayTitle;
  const miniTitle = context.miniNode?.title || "selected mini-node";
  const primaryResource = context.miniNode?.resources?.[0];

  const decision = context.decision;
  const decisionText = decision
    ? `Recommended: ${getNodeTitleById(state.roadmap, decision.recommended_next_node_id)}. Alternatives: ${(decision.alternatives || [])
      .map((item) => item.title)
      .join(", ")}. Locked: ${(decision.why_not_others || []).slice(0, 2).join("; ") || "none"}`
    : "No decision available yet.";

  switch (mode) {
    case "/map": {
      const deltas = state.lastCompile?.roadmapDeltas || [];
      const mapText = !deltas.length
        ? `Active node map: ${targetTitle} expands into ${context.plan.miniNodes.length} mini-nodes. Compile source to add roadmap deltas.`
        : `Roadmap deltas: ${deltas.map((delta) => `${delta.title}: ${delta.from} -> ${delta.to}`).join("; ")}. Active node: ${targetTitle}.`;
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `${mapText} ${decisionText}`,
      };
    }
    case "/read":
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Reader focus for ${targetTitle} / ${miniTitle}: ${context.miniNode.readerPrompt} Resource: ${primaryResource?.kind || "direct-reading"} - ${primaryResource?.title || context.plan.source} (${primaryResource?.source || context.plan.source}).`,
      };
    case "/explain":
      if (!state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: `Explain is scoped and withheld for ${targetTitle}: submit a reconstruction attempt before unlocking hint responses.`,
        };
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Hint-only explain scope for ${miniTitle}: ${nextHint(state.attempts.length)}`,
      };
    case "/test":
      if (!state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "Recall scope blocked until attempt evidence exists.",
        };
      }
      const recallPrompt = `Recall for ${targetTitle} / ${miniTitle}: state the chain-link between forward and backward for one node.`;
      appendUnique(state.artifacts, `Recall task: ${recallPrompt}`);
      appendUnique(state.evidence, `Recall card generated: ${recallPrompt}`);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Created recall prompt for ${targetTitle}.`,
      };
    case "/critic": {
      if (!state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "Critic needs an attempt to evaluate. Submit one first.",
        };
      }
      const lastAttempt = state.attempts[state.attempts.length - 1];
      const signals = detectReadinessSignals(normalizeText(lastAttempt));
      const verdict = {
        score: signals.score,
        gaps: signals.missing,
      };
      const text =
        verdict.score >= 2
          ? `Critic result: evidence-ready candidate with ${verdict.gaps.length} gap(s).`
          : `Critic result: insufficient detail; gaps -> ${verdict.gaps.join(", ")}`;
      state.detectedGap = verdict.gaps.join(", ") || "No immediate gap";
      if (verdict.gaps.length) {
        state.repairAction = `Repair action for ${miniTitle}: address ${verdict.gaps[0]}`;
      }
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text,
      };
    }
    case "/repair": {
      const suggestion = state.repairAction || `Repair action: reduce attempt scope to ${miniTitle} and re-run ${targetTitle} reconstruction.`;
      appendUnique(state.artifacts, `Repair task: ${suggestion}`);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Repair plan set: ${suggestion}`,
      };
    }
    case "/build": {
      const requirement = `Build requirement: implement ${targetTitle} mini artifact for ${miniTitle}.`;
      appendUnique(state.artifacts, requirement);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Build scope pinned. ${requirement}`,
      };
    }
    case "/publish": {
      if (state.readinessScore < 2 || !state.attempts.length) {
        return {
          scope: MODE_SCOPE_LABELS[mode],
          text: "Publish blocked: evidence-backed attempt required before publish scope unlocks.",
          blocked: true,
        };
      }
      const publishCandidate = state.roadmap.find((item) => item.status === "built") || state.roadmap.find((item) => item.status === "in_progress");
      if (publishCandidate) {
        publishCandidate.status = "published";
      }
      const publishedTitle = publishCandidate ? publishCandidate.title : targetTitle;
      appendUnique(state.evidence, `Evidence draft: ${publishedTitle} published.`);
      appendUnique(state.artifacts, `Published draft: ${publishedTitle}`);
      return {
        scope: MODE_SCOPE_LABELS[mode],
        text: `Publish scope applied to ${publishedTitle}.`,
      };
    }
    default:
      return { scope: "generic", text: `Unknown mode ${mode}` };
  }
}

export function describeModeAction(mode, state) {
  return makeModeAction(mode, state);
}

export function getActiveReaderResource(state, context) {
  const selected = state.activeSourceSelection;
  if (!selected) {
    return context.miniNode?.resources?.[0] || null;
  }
  const sameNode = selected.nodeId === context.node?.id;
  const sameMini = selected.miniNodeId === context.miniNode?.id;
  if (!sameNode || !sameMini) {
    return context.miniNode?.resources?.[0] || null;
  }

  const explicitIndex = Number.isInteger(selected.sourceIndex) ? selected.sourceIndex : Number(selected.sourceIndex);
  if (selected.sourceIndex === undefined || selected.sourceIndex === null || Number.isNaN(explicitIndex)) {
    return context.miniNode?.resources?.[0] || null;
  }
  return context.miniNode?.resources?.[explicitIndex] || context.miniNode?.resources?.[0] || null;
}

export function createDefaultState() {
  const roadmap = DEFAULT_ROADMAP.map((node) => ({ ...node }));
  const sessionPlan = buildDefaultSessionPlan(roadmap);
  const state = {
    todayMission: "Frontier AI researcher",
    todayArc: "Neural Nets from Scratch",
    roadmap,
    attempts: [],
    artifacts: [...DEFAULT_ARTIFACTS],
    evidence: [...DEFAULT_EVIDENCE],
    evidenceChecklist: createInitialChecklist(),
    mode: "/map",
    activeNodeId: "backprop",
    activeMiniNodeId: "chain-rule",
    conceptHelpRequested: false,
    activeSessionId: sessionPlan.active_session_id,
    maxActiveSessions: ANTI_OVERLOAD.max_active_sessions,
    maxVisibleChoices: ANTI_OVERLOAD.max_visible_choices,
    sessionPlan,
  expandedTreeNodes: {
      [MISSION_ID]: true,
      [ARC_ID]: true,
      "track-foundations": true,
      "track-sequence": true,
      [`${ARC_ID}-mini`]: true,
    },
    unlockedBySource: [],
    lastCompile: null,
    lastDecision: null,
    lastArtifactImport: null,
    lastContractValidation: null,
    lastContractPayload: "",
    contractStatusText: "",
    readinessLabel: "No evidence yet",
    readinessScore: 0,
    detectedGap: "Attempt before scope actions",
    repairAction: "None",
    modeActions: [],
    modeLogs: [],
    tracks: TRACKS.map((track) => ({ ...track, nodes: [...track.nodes] })),
    lastAction: null,
    roadmapSource: "default",
    artifactPlan: null,
    activeSourceSelection: null,
  };
  state.lastDecision = buildDecisionState(state);
  return state;
}

function buildDefaultSessionPlan(roadmap) {
  const defaultNode = roadmap.find((node) => node.status === "in_progress") || roadmap[0];
  const visibleChoices = collectVisibleChoices(roadmap, ANTI_OVERLOAD.max_visible_choices);
  return {
    sessions: [
      {
        id: "session-1",
        status: "active",
        selected_node_id: defaultNode?.id || "backprop",
        visible_choices: visibleChoices,
        locked_reasons: [],
      },
    ],
    max_active_sessions: ANTI_OVERLOAD.max_active_sessions,
    max_visible_choices: ANTI_OVERLOAD.max_visible_choices,
    active_session_id: "session-1",
  };
}
