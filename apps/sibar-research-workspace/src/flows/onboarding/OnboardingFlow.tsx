import * as React from "react";
import shellStyles from "../../App.module.css";
import styles from "./onboarding.module.css";
import {
  compileFrontierLabMissionFromSource,
  type FrontierLabMissionCompileDiagnostic,
  type FrontierLabMissionCompileResult,
} from "../../../../../engine/workspace/source-mission/frontier-lab-compiler.ts";
import { FRONTIER_LAB_BLOG_URL } from "../../../../../engine/workspace/source-mission/frontier-lab-fixture.ts";
import type { MissionUiProjection } from "../../../../../engine/workspace/source-mission/ui-projection.ts";

const fieldDefaults = {
  intent: "Why should this source become a mission now?",
  source: FRONTIER_LAB_BLOG_URL,
  constraint:
    "Keep scope tight, prioritize practical examples, and finish quickly.",
  known: "What background can the plan assume?",
  unknown:
    "What should stay explicit or locked while we learn?",
  desiredOutput: "repo, notes, or benchmark",
};

const onboardingCopy = {
  eyebrow: "New mission",
  heading: "What source should become a mission?",
  intro: "Compile a supported source URL or pasted text and your reason into a focused Mission Brief.",
  cta: "Review mission",
  sectionLabel: "Mission preview",
  optionalLabel: "Optional background",
  openWorkspaceLabel: "Open Mission Brief",
  knownLabel: "What do you already know?",
  unknownLabel: "What do you not know yet?",
  desiredOutputLabel: "Desired output",
  sourceLabel: "Source URL or pasted text",
  intentLabel: "Reason or goal",
  constraintLabel: "Constraint or reason",
  statusReady: "Mission preview is compiled from the supported frontier-lab source.",
  statusWaiting: "Enter a source URL or pasted text and reason, then review the mission.",
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

type MissionPlanPreview = {
  title: string;
  sourceTitle: string;
  sourceKind: string;
  canonicalUrl: string | null;
  userReason: string;
  contextMessage: string;
  sourceSignals: readonly {
    label: string;
    status: string;
  }[];
  tracks: readonly {
    title: string;
    status: string;
  }[];
  focusedQueue: readonly {
    title: string;
    status: string;
    artifactHints: readonly string[];
  }[];
};

type FlowState = {
  fields: OnboardingIntent;
  isOptionalOpen: boolean;
  compileResult: FrontierLabMissionCompileResult | null;
  preview: MissionPlanPreview | null;
  reviewedSignature: string | null;
};

type OnboardingFlowProps = {
  onOpenWorkspace: (missionProjection: MissionUiProjection) => void;
};

type FlowAction =
  | { type: "set_field"; field: FieldName; value: string }
  | { type: "review_workspace_plan" }
  | { type: "set_optional_open"; isOpen: boolean };

const initialState: FlowState = {
  fields: {
    intent: "",
    source: FRONTIER_LAB_BLOG_URL,
    constraint: "",
    known: "",
    unknown: "",
    desiredOutput: "",
  },
  isOptionalOpen: false,
  compileResult: null,
  preview: null,
  reviewedSignature: null,
};

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
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

function compileDiagnosticsForEmptyReason(): FrontierLabMissionCompileDiagnostic[] {
  return [
    {
      code: "source_intent_input_user_reason",
      message: "Reason or goal is required before compiling a mission.",
      severity: "error",
      path: "user_reason",
    },
  ];
}

function formatSourceKind(value: MissionUiProjection["mission_brief"]["source_context"]["source_kind"]): string {
  return value === "url" ? "Blog URL" : value.replaceAll("_", " ");
}

function buildPreviewFromProjection(uiProjection: MissionUiProjection): MissionPlanPreview {
  const sourceContext = uiProjection.mission_brief.source_context;
  const focusedSessions = [
    ...uiProjection.focused_queue.visible_sessions,
    ...uiProjection.focused_queue.deferred_sessions,
    ...uiProjection.focused_queue.locked_sessions,
  ];

  return {
    title: uiProjection.mission_brief.title,
    sourceTitle: sourceContext.title ?? "Untitled source",
    sourceKind: formatSourceKind(sourceContext.source_kind),
    canonicalUrl: sourceContext.canonical_url,
    userReason: sourceContext.user_reason,
    contextMessage:
      "This preview comes from the blog source plus your reason. It is a compact Mission Brief, not a long curriculum.",
    sourceSignals: uiProjection.source_map.signals.slice(0, 3).map((signal) => ({
      label: signal.label,
      status: signal.confidence,
    })),
    tracks: uiProjection.mission_brief.tracks.slice(0, 3).map((track) => ({
      title: track.title,
      status: track.status,
    })),
    focusedQueue: focusedSessions.slice(0, 3).map((session) => ({
      title: session.title,
      status: session.status,
      artifactHints: session.artifacts.slice(0, 3).map((artifact) => artifact.title),
    })),
  };
}

function reducer(state: FlowState, action: FlowAction): FlowState {
  if (action.type === "set_field") {
    return {
      ...state,
      fields: { ...state.fields, [action.field]: action.value },
      compileResult: null,
      preview: null,
      reviewedSignature: null,
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
    const userReason = normalizeText(values.intent);
    const result = userReason
      ? compileFrontierLabMissionFromSource({
          source: normalizeText(values.source),
          user_reason: userReason,
          optional_goal: normalizeText(values.desiredOutput) || undefined,
          optional_constraints: [values.constraint, values.known, values.unknown]
            .map((item) => normalizeText(item))
            .filter(Boolean),
        })
      : {
          ok: false,
          diagnostics: compileDiagnosticsForEmptyReason(),
        } satisfies FrontierLabMissionCompileResult;

    return {
      ...state,
      compileResult: result,
      preview: result.ok && result.ui_projection
        ? buildPreviewFromProjection(result.ui_projection)
        : null,
      reviewedSignature: buildSignature(values),
    };
  }

  return state;
}

function hasReviewedPlan(state: FlowState): boolean {
  return state.reviewedSignature !== null && state.compileResult?.ok === true && Boolean(state.compileResult.ui_projection);
}

function diagnosticText(state: FlowState): string {
  if (state.compileResult && !state.compileResult.ok) {
    return state.compileResult.diagnostics
      .map((diagnostic) => diagnostic.message)
      .join(" ");
  }

  return state.reviewedSignature === null
    ? onboardingCopy.statusWaiting
    : "Mission compiler did not return a usable UI projection.";
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
  onOpenWorkspace,
}: {
  state: FlowState;
  reviewReady: boolean;
  onOpenWorkspace: (missionProjection: MissionUiProjection) => void;
}) {
  const statusMessage = reviewReady
    ? onboardingCopy.statusReady
    : diagnosticText(state);
  const compiledProjection = state.compileResult?.ok
    ? state.compileResult.ui_projection
    : undefined;

  return (
    <aside className={shellStyles.intentPreview} aria-live="polite">
      <p className={shellStyles.sectionKicker}>{onboardingCopy.sectionLabel}</p>
      <h2>{state.preview?.title ?? "No mission preview yet"}</h2>
      {state.preview ? (
        <>
          <p className={shellStyles.muted}>{state.preview.contextMessage}</p>
          <dl className={styles.previewMeta} aria-label="Source origin">
            <div>
              <dt>Source title</dt>
              <dd>{state.preview.sourceTitle}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{state.preview.sourceKind}</dd>
            </div>
            <div>
              <dt>Canonical URL</dt>
              <dd>{state.preview.canonicalUrl ?? "No canonical URL supplied."}</dd>
            </div>
            <div>
              <dt>User reason</dt>
              <dd>{state.preview.userReason}</dd>
            </div>
          </dl>

          <div className={styles.previewGrid}>
            <section className={styles.previewSection} aria-label="Source signals">
              <h3>Detected signals</h3>
              <ul>
                {state.preview.sourceSignals.map((signal) => (
                  <li key={signal.label}>
                    <span>{signal.label}</span>
                    <small>{signal.status}</small>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.previewSection} aria-label="Tracks">
              <h3>Tracks</h3>
              <ul>
                {state.preview.tracks.map((track) => (
                  <li key={track.title}>
                    <span>{track.title}</span>
                    <small>{track.status}</small>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.previewSection} aria-label="Focused Queue">
              <h3>Focused Queue</h3>
              <ul>
                {state.preview.focusedQueue.map((session) => (
                  <li key={session.title}>
                    <span>{session.title}</span>
                    <small>{session.status}</small>
                    {session.artifactHints.length > 0 ? (
                      <em>Artifact hints: {session.artifactHints.join(", ")}</em>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : (
        <div className={shellStyles.firstSessionCallout}>
          <span>Mission context</span>
          <strong>Compile a supported source to preview the Mission, Tracks, Sessions, and Artifacts.</strong>
        </div>
      )}
      <p className={`${styles.contractStatus} ${reviewReady ? styles.sessionReady : ""}`} role="status" aria-live="polite">
        {statusMessage}
      </p>
      <button
        type="button"
        disabled={!reviewReady || !compiledProjection}
        className={styles.openButton}
        onClick={() => {
          if (compiledProjection) onOpenWorkspace(compiledProjection);
        }}
      >
        {onboardingCopy.openWorkspaceLabel}
      </button>
    </aside>
  );
}

export function OnboardingFlow({ onOpenWorkspace }: OnboardingFlowProps) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const reviewReady = hasReviewedPlan(state);

  return (
    <section
      aria-labelledby="workspace-intent-title"
      data-component="workspace-intent-flow"
    >
      <section
        className={shellStyles.intentScreen}
        id="workspace-intent-view"
      >
        <IntentForm state={state} dispatch={dispatch} />
        <IntentPreview
          state={state}
          reviewReady={reviewReady}
          onOpenWorkspace={onOpenWorkspace}
        />
      </section>
    </section>
  );
}
