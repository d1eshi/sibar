import * as React from "react";

import { CodeDiffPanel } from "./ownershipWorkbench/components/CodeDiffPanel";
import { EvidenceDrawerPanel } from "./ownershipWorkbench/components/EvidenceDrawerPanel";
import { FileTreePanel } from "./ownershipWorkbench/components/FileTreePanel";
import { OwnershipHarnessPanel } from "./ownershipWorkbench/components/OwnershipHarnessPanel";
import type { RepoInventoryStatus } from "./ownershipWorkbench/repoInventoryTypes.ts";
import { loadRepoInventoryStatus } from "./ownershipWorkbench/repoInventoryClient.ts";
import type {
  OwnershipAttemptReadiness,
  BoundaryState,
  LineSelection,
  OwnershipSessionState,
  OwnershipReviewArtifact,
  ReadinessGate,
  EvidenceRef,
  OwnershipBoundary,
} from "./ownershipWorkbench/types";
import {
  codeViewDiffItemsByPath,
  codeViewFileItemsByPath,
  fileFixtures,
  fixtureEvidence,
  fileTreeNodeByPath,
  initialFile,
  initialFileStates,
  ownershipBoundary,
  ownershipReviewQueue,
  fileTreePaths,
  fileDiffsByPath,
} from "./ownershipWorkbench/fixtures";
import {
  getActiveBoundaryState,
  getLineSelectionText,
  withBoundaryFileState,
  groupedEvidence,
  getRelationNavigationTargets,
} from "./ownershipWorkbench/helpers";
import {
  advanceOwnershipSession,
  createOwnershipSessionState,
  makeOwnershipSessionQuestions,
} from "./ownershipWorkbench/ownershipReviewSession";
import { extractCodeEvidence } from "./ownershipWorkbench/evidenceExtraction.ts";
import { buildBoundaryCandidates, projectBoundaryFileStates, selectHighestRiskBoundary } from "./ownershipWorkbench/boundaryBuilder";
import { getWorkbenchFixtureMode, getWorkbenchSurfaceMode } from "./ownershipWorkbench/surfaceMode";
import type { ViewMode } from "./ownershipWorkbench/types";
import { loadFileContentStatus, type FileContentStatus } from "./ownershipWorkbench/fileContentClient.ts";
import { loadRepoSearchStatus, type RepoSearchStatus } from "./ownershipWorkbench/repoSearchClient.ts";
import {
  buildEvidencePack,
  loadLanguageProposalStatus,
  verifyLanguageProposal,
  type EvidenceCitation,
  type EvidencePack,
  type LanguageProposal,
  type LanguageProposalStatus,
  type LanguageProposalVerification,
  type VerifiedLanguageProposalClaim,
} from "./ownershipWorkbench/languageProposal.ts";
import { buildFocusCandidates } from "./ownershipWorkbench/focusCandidates.ts";
import { buildQuestionBatchFromLanguageProposal, type QuestionBatch } from "./ownershipWorkbench/questionBatch.ts";
import {
  buildOwnershipQuestionPlan,
  projectOwnershipQuestionPlanToQuestionBatch,
  verifyOwnershipQuestionPlan,
  type OwnershipQuestionPlanVerification,
} from "./ownershipWorkbench/ownershipQuestionPlanner.ts";
import { buildQuestionQueueProjection } from "./ownershipWorkbench/questionQueue.ts";
import { projectWorkbenchDataset } from "./ownershipWorkbench/workbenchDataset.ts";
import { evaluateOwnershipAttemptReadiness } from "./ownershipWorkbench/attemptReadiness";
import {
  evaluateTransferAttempt,
  integrateTransferReadinessState,
  makeTransferProbe,
  makeTransferSkip,
  type TransferAttemptRecord,
} from "./ownershipWorkbench/transferVerification.ts";
import {
  buildOwnershipReviewArtifact,
  evaluateWorkspaceEscalation,
  type WorkspaceEscalationDecision,
} from "./ownershipWorkbench/workspaceEscalation.ts";
import {
  buildCognitiveDebtMetric,
  buildCognitiveLoadMetric,
  buildDailyCognitiveReadout,
} from "./ownershipWorkbench/cognitiveMetrics.ts";
import type {
  DailyCognitiveReadout,
  CognitiveDebtMetric,
  CognitiveLoadMetric,
} from "./ownershipWorkbench/cognitiveMetrics.ts";
import {
  appendGuidedObservation,
  appendHandoffArtifact,
  appendReadinessAttempt,
  appendTransferAttempt as appendTransferMemoryAttempt,
  buildOwnershipMemoryProjection,
  buildOwnershipMemoryExportBundle,
  createOwnershipMemoryState,
} from "./ownershipWorkbench/ownershipMemory.ts";
import {
  AGENT_FLOW_VALID_ACTIONS,
  AGENT_FLOW_READONLY_ACTION,
  buildAgentFlowManifest,
  buildAgentFlowRuntime,
  validateAgentAction,
  type AgentActionValidationResult,
  type AgentFlowManifest,
} from "./ownershipWorkbench/agentFlowManifest.ts";
import {
  buildGeminiEvidenceLabReport,
  evaluateGeminiEvidenceReport,
  getGeminiEvidenceProviderAdapter,
  type GeminiEvidenceExtractionResult,
} from "./ownershipWorkbench/geminiEvidenceExtractor.ts";
import { CapturePrEntryScreen } from "./capturePr/CapturePrEntryScreen";

function jsonPreview(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function basenameSearchQuery(filePath: string): string {
  const name = filePath.replace(/\\/g, "/").replace(/^.*\//, "");
  return name.replace(/\.[^.]+$/, "").trim();
}

function selectRuntimeContextPaths(paths: string[], selectedPath: string): string[] {
  const normalizedSelectedPath = selectedPath.replace(/\\/g, "/");
  const ordered = [
    normalizedSelectedPath,
    ...paths.filter((path) => /(^|\/)package\.json$/.test(path)),
    ...paths.filter((path) => /(^|\/)readme\.md$/i.test(path)),
    ...paths.filter((path) => /(^|\/)requirements\.txt$/i.test(path)),
    ...paths.filter((path) => /(^|\/)pyproject\.toml$/i.test(path)),
    ...paths.filter((path) => /(^|\/)(?:api|backend|server)\/(?:main|app|server)\.py$/.test(path)),
    ...paths.filter((path) => /(^|\/)tsconfig\.json$/.test(path)),
    ...paths.filter((path) => /(^|\/)vite\.config\.[cm]?[jt]s$/.test(path)),
  ];

  return ordered.filter((path, index, values) => path !== "" && values.indexOf(path) === index).slice(0, 8);
}

function stableLiveSignature(parts: string[]): string {
  const source = parts
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, " "))
    .filter((part) => part.length > 0)
    .join("|");
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return (hash >>> 0).toString(36).slice(0, 8);
}

function liveBoundaryId(filePath: string, startLine: number, endLine: number, semanticSignature: string): string {
  const normalizedPath = filePath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `live-${normalizedPath}-${startLine}-${endLine}-${semanticSignature}`;
}

function evidenceLocation(citation: EvidenceCitation): string {
  return `${citation.filePath}:${citation.startLine}-${citation.endLine}`;
}

function normalizeCitationPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

const GRANULAR_FOCUS_LINE_LIMIT = 20;
const LIVE_FOCUS_CANDIDATE_LIMIT = 2048;
const DEFAULT_SOURCE_ROOT = "sibi/demo/react-fastapi-todo";
const LAB_PROJECT_SIGNALS_LIMIT = 8;

type LiveQuestionState = QuestionBatch["questions"][number]["state"];

type OwnershipQueueProgress = {
  complete: number;
  attempted: number;
  blocked: number;
  total: number;
};

function normalizeSourceRoot(rawSourceRoot: string): string {
  const sourceRoot = rawSourceRoot.replace(/\\/g, "/").trim();
  const hasTraversal = /(^|\/|\\)\.\.(?:$|[\\/])/;

  if (
    sourceRoot === "" ||
    sourceRoot === "." ||
    sourceRoot.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(sourceRoot) ||
    sourceRoot.includes("\u0000") ||
    hasTraversal.test(sourceRoot)
  ) {
    return DEFAULT_SOURCE_ROOT;
  }

  const normalizedParts = sourceRoot
    .split("/")
    .filter((part) => part !== "" && part !== ".")
    .join("/")
    .replace(/^\/+|\/+$/g, "");

  return normalizedParts.length > 0 ? normalizedParts : DEFAULT_SOURCE_ROOT;
}

type OwnershipReviewAnnotationState = "active" | "attempted" | "gap" | "blocked" | "complete";

type OwnershipReviewAnnotation = {
  id: string;
  target:
    | { kind: "code"; filePath: string; startLine: number; endLine: number }
    | { kind: "tree"; path: string };
  title: string;
  detail: string;
  state: OwnershipReviewAnnotationState;
};

function citationLineSpan(citation: EvidenceCitation): number {
  return citation.endLine - citation.startLine + 1;
}

function isSelectedFileCitation(citation: EvidenceCitation, selectedPath: string): boolean {
  return normalizeCitationPath(citation.filePath) === normalizeCitationPath(selectedPath);
}

function isGranularSelectedFileCitation(citation: EvidenceCitation, selectedPath: string): boolean {
  return isSelectedFileCitation(citation, selectedPath) && citationLineSpan(citation) <= GRANULAR_FOCUS_LINE_LIMIT;
}

function selectedFileCitations(claim: VerifiedLanguageProposalClaim | null, selectedPath: string): EvidenceCitation[] {
  if (claim == null) return [];
  return claim.citations.filter((citation) => isSelectedFileCitation(citation, selectedPath));
}

function selectedFileCitation(claim: VerifiedLanguageProposalClaim | null, selectedPath: string): EvidenceCitation | null {
  return selectedFileCitations(claim, selectedPath)[0] ?? null;
}

function granularEvidencePackFocus(evidencePack: EvidencePack | null, selectedPath: string): EvidenceCitation | null {
  if (evidencePack == null) return null;
  return (
    [...evidencePack.excerpts, ...evidencePack.symbols, ...evidencePack.imports, ...evidencePack.exports].find((citation) =>
      isGranularSelectedFileCitation(citation, selectedPath),
    ) ?? null
  );
}

function deriveFocusCitation({
  acceptedAttemptClaim,
  claims,
  evidencePack,
  selectedPath,
}: {
  acceptedAttemptClaim: VerifiedLanguageProposalClaim | null;
  claims: VerifiedLanguageProposalClaim[];
  evidencePack: EvidencePack | null;
  selectedPath: string;
}): EvidenceCitation | null {
  const primaryCitation =
    selectedFileCitation(acceptedAttemptClaim, selectedPath) ??
    claims.map((claim) => selectedFileCitation(claim, selectedPath)).find((citation) => citation != null) ??
    null;

  if (primaryCitation == null || citationLineSpan(primaryCitation) <= GRANULAR_FOCUS_LINE_LIMIT) {
    return primaryCitation;
  }

  return (
    selectedFileCitations(acceptedAttemptClaim, selectedPath).find((citation) =>
      isGranularSelectedFileCitation(citation, selectedPath),
    ) ??
    claims
      .flatMap((claim) => selectedFileCitations(claim, selectedPath))
      .find((citation) => isGranularSelectedFileCitation(citation, selectedPath)) ??
    granularEvidencePackFocus(evidencePack, selectedPath) ??
    primaryCitation
  );
}

function focusLineLabel(citation: EvidenceCitation): string {
  return citation.startLine === citation.endLine
    ? `line ${citation.startLine}`
    : `lines ${citation.startLine}-${citation.endLine}`;
}

function queueStateBadgeClass(state: string): string {
  if (state === "attempted" || state === "repair_needed") {
    return "stateBadge attempted-state";
  }

  if (state === "blocked") {
    return "stateBadge blocked-state";
  }

  if (state === "complete") {
    return "stateBadge owned-state";
  }

  return "stateBadge unvisited-state";
}

function queueStateLabel(state: string): string {
  return state.replace("_", " ");
}

function reviewAnnotationState(
  latestReadiness: OwnershipAttemptReadiness | null,
  activeQuestionState?: string,
): OwnershipReviewAnnotationState {
  if (latestReadiness != null) {
    if (latestReadiness.readiness_gate === "ready") return "complete";
    if (latestReadiness.readiness_gate === "repair-needed") return "gap";
    return "blocked";
  }

  if (activeQuestionState === "attempted" || activeQuestionState === "repair_needed") return "attempted";
  if (activeQuestionState === "blocked") return "blocked";
  if (activeQuestionState === "complete") return "complete";
  return "active";
}

function reviewAnnotationStatusLabel(state: OwnershipReviewAnnotationState): string {
  if (state === "complete") return "Complete artifact";
  if (state === "gap") return "Gap artifact";
  if (state === "blocked") return "Blocked artifact";
  if (state === "attempted") return "Attempt artifact";
  return "Active artifact";
}

function reviewAnnotationTitle(state: OwnershipReviewAnnotationState): string {
  if (state === "complete") return "Boundary explanation accepted";
  if (state === "gap") return "Sibar found a repair gap";
  if (state === "blocked") return "Sibar blocked this claim";
  return "Sibar is reviewing this boundary";
}

function shortArtifactText(value: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function evidenceDetail(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 240) : fallback;
}

function questionPlanEvidenceRefs(citations: EvidenceCitation[], fallbackFilePath: string): EvidenceRef[] {
  const normalizedFallbackPath = normalizeCitationPath(fallbackFilePath);
  return dedupeEvidenceRefs(
    citations.map((citation) => ({
      id: `planner-question-${citation.evidenceId}`,
      title: "Active local question citation",
      detail:
        `${citation.filePath.length > 0 ? citation.filePath : normalizedFallbackPath}:${citation.startLine}-${citation.endLine}`,
      location: evidenceLocation(citation),
      confidence: "observed",
    })),
  );
}

function fallbackOwnershipBoundaryReturnCondition(activeQuestionPrompt: string, filePath: string, focusLineLabel: string | null): string {
  const focusContext = focusLineLabel == null ? "the active focus range" : `the active focus range ${focusLineLabel}`;
  return `Submit a bounded attempt for ${filePath} that answers: ${activeQuestionPrompt} using ${focusContext}.`;
}

function readinessStateLabel(readinessGate: OwnershipAttemptReadiness["readiness_gate"] | null): string {
  if (readinessGate == null) return "No attempt yet";
  if (readinessGate === "ready") return "Ready (provisional)";
  if (readinessGate === "repair-needed") return "Needs repair";
  return "Blocked / not ready";
}

function attemptEvidenceRefs(readiness: OwnershipAttemptReadiness | null, boundary: OwnershipBoundary | null): EvidenceRef[] {
  if (readiness == null) return boundary?.evidence ?? [];
  return readiness.attemptEvidenceRefs.length > 0 ? readiness.attemptEvidenceRefs : boundary?.evidence ?? [];
}

function nextActionForLocalPlanner(
  queueProgress: OwnershipQueueProgress | null,
): string {
  if (queueProgress == null) return "Build local evidence queue and answer the first study question.";
  if (queueProgress.blocked > 0) return "Fix the blocked local question before continuing the study review.";
  if (queueProgress.complete + queueProgress.attempted < queueProgress.total) {
    return "Answer the next local question to advance the study review and narrow next evidence.";
  }
  return "Local planner sequence is complete, but this is not final. Reconnect provider-backed planning for a final report.";
}

function nextActionForVerifiedAttempt(
  readiness: OwnershipAttemptReadiness | null,
  queueProgress: OwnershipQueueProgress | null,
): string {
  if (readiness == null) {
    return "Answer the focused boundary prompt with code evidence; each answer updates the review report.";
  }

  if (readiness.readiness_gate === "ready") {
    return queueProgress == null || queueProgress.complete + queueProgress.attempted >= queueProgress.total
      ? "Review is ready. Re-attempt only when code or ownership condition changes."
      : "Continue answering the active queue in order to complete the ownership pass.";
  }

  return readiness.smallestRepair || "Address the smallest unresolved gap and reattempt.";
}

function dedupeEvidenceRefs(entries: EvidenceRef[]): EvidenceRef[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function proposalClaimEvidenceRefs(claims: VerifiedLanguageProposalClaim[]): EvidenceRef[] {
  return claims.flatMap((claim) =>
    claim.citations.map((citation) => ({
      id: `live-citation-${claim.id}-${citation.evidenceId}`,
      title: `${claim.kind} citation`,
      detail: evidenceDetail(claim.text, claim.kind),
      location: evidenceLocation(citation),
      confidence: claim.confidence,
    })),
  );
}

function deriveLiveOwnershipBoundary({
  evidencePack,
  proposal,
  verification,
}: {
  evidencePack: EvidencePack;
  proposal: LanguageProposal;
  verification: LanguageProposalVerification | null;
}): OwnershipBoundary | null {
  if (verification == null || verification.kind === "blocked_llm_unavailable" || verification.kind === "rejected") {
    return null;
  }

  const selectedFile = evidencePack.selectedFilePath;
  const selectedExcerpts = evidencePack.excerpts.filter(
    (excerpt) => excerpt.filePath === selectedFile && excerpt.text.trim().length > 0,
  );
  const granularExcerpt =
    selectedExcerpts.find((excerpt) => excerpt.endLine - excerpt.startLine <= 20) ?? selectedExcerpts[0] ?? null;
  const startLine = granularExcerpt?.startLine ?? 1;
  const endLine = granularExcerpt?.endLine ?? startLine;
  const acceptedClaims = [...verification.acceptedClaims, ...verification.questions];
  const boundaryClaims = acceptedClaims.filter((claim) => claim.kind === "boundary_candidate");
  const reviewClaims = acceptedClaims.filter((claim) => claim.kind === "review_queue_copy");
  const gapClaims = acceptedClaims.filter((claim) => claim.kind === "gap_label" || claim.kind === "question");
  const attemptClaim = acceptedClaims.find((claim) => claim.kind === "attempt_prompt") ?? proposal.attemptPrompt;
  const repairClaim = acceptedClaims.find((claim) => claim.kind === "smallest_repair") ?? proposal.smallestRepairCopy;
  const boundaryText = boundaryClaims[0]?.text ?? `Review ${selectedFile} as the live ownership boundary.`;
  const prompt = [
    attemptClaim.text,
    ...boundaryClaims.map((claim) => claim.text),
    ...reviewClaims.map((claim) => claim.text),
    ...gapClaims.map((claim) => claim.text),
    repairClaim.text,
  ].filter((text, index, values) => text.trim() !== "" && values.indexOf(text) === index);
  const projectSignalRefs = evidencePack.projectSignals.flatMap((signal) =>
    signal.citations.map((citation) => ({
      id: `live-project-signal-${signal.id}-${citation.evidenceId}`,
      title: signal.label,
      detail: evidenceDetail(signal.value, signal.label),
      location: evidenceLocation(citation),
      confidence: signal.confidence,
    })),
  );
  const searchRefs = evidencePack.searchResults.flatMap((candidate) =>
    candidate.citations.map((citation) => ({
      id: `live-search-${candidate.id}-${citation.evidenceId}`,
      title: candidate.label,
      detail: evidenceDetail(candidate.path, candidate.label),
      location: evidenceLocation(citation),
      confidence: candidate.confidence,
    })),
  );
  const anchorRef =
    granularExcerpt == null
      ? null
      : {
          id: `live-anchor-${granularExcerpt.evidenceId}`,
          title: "Selected file excerpt",
          detail: evidenceDetail(granularExcerpt.text, selectedFile),
          location: evidenceLocation(granularExcerpt),
          confidence: "observed" as const,
        };
  const evidence = dedupeEvidenceRefs([
    ...(anchorRef == null ? [] : [anchorRef]),
    ...projectSignalRefs,
    ...searchRefs,
    ...proposalClaimEvidenceRefs(acceptedClaims),
  ]).slice(0, 18);
  const openQuestions = [...reviewClaims, ...gapClaims].map((claim) => claim.text);
  const returnCondition =
    `Submit a bounded attempt that cites live evidence refs and resolves: ${repairClaim.text}`.slice(0, 260);
  const semanticSignature = stableLiveSignature([
    ...prompt,
    returnCondition,
    ...openQuestions,
    ...evidence.map((entry) => entry.id),
  ]);

  return {
    id: liveBoundaryId(selectedFile, startLine, endLine, semanticSignature),
    files: [selectedFile],
    responsibility_claim: boundaryText,
    evidence,
    open_questions: openQuestions,
    risk: {
      score: gapClaims.length > 0 ? 3 : 2,
      relationWeight: reviewClaims.length > 0 ? 2 : 1,
      missingCallerPenalty: gapClaims.length > 0 ? 1 : 0,
      missingDeletionPenalty: 0,
      blockedPenalty: 0,
      questionablePenalty: verification.kind === "accepted_with_questions" ? 1 : 0,
    },
    confidence: verification.kind === "accepted" ? "observed" : "inferred",
    title: `Live boundary: ${selectedFile}`,
    filePath: selectedFile,
    startLine,
    endLine,
    whyMatters: reviewClaims[0]?.text ?? evidencePack.userIntent,
    prompt,
    returnCondition,
  };
}

function LiveOwnershipWorkbench({
  sourceRoot,
  surfaceMode,
}: {
  sourceRoot: string;
  surfaceMode: "default" | "lab";
}): React.ReactElement {
  const liveCodeViewportRef = React.useRef<HTMLDivElement | null>(null);
  const preferredPath = `${sourceRoot}/src/App.tsx`;
  const [selectedPath, setSelectedPath] = React.useState(preferredPath);
  const [inventoryStatus, setInventoryStatus] = React.useState<RepoInventoryStatus>({ kind: "loading" });
  const [fileContentStatus, setFileContentStatus] = React.useState<FileContentStatus>({ kind: "loading" });
  const [contextFileContents, setContextFileContents] = React.useState<Record<string, string>>({});
  const [contextStatus, setContextStatus] = React.useState<"loading" | "ready">("loading");
  const [loadedContextKey, setLoadedContextKey] = React.useState("");
  const [repoSearchStatus, setRepoSearchStatus] = React.useState<RepoSearchStatus>({ kind: "loading" });
  const [languageStatus, setLanguageStatus] = React.useState<LanguageProposalStatus>({ kind: "loading" });
  const [verification, setVerification] = React.useState<LanguageProposalVerification | null>(null);
  const [liveAttemptText, setLiveAttemptText] = React.useState("");
  const [liveSelfConfidence, setLiveSelfConfidence] = React.useState(60);
  const [liveReadinessHistory, setLiveReadinessHistory] = React.useState<OwnershipAttemptReadiness[]>([]);
  const [liveReadinessStartedAt, setLiveReadinessStartedAt] = React.useState(() => Date.now());
  const [liveOwnershipMemory, setLiveOwnershipMemory] = React.useState(createOwnershipMemoryState);
  const [liveMemoryExportedAt, setLiveMemoryExportedAt] = React.useState(() => Date.now());
  const [liveQuestionStateById, setLiveQuestionStateById] = React.useState<Record<string, LiveQuestionState>>({});
  const [liveActiveQuestionId, setLiveActiveQuestionId] = React.useState<string | null>(null);
  const isLabView = surfaceMode === "lab";

  React.useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const nextStatus = await loadRepoInventoryStatus(sourceRoot, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setInventoryStatus(nextStatus);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [sourceRoot]);

  const dataset = React.useMemo(() => {
    if (inventoryStatus.kind !== "ready") return null;
    return projectWorkbenchDataset({
      inventory: inventoryStatus.inventory,
      repoSearches: repoSearchStatus.kind === "ready" ? [repoSearchStatus.search] : [],
      selectedPath,
      selectedSourceRoot: sourceRoot,
    });
  }, [inventoryStatus, repoSearchStatus, selectedPath, sourceRoot]);

  React.useEffect(() => {
    if (dataset?.selectedPath == null) return;

    const preferredPath = `${sourceRoot}/src/App.tsx`;
    if (selectedPath === preferredPath) {
      if (dataset.fileStates[selectedPath] == null) {
        setSelectedPath(dataset.selectedPath);
      }
      return;
    }

    if (dataset.fileStates[selectedPath] == null) {
      setSelectedPath(dataset.selectedPath);
    }
  }, [dataset?.fileStates, dataset?.selectedPath, selectedPath, sourceRoot]);

  const runtimeContextPaths = React.useMemo(() => {
    if (inventoryStatus.kind !== "ready") return [selectedPath];
    return selectRuntimeContextPaths(
      inventoryStatus.inventory.files.map((file) => file.path),
      selectedPath,
    );
  }, [inventoryStatus, selectedPath]);
  const runtimeContextKey = React.useMemo(() => runtimeContextPaths.join("\n"), [runtimeContextPaths]);

  React.useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const nextStatus = await loadFileContentStatus(selectedPath, {
        signal: controller.signal,
        sourceRoot,
      });
      if (!controller.signal.aborted) {
        setFileContentStatus(nextStatus);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selectedPath, sourceRoot]);

  React.useEffect(() => {
    const controller = new AbortController();
    setContextStatus("loading");
    const expectedContextKey = runtimeContextKey;

    void (async () => {
      const entries = await Promise.all(
        runtimeContextPaths.map(async (path) => {
          const status = await loadFileContentStatus(path, {
            signal: controller.signal,
            sourceRoot,
          });
          return status.kind === "ready" ? ([status.file.path, status.file.contents] as const) : null;
        }),
      );

      if (!controller.signal.aborted) {
        setContextFileContents(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry != null)));
        setLoadedContextKey(expectedContextKey);
        setContextStatus("ready");
      }
    })();

    return () => {
      controller.abort();
    };
  }, [runtimeContextKey, runtimeContextPaths, sourceRoot]);

  React.useEffect(() => {
    const controller = new AbortController();
    const query = basenameSearchQuery(selectedPath);

    void (async () => {
      const nextStatus =
        query === ""
          ? { kind: "unavailable" as const, reason: "repo-search query is empty" }
          : await loadRepoSearchStatus(query, {
              signal: controller.signal,
              sourceRoot,
            });
      if (!controller.signal.aborted) {
        setRepoSearchStatus(nextStatus);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selectedPath, sourceRoot]);

  const fileContents = React.useMemo(() => {
    const contents = { ...contextFileContents };
    if (fileContentStatus.kind !== "ready") return {};
    contents[fileContentStatus.file.path] = fileContentStatus.file.contents;
    return contents;
  }, [contextFileContents, fileContentStatus]);

  const evidencePack = React.useMemo(() => {
    if (
      inventoryStatus.kind !== "ready" ||
      fileContentStatus.kind !== "ready" ||
      contextStatus !== "ready" ||
      loadedContextKey !== runtimeContextKey ||
      repoSearchStatus.kind === "loading"
    ) {
      return null;
    }
    return buildEvidencePack({
      inventory: inventoryStatus.inventory,
      selectedFilePath: fileContentStatus.file.path,
      userIntent:
        "Generate the first live ownership review prompt for the selected repository file after reading the repository overview signals.",
      fileContents,
      repoSearches: repoSearchStatus.kind === "ready" ? [repoSearchStatus.search] : [],
    });
  }, [contextStatus, fileContentStatus, fileContents, inventoryStatus, repoSearchStatus, loadedContextKey, runtimeContextKey]);

  React.useEffect(() => {
    if (evidencePack == null) {
      setLanguageStatus({ kind: "loading" });
      setVerification(null);
      return;
    }

    const controller = new AbortController();

    void (async () => {
      const nextStatus = await loadLanguageProposalStatus({
        endpoint: "/__sibi/language-proposal",
        evidencePack,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      setLanguageStatus(nextStatus);
      const nextVerification =
        nextStatus.kind === "ready"
          ? verifyLanguageProposal({
              proposal: nextStatus.proposal,
              evidencePack,
              fileContents,
            })
          : nextStatus.kind === "unavailable"
            ? verifyLanguageProposal({
                proposal: null,
                evidencePack,
                fileContents,
                providerError: new Error(nextStatus.reason),
              })
            : null;
      setVerification(nextVerification);
    })();

    return () => {
      controller.abort();
    };
  }, [evidencePack, fileContents]);

  const selectedFileText =
    fileContentStatus.kind === "ready"
      ? fileContentStatus.file.contents
      : fileContentStatus.kind === "unavailable"
        ? fileContentStatus.reason
        : "Loading selected file...";
  const usableProposalClaims =
    verification?.kind === "accepted" || verification?.kind === "accepted_with_questions"
      ? [...verification.acceptedClaims, ...verification.questions]
      : [];
  const acceptedAttemptClaim = usableProposalClaims.find((claim) => claim.kind === "attempt_prompt") ?? null;
  const focusCandidateResult = React.useMemo(
    () =>
      evidencePack == null ? null : buildFocusCandidates({ evidencePack, fileContents, maxCandidates: LIVE_FOCUS_CANDIDATE_LIMIT }),
    [evidencePack, fileContents],
  );
  const languageQuestionBatch = React.useMemo(
    () =>
      languageStatus.kind === "ready"
        ? buildQuestionBatchFromLanguageProposal({
            proposal: languageStatus.proposal,
            verification,
            focusCandidates: focusCandidateResult?.candidates ?? [],
          })
        : verification?.kind === "blocked_llm_unavailable"
          ? buildQuestionBatchFromLanguageProposal({
              proposal: null,
              verification,
              focusCandidates: focusCandidateResult?.candidates ?? [],
            })
          : null,
    [focusCandidateResult?.candidates, languageStatus, verification],
  );
  const localOwnershipQuestionPlan = React.useMemo(
    () =>
      evidencePack == null || focusCandidateResult == null
        ? null
        : buildOwnershipQuestionPlan({
            evidencePack,
            fileContents,
            focusCandidates: focusCandidateResult.candidates,
            questionBudget: 10,
            providerId: "local-ownership-planner",
            generatedAt: "2026-01-01T00:00:00.000Z",
          }),
    [evidencePack, fileContents, focusCandidateResult?.candidates],
  );
  const localOwnershipQuestionPlanVerification = React.useMemo<OwnershipQuestionPlanVerification | null>(() => {
    if (localOwnershipQuestionPlan == null) return null;
    return verifyOwnershipQuestionPlan({
      plan: localOwnershipQuestionPlan,
      evidencePack,
      fileContents,
      maxQuestionBudget: 10,
    });
  }, [evidencePack, fileContents, localOwnershipQuestionPlan]);
  const shouldUseLocalPlanner =
    verification == null ||
    languageStatus.kind === "loading" ||
    languageStatus.kind === "unavailable" ||
    verification.kind === "blocked_llm_unavailable";
  const localOwnershipQuestionBatch = React.useMemo(
    () => {
      if (localOwnershipQuestionPlanVerification == null) return null;
      return projectOwnershipQuestionPlanToQuestionBatch({
        verification: localOwnershipQuestionPlanVerification,
      });
    },
    [localOwnershipQuestionPlanVerification],
  );
  const plannerHasDisplayableQuestions =
    localOwnershipQuestionPlanVerification != null && localOwnershipQuestionPlanVerification.acceptedQuestions.length > 0;
  const hasVerifiedGeminiBoundary = verification?.kind === "accepted" || verification?.kind === "accepted_with_questions";
  const questionBatchFromPlanner =
    plannerHasDisplayableQuestions && shouldUseLocalPlanner
      ? localOwnershipQuestionBatch
      : null;
  const baseQuestionBatch = questionBatchFromPlanner ?? languageQuestionBatch;
  const questionBatch = React.useMemo<QuestionBatch | null>(() => {
    if (baseQuestionBatch == null) return null;

    return {
      ...baseQuestionBatch,
      questions: baseQuestionBatch.questions.map((question) => ({
        ...question,
        state: liveQuestionStateById[question.id] ?? question.state,
      })),
    };
  }, [baseQuestionBatch, liveQuestionStateById]);
  const activeTaskSource = questionBatchFromPlanner == null ? "Gemini verified review" : "Local ownership plan";
  const plannerBoundaryFallbackVisible = questionBatchFromPlanner != null && !hasVerifiedGeminiBoundary;
  const localPlannerFallback = plannerBoundaryFallbackVisible;
  const localPlannerFallbackDiagnostics = localOwnershipQuestionPlanVerification?.diagnostics ?? [];
  const activeQuestionPlanFileClass =
    localOwnershipQuestionPlanVerification?.acceptedPlan.heuristics.isLargeFile
      ? "large"
      : localOwnershipQuestionPlanVerification?.acceptedPlan.heuristics.isComposite
        ? "composite"
        : "small";
  const localPlanUnitCount = localOwnershipQuestionPlanVerification?.acceptedPlan.units.length ?? 0;
  const localPlanQuestionCount = localOwnershipQuestionPlanVerification?.acceptedQuestions.length ?? 0;
  const localPlanDiagnosticCount = localOwnershipQuestionPlanVerification?.diagnostics.length ?? 0;
  const localPlanQuestionBacklog = Math.max(0, localPlanUnitCount - localPlanQuestionCount);

  React.useEffect(() => {
    setLiveQuestionStateById({});
    setLiveActiveQuestionId(null);
  }, [baseQuestionBatch?.id]);

  const questionQueue = React.useMemo(
    () => (questionBatch == null ? null : buildQuestionQueueProjection({ batch: questionBatch, activeQuestionId: liveActiveQuestionId })),
    [liveActiveQuestionId, questionBatch],
  );
  const activeQuestion =
    questionBatch == null || questionQueue?.activeQuestionId == null
      ? null
      : questionBatch.questions.find((question) => question.id === questionQueue.activeQuestionId) ?? null;
  const activeQuestionState = activeQuestion?.state;
  const activeQuestionPrompt =
    activeQuestion?.prompt ?? acceptedAttemptClaim?.text ?? "No active question prompt available.";
  const activeQuestionWhyThisMatters = activeQuestion?.whyThisMatters ?? null;
  const taskAnswerPlaceholder =
    activeQuestion?.answerPlaceholder ?? "Respond from the highlighted code and cite evidence from this focus.";
  const liveAttemptPlaceholder = isLabView ? taskAnswerPlaceholder : "Answer this question in your own words.";
  const hasTaskPrompt = activeQuestion != null || acceptedAttemptClaim != null;
  const queueItems = questionQueue?.items ?? [];
  const queueProgress = questionQueue?.progress ?? null;
  const queueProgressLabel = queueProgress ? `${queueProgress.complete + queueProgress.attempted}/${queueProgress.total}` : "--/--";
  const queueCompleteOrAttempted = queueProgress == null ? 0 : queueProgress.complete + queueProgress.attempted;
  const queueSummary = queueProgress == null ? "--/--" : `${queueCompleteOrAttempted}/${queueProgress.total}`;
  const queueReadyState = queueProgress == null
    ? "Queue pending"
    : queueProgress.blocked === 0
      ? "Ready to defend"
      : "Needs attention";
  const queueItemsByPriority = React.useMemo(() => {
    const activeQuestionId = questionQueue?.activeQuestionId ?? null;
    if (queueItems.length < 2 || activeQuestionId == null) return queueItems.slice(0, 5);

    const activeIndex = queueItems.findIndex((item) => item.questionId === activeQuestionId);
    if (activeIndex < 0) return queueItems.slice(0, 5);
    if (activeIndex === 0) return queueItems.slice(0, 5);

    return [
      queueItems[activeIndex],
      ...queueItems.slice(0, activeIndex),
      ...queueItems.slice(activeIndex + 1),
    ].slice(0, 5);
  }, [queueItems, questionQueue?.activeQuestionId]);
  const activeFocusCandidate =
    questionQueue?.activeFocusCandidateId == null
      ? null
      : focusCandidateResult?.candidates.find((candidate) => candidate.id === questionQueue.activeFocusCandidateId) ?? null;
  const activeQuestionCitations = activeQuestion?.citations ?? [];
  const focusCitation = activeFocusCandidate?.citations[0] ?? deriveFocusCitation({
    acceptedAttemptClaim,
    claims: usableProposalClaims,
    evidencePack,
    selectedPath,
  }) ?? (activeQuestionCitations.length > 0 ? activeQuestionCitations[0] : null);
  const reviewQueueClaims = usableProposalClaims.filter((claim) => claim.kind === "review_queue_copy");
  const taskFocusedEvidence = activeQuestionCitations.length > 0 ? activeQuestionCitations : focusCitation == null ? [] : [focusCitation];
  const focusedTaskChipFile = activeFocusCandidate?.filePath ?? focusCitation?.filePath ?? selectedPath;
  const focusedTaskChipRange =
    activeFocusCandidate == null || activeFocusCandidate.citations.length === 0
      ? focusCitation == null
        ? null
        : focusLineLabel(focusCitation)
      : activeFocusCandidate.ui.displayRangeLabel;
  const localBoundaryFocusCitation =
    activeQuestion?.citations.find((citation) => citation.filePath === selectedPath) ?? focusCitation ?? null;
  const localBoundaryLineRange =
    localBoundaryFocusCitation == null
      ? null
      : {
          startLine: localBoundaryFocusCitation.startLine,
          endLine: localBoundaryFocusCitation.endLine,
        };
  const localBoundaryPrompt = activeQuestionPrompt;
  const localBoundaryReturnCondition = fallbackOwnershipBoundaryReturnCondition(
    localBoundaryPrompt,
    selectedPath,
    localBoundaryFocusCitation == null ? null : focusLineLabel(localBoundaryFocusCitation),
  );
  const localBoundaryEvidenceRefs = questionPlanEvidenceRefs(
    localBoundaryFocusCitation == null ? taskFocusedEvidence : activeQuestionCitations,
    selectedPath,
  );
  const localBoundaryOpenQuestions = questionBatchFromPlanner == null ? [] : questionBatch.questions.map((question) => question.prompt).slice(0, 4);
  const localBoundarySignature = stableLiveSignature([
    selectedPath,
    localBoundaryPrompt,
    ...taskFocusedEvidence.map((citation) => evidenceLocation(citation)),
    localBoundaryFocusCitation == null
      ? "no-focus"
      : `${localBoundaryFocusCitation.evidenceId}:${localBoundaryFocusCitation.startLine}-${localBoundaryFocusCitation.endLine}`,
  ]);
  const fallbackOwnershipBoundary: OwnershipBoundary | null = React.useMemo(() => {
    if (questionBatch == null || !hasTaskPrompt || taskFocusedEvidence.length === 0) return null;

    return {
      id: liveBoundaryId(selectedPath, localBoundaryLineRange?.startLine ?? 1, localBoundaryLineRange?.endLine ?? 1, localBoundarySignature),
      files: [selectedPath],
      responsibility_claim: "Live ownership planning boundary fallback.",
      evidence: localBoundaryEvidenceRefs,
      open_questions: questionBatch.questions.map((question) => question.prompt),
      risk: {
        score: 2,
        relationWeight: 1,
        missingCallerPenalty: 0,
        missingDeletionPenalty: 0,
        blockedPenalty: 0,
        questionablePenalty: 0,
      },
      confidence: "observed",
      title: `Live boundary: ${selectedPath}`,
      filePath: selectedPath,
      startLine: localBoundaryLineRange?.startLine ?? 1,
      endLine: localBoundaryLineRange?.endLine ?? 1,
      whyMatters: `Prepare for ownership on ${selectedPath} using active questions.`,
      prompt: [localBoundaryPrompt],
      returnCondition: localBoundaryReturnCondition,
    };
  }, [
    activeQuestion,
    hasTaskPrompt,
    localBoundaryEvidenceRefs,
    localBoundaryLineRange?.endLine,
    localBoundaryLineRange?.startLine,
    localBoundaryPrompt,
    localBoundaryReturnCondition,
    localBoundarySignature,
    taskFocusedEvidence.length,
    selectedPath,
    questionBatch,
  ]);
  const selectedFileLines = selectedFileText.split("\n");

  const liveBoundary = React.useMemo(() => {
    if (evidencePack == null) return null;
    if (plannerBoundaryFallbackVisible && questionBatchFromPlanner != null) {
      const boundarySignature = stableLiveSignature([
        selectedPath,
        localBoundaryPrompt,
        ...taskFocusedEvidence.map((citation) => evidenceLocation(citation)),
        localBoundaryFocusCitation == null ? "no-focus" : `${localBoundaryFocusCitation.evidenceId}:${localBoundaryFocusCitation.startLine}-${localBoundaryFocusCitation.endLine}`,
      ]);
      return {
        id: liveBoundaryId(selectedPath, localBoundaryLineRange?.startLine ?? 1, localBoundaryLineRange?.endLine ?? 1, boundarySignature),
        files: [selectedPath],
        responsibility_claim: "Live local ownership planning boundary.",
        evidence: localBoundaryEvidenceRefs,
        open_questions: localBoundaryOpenQuestions,
        risk: {
          score: 2,
          relationWeight: 1,
          missingCallerPenalty: 0,
          missingDeletionPenalty: 0,
          blockedPenalty: 0,
          questionablePenalty: 0,
        },
        confidence: "observed",
        title: `Live boundary: ${selectedPath}`,
        filePath: selectedPath,
        startLine: localBoundaryLineRange?.startLine ?? 1,
        endLine: localBoundaryLineRange?.endLine ?? 1,
        whyMatters: `Prepare for ownership on ${selectedPath} using active local plan questions.`,
        prompt: [localBoundaryPrompt],
        returnCondition: localBoundaryReturnCondition,
      };
    }

    if (languageStatus.kind !== "ready" || verification == null) return null;
    return deriveLiveOwnershipBoundary({
      evidencePack,
      proposal: languageStatus.proposal,
      verification,
    });
  }, [
    evidencePack,
    focusCitation?.evidenceId,
    hasVerifiedGeminiBoundary,
    languageStatus,
    localBoundaryFocusCitation?.evidenceId,
    localBoundaryLineRange?.startLine,
    localBoundaryLineRange?.endLine,
    localBoundaryOpenQuestions,
    localBoundaryPrompt,
    localBoundaryReturnCondition,
    plannerBoundaryFallbackVisible,
    questionBatchFromPlanner,
    selectedPath,
    taskFocusedEvidence,
    verification,
  ]);
  const submissionBoundary = React.useMemo(
    () => liveBoundary ?? fallbackOwnershipBoundary,
    [fallbackOwnershipBoundary, liveBoundary],
  );
  const latestLiveReadiness = liveReadinessHistory.at(-1) ?? null;
  const liveMemoryProjection = React.useMemo(
    () => buildOwnershipMemoryProjection(liveOwnershipMemory, { boundaryId: submissionBoundary?.id }),
    [submissionBoundary?.id, liveOwnershipMemory],
  );
  React.useEffect(() => {
    if (focusCitation == null) return;
    const focusedLine = liveCodeViewportRef.current?.querySelector(
      `[data-live-code-line-number="${focusCitation.startLine}"]`,
    );
    focusedLine?.scrollIntoView({ block: "center" });
  }, [focusCitation?.filePath, focusCitation?.startLine, focusCitation?.endLine]);
  const currentReviewAnnotationState = reviewAnnotationState(latestLiveReadiness, activeQuestionState);
  const reviewAnnotationVisible =
    hasTaskPrompt &&
    focusCitation != null &&
    (hasVerifiedGeminiBoundary || plannerBoundaryFallbackVisible) &&
    questionQueue?.blockedState == null;
  const reviewAnnotationDetail = shortArtifactText(
    latestLiveReadiness?.smallestRepair ??
      activeQuestionWhyThisMatters ??
      `Explain why ${focusedTaskChipFile} participates in this ownership boundary.`,
  );
  const codeReviewAnnotation: OwnershipReviewAnnotation | null =
    reviewAnnotationVisible && focusCitation != null
      ? {
          id: `review-code-${focusCitation.evidenceId}`,
          target: {
            kind: "code",
            filePath: focusCitation.filePath,
            startLine: focusCitation.startLine,
            endLine: focusCitation.endLine,
          },
          title: reviewAnnotationTitle(currentReviewAnnotationState),
          detail: reviewAnnotationDetail,
          state: currentReviewAnnotationState,
        }
      : null;
  const treeReviewAnnotation: OwnershipReviewAnnotation | null =
    reviewAnnotationVisible
      ? {
          id: `review-tree-${focusedTaskChipFile}`,
          target: {
            kind: "tree",
            path: focusedTaskChipFile,
          },
          title: "Sibar is reviewing this boundary",
          detail: reviewAnnotationDetail,
          state: currentReviewAnnotationState,
        }
      : null;
  const liveMemoryExport = React.useMemo(
    () =>
      submissionBoundary == null
        ? null
        : buildOwnershipMemoryExportBundle({
            memory: liveOwnershipMemory,
            mode: "manual",
            boundaryId: submissionBoundary.id,
            exportedAt: liveMemoryExportedAt,
          }),
    [submissionBoundary, liveMemoryExportedAt, liveOwnershipMemory],
  );
  const liveMemoryBoundaryHistory = liveMemoryExport?.boundary_history ?? [];
  const liveRuntimeUserExpectation =
    submissionBoundary == null
      ? null
      : {
          returnCondition: submissionBoundary.returnCondition,
          prompt: submissionBoundary.prompt,
          evidenceRefs: submissionBoundary.evidence,
        };
  const isProviderVerifiedFlow = hasVerifiedGeminiBoundary && !localPlannerFallback;
  const liveBoundaryStateLabel = readinessStateLabel(latestLiveReadiness?.readiness_gate ?? null);
  const localPlannerNextAction = nextActionForLocalPlanner(queueProgress);
  const verifiedNextAction = nextActionForVerifiedAttempt(latestLiveReadiness, queueProgress);
  const liveReportEvidenceRefs = React.useMemo(
    () => attemptEvidenceRefs(latestLiveReadiness, submissionBoundary),
    [latestLiveReadiness, submissionBoundary],
  );
  const liveReportPreview = React.useMemo(
    () =>
      submissionBoundary == null
        ? null
        : {
            reportId: liveMemoryExport?.export_id ?? "pending",
            sourceRoot,
            boundary: {
              id: submissionBoundary.id,
              filePath: submissionBoundary.filePath,
              startLine: submissionBoundary.startLine,
              endLine: submissionBoundary.endLine,
              returnCondition: submissionBoundary.returnCondition,
            },
            readiness: latestLiveReadiness == null
              ? null
              : {
                  attemptId: latestLiveReadiness.attempt_id,
                  gate: latestLiveReadiness.readiness_gate,
                  state: latestLiveReadiness.state,
                  evidenceFit: latestLiveReadiness.evidence_fit,
                  calibration: latestLiveReadiness.calibration_score,
                  summary: latestLiveReadiness.summary,
                  gapReason: latestLiveReadiness.gapReason,
                  smallestRepair: latestLiveReadiness.smallestRepair,
                },
            memory: {
              eventCount: liveMemoryProjection.event_count,
              exportId: liveMemoryExport?.export_id,
              boundaryHistoryCount: liveMemoryBoundaryHistory.length,
            },
            evidenceRefs: liveReportEvidenceRefs.slice(0, 8).map((entry) => entry.id),
            nextAction: verifiedNextAction,
            nextRecallCondition:
              latestLiveReadiness == null ? submissionBoundary.returnCondition : latestLiveReadiness.returnCondition,
            status: liveBoundaryStateLabel,
          },
    [
      latestLiveReadiness,
      liveBoundaryStateLabel,
      liveMemoryExport?.export_id,
      liveMemoryProjection.event_count,
      liveReportEvidenceRefs,
      liveMemoryBoundaryHistory.length,
      queueProgress,
      sourceRoot,
      submissionBoundary,
      verifiedNextAction,
    ],
  );

  React.useEffect(() => {
    setLiveAttemptText((previousAttempt) => (previousAttempt.trim().length > 0 ? previousAttempt : ""));
    setLiveReadinessHistory([]);
    setLiveOwnershipMemory(createOwnershipMemoryState());
    setLiveReadinessStartedAt(Date.now());
    setLiveMemoryExportedAt(Date.now());
  }, [submissionBoundary?.id]);

  React.useEffect(() => {
    setLiveMemoryExportedAt(Date.now());
  }, [submissionBoundary?.id, liveOwnershipMemory]);

  function submitLiveReadinessAttempt() {
    if (submissionBoundary == null) return;
    const normalizedAttempt = liveAttemptText.trim();
    if (normalizedAttempt.length < 2) return;
    const submittedQuestionId = activeQuestion?.id ?? questionQueue?.activeQuestionId ?? null;
    const submittedQuestionIndex =
      submittedQuestionId == null || questionBatch == null
        ? -1
        : questionBatch.questions.findIndex((question) => question.id === submittedQuestionId);
    const nextActiveQuestion =
      questionBatch == null || submittedQuestionIndex < 0
        ? null
        : [
            ...questionBatch.questions.slice(submittedQuestionIndex + 1),
            ...questionBatch.questions.slice(0, submittedQuestionIndex),
          ].find((question) => {
            const projectedState = liveQuestionStateById[question.id] ?? question.state;
            return projectedState !== "blocked" && projectedState !== "complete" && projectedState !== "attempted";
          }) ?? null;

    if (localPlannerFallback) {
      if (submittedQuestionId != null) {
        setLiveQuestionStateById((prev) => ({
          ...prev,
          [submittedQuestionId]: "attempted",
        }));
        setLiveActiveQuestionId(nextActiveQuestion?.id ?? submittedQuestionId);
      }
      setLiveAttemptText("");
      setLiveReadinessStartedAt(Date.now());
      return;
    }

    const attempt = evaluateOwnershipAttemptReadiness({
      attemptText: normalizedAttempt,
      boundary: submissionBoundary,
      selfConfidence: liveSelfConfidence,
      attemptIndex: liveReadinessHistory.length + 1,
      startedAt: liveReadinessStartedAt,
      now: () => Date.now(),
    });

    setLiveReadinessHistory((prev) => [...prev, attempt]);
    setLiveOwnershipMemory((prev) =>
      appendReadinessAttempt({
        memory: prev,
        boundary: submissionBoundary,
        readiness: attempt,
        effectiveBoundaryState: attempt.readiness_gate === "ready" ? "owned" : attempt.state,
      }),
    );
    if (submittedQuestionId != null) {
      setLiveQuestionStateById((prev) => ({
        ...prev,
        [submittedQuestionId]: "attempted",
      }));
      setLiveActiveQuestionId(nextActiveQuestion?.id ?? submittedQuestionId);
    }
    setLiveAttemptText("");
    setLiveReadinessStartedAt(Date.now());
  }

  return (
    <main className="workbenchRoot liveWorkbenchRoot">
      {dataset == null ? (
        <aside className="panel fileTreePanel" aria-label="Live file tree loading">
          <header className="panelHeader">
            <span className="brand">Sibar</span>
            <p className="panelSub">Ownership Map</p>
          </header>
          <p className="selectionSummary">
            {inventoryStatus.kind === "unavailable" ? inventoryStatus.reason : "Loading live repository inventory..."}
          </p>
        </aside>
      ) : (
        <FileTreePanel
          fileTreePaths={dataset.fileTreePaths}
          fileTreeNodeByPath={dataset.fileTreeNodeByPath}
          fileStates={dataset.fileStates}
          fileStateReasons={dataset.fileStateReasons}
          selectedPath={dataset.selectedPath ?? selectedPath}
          onSelectFile={setSelectedPath}
        />
      )}

      <section className="panel codePanel" aria-label="Live code panel">
        <header className="panelHeader splitHeader">
          <div>
            <p className="panelSub">Live Code</p>
            <h1>{selectedPath}</h1>
            <p className="selectionSummary">
              {fileContentStatus.kind === "ready"
                ? `Live content check: ${fileContentStatus.file.lineCount} lines, ${fileContentStatus.file.sizeBytes} bytes.`
                : "Checking live content availability..."}
            </p>
            <p className="focusSummary" data-testid="live-code-focus-summary">
              {focusCitation == null
                ? "Question focus: waiting for the proposal."
                : `Question focus: ${focusLineLabel(focusCitation)} from ${focusCitation.evidenceId}`}
            </p>
          </div>
        </header>
        <div className="liveCodeViewport" aria-label="Live selected file code" ref={liveCodeViewportRef}>
          {selectedFileLines.map((line, index) => {
            const lineNumber = index + 1;
            const isFocused =
              focusCitation != null &&
              lineNumber >= focusCitation.startLine &&
              lineNumber <= focusCitation.endLine;
            const isFirstFocusedLine = isFocused && lineNumber === focusCitation?.startLine;
            const isLastFocusedLine = isFocused && lineNumber === focusCitation?.endLine;
            const codeLineClassName = [
              "liveCodeLine",
              isFocused ? "focused" : "",
              isFirstFocusedLine ? "firstFocused" : "",
              isLastFocusedLine ? "lastFocused" : "",
            ].filter(Boolean).join(" ");
            return (
              <div
                className={codeLineClassName}
                data-testid={isFocused ? "live-code-line-highlight" : "live-code-line"}
                data-live-code-line-number={lineNumber}
                data-annotation-target={isFocused ? "active-code-focus" : undefined}
                aria-label={`Code line ${lineNumber}${isFocused ? " focused" : ""}`}
                key={lineNumber}
              >
                <span className="liveCodeLineNumber" aria-hidden="true">
                  {lineNumber}
                </span>
                <span className="liveCodeText">
                  <code>{line === "" ? " " : line}</code>
                  {isFirstFocusedLine && codeReviewAnnotation != null ? (
                    <span
                      className={`codeReviewArtifact ${codeReviewAnnotation.state}-review`}
                      aria-label="Code review artifact"
                    >
                      <strong>Sibar review focus</strong>
                      <span>{reviewAnnotationStatusLabel(codeReviewAnnotation.state)}</span>
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="panel ownershipPanel" aria-label="Live ownership review">
        <header className="panelHeader">
          <p className="panelSub">{isLabView ? "Review artifact" : "Question"}</p>
          <h1>{isLabView ? "Sibar is checking ownership" : "Answer the ownership question"}</h1>
          {isLabView ? <p className="boundaryTitle">{selectedPath}</p> : null}
        </header>
        <div className="ownershipPanelBody">
          <section className="ownershipSection ownershipTaskSection">
            {isLabView ? (
              <div className="ownershipTaskHeader">
                <div>
                  <p className="panelSub">Active task source</p>
                  <h2>{activeTaskSource}</h2>
                  <p className="ownershipTaskSourceHint">Explain the boundary Sibar selected</p>
                </div>
                <p className="ownershipTaskProgress" aria-label="Queue progress">
                  {questionQueue == null ? "Queue unavailable" : `Q ${queueProgressLabel}`}
                </p>
              </div>
            ) : null}

            {isLabView || !localPlannerFallback ? null : (
              <section className="ownershipSection" aria-label="Planner contract status">
                <p className="panelSub">Planner contract</p>
                <h2>Local planner limited</h2>
                <p>Status: limited · study mode · non-final.</p>
                {verification?.kind === "blocked_llm_unavailable" ? (
                  <p>{verification.reason}</p>
                ) : null}
                {localPlannerFallbackDiagnostics.length === 0 ? null : (
                  <ul aria-label="Local planner diagnostics">
                    {localPlannerFallbackDiagnostics.map((diagnostic) => (
                      <li key={`${diagnostic.code}-${diagnostic.message}`}>
                        [{diagnostic.severity}] [{diagnostic.code}] {diagnostic.message}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {questionBatchFromPlanner == null && verification?.kind === "blocked_llm_unavailable" ? (
              <section className="ownershipSection" aria-label="Ownership review unavailable">
                <p className="panelSub">Review unavailable</p>
                <h2>Sibar cannot prepare a verified question yet</h2>
                <p>{verification.reason}</p>
              </section>
            ) : questionBatchFromPlanner == null && (languageStatus.kind === "loading" || verification == null) ? (
              <section className="ownershipSection" aria-label="Ownership review preparing">
                <p className="panelSub">Preparing question</p>
                <h2>Sibar is finding the next question</h2>
                {isLabView ? (
                  <ol className="loadingSteps">
                    <li className={evidencePack == null ? "active" : "complete"}>Reading local evidence</li>
                    <li className={languageStatus.kind === "loading" ? "active" : "complete"}>Selecting boundary</li>
                    <li className={verification == null ? "active" : "complete"}>Preparing defense question</li>
                  </ol>
                ) : null}
              </section>
            ) : questionBatchFromPlanner == null && verification.kind === "rejected" ? (
              <section className="ownershipSection" aria-label="Ownership review unavailable">
                <p className="panelSub">Review unavailable</p>
                <h2>Sibar rejected an unverified review artifact</h2>
                <p>The generated review did not match local evidence, so it was not shown as a task.</p>
                <pre>{verification.reasons.join("\n")}</pre>
              </section>
            ) : questionQueue?.blockedState != null ? (
              <section className="ownershipSection" aria-label="Ownership review unavailable">
                <p className="panelSub">Queue blocked</p>
                <h2>{questionQueue.blockedState.code}</h2>
                <p>{questionQueue.blockedState.message}</p>
                {questionQueue.blockedState.detail == null ? null : <p>{questionQueue.blockedState.detail}</p>}
              </section>
            ) : !hasTaskPrompt ? (
              <section className="ownershipSection" aria-label="Generated attempt-first language">
                <p className="panelSub">Question</p>
                <h2>No active question available</h2>
                <p>Sibar found evidence, but there is no verified defense question ready for this boundary yet.</p>
              </section>
            ) : (
              <section className="ownershipSection" aria-label="Generated attempt-first language">
                <p className="panelSub">Question</p>
                <h2>Can you defend this boundary?</h2>
                <p className="taskQuestionText">{activeQuestionPrompt}</p>
                {isLabView && activeQuestionWhyThisMatters != null ? (
                  <p className="taskWhyThisMatters">{activeQuestionWhyThisMatters}</p>
                ) : null}
                {isLabView ? (
                  <>
                    <div className="taskFocusChipRow">
                      {focusedTaskChipRange == null ? (
                        <span className="focusChip muted">Focus pending</span>
                      ) : (
                        <span className="focusChip" data-testid="live-attempt-focus-chip">
                          {focusedTaskChipFile}: {focusedTaskChipRange}
                        </span>
                      )}
                      {activeQuestionState == null ? null : (
                        <span className={queueStateBadgeClass(activeQuestionState)}>{queueStateLabel(activeQuestionState)}</span>
                      )}
                    </div>
                    <div className="taskEvidencePreview">
                      <p className="panelSub">Evidence to inspect</p>
                      {taskFocusedEvidence.length === 0 ? (
                        <p>No focused evidence available yet.</p>
                      ) : (
                        <ul className="taskEvidenceList" aria-label="Task citations">
                          {taskFocusedEvidence.map((citation, index) => (
                            <li key={`${citation.evidenceId}-${citation.startLine}-${citation.endLine}-${index}`}>
                              <span>{citation.evidenceId}</span>
                              <span className="taskEvidenceRange">{citation.filePath}: {focusLineLabel(citation)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                ) : null}
                {activeQuestion == null && acceptedAttemptClaim == null ? null : (
                  <label className="attemptField ownershipTaskAttempt">
                    <span>{isLabView ? "Live boundary attempt" : "Your answer"}</span>
                    <textarea
                      value={liveAttemptText}
                      onChange={(event) => setLiveAttemptText(event.target.value)}
                      placeholder={liveAttemptPlaceholder}
                      rows={5}
                      aria-label={isLabView ? "Live boundary attempt" : "Your answer"}
                    />
                  </label>
                )}
                {isLabView ? (
                  <label className="confidenceField">
                    <span>Self-confidence ({liveSelfConfidence})</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={liveSelfConfidence}
                      onChange={(event) => setLiveSelfConfidence(Number.parseInt(event.target.value, 10))}
                      aria-label="Live self confidence"
                    />
                  </label>
                ) : null}
                <div className="attemptActions">
                  <button
                    type="button"
                    onClick={submitLiveReadinessAttempt}
                    disabled={liveAttemptText.trim().length < 2 || submissionBoundary == null}
                    aria-label={isLabView ? "Submit live attempt" : "Submit answer"}
                  >
                    {isLabView ? "Submit live attempt" : "Submit answer"}
                  </button>
                </div>
              </section>
            )}
            {isLabView && questionBatchFromPlanner != null ? (
              <section className="ownershipSection ownershipPlanSection" aria-label="Ownership plan">
                <div className="ownershipPlanHeader">
                  <p className="panelSub">Ownership plan</p>
                  <h2>Ownership units/questions</h2>
                </div>
                <dl className="ownershipPlanSummary">
                  <div>
                    <dt>File classification</dt>
                    <dd>
                      <span className={`ownershipPlanBadge ${activeQuestionPlanFileClass}`}>
                        {activeQuestionPlanFileClass}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Question budget</dt>
                    <dd>{localPlanQuestionCount}/10</dd>
                  </div>
                  <div>
                    <dt>Unit count</dt>
                    <dd>{localPlanUnitCount}</dd>
                  </div>
                  <div>
                    <dt>Backlog</dt>
                    <dd>{localPlanQuestionBacklog}</dd>
                  </div>
                  <div>
                    <dt>Diagnostics</dt>
                    <dd>{localPlanDiagnosticCount}</dd>
                  </div>
                </dl>
                {localOwnershipQuestionPlanVerification == null ? null : (
                  <ul className="ownershipPlanUnitsList">
                    {localOwnershipQuestionPlanVerification.acceptedPlan.units.slice(0, 4).map((unit) => {
                      const planUnitRange = unit.startLine === unit.endLine
                        ? `line ${unit.startLine}`
                        : `lines ${unit.startLine}-${unit.endLine}`;
                      return (
                        <li key={unit.id}>
                          <span className="ownershipPlanUnitMeta">
                            {unit.kind} · {planUnitRange}
                          </span>
                          <span className="ownershipPlanUnitPath">{selectedPath}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : null}
            {isLabView || submissionBoundary == null ? null : (
              <section
                className="ownershipSection ownershipSectionSecondary"
                aria-label={isProviderVerifiedFlow ? "Ownership report" : "Limited planner status"}
              >
                <p className="panelSub">{isProviderVerifiedFlow ? "Ownership report" : "Limited planner status"}</p>
                <h2>{isProviderVerifiedFlow ? "Live report snapshot" : "Limited study status"}</h2>
                {isProviderVerifiedFlow ? (
                  <>
                    <div className="readinessMetrics">
                      <span>State: {liveBoundaryStateLabel}</span>
                      {liveReportPreview?.readiness?.smallestRepair == null ? null : (
                        <span>Gap/repair: {liveReportPreview.readiness.smallestRepair}</span>
                      )}
                      {liveReportPreview?.readiness?.gapReason == null ? null : (
                        <span>Gap reason: {liveReportPreview.readiness.gapReason}</span>
                      )}
                      <span>Report id: {liveReportPreview?.reportId ?? "pending"}</span>
                      <span>Evidence refs: {liveReportEvidenceRefs.length}</span>
                    </div>
                    <dl className="labFacts compact">
                      <div>
                        <dt>Recall condition</dt>
                        <dd>{liveReportPreview?.nextRecallCondition ?? submissionBoundary.returnCondition}</dd>
                      </div>
                      <div>
                        <dt>Next action</dt>
                        <dd>{liveReportPreview?.nextAction ?? verifiedNextAction}</dd>
                      </div>
                      <div>
                        <dt>Return condition</dt>
                        <dd>{liveReportPreview?.nextRecallCondition ?? submissionBoundary.returnCondition}</dd>
                      </div>
                      <div>
                        <dt>Evidence references</dt>
                        <dd>{liveReportEvidenceRefs.slice(0, 6).map((entry) => entry.id).join(", ") || "none"}</dd>
                      </div>
                    </dl>
                    <details>
                      <summary>Take away report JSON</summary>
                      <pre>{JSON.stringify(liveReportPreview, null, 2)}</pre>
                    </details>
                  </>
                ) : (
                  <>
                    <p>Status: limited · study mode · non-final.</p>
                    <p>
                      This mode does not emit final ownership status or report ids. Answer another limited study prompt or reconnect
                      provider-backed planning for final ownership output.
                    </p>
                    <div className="readinessMetrics">
                      <span>Next review action: {localPlannerNextAction}</span>
                      <span>Next reattempt condition: {submissionBoundary.returnCondition}</span>
                      <span>Study evidence refs: {liveReportEvidenceRefs.length}</span>
                    </div>
                  </>
                )}
              </section>
            )}
            {isLabView && reviewQueueClaims.length > 0 ? (
              <section className="ownershipSection" aria-label="Review rationale">
                <p className="panelSub">Review rationale</p>
                <h2>Why Sibar is asking this</h2>
                <ul>
                  {reviewQueueClaims.map((claim) => (
                    <li key={claim.id}>{claim.text}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </section>

          {isLabView && questionQueue != null ? (
            <section className="ownershipSection ownershipQueueSection">
              <div className="ownershipQueueHeader">
                <p className="panelSub">Queue status</p>
                <h2>Ownership checks</h2>
              </div>
              <div className="ownershipQueueSummary" aria-label="Question queue progress">
                <progress
                  className="queueProgressRail"
                  value={Math.max(0, queueCompleteOrAttempted)}
                  max={Math.max(1, queueProgress?.total ?? 0)}
                />
                <div className="ownershipQueueSummaryHeader">
                  <span className="ownershipQueueSummaryMetric">{queueSummary}</span>
                  <span className="ownershipQueueReady">{queueReadyState}</span>
                </div>
                <div className="queueProgressSegments" aria-hidden="true">
                  {queueProgress == null
                    ? null
                    : Array.from({ length: queueProgress.total }, (_, index) => (
                        <span
                          key={index}
                          className={`queueProgressSegment ${
                            index < queueCompleteOrAttempted ? "queueProgressSegmentComplete" : "queueProgressSegmentPending"
                          }`}
                        />
                      ))}
                </div>
                <p className="ownershipQueueBlocked">Blocked: {queueProgress?.blocked ?? 0}</p>
              </div>
              <ol className="ownershipQueueList">
                {queueItemsByPriority.map((item) => (
                  <li
                    key={item.questionId}
                    className={item.questionId === questionQueue?.activeQuestionId ? "ownershipQueueItemActive" : undefined}
                  >
                    <div className="queueItemHeader">
                      <strong>{item.title}</strong>
                      <span className={queueStateBadgeClass(item.state)}>{queueStateLabel(item.state)}</span>
                    </div>
                    <p className="ownershipQueuePath">{item.filePath}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {isLabView ? (
            <section className="ownershipSection ownershipSectionSecondary">
              <p className="panelSub">Repo context</p>
              <h2>Workspace evidence</h2>
              <p>Reviewing {sourceRoot}</p>
              <p>
                {inventoryStatus.kind === "ready"
                  ? `${inventoryStatus.inventory.files.length} files available for local ownership evidence.`
                  : inventoryStatus.kind === "unavailable"
                    ? inventoryStatus.reason
                    : "Loading inventory..."}
              </p>
              <p>
                {repoSearchStatus.kind === "ready"
                  ? `${repoSearchStatus.search.results.length} nearby evidence matches for '${repoSearchStatus.search.query}'.`
                  : repoSearchStatus.kind === "unavailable"
                    ? `Text search unavailable: ${repoSearchStatus.reason}`
                    : "Loading text search evidence..."}
              </p>
              {evidencePack != null && evidencePack.projectSignals.length > 0 ? (
                <ul aria-label="Project signals">
                  {evidencePack.projectSignals.slice(0, LAB_PROJECT_SIGNALS_LIMIT).map((signal) => (
                    <li key={signal.id}>
                      {signal.label}: {signal.value}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {isLabView ? (
            <section className="ownershipSection ownershipSectionSecondary">
              <p className="panelSub">Provider contract</p>
              <h2>Question batch</h2>
              <dl className="labFacts compact">
                <div>
                  <dt>Provider</dt>
                  <dd>{questionBatch?.providerId ?? "unavailable"}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{questionBatch?.model ?? "unavailable"}</dd>
                </div>
                <div>
                  <dt>Selected files</dt>
                  <dd>{questionBatch == null ? "n/a" : `${questionBatch.selectedFiles.length} selected`}</dd>
                </div>
                <div>
                  <dt>Focus candidates</dt>
                  <dd>{focusCandidateResult?.candidates.length ?? 0}</dd>
                </div>
              </dl>
              {questionBatch == null || questionBatch.diagnostics.length === 0 ? null : (
                <ul>
                  {questionBatch.diagnostics.map((diagnostic) => (
                    <li key={`${diagnostic.code}-${diagnostic.message}`}>[{diagnostic.code}] {diagnostic.message}</li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {isLabView && liveBoundary != null ? (
            <section className="ownershipSection readinessSection" aria-label="Live boundary readiness gate">
              <p className="panelSub">Live attempt</p>
              {plannerBoundaryFallbackVisible ? (
                <>
                  <h2>Local planner limited</h2>
                  <p>Readiness scoring is in limited mode: study prompts only, non-final.</p>
                </>
              ) : (
                <>
                  <h2>Boundary attempt bridge</h2>
                  <p>{liveBoundary.prompt[0] ?? "Submit a bounded attempt for the verified live proposal."}</p>
                  <section className="attemptReadinessSummary" aria-label="Live readiness gate output">
                    <h4>Readiness gate: {latestLiveReadiness?.readiness_gate ?? "not_attempted"}</h4>
                    <div className="readinessMetrics">
                      <span>Evidence fit: {latestLiveReadiness?.evidence_fit.toFixed(2) ?? "n/a"}</span>
                      <span>Calibration: {latestLiveReadiness?.calibration_score.toFixed(2) ?? "n/a"}</span>
                      <span>Memory events: {liveMemoryProjection.event_count}</span>
                    </div>
                    {latestLiveReadiness != null ? (
                      <dl className="readinessDetails">
                        <div>
                          <dt>Smallest repair</dt>
                          <dd>{latestLiveReadiness.smallestRepair}</dd>
                        </div>
                        <div>
                          <dt>Evidence refs</dt>
                          <dd>{latestLiveReadiness.attemptEvidenceRefs.map((entry) => entry.id).join(", ") || "none"}</dd>
                        </div>
                        <div>
                          <dt>Return condition</dt>
                          <dd>{latestLiveReadiness.returnCondition}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </section>
                </>
              )}
            </section>
          ) : null}
          {isLabView ? (
            <section className="ownershipSection" aria-label="Live runtime lab">
              <p className="panelSub">Lab</p>
              <h2>Runtime JSON</h2>
              <pre>
                {jsonPreview({
                  sourceRoot,
                  selectedPath,
                  runtimeContextPaths,
                  contextStatus,
                  loadedContextPaths: Object.keys(contextFileContents),
                  inventoryStatus,
                  dataset,
                  fileContent:
                    fileContentStatus.kind === "ready"
                      ? {
                          sourceRoot: fileContentStatus.file.sourceRoot,
                          path: fileContentStatus.file.path,
                          lineCount: fileContentStatus.file.lineCount,
                          sizeBytes: fileContentStatus.file.sizeBytes,
                        }
                      : fileContentStatus,
                  repoSearchStatus,
                  focusCandidateResult,
                  evidencePack,
                  languageProposal:
                    languageStatus.kind === "ready"
                      ? languageStatus.proposal
                      : languageStatus.kind === "unavailable"
                        ? { kind: languageStatus.kind, reason: languageStatus.reason, trace: languageStatus.trace }
                        : languageStatus,
                  verification,
                  questionBatch,
                  questionQueue,
                  liveBoundary,
                  liveReadinessHistory,
                  liveMemoryProjection,
                  liveMemoryExport,
                  liveRuntimeUserExpectation,
                })}
              </pre>
            </section>
          ) : null}
        </div>
      </aside>
    </main>
  );
}

export default function App() {
  const [locationSearch, setLocationSearch] = React.useState(() =>
    typeof window === "undefined" ? "" : window.location.search,
  );
  const workbenchSurfaceMode = getWorkbenchSurfaceMode(locationSearch);
  const urlParams = React.useMemo(
    () => (typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(locationSearch)),
    [locationSearch],
  );
  const isFixtureMode = getWorkbenchFixtureMode(locationSearch);
  const liveSourceRoot = normalizeSourceRoot(urlParams.get("sourceRoot") ?? DEFAULT_SOURCE_ROOT);
  const [showWorkbench, setShowWorkbench] = React.useState(() => {
    if (typeof window === "undefined") return true;
    const params = new URLSearchParams(window.location.search);
    return workbenchSurfaceMode === "lab" || params.get("workbench") === "1";
  });
  const [selectedFile, setSelectedFile] = React.useState(initialFile);
  const [viewMode, setViewMode] = React.useState<ViewMode>("diff");
  const [selection, setSelection] = React.useState<LineSelection | null>(null);
  const [fileStates, setFileStates] = React.useState<Record<string, BoundaryState>>(initialFileStates);
  const [attemptText, setAttemptText] = React.useState("");
  const [selfConfidence, setSelfConfidence] = React.useState(70);
  const [transferAnswerText, setTransferAnswerText] = React.useState("");
  const [readinessHistory, setReadinessHistory] = React.useState<OwnershipAttemptReadiness[]>([]);
  const [readinessStartedAt, setReadinessStartedAt] = React.useState<number>(() => Date.now());
  const [transferHistoryByBoundary, setTransferHistoryByBoundary] = React.useState<
    Record<string, TransferAttemptRecord[]>
  >({});
  const [authorizedEscalationArtifacts, setAuthorizedEscalationArtifacts] = React.useState<
    Record<string, OwnershipReviewArtifact | null>
  >({});
  const [ownershipMemory, setOwnershipMemory] = React.useState(createOwnershipMemoryState);
  const [sessionState, setSessionState] = React.useState<OwnershipSessionState>(
    createOwnershipSessionState,
  );
  const [inventoryStatus, setInventoryStatus] = React.useState<RepoInventoryStatus>({ kind: "loading" });
  const [fileContentStatus, setFileContentStatus] = React.useState<FileContentStatus>({ kind: "loading" });

  const evidenceGroups = React.useMemo(() => groupedEvidence(fixtureEvidence), []);
  const sessionQuestions = React.useMemo(
    () => makeOwnershipSessionQuestions(ownershipReviewQueue),
    [],
  );
  const codeViewFileItem = codeViewFileItemsByPath[selectedFile];
  const codeViewDiffItem = codeViewDiffItemsByPath[selectedFile];
  const boundaryCandidates = React.useMemo(
    () =>
      buildBoundaryCandidates({
        baseBoundary: ownershipBoundary,
        fileFixtures,
        evidenceRefs: fixtureEvidence,
        reviewQueue: ownershipReviewQueue,
        fileDiffsByPath,
      }),
    [],
  );
  const selectedBoundary = React.useMemo(
    () => selectHighestRiskBoundary(boundaryCandidates),
    [boundaryCandidates],
  );
  const transferProbe = React.useMemo(
    () => makeTransferProbe(selectedBoundary, ownershipReviewQueue),
    [selectedBoundary],
  );
  const { fileStates: projectedFileStates, fileStateReasons } = React.useMemo(
    () =>
      projectBoundaryFileStates({
        boundary: selectedBoundary,
        baseFileStates: fileStates,
        fileDiffsByPath,
        reviewQueue: ownershipReviewQueue,
      }),
    [selectedBoundary, fileStates],
  );
  const boundaryState = getActiveBoundaryState(projectedFileStates, selectedBoundary);
  const selectionSummaryText = getLineSelectionText(selection);
  const labContext =
    workbenchSurfaceMode === "lab"
      ? {
          selectedFile,
          viewMode,
          selection,
          selectionSummaryText,
          evidenceRefs: fixtureEvidence,
        }
      : null;
  const relationNavigation = React.useMemo(
    () => getRelationNavigationTargets(selectedFile, ownershipReviewQueue, fixtureEvidence),
    [selectedFile],
  );
  const relationEvidence = React.useMemo(
    () =>
      extractCodeEvidence({
        selectedFile,
        fileFixtures,
        evidenceRefs: fixtureEvidence,
        reviewQueue: ownershipReviewQueue,
      }),
    [selectedFile],
  );
  const boundaryRelationEvidence = React.useMemo(
    () =>
      extractCodeEvidence({
        selectedFile: selectedBoundary.filePath,
        fileFixtures,
        evidenceRefs: fixtureEvidence,
        reviewQueue: ownershipReviewQueue,
      }),
    [selectedBoundary.filePath],
  );
  const transferHistory = React.useMemo(
    () => transferHistoryByBoundary[selectedBoundary.id] ?? [],
    [selectedBoundary.id, transferHistoryByBoundary],
  );
  const transferHistoryForCurrentProbe = transferHistory.filter((attempt) => attempt.probeId === transferProbe.id);
  const readinessHistoryWithTransfer = React.useMemo(
    () =>
      readinessHistory.map((entry) =>
        integrateTransferReadinessState({
          boundary: selectedBoundary,
          reviewQueue: ownershipReviewQueue,
          readiness: entry,
          transferHistory: transferHistoryForCurrentProbe,
        }),
      ),
    [readinessHistory, selectedBoundary, transferHistoryForCurrentProbe],
  );
  const latestReadinessWithTransfer = React.useMemo(
    () => readinessHistoryWithTransfer.at(-1) ?? null,
    [readinessHistoryWithTransfer],
  );

  const readinessHistoryForCurrentAttempt = React.useMemo(
    () => readinessHistoryWithTransfer.filter((entry) => entry.transfer.probeId === transferProbe.id),
    [readinessHistoryWithTransfer, transferProbe.id],
  );
  const latestReadiness = React.useMemo(
    () => readinessHistoryWithTransfer.at(-1) ?? null,
    [readinessHistoryWithTransfer],
  );
  const readiness: ReadinessGate | "not_attempted" = latestReadiness?.readiness_gate ?? "not_attempted";
  const escalationDecision = React.useMemo<WorkspaceEscalationDecision>(() => {
    return evaluateWorkspaceEscalation({
      boundary: selectedBoundary,
      sessionState,
      readinessHistory: readinessHistoryForCurrentAttempt,
      transferHistory: transferHistoryForCurrentProbe,
      reviewQueue: ownershipReviewQueue,
      evidenceRefs: fixtureEvidence,
    });
  }, [selectedBoundary, sessionState, readinessHistoryForCurrentAttempt, transferHistoryForCurrentProbe]);
  const authorizedHandoffArtifact =
    authorizedEscalationArtifacts[selectedBoundary.id] ?? null;
  const isTransferRequired = latestReadinessWithTransfer?.transfer.required ?? transferProbe.required;
  const ownershipMemoryExport = React.useMemo(
    () =>
      buildOwnershipMemoryExportBundle({
        memory: ownershipMemory,
        mode: "manual",
        boundaryId: selectedBoundary.id,
        exportedAt: 1_700_000_000_000,
      }),
    [ownershipMemory, selectedBoundary.id],
  );
  const cognitiveDebtMetric = React.useMemo<CognitiveDebtMetric>(
    () =>
      buildCognitiveDebtMetric({
        boundary: selectedBoundary,
        memoryExport: ownershipMemoryExport,
        reviewQueue: ownershipReviewQueue,
        codeEvidence: [boundaryRelationEvidence],
      }),
    [ownershipMemoryExport, selectedBoundary, boundaryRelationEvidence],
  );
  const cognitiveLoadMetric = React.useMemo<CognitiveLoadMetric>(
    () =>
      buildCognitiveLoadMetric({
        boundary: selectedBoundary,
        memoryExport: ownershipMemoryExport,
        reviewQueue: ownershipReviewQueue,
        codeEvidence: [boundaryRelationEvidence],
      }),
    [ownershipMemoryExport, selectedBoundary, boundaryRelationEvidence],
  );
  const cognitiveDailyReadout = React.useMemo<DailyCognitiveReadout>(
    () =>
      buildDailyCognitiveReadout({
        boundary: selectedBoundary,
        memoryExport: ownershipMemoryExport,
        reviewQueue: ownershipReviewQueue,
        codeEvidence: [boundaryRelationEvidence],
      }),
    [ownershipMemoryExport, selectedBoundary, boundaryRelationEvidence],
  );
  const labGeminiProvider = getGeminiEvidenceProviderAdapter("gemini-first");
  const agentFlowManifest = React.useMemo<AgentFlowManifest>(() => {
    return buildAgentFlowManifest({
      boundary: selectedBoundary,
      boundaryState,
      readiness,
      selectedFile,
      sessionState,
      evidenceRefs: fixtureEvidence,
    });
  }, [selectedBoundary, boundaryState, readiness, selectedFile, sessionState]);
  const agentFlowRuntime = React.useMemo(() => {
    return buildAgentFlowRuntime({
      boundary: selectedBoundary,
      boundaryState,
      readiness,
      selectedFile,
      evidenceRefs: fixtureEvidence,
      sessionState,
    });
  }, [selectedBoundary, boundaryState, readiness, selectedFile, sessionState]);
  const labAgentFlowHappyPath = React.useMemo<AgentActionValidationResult>(
    () =>
      validateAgentAction({
        manifest: agentFlowManifest,
        runtime: agentFlowRuntime,
        request: {
          actionId: AGENT_FLOW_READONLY_ACTION,
          actor: "agent",
          controlId: "agent-flow-control-read-manifest",
          payload: "inspect-manifest",
        },
      }),
    [agentFlowManifest, agentFlowRuntime],
  );
  const labAgentFlowBlockedPath = React.useMemo<AgentActionValidationResult>(
    () =>
      validateAgentAction({
        manifest: agentFlowManifest,
        runtime: agentFlowRuntime,
        request: {
          actionId: "set_readiness_fact",
          actor: "agent",
          controlId: "agent-flow-control-submit-guided-attempt",
          payload: "set-ready-flag",
        },
      }),
    [agentFlowManifest, agentFlowRuntime],
  );
  const geminiEvidenceLabReport = React.useMemo(() => {
    return buildGeminiEvidenceLabReport({
      selectedFile,
    });
  }, [selectedFile]);
  const labGeminiExtraction: GeminiEvidenceExtractionResult | null = React.useMemo(() => {
    if (labGeminiProvider == null || workbenchSurfaceMode !== "lab") {
      return null;
    }

    return evaluateGeminiEvidenceReport({
      fileContents: fileFixtures,
      report: geminiEvidenceLabReport,
      providerAdapter: labGeminiProvider,
    });
  }, [labGeminiProvider, geminiEvidenceLabReport, workbenchSurfaceMode]);

  const latestTransferAttempt = transferHistoryForCurrentProbe.at(-1) ?? null;

  React.useEffect(() => {
    if (!isFixtureMode) return;
    setSelection(null);
  }, [isFixtureMode, selectedFile, viewMode]);

  React.useEffect(() => {
    if (!isFixtureMode) return;
    const currentQuestion = sessionQuestions[sessionState.currentIndex];
    if (currentQuestion && currentQuestion.filePath !== selectedFile) {
      setSelectedFile(currentQuestion.filePath);
    }
  }, [isFixtureMode, selectedFile, sessionQuestions, sessionState.currentIndex]);

  React.useEffect(() => {
    if (!isFixtureMode) return;
    const controller = new AbortController();

    void (async () => {
      const nextStatus = await loadFileContentStatus(selectedFile, {
        signal: controller.signal,
        sourceRoot: "src",
      });
      if (!controller.signal.aborted) {
        setFileContentStatus(nextStatus);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [isFixtureMode, selectedFile]);

  React.useEffect(() => {
    if (!isFixtureMode) return;
    const controller = new AbortController();

    void (async () => {
      const nextStatus = await loadRepoInventoryStatus("src", { signal: controller.signal });
      if (!controller.signal.aborted) {
        setInventoryStatus(nextStatus);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [isFixtureMode]);

  function submitGuidedAttempt() {
    advanceSession("submit");
  }

  function markUnknown() {
    if (sessionState.isComplete) return;
    advanceSession("mark_unknown");
  }

  function submitReadinessAttempt() {
    submitOwnershipAttempt();
  }

  function authorizeWorkspaceHandoff() {
    if (!escalationDecision.isCandidate || latestReadinessWithTransfer == null) {
      return;
    }

    const artifact = buildOwnershipReviewArtifact({
      boundary: selectedBoundary,
      sessionState,
      readinessHistory: readinessHistoryForCurrentAttempt,
      transferHistory: transferHistoryForCurrentProbe,
      reviewQueue: ownershipReviewQueue,
      evidenceRefs: fixtureEvidence,
      sourceKind: "diff",
      decision: escalationDecision,
      goalContext: selectedBoundary.title,
      diffTextRef: latestReadinessWithTransfer.attempt_id,
      now: () => readinessStartedAt,
    });

    setAuthorizedEscalationArtifacts((prev) => ({
      ...prev,
      [selectedBoundary.id]: artifact,
    }));
    setOwnershipMemory((prev) =>
      appendHandoffArtifact({
        memory: prev,
        boundary: selectedBoundary,
        artifact,
      }),
    );
  }

  function submitOwnershipAttempt() {
    const normalizedAttempt = attemptText.trim();
    if (!sessionState.isComplete || normalizedAttempt.length < 2) {
      return;
    }

    const attempt = evaluateOwnershipAttemptReadiness({
      attemptText: normalizedAttempt,
      boundary: selectedBoundary,
      selfConfidence,
      attemptIndex: readinessHistory.length + 1,
      startedAt: readinessStartedAt,
      now: () => Date.now(),
    });
    const projectedAttempt = integrateTransferReadinessState({
      boundary: selectedBoundary,
      reviewQueue: ownershipReviewQueue,
      readiness: attempt,
      transferHistory: transferHistory.filter((entry) => entry.probeId === transferProbe.id),
    });
    const isTransferSatisfied =
      !isTransferRequired || projectedAttempt.transfer.transferOutcome === "transfer_pass";
    const nextBoundaryState =
      projectedAttempt.readiness_gate === "ready" && isTransferSatisfied
        ? "owned"
        : projectedAttempt.readiness_gate === "ready"
          ? "partial"
          : projectedAttempt.state === "owned"
            ? "partial"
            : projectedAttempt.state;

    setReadinessHistory((prev) => [...prev, projectedAttempt]);
    setOwnershipMemory((prev) =>
      appendReadinessAttempt({
        memory: prev,
        boundary: selectedBoundary,
        readiness: projectedAttempt,
        effectiveBoundaryState: nextBoundaryState,
      }),
    );
    setFileStates((prev) => withBoundaryFileState(prev, selectedBoundary, nextBoundaryState));
    setAttemptText("");
    setTransferAnswerText("");
    setReadinessStartedAt(Date.now());
  }

  function retryOwnershipAttempt() {
    setAttemptText("");
    setSelfConfidence(60);
    setReadinessStartedAt(Date.now());
  }

  function advanceSession(action: "submit" | "mark_unknown") {
    const result = advanceOwnershipSession(sessionState, sessionQuestions, attemptText, action);
    if (!sessionState.isComplete && result.state.isComplete) {
      setReadinessStartedAt(Date.now());
    }
    setSessionState(result.state);
    setAttemptText("");

    if (result.observation) {
      setOwnershipMemory((prev) =>
        appendGuidedObservation({
          memory: prev,
          boundary: selectedBoundary,
          observation: result.observation!,
        }),
      );
      setFileStates((prev) => ({
        ...prev,
        [result.observation.filePath]: "gap",
      }));
    }
  }

  function appendTransferAttempt(nextAttempt: TransferAttemptRecord) {
    setTransferHistoryByBoundary((prev) => {
      const previousAttempts = prev[selectedBoundary.id] ?? [];
      return {
        ...prev,
        [selectedBoundary.id]: [...previousAttempts, nextAttempt],
      };
    });
    setOwnershipMemory((prev) =>
      appendTransferMemoryAttempt({
        memory: prev,
        boundary: selectedBoundary,
        transfer: nextAttempt,
      }),
    );
  }

  function submitTransferAttempt() {
    if (latestReadiness == null || latestReadiness.readiness_gate !== "ready") {
      return;
    }

    const normalizedTransferAnswer = transferAnswerText.trim();
    if (!normalizedTransferAnswer.length) {
      return;
    }

    const nextAttempt = evaluateTransferAttempt({
      attemptText: normalizedTransferAnswer,
      attemptIndex: transferHistoryForCurrentProbe.length + 1,
      probe: transferProbe,
      transferHistory: transferHistoryForCurrentProbe,
      startedAt: readinessStartedAt,
      now: () => Date.now(),
    });

    appendTransferAttempt(nextAttempt);
    setTransferAnswerText("");
    setReadinessStartedAt(Date.now());

    if (nextAttempt.outcome === "transfer_pass") {
      setFileStates((prev) => withBoundaryFileState(prev, selectedBoundary, "owned"));
      return;
    }

    setFileStates((prev) => withBoundaryFileState(prev, selectedBoundary, "partial"));
  }

  function submitTransferSkip() {
    if (latestReadiness == null || latestReadiness.readiness_gate !== "ready") {
      return;
    }

    const nextAttempt = makeTransferSkip({
      attemptText: transferAnswerText.trim(),
      attemptIndex: transferHistoryForCurrentProbe.length + 1,
      probe: transferProbe,
      transferHistory: transferHistoryForCurrentProbe,
      startedAt: readinessStartedAt,
      now: () => Date.now(),
    });

    appendTransferAttempt(nextAttempt);
    setTransferAnswerText("");
    setReadinessStartedAt(Date.now());
    setFileStates((prev) => withBoundaryFileState(prev, selectedBoundary, "partial"));
  }

  if (!showWorkbench && workbenchSurfaceMode !== "lab") {
    return (
      <CapturePrEntryScreen
        onAnalyze={(nextSourceRoot) => {
          const normalizedSourceRoot = normalizeSourceRoot(nextSourceRoot);
          const query = new URLSearchParams();
          query.set("workbench", "1");
          query.set("sourceRoot", normalizedSourceRoot);
          const canonicalWorkbenchSearch = `?${query.toString()}`;
          setShowWorkbench(true);
          setLocationSearch(canonicalWorkbenchSearch);
          if (typeof window !== "undefined") {
            window.history.pushState({}, "", canonicalWorkbenchSearch);
          }
        }}
        sourceRootDefault={DEFAULT_SOURCE_ROOT}
        showSourceRootInput={true}
      />
    );
  }

  if (!isFixtureMode) {
    return <LiveOwnershipWorkbench sourceRoot={liveSourceRoot} surfaceMode={workbenchSurfaceMode} />;
  }

  return (
    <main className="workbenchRoot">
      <FileTreePanel
        fileTreePaths={fileTreePaths}
        fileTreeNodeByPath={fileTreeNodeByPath}
        fileStates={projectedFileStates}
        fileStateReasons={fileStateReasons}
        selectedPath={selectedFile}
        onSelectFile={setSelectedFile}
      />

      <CodeDiffPanel
        selectedFile={selectedFile}
        mode={viewMode}
        selection={selection}
        selectionSummaryText={selectionSummaryText}
        fileContentStatus={fileContentStatus}
        codeViewFileItem={codeViewFileItem}
        codeViewDiffItem={codeViewDiffItem}
        relationNavigation={relationNavigation}
        relationEvidence={relationEvidence}
        setMode={(nextMode) => setViewMode(nextMode)}
        onSelectionChange={setSelection}
      />

      <OwnershipHarnessPanel
        boundary={selectedBoundary}
        inventoryStatus={inventoryStatus}
        boundaryState={boundaryState}
        reviewQueue={ownershipReviewQueue}
        sessionQuestions={sessionQuestions}
        sessionState={sessionState}
        surfaceMode={workbenchSurfaceMode}
        labContext={labContext}
        attemptText={attemptText}
        selfConfidence={selfConfidence}
        onSelfConfidenceChange={setSelfConfidence}
        latestReadiness={latestReadinessWithTransfer}
        onAttemptChange={setAttemptText}
        onSubmitGuidedAttempt={submitGuidedAttempt}
        onSubmitReadinessAttempt={submitReadinessAttempt}
        onMarkUnknown={() => {
          markUnknown();
        }}
        onRetryAttempt={retryOwnershipAttempt}
        geminiEvidenceExtraction={workbenchSurfaceMode === "lab" ? labGeminiExtraction : null}
        transferQuestion={transferProbe.question}
        transferAnswerText={transferAnswerText}
        onTransferAnswerChange={setTransferAnswerText}
        onSubmitTransferAttempt={submitTransferAttempt}
        onSkipTransfer={submitTransferSkip}
        latestTransferAttempt={latestTransferAttempt}
        showTransferProbe={isTransferRequired && latestReadiness?.readiness_gate === "ready"}
        escalationDecision={escalationDecision}
        authorizedHandoffArtifact={authorizedHandoffArtifact}
        onAuthorizeHandoff={authorizeWorkspaceHandoff}
        ownershipMemoryExport={ownershipMemoryExport}
        cognitiveDebtMetric={cognitiveDebtMetric}
        cognitiveLoadMetric={cognitiveLoadMetric}
        cognitiveDailyReadout={cognitiveDailyReadout}
        agentFlowManifest={workbenchSurfaceMode === "lab" ? agentFlowManifest : null}
        agentFlowHappyValidation={workbenchSurfaceMode === "lab" ? labAgentFlowHappyPath : null}
        agentFlowBlockedValidation={workbenchSurfaceMode === "lab" ? labAgentFlowBlockedPath : null}
      />

      <EvidenceDrawerPanel evidenceGroups={evidenceGroups} />
    </main>
  );
}
