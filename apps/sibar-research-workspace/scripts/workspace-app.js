import { HINTS } from "./workspace-data.js";
import { buildNodeStudyPlan } from "./workspace-study-plans.js";
import { formatJson } from "./workspace-utils.js";
import {
  applyRoadmapArtifact,
  compileCurrentStateArtifact,
  compileSourceToRoadmap,
  buildRoadmapArtifactFromRequest,
  importSampleRoadmapArtifact,
} from "./workspace-contract.js";
import {
  buildDecisionState,
  createDefaultState,
  evaluateAttemptForState,
  makeModeAction,
  requestConceptHelpForState,
} from "./workspace-session.js";
import {
  initRootElements,
  makeModeButtonList,
  renderChecklist,
  renderContractPanel,
  renderHistory,
  renderModeLog,
  renderNodeReader,
  renderRoadmap,
  renderSourceCard,
  renderTopBanner,
  renderItems,
  wireMiniNodeSelection,
  wireRoadmapSelection,
} from "./workspace-render.js";

const LM_MODES = ["/map", "/read", "/explain", "/test", "/critic", "/repair", "/build", "/publish"];

function nextHint(attemptsCount) {
  return HINTS[Math.min(attemptsCount - 1, HINTS.length - 1)] || "Repair mode: create a smaller reconstruction and re-run attempt.";
}

export function initResearchWorkspace({
  roadmapPanel = "roadmapList",
  artifactList = "artifactList",
  evidenceList = "evidenceList",
  attemptForm = {
    sourceText: "sourceText",
    compileButton: "compileSource",
    compilerResult: "compilerResult",
    attemptInput: "attemptInput",
    submitAttempt: "submitAttempt",
    requestHint: "requestHint",
    attemptBadge: "attemptBadge",
    attemptFeedback: "attemptFeedback",
    attemptHistory: "attemptHistory",
    sourceCard: "sourceCard",
    sourceCardTitle: "sourceCardTitle",
    sourceClaims: "sourceClaims",
    sourceSuggested: "sourceSuggested",
    sourceNextSession: "sourceNextSession",
    activeNodeTitle: "activeNodeTitle",
    activeNodeFocus: "activeNodeFocus",
    activeNodeSource: "activeNodeSource",
    conceptConfusion: "conceptConfusion",
    miniNodeList: "miniNodeList",
    readerInstruction: "readerInstruction",
    readerResourceList: "readerResourceList",
    evidenceChecklist: "evidenceChecklist",
    readinessSummary: "readinessSummary",
    gapSummary: "gapSummary",
    repairActionText: "repairActionText",
  },
  modePanel = "lmModes",
  modeStatus = "lmModeStatus",
  modeActionLog = "modeActionLog",
  lmContext = {
    activeNode: "lmActiveNode",
    activeMiniNode: "lmActiveMiniNode",
    recommendedDecision: "lmRecommendedDecision",
    decisionAlternatives: "lmDecisionAlternatives",
    decisionLockedReasons: "lmDecisionLockedReasons",
    readerMove: "lmReaderMove",
  },
} = {}) {
  const state = createDefaultState();

  const root = initRootElements(attemptForm, lmContext);
  root.roadmap = document.getElementById(roadmapPanel);
  root.artifacts = document.getElementById(artifactList);
  root.evidence = document.getElementById(evidenceList);
  root.modePanel = document.getElementById(modePanel);
  root.modeStatus = document.getElementById(modeStatus);
  root.modeActionLog = document.getElementById(modeActionLog);
  const maxModeEntries = 6;

  function render() {
    const context = renderNodeReader(root, state);
    renderRoadmap(
      state.roadmap,
      root.roadmap,
      context.node?.id || state.activeNodeId,
      `${state.activeNodeId}::${state.activeMiniNodeId}`,
      state.expandedTreeNodes,
      {
        missionTitle: state.todayMission,
        arcTitle: state.todayArc,
        tracks: state.tracks,
      },
    );
    renderItems(root.artifacts, state.artifacts);
    renderItems(root.evidence, state.evidence);
    renderHistory(root.attemptHistory, state.attempts);
    renderChecklist(root.evidenceChecklist, state.evidenceChecklist);
    if (root.readinessSummary) root.readinessSummary.textContent = state.readinessLabel;
    if (root.gapSummary) root.gapSummary.textContent = state.detectedGap;
    if (root.repairActionText) root.repairActionText.textContent = state.repairAction;
    renderModeLog(root.modeActionLog, state.modeActions);
    renderTopBanner(root, state);
    renderContractPanel(root, state);

    if (state.lastCompile) {
      renderSourceCard(root, state.lastCompile);
      if (root.compilerResult) {
        const unlockedText = state.lastCompile.unlockedNodes.length
          ? `Source mapped to roadmap: ${state.lastCompile.unlockedNodes.join(", ")}.`
          : "No roadmap unlocks; keep claims concrete.";
        root.compilerResult.textContent = `${unlockedText} In progress nodes: ${state.lastCompile.inProgressCount}.`;
      }
    } else if (root.compilerResult) {
      root.compilerResult.textContent = "Use Compile source to roadmap, then Generate contract payload.";
    }

    wireRoadmapSelection(state, root, (selection) => pushModeAction(selection), render);
    wireMiniNodeSelection(root, state, render);
  }

  function pushModeAction(entry) {
    state.lastAction = entry;
    state.modeActions = [entry, ...state.modeActions].slice(0, maxModeEntries);
    renderModeLog(root.modeActionLog, state.modeActions);
  }

  function runMode(mode) {
    const action = makeModeAction(mode, state);
    pushModeAction(action);
    if (action.text && root.attemptFeedback) {
      root.attemptFeedback.textContent = action.text;
    }
    if (mode === "/critic" && action.text === "No immediate gap") {
      state.detectedGap = "No immediate gap";
    }
    render();
  }

  function selectNode(nodeId) {
    const plan = buildNodeStudyPlan(nodeId, state.roadmap);
    state.activeNodeId = plan.nodeId;
    state.activeMiniNodeId = plan.defaultMiniNodeId;
    state.activeSourceSelection = null;
    state.conceptHelpRequested = false;
    state.lastDecision = buildDecisionState(state);
    pushModeAction({
      scope: "/map",
      text: `Active node selected: ${plan.displayTitle}; ${plan.miniNodes.length} mini-nodes loaded into reader.`,
    });
    render();
  }

  function selectMiniNode(miniNodeId) {
    const plan = buildNodeStudyPlan(state.activeNodeId, state.roadmap);
    const miniNode = plan.miniNodes.find((item) => item.id === miniNodeId);
    if (!miniNode) return;
    state.activeMiniNodeId = miniNode.id;
    state.activeSourceSelection = null;
    state.conceptHelpRequested = false;
    state.lastAction = {
      scope: "/read",
      text: `Reader focused: ${plan.displayTitle} / ${miniNode.title}.`,
    };
    state.lastDecision = buildDecisionState(state);
    pushModeAction(state.lastAction);
    render();
  }

  function setMode(nextMode) {
    state.mode = nextMode;
    const buttons = root.modePanel?.querySelectorAll("button[data-mode]");
    buttons?.forEach((button) => button.setAttribute("aria-pressed", button.dataset.mode === nextMode ? "true" : "false"));
    if (root.modeStatus) root.modeStatus.textContent = `Mode: ${nextMode}`;
    runMode(nextMode);
  }

  function wireModes() {
    if (!root.modePanel) return [];
    const buttons = Array.from(root.modePanel.querySelectorAll("button[data-mode]"));
    const configuredModes = new Set();
    buttons.forEach((button) => {
      const mode = button.dataset.mode;
      if (!mode) return;
      configuredModes.add(mode);
      if (!button.textContent || !button.textContent.trim()) {
        button.textContent = mode;
      }
      button.type = "button";
      button.setAttribute("aria-pressed", mode === "/map" ? "true" : "false");
      button.addEventListener("click", () => setMode(mode));
    });

    return makeModeButtonList(root.modePanel, LM_MODES);
  }

  function applyPayloadFromTextarea(label) {
    if (!root.contractPayload?.value) {
      state.contractStatusText = "No payload available to import.";
      renderContractPanel(root, state);
      return;
    }
    try {
      const parsed = JSON.parse(root.contractPayload.value);
      const candidate = parsed.artifact || parsed;
      const result = applyRoadmapArtifact(state, candidate);
      state.lastContractPayload = root.contractPayload.value;
      if (!result.applied) {
        state.contractStatusText = `Contract import failed: ${(result.validation?.errors || []).map((error) => error.message).join(" | ")}`;
        return;
      }
      state.contractStatusText = `Applied ${label} artifact ${result.artifact?.artifact_id || ""} to roadmap.`;
      state.roadmapSource = "applied-artifact";
      if (state.roadmapSource === "applied-artifact") {
        state.lastApplyResult = {
          artifact_id: result.artifact?.artifact_id,
          request_id: result.artifact?.request_id,
          source: label,
        };
      }
      render();
      return;
    } catch {
      state.contractStatusText = "Unable to parse contract payload JSON.";
      renderContractPanel(root, state);
    }
  }

  root.compileButton?.addEventListener("click", () => {
    const sourceResult = compileSourceToRoadmap(root.sourceText?.value || "", state.roadmap);
    state.roadmap = sourceResult.roadmap;
    state.unlockedBySource = sourceResult.unlockedNodes;
    state.lastCompile = sourceResult;
    state.lastDecision = buildDecisionState(state);
    state.lastDecisionText = `Decision recalculated from source compile: ${state.lastDecision.recommended_next_node_id}`;
    render();
    pushModeAction({
      scope: "/map",
      text: `Source mapped. Claims: ${sourceResult.sourceCard.claims.length}; next outputs: ${sourceResult.sourceCard.nextSessionOutputs.length}.`,
    });
  });

  root.buildContractPayload?.addEventListener("click", () => {
    const artifactPackage = compileCurrentStateArtifact(state, root.sourceText?.value || "");
    const payload = {
      request: artifactPackage.request,
      artifact: artifactPackage.artifact,
      validation: artifactPackage.validation,
    };
    state.lastContractPayload = formatJson(payload);
    state.contractStatusText = artifactPackage.validation.valid ? "Generated valid contract payload." : "Generated invalid payload (see validation).";
    state.lastArtifactPayload = payload;
    state.lastContractValidation = artifactPackage.validation;
    renderContractPanel(root, state);
    render();
    pushModeAction({
      scope: "contract",
      text: `Compiled roadmap contract payload from ${state.todayMission}/${state.todayArc}.`,
    });
  });

  root.applyGeneratedArtifact?.addEventListener("click", () => applyPayloadFromTextarea("generated"));
  root.applySampleArtifact?.addEventListener("click", () => {
    root.contractPayload.value = formatJson(importSampleRoadmapArtifact());
    applyPayloadFromTextarea("sample");
  });

  root.submitAttempt?.addEventListener("click", () => {
    const current = root.attemptInput?.value || "";
    const evaluation = evaluateAttemptForState(state, current);
    if (!evaluation.entry) {
      root.attemptFeedback.textContent = "Attempt is required before any tool mode can continue.";
      return;
    }
    root.attemptInput.value = "";
    root.requestHint.disabled = false;
    root.attemptBadge.textContent = `Attempt ${state.attempts.length}`;
    render();

    if (state.attempts.length === 1) {
      root.attemptFeedback.textContent = "Reconstruction captured. Move through /explain and /critic next.";
    } else if (state.attempts.length === 2) {
      root.attemptFeedback.textContent = `Attempt logged (${evaluation.evaluation.readinessLabel}). Use /test to generate recall.`;
    } else {
      root.attemptFeedback.textContent = `Evidence readiness: ${evaluation.evaluation.readinessLabel}. Next action: ${state.repairAction}.`;
    }

    pushModeAction({
      scope: "evaluation",
      text: `Attempt ${evaluation.entry.index + 1} evaluated -> ${evaluation.evaluation.readinessLabel}; target ${evaluation.evaluation.targetNode?.title || "none"}.`,
    });
  });

  root.conceptConfusion?.addEventListener("click", () => {
    const action = requestConceptHelpForState(state);
    if (root.attemptFeedback) {
      root.attemptFeedback.textContent = action.text;
    }
    pushModeAction(action);
    render();
  });

  root.requestHint?.addEventListener("click", () => {
    root.attemptFeedback.textContent = nextHint(state.attempts.length);
    pushModeAction({
      scope: "hint",
      text: `Hint emitted for attempt ${state.attempts.length}.`,
    });
  });

  state.lastDecision = buildDecisionState(state);
  render();
  const wiredModes = wireModes();
  setMode("/map");

  return {
    state,
    rerender: render,
    setMode,
    runMode,
    wireModes,
    wiredModes,
    selectNode,
    selectMiniNode,
    createModeAction: makeModeAction,
    buildRoadmapArtifactFromRequest,
    applyRoadmapArtifact,
    compileCurrentStateArtifact,
  };
}

export { LM_MODES };
