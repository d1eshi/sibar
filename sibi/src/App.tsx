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
import { getWorkbenchSurfaceMode } from "./ownershipWorkbench/surfaceMode";
import type { ViewMode } from "./ownershipWorkbench/types";
import { loadFileContentStatus, type FileContentStatus } from "./ownershipWorkbench/fileContentClient.ts";
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

interface CapturePrScreenProps {
  onAnalyze: () => void;
}

function CapturePrScreen({ onAnalyze }: CapturePrScreenProps): React.ReactElement {
  const [prUrl, setPrUrl] = React.useState("https://github.com/d1eshi/sibar/pull/18");

  function submitCapture(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onAnalyze();
  }

  return (
    <main className="captureRoot">
      <form className="capturePanel" aria-label="Capture PR" onSubmit={submitCapture}>
        <div className="captureBrand">Sibi</div>
        <section className="captureIntro">
          <h1>Capture PR</h1>
          <p>Capture a GitHub pull request and turn it into an ownership artifact.</p>
        </section>

        <label className="captureInput">
          <span>Pull request URL</span>
          <div className="captureInputControl">
            <span className="githubGlyph" aria-hidden="true" />
            <input
              value={prUrl}
              onChange={(event) => setPrUrl(event.target.value)}
              placeholder="https://github.com/org/repo/pull/123"
            />
            <span className="captureCheck" aria-hidden="true">✓</span>
          </div>
        </label>

        <div className="captureDivider">
          <span />
          <p>or</p>
          <span />
        </div>

        <button className="pasteDiffDropzone" type="button" aria-label="Paste diff">
          <span className="documentGlyph" aria-hidden="true">&lt;/&gt;</span>
          <strong>Paste diff</strong>
          <small>Paste a unified diff to analyze ownership</small>
        </button>

        <button className="capturePrimary" type="submit">
          <span aria-hidden="true">✦</span>
          Analyze ownership
        </button>
      </form>

      <section className="routePreview" aria-label="Ownership route preview">
        <header className="routePreviewHeader">
          <h2>Ownership route</h2>
          <span className="routeStatus ready">Auto guide</span>
        </header>

        <div className="routeCanvas">
          <div className="routeSlideDeck" aria-label="Automatic ownership route guide">
            <article className="routeSlide slideOne" aria-label="Step 1 Capture PR">
              <span className="slideStep">1. Capture PR</span>
              <h3>Start with the GitHub pull request.</h3>
              <p>Paste the PR URL or a diff. Sibi keeps the capture focused on the change under review.</p>
              <div className="slidePreview prMini" aria-hidden="true">
                <span className="prAvatar" />
                <strong>#18</strong>
                <small>+142 -27 · 8 files</small>
              </div>
            </article>
            <article className="routeSlide slideTwo" aria-label="Step 2 Sibi reads the diff">
              <span className="slideStep">2. Sibi reads the diff</span>
              <h3>The changed lines become the working context.</h3>
              <p>Sibi pulls out touched files, callers, tests, and relation hints before asking anything.</p>
              <div className="slidePreview diffMini" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </article>
            <article className="routeSlide slideThree" aria-label="Step 3 You prove the boundary">
              <span className="slideStep">3. You prove the boundary</span>
              <h3>Answer the smallest ownership question.</h3>
              <p>You show which team owns the change, what evidence proves it, and where gaps remain.</p>
              <div className="slidePreview graphMini" aria-hidden="true">
                <span className="node green" />
                <span className="node green lower" />
                <span className="node amber" />
                <span className="node red" />
              </div>
            </article>
            <article className="routeSlide slideFour" aria-label="Step 4 Ownership artifact">
              <span className="slideStep">4. Ownership artifact</span>
              <h3>Leave with a reviewable artifact.</h3>
              <p>The workbench turns your answers into owned, supported, and unresolved boundaries.</p>
              <div className="slidePreview artifactMini" aria-hidden="true">
                <span>Owns</span>
                <span>Supports</span>
                <span>Gap</span>
              </div>
            </article>
          </div>

          <ol className="routeTimeline" aria-label="Ownership route steps">
            <li>
              <span className="stepIndex">1</span>
              <div>
                <strong>GitHub PR</strong>
                <p>Capture PR</p>
              </div>
            </li>
            <li>
              <span className="stepIndex">2</span>
              <div>
                <strong>Read diff</strong>
                <p>Sibi reads the diff</p>
              </div>
            </li>
            <li>
              <span className="stepIndex">3</span>
              <div>
                <strong>Analyze ownership</strong>
                <p>You prove the boundary</p>
              </div>
            </li>
            <li>
              <span className="stepIndex">4</span>
              <div>
                <strong>Ownership route</strong>
                <p>Ownership artifact</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const workbenchSurfaceMode = getWorkbenchSurfaceMode(
    typeof window === "undefined" ? "" : window.location.search,
  );
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
    setSelection(null);
  }, [selectedFile, viewMode]);

  React.useEffect(() => {
    const currentQuestion = sessionQuestions[sessionState.currentIndex];
    if (currentQuestion && currentQuestion.filePath !== selectedFile) {
      setSelectedFile(currentQuestion.filePath);
    }
  }, [selectedFile, sessionQuestions, sessionState.currentIndex]);

  React.useEffect(() => {
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
  }, [selectedFile]);

  React.useEffect(() => {
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
  }, []);

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
      <CapturePrScreen
        onAnalyze={() => {
          setShowWorkbench(true);
          if (typeof window !== "undefined") {
            window.history.pushState({}, "", "?workbench=1");
          }
        }}
      />
    );
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
