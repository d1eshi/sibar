import type {
  CodeViewDiffItem,
  CodeViewFileItem,
  CodeViewLineSelection,
  DiffLineAnnotation,
  LineAnnotation,
  SelectedLineRange,
} from "@pierre/diffs";
import * as React from "react";
import { noCodeLinePlaceHolder } from "../fixtures";
import type { LineSelection, ViewMode } from "../types";
import type { WorkbenchLineMetadata } from "../types";
import { PierreCodeView } from "./PierreCodeView";

interface CodeDiffPanelProps {
  selectedFile: string;
  mode: ViewMode;
  selection: LineSelection | null;
  selectionSummaryText: string;
  codeViewFileItem?: CodeViewFileItem<WorkbenchLineMetadata>;
  codeViewDiffItem?: CodeViewDiffItem<WorkbenchLineMetadata>;
  setMode: (mode: ViewMode) => void;
  onSelectionChange: (selection: LineSelection | null) => void;
}

function annotationStyle(annotationKind: WorkbenchLineMetadata["kind"]): string {
  if (annotationKind === "ownership-boundary") return "ownershipBoundaryTag";
  return "evidenceTag";
}

function toRange(selection: CodeViewLineSelection | null): LineSelection | null {
  if (!selection) return null;
  return {
    startLine: selection.range.start,
    endLine: selection.range.end,
    startSide: selection.range.startSide,
    endSide: selection.range.endSide,
  };
}

function toCodeViewSelection(selection: LineSelection | null, itemId?: string): CodeViewLineSelection | null {
  if (!selection || !itemId) return null;
  return {
    id: itemId,
    range: {
      start: selection.startLine,
      end: selection.endLine,
      startSide: selection.startSide,
      endSide: selection.endSide,
    } satisfies SelectedLineRange,
  };
}

function formatRangeLabel(range: SelectedLineRange): string {
  const lineText = range.start === range.end ? `${range.start}` : `${range.start}→${range.end}`;
  return `${lineText}`;
}

function renderLineAnnotation(
  annotation:
    | LineAnnotation<WorkbenchLineMetadata>
    | DiffLineAnnotation<WorkbenchLineMetadata>,
): React.ReactElement | null {
  if (!annotation.metadata) return null;
  return (
    <span className={`lineBadge ${annotationStyle(annotation.metadata.kind)}`} title={annotation.metadata.detail}>
      {annotation.metadata.label}
    </span>
  );
}

export function CodeDiffPanel({
  selectedFile,
  mode,
  selection,
  selectionSummaryText,
  codeViewFileItem,
  codeViewDiffItem,
  setMode,
  onSelectionChange,
}: CodeDiffPanelProps): React.ReactElement {
  const activeItem = mode === "code" ? codeViewFileItem : codeViewDiffItem;
  const selectedLines = React.useMemo(
    () => toCodeViewSelection(selection, activeItem?.id),
    [selection, activeItem?.id],
  );

  const modeDescription = mode === "code" ? "Stable file line numbers." : "Diff line references from old/new snapshots.";

  function onSelectedLinesChange(next: CodeViewLineSelection | null): void {
    if (!activeItem || !next || next.id !== activeItem.id) {
      onSelectionChange(null);
      return;
    }
    onSelectionChange(toRange(next));
  }

  const emptyMessage = activeItem
    ? undefined
    : mode === "code"
      ? "No fixture content available for this file."
      : noCodeLinePlaceHolder;

  return (
    <section className="panel codePanel">
      <header className="panelHeader splitHeader">
        <div>
          <p className="panelSub">Code & Diff</p>
          <h1>{selectedFile}</h1>
          {selection ? (
            <p className="selectionSummary">{selectionSummaryText}</p>
          ) : (
            <p className="selectionSummary">Selected range: none.</p>
          )}
        </div>
        <div className="modeTabs">
          <button type={("button" as const)} className={mode === "code" ? "active" : ""} onClick={() => setMode("code")}>
            File mode
          </button>
          <button
            type={("button" as const)}
            className={mode === "diff" ? "active" : ""}
            onClick={() => setMode("diff")}
          >
            Diff mode
          </button>
        </div>
      </header>

      <p className="selectionSummary">{modeDescription}</p>
      {activeItem ? (
        <PierreCodeView<WorkbenchLineMetadata>
          className="codeViewport"
          options={{ controlledSelection: true, enableLineSelection: true }}
          items={[activeItem]}
          selectedLines={selectedLines}
          onSelectedLinesChange={onSelectedLinesChange}
          renderAnnotation={renderLineAnnotation}
        />
      ) : (
        <p className="selectionSummary">{emptyMessage}</p>
      )}

      {selection?.startLine != null && selection?.endLine != null && selectedLines?.range && (
        <p className="selectionSummary">
          Current selection detail: {formatRangeLabel(selectedLines.range)}
        </p>
      )}
    </section>
  );
}
