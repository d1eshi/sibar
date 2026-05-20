import { escapeHtml } from "./workspace-utils.js";
import { ARC_ID, MISSION_ID, STATUS, STATUS_CLASS, TRACKS } from "./workspace-data.js";
import { buildNodeStudyPlan, getNodeById } from "./workspace-study-plans.js";
import { buildDecisionState, getActiveReaderResource, getStudyContext } from "./workspace-session.js";

function createArtifactTreeNode(node) {
  const planItem = buildNodeStudyPlan(node.id, [node]);
  return {
    kind: "node",
    depth: 3,
    id: node.id,
    title: planItem.displayTitle,
    status: node.status || "unseen",
    lockedReasons: planItem.lockedReasons,
    miniNodes: (planItem.miniNodes || []).map((miniNode) => ({
      kind: "mini-node",
      id: `${node.id}::${miniNode.id}`,
      nodeId: node.id,
      title: miniNode.title,
      readerPrompt: miniNode.readerPrompt,
      resources: (miniNode.resources || []).map((resource, index) => ({
        kind: "source",
        id: `${node.id}::${miniNode.id}::source-${index}`,
        nodeId: node.id,
        miniNodeId: miniNode.id,
        sourceIndex: index,
        title: resource.title,
        source: resource.source || "Current source",
        action: resource.action,
      })),
    })),
  };
}

function buildRoadmapTree(roadmap, context = {}) {
  const missionTitle = context.missionTitle || "Frontier AI researcher";
  const arcTitle = context.arcTitle || "Neural Nets from Scratch";
  const tracks = Array.isArray(context.tracks) && context.tracks.length ? context.tracks : TRACKS;
  const trackNodes = tracks.map((track) => {
    const trackNodeIds = track.nodes || track.node_ids || [];
    const trackNodes = trackNodeIds
      .map((nodeId) => {
        const node = roadmap.find((entry) => entry.id === nodeId);
        if (!node) return null;
        return createArtifactTreeNode(node, null, 3);
      })
      .filter(Boolean);

    return {
      kind: "track",
      id: track.id,
      title: track.title,
      status: track.status,
      children: trackNodes,
    };
  });

  return {
    kind: "mission",
    id: MISSION_ID,
    title: missionTitle,
    children: [
      {
        kind: "arc",
        id: ARC_ID,
        title: arcTitle,
        children: trackNodes,
      },
    ],
  };
}

function renderRoadmapNode(node, activeNodeId, activeMiniNodeId, expandedNodes) {
  const isNode = node.kind === "node";
  const isMini = node.kind === "mini-node";
  const isSource = node.kind === "source";
  const hasChildren =
    (Array.isArray(node.children) && node.children.length > 0) ||
    (Array.isArray(node.miniNodes) && node.miniNodes.length > 0) ||
    (Array.isArray(node.resources) && node.resources.length > 0);
  const expanded = expandedNodes[node.id] !== false;
  const isActiveNode = node.kind === "node" && node.id === activeNodeId;
  const isActiveMini = node.kind === "mini-node" && node.id === activeMiniNodeId;
  const lockClass = node.lockedReasons?.length ? "locked" : "";
  const nodeButtonClass = [
    "roadmap-tree-node",
    node.kind,
    STATUS_CLASS[node.status || "unseen"],
    lockClass,
    isActiveNode ? "active" : "",
    isActiveMini ? "active-mini" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const marker = isNode ? STATUS[node.status || "unseen"] : "▸";
  const statusText = isNode ? `<span class=\"roadmap-status\" aria-label=\"${escapeHtml(node.status || "unseen")}\">${marker}</span>` : "";
  const title = escapeHtml(node.title);
  const expandIcon = hasChildren ? (expanded ? "▾" : "▸") : "•";
  const nodeData = node.kind === "mini-node" ? `${node.nodeId}::${node.id}` : node.id;
  const selectedNodeId = node.kind === "source" ? node.nodeId || node.id : node.id;
  const sourceNodeId = node.kind === "source" ? node.nodeId || "" : "";
  const sourceMiniId = node.kind === "source" ? node.miniNodeId || "" : "";
  const sourceIndex = node.kind === "source" && Number.isInteger(node.sourceIndex) ? node.sourceIndex : "";
  const selectKind =
    node.kind === "source"
      ? "source"
      : node.kind === "mini-node"
        ? "mini-node"
        : node.kind === "node"
          ? "node"
          : "container";

  const selectableClass = isNode || isMini || isSource ? "selectable" : "";

  const childrenMarkup = () => {
    if (!hasChildren || !expanded) return "";
    const childNodes = node.children?.length
      ? node.children
      : node.miniNodes?.length
        ? node.miniNodes
        : node.resources || [];
    const children = childNodes.map((child) => `<li>${renderRoadmapNode(child, activeNodeId, activeMiniNodeId, expandedNodes)}</li>`).join("");
    return `<ul class="roadmap-tree-children">${children}</ul>`;
  };

  return `
    <div class="roadmap-tree-item ${selectableClass} ${isActiveNode ? "active" : ""}">
      <button type="button"
        class="${nodeButtonClass}"
        data-tree-id="${escapeHtml(node.id)}"
        data-tree-kind="${escapeHtml(node.kind)}"
        data-node-id="${escapeHtml(selectedNodeId)}"
        data-select-kind="${selectKind}"
        data-select-target="${escapeHtml(nodeData)}"
        data-target-mini="${escapeHtml(isMini ? node.id : "") }"
        data-target-source="${escapeHtml(isSource ? node.id : "") }"
        data-source-node="${escapeHtml(sourceNodeId)}"
        data-source-mini="${escapeHtml(sourceMiniId)}"
        data-source-index="${escapeHtml(String(sourceIndex))}"
        data-aria-has-children="${hasChildren ? "true" : "false"}"
        aria-expanded="${hasChildren ? String(expanded) : "false"}"
        data-expanded="${expanded ? "true" : "false"}"
      >${expandIcon} ${statusText} ${title}</button>
      ${childrenMarkup()}
    </div>
  `;
}

export function renderRoadmap(roadmap, roadmapEl, activeNodeId, activeMiniNodeId, expandedNodes, roadmapContext = {}) {
  if (!roadmapEl) return;
  const tree = buildRoadmapTree(roadmap, roadmapContext);
  const treeNode = renderRoadmapNode(tree, activeNodeId, activeMiniNodeId, expandedNodes);
  roadmapEl.innerHTML = `<li>${treeNode}</li>`;
}

export function renderItems(listEl, values) {
  if (!listEl) return;
  listEl.innerHTML = values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
}

export function renderSourceCard(root, sourceResult) {
  if (!root.sourceCard || !sourceResult?.sourceCard) return;
  if (root.sourceCardTitle) root.sourceCardTitle.textContent = sourceResult.sourceCard.title;

  const claims = sourceResult.sourceCard.claims || [];
  const suggested = sourceResult.sourceCard.suggestedNodes || [];
  const next = sourceResult.sourceCard.nextSessionOutputs || [];
  root.sourceClaims.innerHTML = claims.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  root.sourceSuggested.innerHTML = suggested.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  root.sourceNextSession.innerHTML = next.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

export function renderHistory(historyEl, attempts) {
  if (!historyEl) return;
  if (!attempts.length) {
    historyEl.textContent = "No attempts yet. Start by writing one short reconstruction.";
    return;
  }
  historyEl.textContent = attempts.map((attempt, index) => `Attempt ${index + 1}: ${attempt}`).join("\n");
}

export function renderChecklist(el, checklist) {
  if (!el) return;
  el.innerHTML = checklist
    .map((item) => `<li class="${item.complete ? "done" : ""}">${item.complete ? "[x]" : "[ ]"} ${escapeHtml(item.label)}</li>`)
    .join("");
}

export function renderModeLog(logEl, entries) {
  if (!logEl) return;
  logEl.innerHTML = entries.map((entry) => `<li>[${escapeHtml(entry.scope)}] ${escapeHtml(entry.text)}</li>`).join("");
}

export function renderContractPanel(root, state) {
  if (!root.contractPayload) return;
  if (!state.lastContractPayload) {
    root.contractPayload.value = "";
  }
  if (root.contractStatus) {
    root.contractStatus.textContent = state.contractStatusText || "";
  }
  if (state.lastContractPayload && !root.contractPayload.value) {
    root.contractPayload.value = state.lastContractPayload;
  }
  if (state.lastContractPayload) {
    root.contractPayload.value = state.lastContractPayload;
  }
}

export function renderTopBanner(root, state) {
  if (root.todayMission) root.todayMission.textContent = state.todayMission;
  if (root.todayMissionField) root.todayMissionField.textContent = state.todayMission;
  if (root.todayArc) root.todayArc.textContent = state.todayArc;
  if (root.todayArcField) root.todayArcField.textContent = state.todayArc;
}

export function renderNodeReader(root, state) {
  const context = getStudyContext(state);
  state.activeNodeId = context.node?.id || context.plan.nodeId;
  state.activeMiniNodeId = context.miniNode?.id || context.plan.defaultMiniNodeId;
  const selectedResource = getActiveReaderResource(state, context);
  if (root.activeNodeTitle) root.activeNodeTitle.textContent = `Learning Node: ${context.plan.displayTitle}`;
  if (root.activeNodeFocus) root.activeNodeFocus.textContent = context.plan.focus;
  if (root.activeNodeSource) {
    root.activeNodeSource.textContent = `Source: ${selectedResource?.title || context.plan.source}`;
  }

  const lockText = context.roadmapLockReasons.length ? ` (locked: ${context.roadmapLockReasons.join(", ")})` : "";
  if (root.activeNodeTitle) {
    root.activeNodeTitle.textContent = `Learning Node: ${context.plan.displayTitle}${lockText}`;
  }

  if (root.miniNodeList) {
    root.miniNodeList.innerHTML = context.plan.miniNodes
      .map(
        (miniNode) => `
          <li>
            <button type="button"
              data-mini-node-id="${escapeHtml(miniNode.id)}"
              aria-pressed="${miniNode.id === context.miniNode.id ? "true" : "false"}"
            >
              <strong>${escapeHtml(miniNode.title)}</strong>
              <span>${escapeHtml(miniNode.goal)}</span>
            </button>
          </li>
        `,
      )
      .join("");
  }

  if (root.readerInstruction) {
    const helpPrefix = state.conceptHelpRequested ? "Profundicemos: " : "";
    root.readerInstruction.textContent = `${helpPrefix}${context.miniNode.readerPrompt}`;
  }

  if (root.readerResourceList) {
    root.readerResourceList.innerHTML = (context.miniNode.resources || [])
      .map(
        (resource) => `
          <li>
            <strong>${escapeHtml(resource.kind)}</strong>: ${escapeHtml(resource.title)}
            <span>${escapeHtml(resource.source)} - ${escapeHtml(resource.action)}</span>
          </li>
        `,
      )
      .join("");
  }

  renderLmContext(root, context, selectedResource);
  return context;
}

function renderLmContext(root, context, activeResource = null) {
  const decision = context.decision || {};
  const alternatives = (decision.alternatives || []).map((entry) => entry.title).join(", ") || "none";
  const reasons = (decision.why_not_others || []).join(" | ") || "none";
  const resource = activeResource || context.miniNode?.resources?.[0];
  if (root.lmActiveNode) root.lmActiveNode.textContent = context.plan.displayTitle;
  if (root.lmActiveMiniNode) root.lmActiveMiniNode.textContent = context.miniNode?.title || "None";
  if (root.lmRecommendedDecision) root.lmRecommendedDecision.textContent = context.plan.recommendedDecision;
  if (root.lmDecisionAlternatives) root.lmDecisionAlternatives.textContent = alternatives;
  if (root.lmDecisionLockedReasons) root.lmDecisionLockedReasons.textContent = reasons;
  if (root.lmReaderMove) {
    root.lmReaderMove.textContent = resource
      ? `${context.plan.readerMove} Current resource: ${resource.title}.`
      : context.plan.readerMove;
  }
}

export function toNodeIdFromTreeNode(treeNodeId) {
  return treeNodeId.includes("::") ? treeNodeId.split("::")[0] : treeNodeId;
}

export function toggleTreeNode(treeId, expandedNodes) {
  const hasState = Object.prototype.hasOwnProperty.call(expandedNodes, treeId);
  if (!hasState && expandedNodes[treeId] === undefined) {
    expandedNodes[treeId] = false;
    return;
  }
  expandedNodes[treeId] = !expandedNodes[treeId];
}

export function wireRoadmapSelection(state, root = {}, onSelection, rerender) {
  const normalizedSourceIndex = (rawIndex) => {
    if (rawIndex === undefined || rawIndex === null || rawIndex === "") return null;
    const parsed = Number.parseInt(rawIndex, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  if (!state || !root || !root.roadmap) return;
  const buttons = root.roadmap?.querySelectorAll?.("button[data-select-kind]");
  buttons?.forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      let selectAction = null;
      const type = button.dataset.selectKind || "node";
      const nodeId = button.dataset.nodeId;
      const targetMini = button.dataset.targetMini;
      const targetSource = button.dataset.targetSource;
      const sourceNode = button.dataset.sourceNode || "";
      const sourceMini = button.dataset.sourceMini || "";
      const sourceIndex = normalizedSourceIndex(button.dataset.sourceIndex);

      if (button.dataset.ariaHasChildren === "true" && type === "container") {
        toggleTreeNode(nodeId, state.expandedTreeNodes);
      }
      if (type === "node") {
        const selected = getNodeById(state.roadmap, nodeId) ? nodeId : null;
        if (selected) {
          state.activeNodeId = selected;
          state.activeMiniNodeId = buildNodeStudyPlan(selected, state.roadmap).defaultMiniNodeId;
          state.activeSourceSelection = null;
          state.conceptHelpRequested = false;
          state.lastDecision = buildDecisionState(state);
          selectAction = {
            scope: "/map",
            text: `Active node selected: ${state.activeNodeId}.`,
          };
        }
      }

      if (type === "mini-node") {
        if (targetMini) {
          const nodeIdFromMini = toNodeIdFromTreeNode(targetMini);
          const plan = buildNodeStudyPlan(nodeIdFromMini, state.roadmap);
          if (plan?.miniNodes?.some((item) => `${plan.nodeId}::${item.id}` === targetMini)) {
            state.activeNodeId = plan.nodeId;
            state.activeMiniNodeId = targetMini.includes("::") ? targetMini.split("::").pop() : targetMini;
            state.activeSourceSelection = null;
          }
          state.conceptHelpRequested = false;
          state.lastDecision = buildDecisionState(state);
          selectAction = {
            scope: "/read",
            text: `Reader focused: ${plan?.displayTitle || state.activeNodeId} / ${state.activeMiniNodeId}.`,
          };
        }
      } else if (type === "source") {
        const sourcePlan = buildNodeStudyPlan(sourceNode || nodeId, state.roadmap);
        const selectedMiniNodeId = sourceMini || "";
        const miniNode = sourcePlan?.miniNodes?.find((entry) => entry.id === selectedMiniNodeId);
        const resource = miniNode?.resources?.[sourceIndex ?? 0] || sourcePlan?.miniNodes?.[0]?.resources?.[0];

        if (sourcePlan && selectedMiniNodeId && miniNode) {
          state.activeNodeId = sourcePlan.nodeId;
          state.activeMiniNodeId = miniNode.id;
          state.activeSourceSelection = {
            nodeId: sourcePlan.nodeId,
            miniNodeId: miniNode.id,
            sourceIndex: sourceIndex ?? 0,
            sourceId: targetSource || sourcePlan?.miniNodes?.find((entry) => entry.id === selectedMiniNodeId)?.title || null,
          };
          state.conceptHelpRequested = false;
          state.lastDecision = buildDecisionState(state);
          selectAction = {
            scope: "/read",
            text: `Source selected: ${resource?.title || "resource"} for ${sourcePlan.displayTitle} / ${miniNode.title}.`,
          };
        }
      }

      if (typeof onSelection === "function" && typeof selectAction === "object" && selectAction !== null) {
        onSelection(selectAction);
      }
      if (typeof rerender === "function") {
        rerender();
      }
    });
  });
}

export function wireMiniNodeSelection(root = {}, state, rerender) {
  if (!root || !state || !root.miniNodeList) return;
  const buttons = root.miniNodeList?.querySelectorAll?.("button[data-mini-node-id]");
  buttons?.forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const miniNodeId = button.dataset.miniNodeId;
      const plan = buildNodeStudyPlan(state.activeNodeId, state.roadmap);
      const miniNode = plan.miniNodes.find((item) => item.id === miniNodeId);
      if (!miniNode) return;
      state.activeMiniNodeId = miniNode.id;
      state.conceptHelpRequested = false;
      state.activeSourceSelection = null;
      state.lastAction = {
        scope: "/read",
        text: `Reader focused: ${plan.displayTitle} / ${miniNode.title}.`,
      };
      if (typeof rerender === "function") {
        rerender();
      }
    });
  });
}

export function initRootElements(attemptForm, lmContext) {
  return {
    roadmap: document.getElementById("roadmapList"),
    artifacts: document.getElementById("artifactList"),
    evidence: document.getElementById("evidenceList"),
    compileButton: document.getElementById(attemptForm.compileButton),
    sourceText: document.getElementById(attemptForm.sourceText),
    buildContractPayload: document.getElementById("buildContractPayload"),
    applyGeneratedArtifact: document.getElementById("applyGeneratedArtifact"),
    applySampleArtifact: document.getElementById("applySampleArtifact"),
    contractPayload: document.getElementById("contractPayload"),
    contractStatus: document.getElementById("contractStatus"),
    compilerResult: document.getElementById(attemptForm.compilerResult),
    attemptInput: document.getElementById(attemptForm.attemptInput),
    submitAttempt: document.getElementById(attemptForm.submitAttempt),
    requestHint: document.getElementById(attemptForm.requestHint),
    attemptBadge: document.getElementById(attemptForm.attemptBadge),
    attemptFeedback: document.getElementById(attemptForm.attemptFeedback),
    attemptHistory: document.getElementById(attemptForm.attemptHistory),
    sourceCard: document.getElementById(attemptForm.sourceCard),
    sourceCardTitle: document.getElementById(attemptForm.sourceCardTitle),
    sourceClaims: document.getElementById(attemptForm.sourceClaims),
    sourceSuggested: document.getElementById(attemptForm.sourceSuggested),
    sourceNextSession: document.getElementById(attemptForm.sourceNextSession),
    activeNodeTitle: document.getElementById(attemptForm.activeNodeTitle),
    activeNodeFocus: document.getElementById(attemptForm.activeNodeFocus),
    activeNodeSource: document.getElementById(attemptForm.activeNodeSource),
    conceptConfusion: document.getElementById(attemptForm.conceptConfusion),
    miniNodeList: document.getElementById(attemptForm.miniNodeList),
    readerInstruction: document.getElementById(attemptForm.readerInstruction),
    readerResourceList: document.getElementById(attemptForm.readerResourceList),
    evidenceChecklist: document.getElementById(attemptForm.evidenceChecklist),
    readinessSummary: document.getElementById(attemptForm.readinessSummary),
    gapSummary: document.getElementById(attemptForm.gapSummary),
    repairActionText: document.getElementById(attemptForm.repairActionText),
    modePanel: document.getElementById("lmModes"),
    modeStatus: document.getElementById("lmModeStatus"),
    modeActionLog: document.getElementById("modeActionLog"),
    lmActiveNode: document.getElementById(lmContext.activeNode),
    lmActiveMiniNode: document.getElementById(lmContext.activeMiniNode),
    lmRecommendedDecision: document.getElementById(lmContext.recommendedDecision),
    lmDecisionAlternatives: document.getElementById(lmContext.decisionAlternatives),
    lmDecisionLockedReasons: document.getElementById(lmContext.decisionLockedReasons),
    lmReaderMove: document.getElementById(lmContext.readerMove),
    todayMission: document.getElementById("todayMission"),
    todayMissionField: document.getElementById("todayMissionField"),
    todayArc: document.getElementById("todayArc"),
    todayArcField: document.getElementById("todayArcField"),
  };
}

export function makeModeButtonList(modePanel, configuredModes, fallbackModes = ["/publish"]) {
  const existingModes = Array.from(modePanel?.querySelectorAll?.("button[data-mode]") || []);
  const buttonsByMode = new Set(existingModes.map((button) => button.dataset.mode));
  configuredModes.forEach((mode) => {
    if (buttonsByMode.has(mode)) return;
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = mode;
    button.dataset.mode = mode;
    button.setAttribute("aria-pressed", mode === "/map" ? "true" : "false");
    li.appendChild(button);
    modePanel.appendChild(li);
    buttonsByMode.add(mode);
  });
  return configuredModes.filter((mode) => buttonsByMode.has(mode) || fallbackModes.includes(mode));
}
