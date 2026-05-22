import type {
  BoundaryState,
  EvidenceRef,
  LineSelection,
  OwnershipAttemptReadiness,
  OwnershipReviewArtifact,
  OwnershipBoundary,
  OwnershipSessionQuestion,
  OwnershipSessionState,
  ReviewQueueItem,
  ViewMode,
  WorkbenchSurfaceMode,
} from "../types";
import type { RepoInventoryStatus } from "../repoInventoryTypes.ts";
import * as React from "react";
import { OwnershipLabPanel } from "./OwnershipLabPanel";
import { ReviewGuidePanel } from "./ReviewGuidePanel";
import { RepoInventoryStatusPanel } from "./RepoInventoryStatusPanel";
import type { TransferAttemptRecord } from "../transferVerification.ts";
import type { WorkspaceEscalationDecision } from "../workspaceEscalation.ts";

interface OwnershipLabContext {
  selectedFile: string;
  viewMode: ViewMode;
  selection: LineSelection | null;
  selectionSummaryText: string;
  evidenceRefs: EvidenceRef[];
}

interface OwnershipHarnessPanelProps {
  boundary: OwnershipBoundary;
  inventoryStatus: RepoInventoryStatus;
  boundaryState: BoundaryState;
  reviewQueue: ReviewQueueItem[];
  sessionQuestions: OwnershipSessionQuestion[];
  sessionState: OwnershipSessionState;
  surfaceMode: WorkbenchSurfaceMode;
  labContext: OwnershipLabContext | null;
  attemptText: string;
  selfConfidence: number;
  onAttemptChange: (next: string) => void;
  onSelfConfidenceChange: (nextConfidence: number) => void;
  latestReadiness: OwnershipAttemptReadiness | null;
  onSubmitGuidedAttempt: () => void;
  onSubmitReadinessAttempt: () => void;
  onMarkUnknown: () => void;
  onRetryAttempt: () => void;
  transferQuestion: string;
  transferAnswerText: string;
  onTransferAnswerChange: (next: string) => void;
  onSubmitTransferAttempt: () => void;
  onSkipTransfer: () => void;
  latestTransferAttempt: TransferAttemptRecord | null;
  showTransferProbe: boolean;
  escalationDecision: WorkspaceEscalationDecision;
  authorizedHandoffArtifact: OwnershipReviewArtifact | null;
  onAuthorizeHandoff: () => void;
}

export function OwnershipHarnessPanel({
  boundary,
  inventoryStatus,
  boundaryState,
  reviewQueue,
  sessionQuestions,
  sessionState,
  surfaceMode,
  labContext,
  attemptText,
  selfConfidence,
  onAttemptChange,
  onSelfConfidenceChange,
  latestReadiness,
  onSubmitGuidedAttempt,
  onSubmitReadinessAttempt,
  onMarkUnknown,
  onRetryAttempt,
  transferQuestion,
  transferAnswerText,
  onTransferAnswerChange,
  onSubmitTransferAttempt,
  onSkipTransfer,
  latestTransferAttempt,
  showTransferProbe,
  escalationDecision,
  authorizedHandoffArtifact,
  onAuthorizeHandoff,
}: OwnershipHarnessPanelProps): React.ReactElement {
  const isLabView = surfaceMode === "lab" && labContext != null;
  const currentQuestion = sessionState.isComplete ? null : sessionQuestions[sessionState.currentIndex] ?? null;
  const readinessReady = latestReadiness?.readiness_gate === "ready";
  const latestElapsedMs = latestReadiness == null ? null : Math.max(1, latestReadiness.elapsedMs);
  const transferState = latestReadiness?.transfer ?? null;
  const transferOutcomeText = transferState?.transferOutcome ?? "not yet attempted";
  const transferContinuityText =
    transferState == null ? "—" : `${Math.round(transferState.readinessContinuity * 100)}%`;
  const transferDebtText = transferState == null ? "—" : `${Math.round(transferState.debtSignal * 100)}%`;

  const readinessStatusText = latestReadiness == null ? "Not yet attempted." : latestReadiness.readiness_gate;
  const evidenceFitText = latestReadiness == null ? "—" : `${Math.round(latestReadiness.evidence_fit * 100)}%`;
  const calibrationText =
    latestReadiness == null ? "—" : `${Math.round(latestReadiness.calibration_score * 100)}%`;
  const hasHandoffCandidate = escalationDecision.isCandidate;
  const handoffSummaryEvidenceRefs = escalationDecision.evidence_refs.slice(0, 6);

  return (
    <aside className="panel ownershipPanel">
      <header className="panelHeader">
        <p className="panelSub">{isLabView ? "Local trace lab" : "Ownership Harness"}</p>
        <h1>{isLabView ? "Derivation lab" : "Review sequence"}</h1>
        <p className="boundaryTitle">{boundary.title}</p>
      </header>

      <div className="ownershipPanelBody">
        <RepoInventoryStatusPanel status={inventoryStatus} />

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
                <button type="button" onClick={onSubmitGuidedAttempt}>
                  Submit attempt
                </button>
                <button type="button" onClick={onMarkUnknown} className="secondary">
                  Mark unknown
                </button>
              </div>
            </>
          )}

          {!currentQuestion && (
            <section className="readinessSection" aria-label="Boundary readiness gate">
              <h3>Boundary readiness assessment</h3>
              <p>Submit a final bounded attempt with a confidence score to evaluate readiness.</p>
              <label className="attemptField">
                <span>Final boundary attempt</span>
                <textarea
                  value={attemptText}
                  onChange={(event) => onAttemptChange(event.target.value)}
                  placeholder="Describe the exact contract, caller safety behavior, and failure mode."
                  rows={6}
                />
              </label>

              <label className="confidenceField">
                <span>Self-confidence ({selfConfidence})</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={selfConfidence}
                  onChange={(event) => onSelfConfidenceChange(Number.parseInt(event.target.value, 10))}
                  aria-label="Self confidence"
                />
              </label>

              <div className="attemptActions">
                <button
                  type="button"
                  onClick={onSubmitReadinessAttempt}
                  disabled={attemptText.trim().length === 0}
                >
                  Submit attempt
                </button>
                <button
                  type="button"
                  onClick={onRetryAttempt}
                  className="secondary"
                  disabled={latestReadiness == null || readinessReady}
                >
                  Retry after repair
                </button>
              </div>

              <section className="attemptReadinessSummary" aria-label="Readiness gate output">
                <h4>Readiness gate: {readinessStatusText}</h4>
                <div className="readinessMetrics">
                  <span>Attempt ID: {latestReadiness?.attempt_id ?? "not submitted"}</span>
                  <span>Evidence fit: {evidenceFitText}</span>
                  <span>Calibration: {calibrationText}</span>
                  <span>Elapsed: {latestElapsedMs == null ? "n/a" : `${latestElapsedMs}ms`}</span>
                </div>
                {latestReadiness != null && (
                  <dl className="readinessDetails">
                    <div>
                      <dt>State</dt>
                      <dd>{latestReadiness.state}</dd>
                    </div>
                    <div>
                      <dt>Evidence refs</dt>
                      <dd>{latestReadiness.attemptEvidenceRefs.map((entry) => entry.id).join(", ") || "none"}</dd>
                    </div>
                    <div>
                      <dt>Smallest repair</dt>
                      <dd>{latestReadiness.smallestRepair}</dd>
                    </div>
                    <div>
                      <dt>Return condition</dt>
                      <dd>{latestReadiness.returnCondition}</dd>
                    </div>
                  </dl>
                )}
                {showTransferProbe && (
                  <section className="transferSection" aria-label="Transfer probe">
                    <h4>Transfer probe required</h4>
                    <p>{transferQuestion}</p>
                    <label className="attemptField">
                      <span>Transfer answer</span>
                      <textarea
                        value={transferAnswerText}
                        onChange={(event) => onTransferAnswerChange(event.target.value)}
                        placeholder="Translate the boundary invariant to the related file."
                        rows={5}
                      />
                    </label>
                    <div className="attemptActions">
                      <button
                        type="button"
                        onClick={onSubmitTransferAttempt}
                        disabled={transferAnswerText.trim().length === 0}
                      >
                        Submit transfer answer
                      </button>
                      <button type="button" onClick={onSkipTransfer} className="secondary">
                        Skip transfer
                      </button>
                    </div>
                    <div className="readinessMetrics">
                      <span>Transfer outcome: {transferOutcomeText}</span>
                      <span>Continuity: {transferContinuityText}</span>
                      <span>Debt signal: {transferDebtText}</span>
                      {transferState?.transferRecurrenceTags?.length ? (
                        <span>Recurrence: {transferState.transferRecurrenceTags.join(", ")}</span>
                      ) : null}
                    </div>
                    {(transferState?.transferFollowUpTasks?.length ?? 0) > 0 ? (
                      <div className="gapCard">
                        <p>Recovery tasks</p>
                        <ul>
                          {(transferState?.transferFollowUpTasks ?? []).map((task) => (
                            <li key={task}>{task}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {transferState?.transferEscalationCandidate ? (
                      <p className="gapEvidence">Escalation candidate: transfer failed repeatedly.</p>
                    ) : null}
                {latestTransferAttempt ? (
                      <p className="gapEvidence">
                        Last transfer answer: {latestTransferAttempt.attemptTextPreview}
                      </p>
                    ) : null}
                  </section>
                )}
                {hasHandoffCandidate ? (
                  <section className="handoffSection" aria-label="Workspace handoff candidate">
                    <h4>Workspace handoff candidate</h4>
                    <p className="handoffReasonText">{escalationDecision.reasonText}</p>
                    {escalationDecision.primaryReason != null ? (
                      <p>Primary reason: {escalationDecision.primaryReason}</p>
                    ) : null}
                    {escalationDecision.blocking_ids.length > 0 ? (
                      <p className="handoffBlocking">Blocking IDs: {escalationDecision.blocking_ids.join(", ")}</p>
                    ) : null}
                    {handoffSummaryEvidenceRefs.length > 0 ? (
                      <div className="gapCard">
                        <p>Evidence summary</p>
                        <ul>
                          {handoffSummaryEvidenceRefs.map((entry) => (
                            <li key={entry.id}>
                              <strong>{entry.title}</strong> — {entry.id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="attemptActions">
                      <button
                        type="button"
                        onClick={onAuthorizeHandoff}
                        disabled={authorizedHandoffArtifact != null}
                      >
                        {authorizedHandoffArtifact == null ? "Authorize workspace handoff" : "Workspace handoff authorized"}
                      </button>
                    </div>
                  </section>
                ) : null}
                {authorizedHandoffArtifact != null ? (
                  <section className="handoffSection" aria-label="Workspace handoff artifact">
                    <h4>Workspace handoff artifact</h4>
                    <p className="handoffReasonText">{authorizedHandoffArtifact.review}</p>
                    <div className="readinessMetrics">
                      <span>ID: {authorizedHandoffArtifact.artifact_id}</span>
                      <span>Source: {authorizedHandoffArtifact.source_kind}</span>
                      <span>Created: {authorizedHandoffArtifact.created_at}</span>
                    </div>
                    <div className="gapCard">
                      <p>Read path</p>
                      <ul>
                        {authorizedHandoffArtifact.read_path.map((entry) => (
                          <li key={`${authorizedHandoffArtifact.artifact_id}-${entry}`}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                    {authorizedHandoffArtifact.required_evidence.length > 0 ? (
                      <div className="gapCard">
                        <p>Required evidence</p>
                        <ul>
                          {authorizedHandoffArtifact.required_evidence.slice(0, 6).map((entry) => (
                            <li key={entry.id}>
                              <strong>{entry.title}</strong> — {entry.id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {authorizedHandoffArtifact.blocking_ids.length > 0 ? (
                      <div className="gapCard">
                        <p>Blocking IDs</p>
                        <p>{authorizedHandoffArtifact.blocking_ids.join(", ")}</p>
                      </div>
                    ) : null}
                    {authorizedHandoffArtifact.blocked_reasons.length > 0 ? (
                      <div className="gapCard">
                        <p>Blocked reasons</p>
                        <ul>
                          {authorizedHandoffArtifact.blocked_reasons.slice(0, 6).map((entry) => (
                            <li key={`${authorizedHandoffArtifact.artifact_id}-block-${entry}`}>{entry}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {authorizedHandoffArtifact.suggested_workspace_seed == null ? null : (
                      <p>Suggested workspace seed: {authorizedHandoffArtifact.suggested_workspace_seed}</p>
                    )}
                  </section>
                ) : null}
                {latestReadiness?.gapDiagnoses?.map((gap) => (
                  <section className="gapCard" key={`${latestReadiness.attempt_id}-${gap.reason}`}>
                    <p>{gap.reason}</p>
                    <p className="gapEvidence">
                      Evidence anchors: {gap.evidenceRefs.map((entry) => entry.id).join(", ")}
                    </p>
                  </section>
                ))}
              </section>
            </section>
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
