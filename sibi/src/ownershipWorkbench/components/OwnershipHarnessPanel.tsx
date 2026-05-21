import type {
  AttemptResult,
  BoundaryState,
  EvidenceRef,
  LineSelection,
  OwnershipBoundary,
  ReviewQueueItem,
  ViewMode,
  WorkbenchSurfaceMode,
} from "../types";
import * as React from "react";
import { OwnershipLabPanel } from "./OwnershipLabPanel";
import { ReviewGuidePanel } from "./ReviewGuidePanel";

interface OwnershipLabContext {
  selectedFile: string;
  viewMode: ViewMode;
  selection: LineSelection | null;
  selectionSummaryText: string;
  evidenceRefs: EvidenceRef[];
}

interface OwnershipHarnessPanelProps {
  boundary: OwnershipBoundary;
  boundaryState: BoundaryState;
  reviewQueue: ReviewQueueItem[];
  surfaceMode: WorkbenchSurfaceMode;
  labContext: OwnershipLabContext | null;
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
  boundary,
  boundaryState,
  reviewQueue,
  surfaceMode,
  labContext,
  attemptText,
  attemptResult,
  showHint,
  onAttemptChange,
  onSubmitAttempt,
  onShowHint,
  onMarkUnknown,
  onReattempt,
}: OwnershipHarnessPanelProps): React.ReactElement {
  const isLabView = surfaceMode === "lab" && labContext != null;

  return (
    <aside className="panel ownershipPanel">
      <header className="panelHeader">
        <p className="panelSub">{isLabView ? "Local trace lab" : "Ownership Harness"}</p>
        <h1>{isLabView ? "Derivation lab" : "Review sequence"}</h1>
        <p className="boundaryTitle">{boundary.title}</p>
      </header>

      <div className="ownershipPanelBody">
        {isLabView && (
          <section className="ownershipSection labModeNotice">
            <p className="panelSub">Debug view</p>
            <h2>Local trace lab</h2>
            <p>
              This URL mode is for reviewing derivation traces and user reports. The default
              workbench hides the lab and keeps the right panel user-facing.
            </p>
          </section>
        )}

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

        {isLabView && (
          <OwnershipLabPanel
            selectedFile={labContext.selectedFile}
            viewMode={labContext.viewMode}
            selection={labContext.selection}
            selectionSummaryText={labContext.selectionSummaryText}
            boundary={boundary}
            boundaryState={boundaryState}
            evidenceRefs={labContext.evidenceRefs}
          />
        )}
      </div>
    </aside>
  );
}
