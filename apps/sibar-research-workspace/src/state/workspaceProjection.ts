import {
  type WorkspaceSessionActionKind,
  type WorkspaceSessionState,
} from "./workspaceReducer";

export type SourceType = "paper" | "artifact" | "code";

export type WorkspaceSource = {
  id: string;
  title: string;
  type: SourceType;
  snippet: string;
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
  status: "ready" | "queued" | "locked";
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
  sourceCount: number;
  selectedNode: WorkspaceStudyNode;
  selectedMiniNode: WorkspaceMiniNode;
  selectedSource: WorkspaceSource;
  activeAction: WorkspaceSessionActionKind;
  readinessLabel: string;
};

export const firstWorkspaceSessionFixture: WorkspaceSessionFixture = {
  title: "Focused workspace: embeddings",
  sessionHint: "Read one compact source slice, draft a practical artifact, then confirm readiness.",
  nodes: [
    {
      id: "goal-embeddings",
      name: "Embedding basics",
      scope: "How do embeddings turn meaning into vectors and where do they fail?",
      sessionTitle: "Session 01 - read the first source slice",
      status: "ready",
      miniNodes: [
        {
          id: "mn-tokenization",
          name: "Token boundaries",
          question: "What happens to meaning when text is split into tokens?",
          sourceId: "source-overview",
        },
        {
          id: "mn-vector-space",
          name: "Vector space intuition",
          question: "How do vectors preserve similarity in retrieval?",
          sourceId: "source-overview",
        },
        {
          id: "mn-implementation",
          name: "Toy implementation",
          question: "What small artifact proves retrieval quality?",
          sourceId: "source-repo",
        },
      ],
    },
    {
      id: "goal-correctness",
      name: "Failure cases",
      scope: "Can this approach handle negation, ambiguity, and short queries?",
      sessionTitle: "Session 02 - test retrieval boundaries",
      status: "queued",
      miniNodes: [
        {
          id: "mn-failure-boundaries",
          name: "Boundary checks",
          question: "When should we stop trusting embeddings alone?",
          sourceId: "source-note",
        },
        {
          id: "mn-readability-evidence",
          name: "Evidence check",
          question: "What evidence supports each limitation claim?",
          sourceId: "source-note",
        },
      ],
    },
  ],
  sources: [
    {
      id: "source-overview",
      type: "paper",
      title: "Embedding overview paper excerpt",
      snippet:
        "Embedding methods map text into dense vectors so semantic similarity becomes a nearest-neighbor query.",
    },
    {
      id: "source-repo",
      type: "code",
      title: "Local toy retrieval notebook",
      snippet:
        "Generate vectors, index them, and evaluate retrieval by recall@k against a tiny query set.",
    },
    {
      id: "source-note",
      type: "artifact",
      title: "Limitations and caveats note",
      snippet:
        "Short queries, out-of-domain language, and negation are common retrieval failure modes.",
    },
  ],
};

function getWorkspaceSourceById(
  sources: readonly WorkspaceSource[],
  sourceId: string | null,
): WorkspaceSource {
  return (
    sources.find((source) => source.id === sourceId) ??
    sources[0] ?? {
      id: "unresolved-source",
      type: "artifact",
      title: "Source unavailable",
      snippet: "Select a source from the study path to load a study context.",
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
  const firstMini = firstNode?.miniNodes[0];
  const fallbackSourceId =
    firstMini?.sourceId ??
    fixture.sources[0]?.id ??
    "unresolved-source";

  return {
    selectedNodeId: firstNode?.id ?? "",
    selectedMiniNodeId: firstMini?.id ?? "",
    selectedSourceId: fallbackSourceId,
    activeAction: "read",
    isReadinessPanelVisible: true,
    ...overrides,
  };
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
    activeAction: state.activeAction,
    nodes: fixture.nodes,
    sourceCount: fixture.sources.length,
    readinessLabel: "Ready to mark readiness once a source claim is evidenced and one artifact is produced.",
  };
}
