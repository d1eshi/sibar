import type {
  AttemptResult,
  BoundaryState,
  EvidenceRef,
  LineSelection,
  OwnershipBoundary,
  ReviewQueueItem,
  ViewMode,
} from "../types";
import * as React from "react";
import { OwnershipLabPanel } from "./OwnershipLabPanel";
import { ReviewGuidePanel } from "./ReviewGuidePanel";

interface OwnershipHarnessPanelProps {
  selectedFile: string;
  viewMode: ViewMode;
  selection: LineSelection | null;
  selectionSummaryText: string;
  boundary: OwnershipBoundary;
  boundaryState: BoundaryState;
  evidenceRefs: EvidenceRef[];
  reviewQueue: ReviewQueueItem[];
  attemptText: string;
  attemptResult: AttemptResult | null;
  showHint: boolean;
  onAttemptChange: (next: string) => void;
  onSubmitAttempt: () => void;
  onShowHint: () => void;
  onMarkUnknown: () => void;
  onReattempt: () => void;
}

export function OwnershipHarnessPanel({
  selectedFile,
  viewMode,
  selection,
  selectionSummaryText,
  boundary,
  boundaryState,
  evidenceRefs,
  reviewQueue,
  attemptText,
  attemptResult,
  showHint,
  onAttemptChange,
  onSubmitAttempt,
  onShowHint,
  onMarkUnknown,
  onReattempt,
}: OwnershipHarnessPanelProps): React.ReactElement {
  return (
    <aside className="panel ownershipPanel">
      <header className="panelHeader">
        <p className="panelSub">Ownership Harness</p>
        <h1>Review sequence</h1>
        <p className="boundaryTitle">{boundary.title}</p>
      </header>

      <div className="ownershipPanelBody">
        <ReviewGuidePanel boundary={boundary} boundaryState={boundaryState} reviewQueue={reviewQueue} />

        <section className="ownershipSection">
          <p className="panelSub">Stage 3</p>
          <h2>Ownership prompt</h2>
          <ol>
            {boundary.prompt.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>

        <label className="attemptField">
          <span>User attempt</span>
          <textarea
            value={attemptText}
            onChange={(event) => onAttemptChange(event.target.value)}
            placeholder="Write your ownership attempt before diagnosis."
            rows={6}
          />
        </label>

        <div className="primaryActions">
          <button type="button" onClick={onSubmitAttempt} disabled={!attemptText.trim()}>
            Submit attempt
          </button>
          <button type="button" onClick={onShowHint} className="secondary">
            Ask for hint
          </button>
          <button type="button" onClick={onMarkUnknown} className="secondary">
            Mark unknown
          </button>
        </div>

        {showHint && !attemptResult && (
          <section className="ownershipSection">
            <h2>Hint</h2>
            <p>
              Focus on the caller path: describe what breaks if `createSession` returns `null` and which
              consumer logic is now required.
            </p>
          </section>
        )}

        {attemptResult && (
          <section className="ownershipSection ownershipResult">
            <h2>Diagnosis</h2>
            <p>{attemptResult.summary}</p>
            {attemptResult.gapReason && (
              <p>
                <strong>Gap:</strong> {attemptResult.gapReason}
              </p>
            )}
            <p>
              <strong>Smallest repair:</strong> {attemptResult.smallestRepair}
            </p>
            <p>
              <strong>Return condition:</strong> {attemptResult.returnCondition}
            </p>
            <div className="attemptActions">
              <button type="button" className="secondary" onClick={onReattempt}>
                Re-attempt
              </button>
            </div>
          </section>
        )}

        <OwnershipLabPanel
          selectedFile={selectedFile}
          viewMode={viewMode}
          selection={selection}
          selectionSummaryText={selectionSummaryText}
          boundary={boundary}
          boundaryState={boundaryState}
          evidenceRefs={evidenceRefs}
        />
      </div>
    </aside>
  );
}
