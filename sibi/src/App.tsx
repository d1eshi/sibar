import * as React from "react";

import { CodeDiffPanel } from "./ownershipWorkbench/components/CodeDiffPanel";
import { EvidenceDrawerPanel } from "./ownershipWorkbench/components/EvidenceDrawerPanel";
import { FileTreePanel } from "./ownershipWorkbench/components/FileTreePanel";
import { OwnershipHarnessPanel } from "./ownershipWorkbench/components/OwnershipHarnessPanel";
import type { RepoInventoryStatus } from "./ownershipWorkbench/repoInventoryTypes.ts";
import { loadRepoInventoryStatus } from "./ownershipWorkbench/repoInventoryClient.ts";
import type {
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

export default function App() {
  const workbenchSurfaceMode = getWorkbenchSurfaceMode(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const [selectedFile, setSelectedFile] = React.useState(initialFile);
  const [viewMode, setViewMode] = React.useState<ViewMode>("diff");
  const [selection, setSelection] = React.useState<LineSelection | null>(null);
  const [fileStates, setFileStates] = React.useState<Record<string, BoundaryState>>(initialFileStates);
  const [attemptText, setAttemptText] = React.useState("");
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

  function submitAttempt() {
    advanceSession("submit");
  }

  function markUnknown() {
    advanceSession("mark_unknown");
  }

  function advanceSession(action: "submit" | "mark_unknown") {
    const result = advanceOwnershipSession(sessionState, sessionQuestions, attemptText, action);
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
        onAttemptChange={setAttemptText}
        onSubmitAttempt={submitAttempt}
        onMarkUnknown={() => {
          markUnknown();
        }}
      />

      <EvidenceDrawerPanel evidenceGroups={evidenceGroups} />
    </main>
  );
}
