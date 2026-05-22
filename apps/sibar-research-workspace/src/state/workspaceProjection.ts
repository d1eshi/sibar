import type { WorkspaceSessionState } from "./workspaceReducer";
import { buildFrontierLabMissionUiProjection } from "../../../../src/runtime-source-mission-frontier-lab-ui-projection.ts";
import type {
  MissionQueueSessionProjection,
  MissionSourceSliceProjection,
  MissionUiProjection,
} from "../../../../src/runtime-source-mission-ui-projection.ts";

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
  sourceOriginUrl?: string;
  userGoal?: string;
  whyMissionExists?: string;
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

export const frontierLabMissionUiProjection = buildFrontierLabMissionUiProjection();

function allMissionQueueSessions(
  missionProjection: MissionUiProjection,
): MissionQueueSessionProjection[] {
  return [
    ...missionProjection.focused_queue.visible_sessions,
    ...missionProjection.focused_queue.deferred_sessions,
    ...missionProjection.focused_queue.locked_sessions,
  ];
}

function queueProgressLabel(missionProjection: MissionUiProjection): string {
  const sessions = allMissionQueueSessions(missionProjection);
  const activeIndex = sessions.findIndex((session) => session.status === "now");
  const currentStep = activeIndex >= 0 ? activeIndex + 1 : 1;
  return `${currentStep} of ${sessions.length} sessions`;
}

function sessionStatusToStudyStatus(
  status: MissionQueueSessionProjection["status"],
): WorkspaceStudyNode["status"] {
  if (status === "now") return "ready";
  if (status === "next" || status === "later") return "queued";
  return "locked";
}

function sourceModeForSlice(
  slice: MissionSourceSliceProjection,
  missionProjection: MissionUiProjection,
): WorkspaceMaterialMode {
  const signalKinds = slice.source_signal_ids
    .map((signalId) =>
      missionProjection.source_map.signals.find((signal) => signal.id === signalId)?.kind,
    )
    .filter(Boolean);

  if (signalKinds.includes("exercise")) return "artifact";
  if (signalKinds.includes("resource")) return "paper";
  return "note";
}

function sourceForSlice(
  slice: MissionSourceSliceProjection,
  missionProjection: MissionUiProjection,
): WorkspaceSource {
  const sourceTitle =
    missionProjection.mission_brief.source_context.title ??
    missionProjection.source_map.source_title ??
    "Frontier lab source";
  const signalLabels = slice.source_signal_ids
    .map((signalId) =>
      missionProjection.source_map.signals.find((signal) => signal.id === signalId)?.label,
    )
    .filter((label): label is string => Boolean(label));

  return {
    id: slice.id,
    title: slice.label,
    type: sourceModeForSlice(slice, missionProjection),
    metadata: `${sourceTitle} - ${slice.excerpt_ref}`,
    snippet: signalLabels.length > 0 ? signalLabels.join(" / ") : slice.excerpt_ref,
    body: [
      `${slice.label}: ${signalLabels.join(", ") || "source-backed mission slice"}.`,
      `Source excerpt ref: ${slice.excerpt_ref}.`,
      `Origin: ${missionProjection.mission_brief.source_context.canonical_url ?? "Frontier lab blog fixture"}.`,
    ],
  };
}

function queueSessionToStudyNode(
  session: MissionQueueSessionProjection,
  missionProjection: MissionUiProjection,
): WorkspaceStudyNode {
  const sourceIds = session.source_slice_refs.length > 0
    ? session.source_slice_refs
    : missionProjection.source_map.slices.slice(0, 1).map((slice) => slice.id);

  return {
    id: session.id,
    name: session.title,
    scope: session.reason,
    sessionTitle: `Session - ${session.title}`,
    status: sessionStatusToStudyStatus(session.status),
    miniNodes: sourceIds.slice(0, 3).map((sourceId, index) => {
      const slice = missionProjection.source_map.slices.find((item) => item.id === sourceId);
      return {
        id: `${session.id}:slice:${index + 1}`,
        name: slice?.label ?? session.operation_label,
        question:
          index === 0
            ? session.operation_label
            : `Ground this step in ${slice?.label ?? "the source slice"}.`,
        sourceId,
      };
    }),
  };
}

export function buildWorkspaceHomeProjectionFromMission(
  missionProjection: MissionUiProjection,
): WorkspaceHomeProjection {
  const nextSession =
    missionProjection.focused_queue.visible_sessions.find((session) => session.status === "now") ??
    missionProjection.focused_queue.visible_sessions[0];

  return {
    workspaces: [
      {
        id: missionProjection.mission_brief.mission_id,
        title: missionProjection.mission_brief.title,
        objective: missionProjection.mission_brief.user_goal,
        sourceBoundary: missionProjection.mission_brief.source_context.summary,
        sourceOriginUrl: missionProjection.mission_brief.source_context.canonical_url ?? undefined,
        userGoal: missionProjection.mission_brief.user_goal,
        whyMissionExists: missionProjection.mission_brief.rationale,
        progress: queueProgressLabel(missionProjection),
        nextNode: nextSession?.title ?? missionProjection.active_session.title,
        readinessHint: missionProjection.active_session.readiness_scope.label,
        readinessPercent: missionProjection.mission_brief.confidence === "high" ? 72 : 48,
        readinessLevel: missionProjection.mission_brief.confidence === "high" ? "Ready" : "Needs review",
        lastActivity: "Today",
        icon: "code",
        status: "active",
        openTarget: "overview",
      },
    ],
  };
}

export function buildWorkspaceSessionFixtureFromMission(
  missionProjection: MissionUiProjection,
): WorkspaceSessionFixture {
  const queueSessions = allMissionQueueSessions(missionProjection).slice(0, 5);
  const sources = missionProjection.source_map.slices.map((slice) =>
    sourceForSlice(slice, missionProjection),
  );

  return {
    title: missionProjection.mission_brief.title,
    sessionHint: missionProjection.active_session.operation.prompt,
    nodes: queueSessions.map((session) => queueSessionToStudyNode(session, missionProjection)),
    sources,
  };
}

export const workspaceHomeProjection: WorkspaceHomeProjection = {
  ...buildWorkspaceHomeProjectionFromMission(frontierLabMissionUiProjection),
};

export const frontierLabWorkspaceSessionFixture =
  buildWorkspaceSessionFixtureFromMission(frontierLabMissionUiProjection);

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
      body: [
        "The useful claim for this node is not that embeddings understand meaning globally. The narrower claim is that they preserve enough local similarity for a bounded retrieval task.",
        "Short queries and out-of-domain phrasing are the first stress tests. If the vector neighborhood changes when the wording changes slightly, the retrieval layer needs additional evidence before it can be trusted.",
        "For this session, treat the paper as source material: identify the claim, the boundary condition, and the evidence required before turning it into an implementation artifact.",
      ],
    },
    {
      id: "source-repo",
      type: "code",
      title: "Local toy retrieval notebook",
      metadata: "Local artifact - Notebook - 2024",
      snippet:
        "Nearest neighbors drift when the query distribution shifts...",
      body: [
        "const query = embed(\"what breaks retrieval for tiny queries\");",
        "const neighbors = index.search(query, { k: 5 });",
        "const failed = neighbors.filter((item) => item.sourceDomain !== \"retrieval-notes\");",
        "assert(failed.length === 0, \"nearest neighbors drifted outside the intended boundary\");",
      ],
    },
    {
      id: "source-note",
      type: "note",
      title: "Limitations and caveats note",
      metadata: "Sibar workspace note - 2024",
      snippet:
        "Negation, ambiguity, and very short queries are common retrieval failure modes.",
      body: [
        "Negation is the first failure mode to isolate. Similar words can point to opposite operational claims, so a nearest-neighbor match is not enough evidence by itself.",
        "Ambiguity is the second failure mode. A short query can match many plausible contexts and still fail the user's actual intent.",
        "The note for this node should produce one boundary rule: when embeddings are allowed to rank candidates, and when another signal must verify the claim.",
      ],
    },
    {
      id: "source-equation",
      type: "equation",
      title: "Similarity scoring equation",
      metadata: "Sibar derivation notebook - 2024",
      snippet:
        "cosine_similarity(a, b) = (a · b) / (||a|| · ||b||); edge cases appear when one vector norm is near zero.",
      body: [
        "cosine_similarity(a, b) = (a · b) / (||a|| · ||b||)",
        "If ||a|| is near zero, the score becomes unstable or undefined. That is not a model insight; it is a boundary condition of the scoring function.",
        "The learning task is to connect this equation to a practical retrieval decision: a similarity score needs input validation, normalization checks, and fallback behavior.",
      ],
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
