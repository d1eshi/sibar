import * as React from "react";
import { reviewOwnership, type OwnershipReview, type OwnershipReviewStatus } from "./ownershipReview";

const sampleDiff = `diff --git a/src/api/session.ts b/src/api/session.ts
index 42ac..89fc 100644
--- a/src/api/session.ts
+++ b/src/api/session.ts
@@ -14,8 +14,12 @@ export async function createSession(payload: LoginPayload) {
-  return response.json();
+  if (response.status === 204) return null;
+  return response.json();
 }
diff --git a/src/api/session.test.ts b/src/api/session.test.ts
index 11aa..33bd 100644
--- a/src/api/session.test.ts
+++ b/src/api/session.test.ts
@@ -2,3 +2,8 @@ import { createSession } from "./session";
+test("handles empty session response", async () => {
+  await expect(createSession({ email: "a@b.com" })).resolves.toBeNull();
+});`;

function statusLabel(status: OwnershipReviewStatus): string {
  if (status === "blocked") return "Blocked";
  if (status === "limited") return "Limited";
  return "Ready";
}

function StatusPill({ status }: { status: OwnershipReviewStatus }) {
  return (
    <span className={`statusPill status-${status}`} aria-label={`Review status ${status}`}>
      {statusLabel(status)}
    </span>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="resultSection">
      <h2>{title}</h2>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="emptyState">No items detected.</p>
      )}
    </section>
  );
}

function FileRows({ review }: { review: OwnershipReview }) {
  return (
    <section className="resultSection">
      <h2>Areas touched</h2>
      <div className="areaChips">
        {review.areasTouched.map((area) => (
          <span key={area}>{area}</span>
        ))}
      </div>
      <div className="fileRows">
        {review.files.map((file) => (
          <div className="fileRow" key={file.path}>
            <span>{file.path}</span>
            <span>+{file.additions} / -{file.deletions}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [diffText, setDiffText] = React.useState("");
  const [goalContext, setGoalContext] = React.useState("");
  const [review, setReview] = React.useState<OwnershipReview | null>(null);

  function runReview() {
    setReview(reviewOwnership({ diffText, goalContext }));
  }

  function loadSample() {
    setDiffText(sampleDiff);
    setGoalContext("Agent changed session handling for an empty auth response.");
    setReview(reviewOwnership({
      diffText: sampleDiff,
      goalContext: "Agent changed session handling for an empty auth response.",
    }));
  }

  return (
    <main className="ownershipShell">
      <section className="inputPane">
        <div className="brandLine">
          <span className="mark">S</span>
          <span>Sibi</span>
        </div>
        <header className="intro">
          <p className="eyebrow">Ownership review</p>
          <h1>Don't merge code you don't own.</h1>
          <p>Build with AI without losing ownership.</p>
        </header>

        <label className="field">
          <span>Diff, PR, or agent output</span>
          <textarea
            value={diffText}
            onChange={(event) => setDiffText(event.target.value)}
            spellCheck={false}
            placeholder="Paste a unified diff, PR body, or agent output..."
          />
        </label>

        <label className="field">
          <span>Goal / context</span>
          <input
            value={goalContext}
            onChange={(event) => setGoalContext(event.target.value)}
            placeholder="What was the agent supposed to change?"
          />
        </label>

        <div className="actions">
          <button className="primaryButton" type="button" onClick={runReview}>
            Review ownership
          </button>
          <button className="ghostButton" type="button" onClick={loadSample}>
            Load sample
          </button>
        </div>
      </section>

      <section className="reviewPane" aria-live="polite">
        {review ? (
          <>
            <div className="resultHeader">
              <div>
                <p className="eyebrow">Merge posture</p>
                <h2>{review.summary}</h2>
              </div>
              <StatusPill status={review.status} />
            </div>

            <div className="metricsGrid">
              <div>
                <span>{review.metrics.filesChanged}</span>
                <p>Files</p>
              </div>
              <div>
                <span>+{review.metrics.additions}</span>
                <p>Added</p>
              </div>
              <div>
                <span>-{review.metrics.deletions}</span>
                <p>Removed</p>
              </div>
              <div>
                <span>{review.metrics.riskyAreaCount}</span>
                <p>Risk areas</p>
              </div>
            </div>

            <FileRows review={review} />
            <ListBlock title="Ownership questions" items={review.ownershipQuestions} />
            <ListBlock title="Ownership gaps" items={review.ownershipGaps} />
            <ListBlock title="Tests / evidence suggested" items={review.testsEvidenceSuggested} />
            <ListBlock title="Minimum read path" items={review.readPath} />

            <div className="handoffBar">
              <span>Next artifact</span>
              <button type="button" disabled>Open Sibar session</button>
            </div>
          </>
        ) : (
          <div className="emptyReview">
            <p className="eyebrow">Waiting for input</p>
            <h2>Paste the work before it becomes your merge.</h2>
          </div>
        )}
      </section>
    </main>
  );
}
