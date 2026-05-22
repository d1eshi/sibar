import * as React from "react";

import { labelForState } from "../helpers";
import type { BoundaryState, OwnershipBoundary, ReviewQueueItem } from "../types";

interface ReviewGuidePanelProps {
  boundary: OwnershipBoundary;
  boundaryState: BoundaryState;
  reviewQueue: ReviewQueueItem[];
  showDetailedQueue?: boolean;
}

export function ReviewGuidePanel({
  boundary,
  boundaryState,
  reviewQueue,
  showDetailedQueue = false,
}: ReviewGuidePanelProps): React.ReactElement {
  const currentItem = reviewQueue[0];

  return (
    <section className="reviewGuide" aria-label="First-run review sequence">
      <div className="reviewGuideIntro">
        <p className="panelSub">Review guide</p>
        <h2>Start with the changed boundary.</h2>
        <p>
          Sibi reviews the touched surface first, then traces only the caller evidence needed for this
          boundary. The ownership prompt comes after this check is grounded.
        </p>
      </div>

      {currentItem && (
        <section className="reviewCurrentFocus" aria-label="Current queue focus">
          <div className="reviewQueueHeader">
            <h3>Current step</h3>
            <span className={`stateBadge ${boundaryState}-state`}>{labelForState(boundaryState)}</span>
          </div>
          <p>
            <strong>{currentItem.boundaryTitle}</strong>
          </p>
          <dl>
            <div>
              <dt>Start here</dt>
              <dd>{currentItem.orderReason}</dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>{currentItem.nextStep}</dd>
            </div>
          </dl>
          <p className="reviewLaterStep">Later: request the ownership attempt after this boundary is reviewed.</p>
        </section>
      )}

      {showDetailedQueue && (
        <section className="reviewQueue" aria-label="Prioritized review queue">
          <div className="reviewQueueHeader">
            <h3>Priority queue</h3>
            <span className={`stateBadge ${boundaryState}-state`}>{labelForState(boundaryState)}</span>
          </div>
          <ol>
            {reviewQueue.map((item) => (
              <li key={item.id}>
                <div className="queueItemHeader">
                  <strong>{item.filePath}</strong>
                  <span className="queueItemMeta">
                    Priority {item.priority} / {labelForState(item.state)}
                  </span>
                </div>
                <p>{item.boundaryTitle}</p>
                <dl>
                  <div>
                    <dt>Touched</dt>
                    <dd>{item.touched ? "yes" : "no, caller evidence only"}</dd>
                  </div>
                  <div>
                    <dt>Reason</dt>
                    <dd>{item.orderReason}</dd>
                  </div>
                  <div>
                    <dt>Next step</dt>
                    <dd>{item.nextStep}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="reviewBoundaryFocus" aria-label="Current boundary focus">
        <h3>Current boundary</h3>
        <p>
          <strong>{boundary.title}</strong>
        </p>
        <p>
          Responsibility claim: <strong>{boundary.responsibility_claim}</strong>
        </p>
        <p>{boundary.whyMatters}</p>
      </section>

      <section className="reviewBoundaryRisk" aria-label="Highest-risk boundary">
        <h3>Highest-risk boundary</h3>
        <p>
          <strong>{boundary.title}</strong> ranked by policy.
        </p>
        <dl className="boundaryRiskGrid">
          <div>
            <dt>Risk score</dt>
            <dd>{boundary.risk.score}</dd>
          </div>
          <div>
            <dt>Relation weight</dt>
            <dd>{boundary.risk.relationWeight}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{boundary.confidence}</dd>
          </div>
          <div>
            <dt>Open questions</dt>
            <dd>{boundary.open_questions.length}</dd>
          </div>
        </dl>
      </section>
    </section>
  );
}
