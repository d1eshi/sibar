import * as React from "react";
import styles from "./App.module.css";

const intentFields = {
  buildPrompt: "quiero aprender embeddings, a no mas poder",
  sourcePrompt: "URL / pasted text / paper / repo",
  constraintPrompt: "time, scope, depth, or why this matters now",
  knownPrompt: "What background can the plan assume?",
  unknownPrompt: "What should stay explicit or locked?",
  desiredOutputPrompt: "repo, notes, benchmark, public writeup",
};

const planPreview = {
  title: "One bounded workspace",
  firstSession: "Read one source slice, build one artifact, recall once.",
  outputs: [
    "One source-backed study path",
    "One session artifact",
    "One readiness signal",
  ],
};

const onboardingCopy = {
  eyebrow: "New workspace",
  heading: "What do you want to study or build?",
  intro: "Turn one question and its sources into a focused first session.",
  cta: "Review workspace plan",
  sectionLabel: "Proposed plan",
  openSessionLabel: "Open first session",
};

function Topbar() {
  return (
    <header className={styles.topbar} aria-label="Workspace toolbar">
      <div className={styles.windowCluster} aria-hidden="true">
        <span className={`${styles.windowDot} ${styles.red}`} />
        <span className={`${styles.windowDot} ${styles.amber}`} />
        <span className={`${styles.windowDot} ${styles.green}`} />
      </div>
      <div className={styles.brandMark} aria-label="Sibar">
        <span className={styles.brandSymbol}>S</span>
        <strong>Sibar</strong>
      </div>
      <p className={styles.topbarDocument}>
        <span>Create Workspace</span>
        <span aria-hidden="true">/</span>
        <span>Focused Study</span>
      </p>
      <span className={styles.topbarSpacer} />
      <button className={styles.iconButton} type="button" aria-label="Search">
        S
      </button>
      <button className={styles.iconButton} type="button" aria-label="Toggle notes">
        N
      </button>
      <div className={styles.topbarDiscussion}>
        <span aria-hidden="true">*</span>
        <span>Local workspace</span>
      </div>
    </header>
  );
}

function IntentRail() {
  return (
    <aside className={styles.intentRail} aria-label="Workspace creation steps">
      <span className={styles.intentRailMark}>S</span>
      <ol>
        <li className={styles.intentStepActive}>Define</li>
        <li>Review</li>
        <li>Create</li>
      </ol>
    </aside>
  );
}

function IntentForm() {
  return (
    <section className={styles.intentForm}>
      <p className={styles.eyebrow}>{onboardingCopy.eyebrow}</p>
      <h1 id="workspace-intent-title">{onboardingCopy.heading}</h1>
      <p className={styles.intentCopy}>{onboardingCopy.intro}</p>

      <label htmlFor="workspaceIntentBuild">What are you trying to build or understand?</label>
      <textarea id="workspaceIntentBuild" rows={3} placeholder={intentFields.buildPrompt} />

      <label htmlFor="workspaceIntentSource">Source, repo, paper, or note</label>
      <textarea id="workspaceIntentSource" rows={1} placeholder={intentFields.sourcePrompt} />

      <label htmlFor="workspaceIntentWhy">Constraint or reason</label>
      <textarea id="workspaceIntentWhy" rows={2} placeholder={intentFields.constraintPrompt} />

      <details className={styles.intentSecondaryFields}>
        <summary>Optional background</summary>
        <div className={styles.intentFieldGrid}>
          <div>
            <label htmlFor="workspaceIntentKnown">What do you already know?</label>
            <textarea id="workspaceIntentKnown" rows={3} placeholder={intentFields.knownPrompt} />
          </div>
          <div>
            <label htmlFor="workspaceIntentUnknown">What do you not know yet?</label>
            <textarea id="workspaceIntentUnknown" rows={3} placeholder={intentFields.unknownPrompt} />
          </div>
        </div>

        <label htmlFor="workspaceIntentDesiredOutput">Desired output</label>
        <input id="workspaceIntentDesiredOutput" type="text" placeholder={intentFields.desiredOutputPrompt} />
      </details>

      <div className={styles.intentActions}>
        <button className={styles.generateButton} type="button">
          {onboardingCopy.cta}
        </button>
      </div>
    </section>
  );
}

function IntentPreview() {
  return (
    <aside className={styles.intentPreview} aria-live="polite">
      <p className={styles.sectionKicker}>{onboardingCopy.sectionLabel}</p>
      <h2>{planPreview.title}</h2>
      <div className={styles.firstSessionCallout}>
        <span>First session</span>
        <strong>{planPreview.firstSession}</strong>
      </div>
      <p className={styles.muted}>This workspace will produce:</p>
      <ul className={styles.itemList}>
        {planPreview.outputs.map((output) => (
          <li key={output}>{output}</li>
        ))}
      </ul>
      <p className={styles.contractStatus} role="status" aria-live="polite" />
      <button type="button" disabled>
        {onboardingCopy.openSessionLabel}
      </button>
    </aside>
  );
}

export default function App() {
  return (
    <main className={styles.researchShell} data-component="research-workspace-root">
      <section className={styles.nativeWindow} data-component="today-screen" data-workspace-state="intent">
        <Topbar />
        <section className={styles.intentScreen} aria-labelledby="workspace-intent-title" data-component="workspace-intent-flow">
          <IntentRail />
          <IntentForm />
          <IntentPreview />
        </section>
      </section>
    </main>
  );
}
