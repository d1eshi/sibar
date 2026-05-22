import * as React from "react";

import { CodeDiffPanel } from "./ownershipWorkbench/components/CodeDiffPanel";
import { EvidenceDrawerPanel } from "./ownershipWorkbench/components/EvidenceDrawerPanel";
import { FileTreePanel } from "./ownershipWorkbench/components/FileTreePanel";
import { OwnershipHarnessPanel } from "./ownershipWorkbench/components/OwnershipHarnessPanel";
import type {
  BoundaryState,
  LineSelection,
  OwnershipSessionState,
} from "./ownershipWorkbench/types";
import {
  codeViewDiffItemsByPath,
  codeViewFileItemsByPath,
  fixtureEvidence,
  fileTreeNodeByPath,
  initialFile,
  initialFileStates,
  ownershipBoundary,
  ownershipReviewQueue,
  fileTreePaths,
} from "./ownershipWorkbench/fixtures";
import {
  getActiveBoundaryState,
  getLineSelectionText,
  groupedEvidence,
} from "./ownershipWorkbench/helpers";
import {
  advanceOwnershipSession,
  createOwnershipSessionState,
  makeOwnershipSessionQuestions,
} from "./ownershipWorkbench/ownershipReviewSession";
import { getWorkbenchSurfaceMode } from "./ownershipWorkbench/surfaceMode";
import type { ViewMode } from "./ownershipWorkbench/types";

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

  const evidenceGroups = React.useMemo(() => groupedEvidence(fixtureEvidence), []);
  const sessionQuestions = React.useMemo(
    () => makeOwnershipSessionQuestions(ownershipReviewQueue),
    [],
  );
  const codeViewFileItem = codeViewFileItemsByPath[selectedFile];
  const codeViewDiffItem = codeViewDiffItemsByPath[selectedFile];
  const boundaryState = getActiveBoundaryState(fileStates, ownershipBoundary);
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

  React.useEffect(() => {
    setSelection(null);
  }, [selectedFile, viewMode]);

  React.useEffect(() => {
    const currentQuestion = sessionQuestions[sessionState.currentIndex];
    if (currentQuestion && currentQuestion.filePath !== selectedFile) {
      setSelectedFile(currentQuestion.filePath);
    }
  }, [selectedFile, sessionQuestions, sessionState.currentIndex]);

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
        fileStates={fileStates}
        selectedPath={selectedFile}
        onSelectFile={setSelectedFile}
      />

      <CodeDiffPanel
        selectedFile={selectedFile}
        mode={viewMode}
        selection={selection}
        selectionSummaryText={selectionSummaryText}
        codeViewFileItem={codeViewFileItem}
        codeViewDiffItem={codeViewDiffItem}
        setMode={(nextMode) => setViewMode(nextMode)}
        onSelectionChange={setSelection}
      />

      <OwnershipHarnessPanel
        boundary={ownershipBoundary}
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
