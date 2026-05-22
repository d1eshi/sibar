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
  const [readinessHistory, setReadinessHistory] = React.useState<OwnershipAttemptReadiness[]>([]);
  const [readinessStartedAt, setReadinessStartedAt] = React.useState<number>(() => Date.now());
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
  const latestReadiness = React.useMemo(
    () => readinessHistory[readinessHistory.length - 1] ?? null,
    [readinessHistory],
  );

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

    setReadinessHistory((prev) => [...prev, attempt]);
    const nextBoundaryState = attempt.readiness_gate === "ready" ? "owned" : attempt.state === "owned" ? "partial" : attempt.state;
    setFileStates((prev) => withBoundaryFileState(prev, selectedBoundary, nextBoundaryState));
    setAttemptText("");
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
      setFileStates((prev) => ({
        ...prev,
        [result.observation.filePath]: "gap",
      }));
    }
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
        latestReadiness={latestReadiness}
        onAttemptChange={setAttemptText}
        onSubmitGuidedAttempt={submitGuidedAttempt}
        onSubmitReadinessAttempt={submitReadinessAttempt}
        onMarkUnknown={() => {
          markUnknown();
        }}
        onRetryAttempt={retryOwnershipAttempt}
      />

      <EvidenceDrawerPanel evidenceGroups={evidenceGroups} />
    </main>
  );
}
