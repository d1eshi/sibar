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
  appendGuidedObservation,
  appendHandoffArtifact,
  appendReadinessAttempt,
  appendTransferAttempt as appendTransferMemoryAttempt,
  buildOwnershipMemoryExportBundle,
  createOwnershipMemoryState,
} from "./ownershipWorkbench/ownershipMemory.ts";

export default function App() {
  const workbenchSurfaceMode = getWorkbenchSurfaceMode(
    typeof window === "undefined" ? "" : window.location.search,
  );
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
      />

      <EvidenceDrawerPanel evidenceGroups={evidenceGroups} />
    </main>
  );
}
