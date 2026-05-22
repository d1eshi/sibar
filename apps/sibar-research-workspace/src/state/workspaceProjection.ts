import type { WorkspaceSessionState } from "./workspaceReducer";

export type WorkspaceMaterialMode =
  | "paper"
  | "note"
  | "artifact"
  | "code"
  | "equation"
  | "math"
  | "fallback";

export type WorkspaceSource = {
  id: string;
  title: string;
  type: WorkspaceMaterialMode;
  metadata: string;
  snippet: string;
  body: readonly string[];
};

export type WorkspaceMiniNode = {
  id: string;
  name: string;
  question: string;
  sourceId: string;
};

export type WorkspaceStudyNode = {
  id: string;
  name: string;
  scope: string;
  sessionTitle: string;
  status: "complete" | "ready" | "queued" | "locked";
  miniNodes: readonly WorkspaceMiniNode[];
};

export type WorkspaceSessionFixture = {
  title: string;
  sessionHint: string;
  nodes: readonly WorkspaceStudyNode[];
  sources: readonly WorkspaceSource[];
};

export type WorkspaceSessionProjection = {
  title: string;
  sessionHint: string;
  nodes: readonly WorkspaceStudyNode[];
  sources: readonly WorkspaceSource[];
  sourceCount: number;
  selectedNode: WorkspaceStudyNode;
  selectedMiniNode: WorkspaceMiniNode;
  selectedSource: WorkspaceSource;
  selectedMaterial: {
    id: string;
    mode: WorkspaceMaterialMode;
    title: string;
    content: readonly string[];
    modeLabel: string;
  };
  readinessLabel: string;
  recallStatus: string;
};

export type WorkspaceHomeTarget = "overview" | "session";

export type WorkspaceHomeWorkspace = {
  id: string;
  title: string;
  objective: string;
  sourceBoundary: string;
  progress: string;
  nextNode: string;
  readinessHint: string;
  readinessPercent: number;
  readinessLevel: string;
  lastActivity: string;
  icon: "cluster" | "document" | "code";
  status: "active" | "ready" | "draft" | "blocked";
  openTarget: WorkspaceHomeTarget;
};

export type WorkspaceHomeProjection = {
  workspaces: readonly WorkspaceHomeWorkspace[];
};

function getWorkspaceSourceById(
  sources: readonly WorkspaceSource[],
  sourceId: string | null,
): WorkspaceSource {
  return (
    sources.find((source) => source.id === sourceId) ??
    sources[0] ?? {
      id: "unresolved-source",
      type: "fallback",
      title: "Source unavailable",
      metadata: "No source selected",
      snippet: "Select a source from the study path to load a study context.",
      body: ["Select a source from the study path to load a study context."],
    }
  );
}

const fallbackNode: WorkspaceStudyNode = {
  id: "fallback-node",
  name: "Ready node",
  scope: "Define a focus to see this study node.",
  sessionTitle: "Session unavailable",
  status: "locked",
  miniNodes: [],
};

const fallbackMiniNode: WorkspaceMiniNode = {
  id: "fallback-mini-node",
  name: "Ready mini-node",
  question: "Open a study path to start the first session.",
  sourceId: "unresolved-source",
};

export function createInitialWorkspaceStateFromFixture(
  fixture: WorkspaceSessionFixture,
  overrides?: Partial<WorkspaceSessionState>,
): WorkspaceSessionState {
  const firstNode = fixture.nodes[0];
  const initialNode =
    fixture.nodes.find((node) => node.status !== "complete") ?? firstNode;
  const firstMini = initialNode?.miniNodes[0];
  const fallbackSourceId =
    firstMini?.sourceId ??
    fixture.sources[0]?.id ??
    "unresolved-source";

  return {
    selectedNodeId: initialNode?.id ?? "",
    selectedMiniNodeId: firstMini?.id ?? "",
    selectedSourceId: fallbackSourceId,
    isReadinessPanelVisible: true,
    studyCourseTitle: fixture.title,
    studyNoteDraft: "",
    studyNotes: [],
    ...overrides,
  };
}

function getMaterialModeLabel(mode: WorkspaceMaterialMode): string {
  if (mode === "code") {
    return "Code";
  }

  if (mode === "paper") {
    return "Paper";
  }

  if (mode === "note") {
    return "Note";
  }

  if (mode === "artifact") {
    return "Artifact";
  }

  if (mode === "equation" || mode === "math") {
    return "Equation";
  }

  return "Material";
}

function getRecallStatus(mode: WorkspaceMaterialMode): string {
  if (mode === "code" || mode === "artifact") {
    return "Recall is a pedagogy follow-up: verify implementation and evidence after this node is completed.";
  }

  if (mode === "equation" || mode === "math") {
    return "Recall is a pedagogy follow-up: reconstruct the derivation after an explanation attempt.";
  }

  return "Recall is a pedagogy follow-up after the node is complete and evidence is tied to the source.";
}

export function projectWorkspaceSession(
  state: WorkspaceSessionState,
  fixture: WorkspaceSessionFixture,
): WorkspaceSessionProjection {
  const selectedNode =
    fixture.nodes.find((node) => node.id === state.selectedNodeId) ??
    fixture.nodes[0] ??
    fallbackNode;

  const selectedMiniNode =
    selectedNode?.miniNodes.find((mini) => mini.id === state.selectedMiniNodeId) ??
    selectedNode?.miniNodes[0] ??
    fallbackMiniNode;

  const validSourceId =
    state.selectedSourceId &&
    fixture.sources.some((source) => source.id === state.selectedSourceId)
      ? state.selectedSourceId
      : selectedMiniNode?.sourceId ??
        fixture.sources[0]?.id ??
        null;

  const selectedSource = getWorkspaceSourceById(fixture.sources, validSourceId);

  return {
    title: fixture.title,
    sessionHint: fixture.sessionHint,
    selectedNode,
    selectedMiniNode,
    selectedSource,
    selectedMaterial: {
      id: selectedSource.id,
      mode: selectedSource.type,
      title: selectedSource.title,
      content: selectedSource.body,
      modeLabel: getMaterialModeLabel(selectedSource.type),
    },
    nodes: fixture.nodes,
    sources: fixture.sources,
    sourceCount: fixture.sources.length,
    readinessLabel: "Ready to mark readiness once a source claim is evidenced and one artifact is produced.",
    recallStatus: getRecallStatus(selectedSource.type),
  };
}
