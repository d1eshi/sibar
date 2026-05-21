import * as React from "react";

import { labelForState } from "../helpers";
import type { BoundaryState, OwnershipBoundary, ReviewQueueItem } from "../types";

interface ReviewGuidePanelProps {
  boundary: OwnershipBoundary;
  boundaryState: BoundaryState;
  reviewQueue: ReviewQueueItem[];
}

export function ReviewGuidePanel({
  boundary,
  boundaryState,
  reviewQueue,
}: ReviewGuidePanelProps): React.ReactElement {
  return (
    <section className="reviewGuide" aria-label="First-run review sequence">
      <div className="reviewGuideIntro">
        <p className="panelSub">Review guide</p>
        <h2>Sibi will review the changed boundary before asking you to prove ownership.</h2>
        <p>
          Start with the visible diff and touched files, then trace only the caller evidence needed for this
          boundary. The ownership prompt comes after that queue is grounded.
        </p>
      </div>

      <div className="reviewStageList" aria-label="Sibi review sequence">
        <article className="reviewStage active">
          <span className="stageIndex">1</span>
          <div>
            <h3>Inspect changed surface</h3>
            <p>
              Review touched files, current state, and evidence confidence before making any readiness claim.
            </p>
          </div>
        </article>
        <article className="reviewStage">
          <span className="stageIndex">2</span>
          <div>
            <h3>Prioritize boundaries</h3>
            <p>
              Order the queue by risk: touched contract first, supporting test next, inferred caller last.
            </p>
          </div>
        </article>
        <article className="reviewStage">
          <span className="stageIndex">3</span>
          <div>
            <h3>Request ownership attempt</h3>
            <p>
              Ask the user to prove this boundary only after the review queue explains what must be checked.
            </p>
          </div>
        </article>
      </div>

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

      <section className="reviewBoundaryFocus" aria-label="Current boundary focus">
        <h3>Current boundary</h3>
        <p>
          <strong>{boundary.title}</strong>
        </p>
        <p>{boundary.whyMatters}</p>
      </section>
    </section>
  );
}
