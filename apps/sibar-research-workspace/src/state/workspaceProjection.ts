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
    content: string;
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
  status: "active" | "ready" | "draft" | "blocked";
  openTarget: WorkspaceHomeTarget;
};

export type WorkspaceHomeProjection = {
  workspaces: readonly WorkspaceHomeWorkspace[];
};

export const workspaceHomeProjection: WorkspaceHomeProjection = {
  workspaces: [
    {
      id: "embeddings-probe",
      title: "Embeddings",
      objective: "Consolidate nearest-neighbor behavior and failure cases.",
      sourceBoundary: "Paper excerpt + local notebook",
      progress: "1 of 5 nodes",
      nextNode: "Boundary checks",
      readinessHint: "Ready to resume the current mini-node.",
      status: "active",
      openTarget: "session",
    },
    {
      id: "rag-track",
      title: "RAG",
      objective: "Evaluate retrieval quality against paraphrase and negation.",
      sourceBoundary: "Course notes + mini eval corpus",
      progress: "2 of 6 nodes",
      nextNode: "Session 03 - compare trade-offs",
      readinessHint: "Open to continue the study path from the next available session.",
      status: "ready",
      openTarget: "overview",
    },
    {
      id: "jax-lab",
      title: "JAX",
      objective: "Prototype tiny learning examples and compare baseline outputs.",
      sourceBoundary: "Draft intent + reference notebook",
      progress: "Draft",
      nextNode: "Define source scope",
      readinessHint: "Draft session needs a fresh workspace source input.",
      status: "draft",
      openTarget: "overview",
    },
  ],
};

export const firstWorkspaceSessionFixture: WorkspaceSessionFixture = {
  title: "Focused workspace: embeddings",
  sessionHint:
    "Inspect one compact material slice, draft a grounded artifact, and confirm readiness.",
  nodes: [
    {
      id: "goal-embeddings",
      name: "Embedding basics",
      scope: "How do embeddings turn meaning into vectors and where do they fail?",
      sessionTitle: "Session 01 - read the first source slice",
      status: "complete",
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
      status: "ready",
      miniNodes: [
        {
          id: "mn-failure-boundaries",
          name: "Boundary checks",
          question: "When should we stop trusting embeddings alone?",
          sourceId: "source-equation",
        },
        {
          id: "mn-readability-evidence",
          name: "Evidence check",
          question: "What evidence supports each limitation claim?",
          sourceId: "source-note",
        },
      ],
    },
    {
      id: "goal-toy-implementation",
      name: "Toy implementation",
      scope: "What small artifact proves retrieval quality?",
      sessionTitle: "Session 03 - build a toy retrieval proof",
      status: "queued",
      miniNodes: [
        {
          id: "mn-small-retrieval-loop",
          name: "Small retrieval loop",
          question: "What minimal code path shows the retrieval failure?",
          sourceId: "source-repo",
        },
      ],
    },
    {
      id: "goal-tradeoffs",
      name: "Retrieval trade-offs",
      scope: "When should retrieval use embeddings versus explicit rules?",
      sessionTitle: "Session 04 - compare trade-offs",
      status: "locked",
      miniNodes: [
        {
          id: "mn-tradeoff-matrix",
          name: "Trade-off matrix",
          question: "Which failure modes need non-embedding signals?",
          sourceId: "source-note",
        },
      ],
    },
    {
      id: "goal-readiness",
      name: "Readiness review",
      scope: "What evidence is enough to trust the artifact?",
      sessionTitle: "Session 05 - readiness review",
      status: "locked",
      miniNodes: [
        {
          id: "mn-readiness-evidence",
          name: "Readiness evidence",
          question: "What still needs proof before shipping the retrieval feature?",
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
      metadata: "Wu et al. - arXiv:2309.12345 - 2023",
      snippet:
        "Short queries and out-of-domain language often break semantic generalization...",
    },
    {
      id: "source-repo",
      type: "code",
      title: "Local toy retrieval notebook",
      metadata: "Local artifact - Notebook - 2024",
      snippet:
        "Nearest neighbors drift when the query distribution shifts...",
    },
    {
      id: "source-note",
      type: "note",
      title: "Limitations and caveats note",
      metadata: "Sibar workspace note - 2024",
      snippet:
        "Negation, ambiguity, and very short queries are common retrieval failure modes.",
    },
    {
      id: "source-equation",
      type: "equation",
      title: "Similarity scoring equation",
      metadata: "Sibar derivation notebook - 2024",
      snippet:
        "cosine_similarity(a, b) = (a · b) / (||a|| · ||b||); edge cases appear when one vector norm is near zero.",
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
      type: "fallback",
      title: "Source unavailable",
      metadata: "No source selected",
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
      content: selectedSource.snippet,
      modeLabel: getMaterialModeLabel(selectedSource.type),
    },
    nodes: fixture.nodes,
    sources: fixture.sources,
    sourceCount: fixture.sources.length,
    readinessLabel: "Ready to mark readiness once a source claim is evidenced and one artifact is produced.",
    recallStatus: getRecallStatus(selectedSource.type),
  };
}
