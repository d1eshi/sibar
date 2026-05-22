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
import type { FileContentStatus } from "../fileContentClient.ts";
import type { CodeEvidence, LineSelection, ViewMode } from "../types";
import type { RelationNavigationTarget } from "../helpers";
import type { WorkbenchLineMetadata } from "../types";
import { PierreCodeView } from "./PierreCodeView";

interface CodeDiffPanelProps {
  selectedFile: string;
  mode: ViewMode;
  selection: LineSelection | null;
  selectionSummaryText: string;
  fileContentStatus: FileContentStatus;
  codeViewFileItem?: CodeViewFileItem<WorkbenchLineMetadata>;
  codeViewDiffItem?: CodeViewDiffItem<WorkbenchLineMetadata>;
  relationNavigation: RelationNavigationTarget[];
  relationEvidence: CodeEvidence;
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
  fileContentStatus,
  codeViewFileItem,
  codeViewDiffItem,
  relationNavigation,
  relationEvidence,
  setMode,
  onSelectionChange,
}: CodeDiffPanelProps): React.ReactElement {
  const activeItem = mode === "code" ? codeViewFileItem : codeViewDiffItem;
  const selectedLines = React.useMemo(
    () => toCodeViewSelection(selection, activeItem?.id),
    [selection, activeItem?.id],
  );

  const modeDescription = mode === "code" ? "Stable file line numbers." : "Diff line references from old/new snapshots.";
  const fileContentDetail =
    fileContentStatus.kind === "ready"
      ? `Live content check: ${fileContentStatus.file.lineCount} lines, ${fileContentStatus.file.sizeBytes} bytes.`
      : fileContentStatus.kind === "unavailable"
        ? "missing: unable to load live content."
        : "Checking live content availability...";

  const relationItems = relationNavigation.length > 0 ? relationNavigation : [];
  const evidenceItems = relationEvidence.evidenceKindCounts;
  const relationGapTexts = relationEvidence.relationGaps.map(
    (gap) =>
      `${gap.type} (${gap.evidenceKind}): ${gap.candidateReason} ` +
      `${gap.downgrade ? `downgraded: ${gap.downgrade.from}→${gap.downgrade.to}. ${gap.downgrade.reason}` : "direct signal."}`,
  );
  const candidateTest = relationEvidence.relationCandidates.filter((candidate) => candidate.kind === "test");
  const candidateCallers = relationEvidence.relationCandidates.filter((candidate) => candidate.kind === "caller");
  const candidateRuntime = relationEvidence.relationCandidates.filter((candidate) => candidate.kind === "runtime-contract");

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

      <section className="relationPreview" aria-label="Relation navigation preview">
        <p className="relationHeader">Relation navigation preview</p>
        <p className="selectionSummary">{fileContentDetail}</p>
        <ul className="relationList">
          {relationItems.map((item) => (
            <li key={`${item.path}-${item.source}`} className="relationListItem">
              <span className="relationPill">{item.kind}</span>
              <span className="relationPath">{item.path}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="relationEvidenceExtraction" aria-label="Relation evidence extraction">
        <p className="relationHeader">Relation evidence extraction</p>
        <p className="selectionSummary">
          Observed: {evidenceItems.observed} | Inferred: {evidenceItems.inferred} | Unverified: {evidenceItems.unverified} | Conflict: {evidenceItems.conflict}
        </p>
        <div className="relationDetails">
          <p>Active file imports: {relationEvidence.imports.length}</p>
          <p>Active file exports: {relationEvidence.exports.length}</p>
          <p>Active file symbols: {relationEvidence.symbols.length}</p>
          <p>Candidate tests: {candidateTest.length}</p>
          <p>Candidate callers: {candidateCallers.length}</p>
          <p>Runtime candidates: {candidateRuntime.length}</p>
        </div>

        <ul className="relationList">
          {relationEvidence.relationCandidates.map((candidate) => (
            <li key={`${relationEvidence.selectedFile}:candidate:${candidate.kind}:${candidate.path}`} className="relationListItem">
              <span className={`relationPill ${candidate.evidenceKind}`}>{candidate.kind}</span>
              <span className={`relationPill ${candidate.evidenceKind}`}>{candidate.evidenceKind}</span>
              <span className="relationPath">{candidate.path}</span>
              <span className="relationMeta">
                ({candidate.source}) {candidate.label}
              </span>
            </li>
          ))}

          {relationEvidence.imports.map((entry) => (
            <li key={entry.id} className="relationListItem">
              <span className={`relationPill ${entry.evidenceKind}`}>{entry.evidenceKind}</span>
              <span className="relationPath">
                import:{entry.line}: {entry.text}
              </span>
            </li>
          ))}
          {relationEvidence.exports.map((entry) => (
            <li key={entry.id} className="relationListItem">
              <span className={`relationPill ${entry.evidenceKind}`}>{entry.evidenceKind}</span>
              <span className="relationPath">
                export:{entry.line}: {entry.text}
              </span>
            </li>
          ))}
          {relationEvidence.symbols.map((entry) => (
            <li key={entry.id} className="relationListItem">
              <span className={`relationPill ${entry.evidenceKind}`}>{entry.evidenceKind}</span>
              <span className="relationPath">
                symbol:{entry.line}: {entry.text}
              </span>
            </li>
          ))}
        </ul>

        {relationEvidence.relationGaps.length > 0 && (
          <div className="relationGaps">
            <h3>Relation gaps</h3>
            <ul className="relationList">
              {relationGapTexts.map((gapText, index) => (
                <li key={`${relationEvidence.selectedFile}-gap-${index}`}>
                  <span className="relationGap">{gapText}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {selection?.startLine != null && selection?.endLine != null && selectedLines?.range && (
        <p className="selectionSummary">
          Current selection detail: {formatRangeLabel(selectedLines.range)}
        </p>
      )}
    </section>
  );
}
