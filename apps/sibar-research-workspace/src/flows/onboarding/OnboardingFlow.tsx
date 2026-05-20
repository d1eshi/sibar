import * as React from "react";
import shellStyles from "../../App.module.css";
import styles from "./onboarding.module.css";

const fieldDefaults = {
  intent:
    "I want to understand embeddings so I can build one small retrieval feature and explain trade-offs quickly.",
  source: "URL, pasted text, paper, or repository",
  constraint:
    "Keep scope tight, prioritize practical examples, and finish quickly.",
  known: "What background can the plan assume?",
  unknown:
    "What should stay explicit or locked while we learn?",
  desiredOutput: "repo, notes, or benchmark",
};

const onboardingCopy = {
  eyebrow: "New workspace",
  heading: "What do you want to study or build?",
  intro: "Turn one question and its sources into a focused first session.",
  cta: "Review workspace plan",
  sectionLabel: "Proposed plan",
  optionalLabel: "Optional background",
  openSessionLabel: "Open first session",
  knownLabel: "What do you already know?",
  unknownLabel: "What do you not know yet?",
  desiredOutputLabel: "Desired output",
  sourceLabel: "Source, repo, paper, or note",
  intentLabel: "What are you trying to build or understand?",
  constraintLabel: "Constraint or reason",
  statusReady: "Workspace plan is ready. You can open the first session.",
  statusWaiting: "Update fields and click Review workspace plan to regenerate the preview.",
  statusOpened: "First session ready",
};

type FieldName = keyof typeof fieldDefaults;

type OnboardingIntent = {
  intent: string;
  source: string;
  constraint: string;
  known: string;
  unknown: string;
  desiredOutput: string;
};

type WorkspacePlanPreview = {
  title: string;
  firstSession: string;
  outputs: [string, string, string];
};

type FlowState = {
  fields: OnboardingIntent;
  isOptionalOpen: boolean;
  preview: WorkspacePlanPreview;
  reviewedSignature: string | null;
  isSessionOpen: boolean;
};

type FlowAction =
  | { type: "set_field"; field: FieldName; value: string }
  | { type: "review_workspace_plan" }
  | { type: "open_first_session" }
  | { type: "set_optional_open"; isOpen: boolean };

const initialState: FlowState = {
  fields: {
    intent: "",
    source: "",
    constraint: "",
    known: "",
    unknown: "",
    desiredOutput: "",
  },
  isOptionalOpen: false,
  preview: {
    title: "Ready workspace shell",
    firstSession: "Add an intent and a source, then generate your workspace plan.",
    outputs: [
      "One bounded study path",
      "One concrete first session artifact",
      "One progress checkpoint",
    ],
  },
  reviewedSignature: null,
  isSessionOpen: false,
};

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function textPreviewFrom(value: string, maxWords: number): string {
  const cleaned = normalizeText(value);
  if (!cleaned) {
    return "";
  }
  const words = cleaned.split(" ");
  if (words.length <= maxWords) {
    return cleaned;
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function buildSignature(values: OnboardingIntent): string {
  return JSON.stringify({
    intent: normalizeText(values.intent).toLowerCase(),
    source: normalizeText(values.source).toLowerCase(),
    constraint: normalizeText(values.constraint).toLowerCase(),
    known: normalizeText(values.known).toLowerCase(),
    unknown: normalizeText(values.unknown).toLowerCase(),
    desiredOutput: normalizeText(values.desiredOutput).toLowerCase(),
  });
}

function splitOutputList(raw: string): string[] {
  return raw
    .split(/[;,]| and /i)
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .filter((item) => item.length > 0);
}

function makeWorkspacePreview(values: OnboardingIntent): WorkspacePlanPreview {
  const intentSummary = textPreviewFrom(values.intent || fieldDefaults.intent, 8);
  const sourceSummary = normalizeText(values.source || fieldDefaults.source);
  const constraintSummary = normalizeText(values.constraint || fieldDefaults.constraint);
  const knownSummary = normalizeText(values.known || fieldDefaults.known);
  const unknownSummary = normalizeText(values.unknown || fieldDefaults.unknown);
  const desiredOutputList = splitOutputList(values.desiredOutput || fieldDefaults.desiredOutput);

  const title = normalizeText(
    `Bounded workspace on ${intentSummary || "the chosen intent"}`,
  );
  const fallbackSourceLine =
    sourceSummary.length > 78
      ? `${sourceSummary.slice(0, 75).trim()}...`
      : sourceSummary;
  const firstSession = `Read one source slice from ${fallbackSourceLine}, then produce one artifact scoped by ${constraintSummary.toLowerCase() || "the stated constraint"}, and mark readiness once.`;
  const fallbackOutputs = [
    `One source-backed study path for ${intentSummary || "the topic"}`,
    `One ${desiredOutputList[0] || "artifact"} proving what changed`,
    `One readiness checkpoint tied to ${unknownSummary || knownSummary || "the topic"}`,
  ];
  const outputs = [
    ...desiredOutputList.slice(0, 2),
    ...fallbackOutputs,
  ];

  return {
    title,
    firstSession,
    outputs: [
      outputs[0] || fallbackOutputs[0],
      outputs[1] || fallbackOutputs[1],
      outputs[2] || fallbackOutputs[2],
    ],
  };
}

function reducer(state: FlowState, action: FlowAction): FlowState {
  if (action.type === "set_field") {
    return {
      ...state,
      fields: { ...state.fields, [action.field]: action.value },
      reviewedSignature: null,
      isSessionOpen: false,
    };
  }

  if (action.type === "set_optional_open") {
    return {
      ...state,
      isOptionalOpen: action.isOpen,
    };
  }

  if (action.type === "review_workspace_plan") {
    const values = { ...state.fields };
    return {
      ...state,
      preview: makeWorkspacePreview(values),
      reviewedSignature: buildSignature(values),
      isSessionOpen: false,
    };
  }

  if (action.type === "open_first_session") {
    if (!state.reviewedSignature) {
      return state;
    }
    return {
      ...state,
      isSessionOpen: true,
    };
  }

  return state;
}

function hasReviewedPlan(state: FlowState): boolean {
  return state.reviewedSignature !== null;
}

function Topbar() {
  return (
    <header className={shellStyles.topbar} aria-label="Workspace toolbar">
      <div className={shellStyles.windowCluster} aria-hidden="true">
        <span className={`${shellStyles.windowDot} ${shellStyles.red}`} />
        <span className={`${shellStyles.windowDot} ${shellStyles.amber}`} />
        <span className={`${shellStyles.windowDot} ${shellStyles.green}`} />
      </div>
      <div className={shellStyles.brandMark} aria-label="Sibar">
        <span className={shellStyles.brandSymbol}>S</span>
        <strong>Sibar</strong>
      </div>
      <p className={shellStyles.topbarDocument}>
        <span>Create Workspace</span>
        <span aria-hidden="true">/</span>
        <span>Focused Study</span>
      </p>
      <span className={shellStyles.topbarSpacer} />
      <button className={shellStyles.iconButton} type="button" aria-label="Search">
        S
      </button>
      <button className={shellStyles.iconButton} type="button" aria-label="Toggle notes">
        N
      </button>
      <div className={shellStyles.topbarDiscussion}>
        <span aria-hidden="true">*</span>
        <span>Local workspace</span>
      </div>
    </header>
  );
}

function IntentRail() {
  return (
    <aside className={shellStyles.intentRail} aria-label="Workspace creation steps">
      <span className={shellStyles.intentRailMark}>S</span>
      <ol>
        <li className={shellStyles.intentStepActive}>Define</li>
        <li>Review</li>
        <li>Create</li>
      </ol>
    </aside>
  );
}

function IntentForm({
  state,
  dispatch,
}: {
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
}) {
  return (
    <section className={shellStyles.intentForm}>
      <p className={shellStyles.eyebrow}>{onboardingCopy.eyebrow}</p>
      <h1 id="workspace-intent-title">{onboardingCopy.heading}</h1>
      <p className={shellStyles.intentCopy}>{onboardingCopy.intro}</p>

      <label htmlFor="workspaceIntentBuild">{onboardingCopy.intentLabel}</label>
      <textarea
        id="workspaceIntentBuild"
        rows={3}
        value={state.fields.intent}
        onChange={(event) =>
          dispatch({ type: "set_field", field: "intent", value: event.currentTarget.value })
        }
        placeholder={fieldDefaults.intent}
      />

      <label htmlFor="workspaceIntentSource">{onboardingCopy.sourceLabel}</label>
      <textarea
        id="workspaceIntentSource"
        rows={1}
        value={state.fields.source}
        onChange={(event) =>
          dispatch({ type: "set_field", field: "source", value: event.currentTarget.value })
        }
        placeholder={fieldDefaults.source}
      />

      <label htmlFor="workspaceIntentWhy">{onboardingCopy.constraintLabel}</label>
      <textarea
        id="workspaceIntentWhy"
        rows={2}
        value={state.fields.constraint}
        onChange={(event) =>
          dispatch({
            type: "set_field",
            field: "constraint",
            value: event.currentTarget.value,
          })
        }
        placeholder={fieldDefaults.constraint}
      />

      <details
        className={shellStyles.intentSecondaryFields}
        open={state.isOptionalOpen}
        onToggle={(event) =>
          dispatch({
            type: "set_optional_open",
            isOpen: event.currentTarget.open,
          })
        }
      >
        <summary>{onboardingCopy.optionalLabel}</summary>
        <div className={shellStyles.intentFieldGrid}>
          <div>
            <label htmlFor="workspaceIntentKnown">{onboardingCopy.knownLabel}</label>
            <textarea
              id="workspaceIntentKnown"
              rows={3}
              value={state.fields.known}
              onChange={(event) =>
                dispatch({ type: "set_field", field: "known", value: event.currentTarget.value })
              }
              placeholder={fieldDefaults.known}
            />
          </div>
          <div>
            <label htmlFor="workspaceIntentUnknown">{onboardingCopy.unknownLabel}</label>
            <textarea
              id="workspaceIntentUnknown"
              rows={3}
              value={state.fields.unknown}
              onChange={(event) =>
                dispatch({ type: "set_field", field: "unknown", value: event.currentTarget.value })
              }
              placeholder={fieldDefaults.unknown}
            />
          </div>
        </div>

        <label htmlFor="workspaceIntentDesiredOutput">{onboardingCopy.desiredOutputLabel}</label>
        <input
          id="workspaceIntentDesiredOutput"
          type="text"
          value={state.fields.desiredOutput}
          onChange={(event) =>
            dispatch({
              type: "set_field",
              field: "desiredOutput",
              value: event.currentTarget.value,
            })
          }
          placeholder={fieldDefaults.desiredOutput}
        />
      </details>

      <div className={shellStyles.intentActions}>
        <button
          className={shellStyles.generateButton}
          type="button"
          onClick={() => dispatch({ type: "review_workspace_plan" })}
        >
          {onboardingCopy.cta}
        </button>
      </div>
    </section>
  );
}

function IntentPreview({
  state,
  reviewReady,
  dispatch,
}: {
  state: FlowState;
  reviewReady: boolean;
  dispatch: React.Dispatch<FlowAction>;
}) {
  const statusMessage = state.isSessionOpen
    ? onboardingCopy.statusOpened
    : reviewReady
      ? onboardingCopy.statusReady
      : onboardingCopy.statusWaiting;

  return (
    <aside className={shellStyles.intentPreview} aria-live="polite">
      <p className={shellStyles.sectionKicker}>{onboardingCopy.sectionLabel}</p>
      <h2>{state.preview.title}</h2>
      <div className={shellStyles.firstSessionCallout}>
        <span>First session</span>
        <strong>{state.preview.firstSession}</strong>
      </div>
      <p className={shellStyles.muted}>This workspace will produce:</p>
      <ul className={shellStyles.itemList}>
        {state.preview.outputs.map((output) => (
          <li key={output}>{output}</li>
        ))}
      </ul>
      <p className={`${styles.contractStatus} ${state.isSessionOpen ? styles.sessionReady : ""}`} role="status" aria-live="polite">
        {statusMessage}
      </p>
      <button
        type="button"
        disabled={!reviewReady}
        className={state.isSessionOpen ? styles.openButtonActive : undefined}
        onClick={() => dispatch({ type: "open_first_session" })}
      >
        {onboardingCopy.openSessionLabel}
      </button>
    </aside>
  );
}

export function OnboardingFlow() {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const reviewReady = hasReviewedPlan(state);

  return (
    <>
      <Topbar />
      <section
        className={shellStyles.intentScreen}
        aria-labelledby="workspace-intent-title"
        data-component="workspace-intent-flow"
      >
        <IntentRail />
        <IntentForm state={state} dispatch={dispatch} />
        <IntentPreview
          state={state}
          reviewReady={reviewReady}
          dispatch={dispatch}
        />
      </section>
    </>
  );
}
