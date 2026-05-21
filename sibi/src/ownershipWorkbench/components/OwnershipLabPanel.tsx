import * as React from "react";
import { evidenceForSelection, labelForState } from "../helpers";
import type {
  BoundaryState,
  EvidenceRef,
  LineSelection,
  OwnershipBoundary,
  ViewMode,
} from "../types";

interface OwnershipLabPanelProps {
  selectedFile: string;
  viewMode: ViewMode;
  selection: LineSelection | null;
  selectionSummaryText: string;
  boundary: OwnershipBoundary;
  boundaryState: BoundaryState;
  evidenceRefs: EvidenceRef[];
}

function selectionTouchesBoundary(
  selectedFile: string,
  selection: LineSelection | null,
  boundary: OwnershipBoundary,
): boolean {
  if (!selection || selectedFile !== boundary.filePath) return false;
  const startLine = Math.min(selection.startLine, selection.endLine);
  const endLine = Math.max(selection.startLine, selection.endLine);
  return startLine <= boundary.endLine && endLine >= boundary.startLine;
}

function rangeText(selection: LineSelection | null): string {
  if (!selection) return "No range selected";
  const startLine = Math.min(selection.startLine, selection.endLine);
  const endLine = Math.max(selection.startLine, selection.endLine);
  return startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
}

function boundaryContextText(
  selection: LineSelection | null,
  touchesBoundary: boolean,
  isBoundaryFile: boolean,
): string {
  if (!selection) return "No range selected; showing active boundary context.";
  if (touchesBoundary) return "Selection intersects the active boundary.";
  if (isBoundaryFile) return "Same file; selected range is outside the active boundary.";
  return "Supporting file context for the active boundary.";
}

export function OwnershipLabPanel({
  selectedFile,
  viewMode,
  selection,
  selectionSummaryText,
  boundary,
  boundaryState,
  evidenceRefs,
}: OwnershipLabPanelProps): React.ReactElement {
  const selectedEvidence = React.useMemo(
    () => evidenceForSelection(evidenceRefs, selectedFile, selection),
    [evidenceRefs, selectedFile, selection],
  );
  const fallbackEvidence = React.useMemo(
    () => evidenceRefs,
    [evidenceRefs],
  );
  const displayedEvidence = selectedEvidence.length > 0 ? selectedEvidence : fallbackEvidence;
  const touchesBoundary = selectionTouchesBoundary(selectedFile, selection, boundary);
  const isBoundaryFile = selectedFile === boundary.filePath;
  const evidenceScope =
    selectedEvidence.length > 0
      ? "Line-matched evidence"
      : selection
        ? "No line evidence matched; showing boundary evidence"
        : "Boundary evidence";

  const signals = [
    selection ? "selection-active" : "selection-empty",
    isBoundaryFile ? "boundary-file" : "supporting-file",
    touchesBoundary ? "boundary-intersection" : "boundary-context",
    selectedEvidence.length > 0 ? "line-evidence-match" : "boundary-evidence-fallback",
  ];

  return (
    <section className="ownershipLab" aria-label="Ownership selection lab">
      <div className="labHeader">
        <div>
          <p className="panelSub">Selection lab</p>
          <h2>{rangeText(selection)}</h2>
        </div>
        <span className={`stateBadge ${boundaryState}-state`}>{labelForState(boundaryState)}</span>
      </div>

      <div className="labSection">
        <h3>Selection</h3>
        <dl className="labFacts">
          <div>
            <dt>File</dt>
            <dd>{selectedFile}</dd>
          </div>
          <div>
            <dt>View</dt>
            <dd>{viewMode === "diff" ? "diff" : "code"}</dd>
          </div>
          <div>
            <dt>Range</dt>
            <dd>{selection ? selectionSummaryText : "Select code or diff lines to scope the lab."}</dd>
          </div>
          <div>
            <dt>Boundary</dt>
            <dd>{boundaryContextText(selection, touchesBoundary, isBoundaryFile)}</dd>
          </div>
        </dl>
      </div>

      <div className="labSection">
        <h3>Trace</h3>
        <p>
          Boundary <strong>{boundary.id}</strong> maps to {boundary.filePath}:{boundary.startLine}-{boundary.endLine}.
        </p>
        <p>
          Use the boundary responsibility and range to test control, evidence, and breakage with your attempt.
        </p>
      </div>

      <div className="labSection">
        <h3>Signals</h3>
        <div className="signalRow">
          {signals.map((signal) => (
            <span key={signal} className="signalPill">
              {signal}
            </span>
          ))}
        </div>
      </div>

      <div className="labSection">
        <h3>Schema</h3>
        <dl className="labFacts compact">
          <div>
            <dt>State</dt>
            <dd>{labelForState(boundaryState)}</dd>
          </div>
          <div>
            <dt>Expected proof</dt>
            <dd>control, evidence, and breakage named by the user.</dd>
          </div>
        </dl>
      </div>

      <div className="labSection">
        <h3>Evidence</h3>
        <p className="labHint">{evidenceScope}</p>
        {displayedEvidence.length > 0 ? (
          <ul className="labEvidenceList">
            {displayedEvidence.map((entry) => (
              <li key={entry.id}>
                <span className={`evidenceBadge ${entry.confidence}`}>{entry.confidence}</span>
                <strong>{entry.title}</strong>
                <span className="evidenceLocation">{entry.location}</span>
                <p>{entry.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No evidence references are attached to this boundary yet.</p>
        )}
      </div>
    </section>
  );
}
