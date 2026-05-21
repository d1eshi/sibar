import type {
  BoundaryState,
  EvidenceRef,
  LineSelection,
  OwnershipBoundary,
  OwnershipSessionQuestion,
  OwnershipSessionState,
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
  sessionQuestions: OwnershipSessionQuestion[];
  sessionState: OwnershipSessionState;
  surfaceMode: WorkbenchSurfaceMode;
  labContext: OwnershipLabContext | null;
  attemptText: string;
  onAttemptChange: (next: string) => void;
  onSubmitAttempt: () => void;
  onMarkUnknown: () => void;
}

export function OwnershipHarnessPanel({
  boundary,
  boundaryState,
  reviewQueue,
  sessionQuestions,
  sessionState,
  surfaceMode,
  labContext,
  attemptText,
  onAttemptChange,
  onSubmitAttempt,
  onMarkUnknown,
}: OwnershipHarnessPanelProps): React.ReactElement {
  const isLabView = surfaceMode === "lab" && labContext != null;
  const currentQuestion = sessionState.isComplete ? null : sessionQuestions[sessionState.currentIndex] ?? null;

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

        <ReviewGuidePanel
          boundary={boundary}
          boundaryState={boundaryState}
          reviewQueue={reviewQueue}
          showDetailedQueue={isLabView}
        />

        <section className="ownershipSession" aria-label="Guided ownership review session">
          <div className="sessionHeader">
            <p className="panelSub">
              {sessionState.isComplete
                ? `Sibi step ${sessionQuestions.length} / ${sessionQuestions.length}`
                : `Sibi step ${Math.min(sessionState.currentIndex + 1, sessionQuestions.length)} / ${sessionQuestions.length}`}
            </p>
            <h2>{currentQuestion ? currentQuestion.title : "Session complete"}</h2>
            {currentQuestion && <p className="sessionFile">{currentQuestion.filePath}</p>}
          </div>

          {currentQuestion && (
            <>
              <section className="sessionQuestion" aria-label="Current Sibi question">
                <p>{currentQuestion.prompt}</p>
                <span>{currentQuestion.intent}</span>
              </section>

              {sessionState.showHintLadder && (
                <section className="hintLadder" aria-label="Minimal context hint ladder">
                  <h3>Contexto mínimo</h3>
                  <ol>
                    {currentQuestion.hintLadder.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ol>
                </section>
              )}

              <label className="attemptField">
                <span>Tu respuesta</span>
                <textarea
                  value={attemptText}
                  onChange={(event) => onAttemptChange(event.target.value)}
                  placeholder="Respondé solo este paso de ownership."
                  rows={5}
                />
              </label>

              <div className="primaryActions">
                <button type="button" onClick={onSubmitAttempt}>
                  Submit attempt
                </button>
                <button type="button" onClick={onMarkUnknown} className="secondary">
                  Mark unknown
                </button>
              </div>
            </>
          )}

          {sessionState.lastFeedback && (
            <section className="sessionFeedback" aria-live="polite">
              <p>{sessionState.lastFeedback}</p>
            </section>
          )}

          {sessionState.observations.length > 0 && (
            <section className="sessionObservations" aria-label="Session observations">
              <h3>Observations</h3>
              <ul>
                {sessionState.observations.map((observation) => (
                  <li key={observation.id}>
                    <strong>{observation.reason}</strong>
                    <span>{observation.filePath}</span>
                    <p>{observation.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>

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
