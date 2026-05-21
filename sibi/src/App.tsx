import * as React from "react";

import { CodeDiffPanel } from "./ownershipWorkbench/components/CodeDiffPanel";
import { EvidenceDrawerPanel } from "./ownershipWorkbench/components/EvidenceDrawerPanel";
import { FileTreePanel } from "./ownershipWorkbench/components/FileTreePanel";
import { OwnershipHarnessPanel } from "./ownershipWorkbench/components/OwnershipHarnessPanel";
import type {
  AttemptResult,
  BoundaryState,
  LineSelection,
} from "./ownershipWorkbench/types";
import {
  codeViewDiffItemsByPath,
  codeViewFileItemsByPath,
  fixtureEvidence,
  fileTreeNodeByPath,
  initialFile,
  initialFileStates,
  ownershipBoundary,
  fileTreePaths,
} from "./ownershipWorkbench/fixtures";
import {
  evaluateAttempt,
  getLineSelectionText,
  groupedEvidence,
} from "./ownershipWorkbench/helpers";
import type { ViewMode } from "./ownershipWorkbench/types";

export default function App() {
  const [selectedFile, setSelectedFile] = React.useState(initialFile);
  const [viewMode, setViewMode] = React.useState<ViewMode>("diff");
  const [selection, setSelection] = React.useState<LineSelection | null>(null);
  const [fileStates, setFileStates] = React.useState<Record<string, BoundaryState>>(initialFileStates);
  const [boundaryState, setBoundaryState] = React.useState<BoundaryState>("unvisited");
  const [attemptText, setAttemptText] = React.useState("");
  const [attemptResult, setAttemptResult] = React.useState<AttemptResult | null>(null);
  const [showHint, setShowHint] = React.useState(false);

  const evidenceGroups = React.useMemo(() => groupedEvidence(fixtureEvidence), []);
  const codeViewFileItem = codeViewFileItemsByPath[selectedFile];
  const codeViewDiffItem = codeViewDiffItemsByPath[selectedFile];

  React.useEffect(() => {
    setSelection(null);
  }, [selectedFile, viewMode]);

  function submitAttempt() {
    const result = evaluateAttempt(attemptText, ownershipBoundary);
    setAttemptResult(result);
    setBoundaryState(result.state);
    setShowHint(false);

    const nextStates: Record<string, BoundaryState> = {
      ...fileStates,
      "src/api/session.ts":
        result.state === "owned"
          ? "owned"
          : result.state === "questionable"
            ? "questionable"
            : "partial",
      "src/api/session.test.ts": result.state === "owned" ? "owned" : "attempted",
      "src/runtime/consumer.ts": result.state === "owned" ? "attempted" : "attempted",
    };
    setFileStates(nextStates);
  }

  function markUnknown() {
    setShowHint(false);
    const unknownResult = {
      state: "questionable" as const,
      summary: "Boundary manually marked unknown; no ownership state assigned yet.",
      smallestRepair:
        "Re-run with an attempt focused on null handling and the caller safety path.",
      returnCondition: ownershipBoundary.returnCondition,
    };
    setBoundaryState("questionable");
    setAttemptResult(unknownResult);
    setFileStates((prev) => ({
      ...prev,
      "src/api/session.ts": "questionable",
    }));
  }

  function reattempt() {
    setAttemptResult(null);
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
        selectionSummaryText={getLineSelectionText(selection)}
        codeViewFileItem={codeViewFileItem}
        codeViewDiffItem={codeViewDiffItem}
        setMode={(nextMode) => setViewMode(nextMode)}
        onSelectionChange={setSelection}
      />

      <OwnershipHarnessPanel
        selectedFile={selectedFile}
        viewMode={viewMode}
        selection={selection}
        selectionSummaryText={getLineSelectionText(selection)}
        boundary={ownershipBoundary}
        boundaryState={boundaryState}
        evidenceRefs={fixtureEvidence}
        attemptText={attemptText}
        attemptResult={attemptResult}
        showHint={showHint}
        onAttemptChange={setAttemptText}
        onSubmitAttempt={submitAttempt}
        onShowHint={() => {
          setShowHint(true);
        }}
        onMarkUnknown={() => {
          markUnknown();
        }}
        onReattempt={reattempt}
      />

      <EvidenceDrawerPanel evidenceGroups={evidenceGroups} />
    </main>
  );
}
