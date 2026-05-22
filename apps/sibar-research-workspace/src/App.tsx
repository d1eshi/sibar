import * as React from "react";
import styles from "./App.module.css";
import { OnboardingFlow } from "./flows/onboarding/OnboardingFlow";
import { WorkspaceShell } from "./flows/workspace/WorkspaceShell";
import { WorkspaceHome } from "./flows/workspace/WorkspaceHome";
import { WorkspaceOverview } from "./flows/workspace/WorkspaceOverview";
import { SessionWorkbench } from "./flows/workspace/SessionWorkbench";
import { StudyPathRail } from "./flows/workspace/StudyPathRail";
import { StudySessionNotes } from "./flows/workspace/StudySessionNotes";
import stylesWorkspace from "./flows/workspace/workspace.module.css";
import {
  createInitialWorkspaceStateFromFixture,
  firstWorkspaceSessionFixture,
  workspaceHomeProjection,
  projectWorkspaceSession,
} from "./state/workspaceProjection";
import { workspaceSessionReducer } from "./state/workspaceReducer";
import type { WorkspaceStudyNote } from "./state/workspaceReducer";

const studyNoteDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const studyNotesStorageKey = "sibar:workspace-study-notes:v1";

type StoredStudyNotesState = {
  version: 1;
  courseTitle: string;
  notes: WorkspaceStudyNote[];
};

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isStudyNote(value: unknown): value is WorkspaceStudyNote {
  if (!value || typeof value !== "object") {
    return false;
  }

  const note = value as Record<string, unknown>;

  return (
    typeof note.id === "string" &&
    typeof note.courseTitle === "string" &&
    typeof note.sessionTitle === "string" &&
    typeof note.nodeName === "string" &&
    typeof note.miniNodeQuestion === "string" &&
    typeof note.sourceTitle === "string" &&
    typeof note.createdAtIso === "string" &&
    typeof note.createdAtLabel === "string" &&
    typeof note.createdAtEpochMs === "number" &&
    Number.isFinite(note.createdAtEpochMs) &&
    typeof note.createdAtDateKey === "string" &&
    typeof note.iterationLabel === "string" &&
    typeof note.body === "string"
  );
}

function readStoredStudyNotesState(): Partial<StoredStudyNotesState> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(studyNotesStorageKey);

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const stored = parsed as Record<string, unknown>;

    if (
      stored.version !== 1 ||
      typeof stored.courseTitle !== "string" ||
      !Array.isArray(stored.notes) ||
      !stored.notes.every(isStudyNote)
    ) {
      return {};
    }

    return {
      courseTitle: stored.courseTitle,
      notes: stored.notes,
    };
  } catch {
    return {};
  }
}

function writeStoredStudyNotesState(state: StoredStudyNotesState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(studyNotesStorageKey, JSON.stringify(state));
  } catch {
    // Local note capture should keep working even when storage is unavailable.
  }
}

export default function App() {
  type AppFlowStep = "home" | "onboarding" | "overview" | "session";
  const [flowStep, setFlowStep] = React.useState<AppFlowStep>("home");
  const [workspaceState, dispatchWorkspace] = React.useReducer(
    workspaceSessionReducer,
    firstWorkspaceSessionFixture,
    (fixture) => {
      const storedStudyNotesState = readStoredStudyNotesState();
      const initialState = createInitialWorkspaceStateFromFixture(fixture);

      return {
        ...initialState,
        studyCourseTitle:
          storedStudyNotesState.courseTitle ?? initialState.studyCourseTitle,
        studyNotes: storedStudyNotesState.notes ?? initialState.studyNotes,
      };
    },
  );
  const workspaceProjection = projectWorkspaceSession(
    workspaceState,
    firstWorkspaceSessionFixture,
  );

  React.useEffect(() => {
    writeStoredStudyNotesState({
      version: 1,
      courseTitle: workspaceState.studyCourseTitle,
      notes: [...workspaceState.studyNotes],
    });
  }, [workspaceState.studyCourseTitle, workspaceState.studyNotes]);

  function openFlowStep(nextStep: AppFlowStep) {
    setFlowStep(nextStep);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }

  function saveStudyNote() {
    const noteBody = workspaceState.studyNoteDraft.trim();

    if (noteBody.length === 0) {
      return;
    }

    const now = new Date();
    const noteNumber = workspaceState.studyNotes.length + 1;
    const createdAtEpochMs = now.getTime();
    const note: WorkspaceStudyNote = {
      id: `study-note-${createdAtEpochMs}-${noteNumber}`,
      courseTitle: workspaceState.studyCourseTitle.trim() || "Untitled course",
      sessionTitle: workspaceProjection.selectedNode.sessionTitle,
      nodeName: workspaceProjection.selectedNode.name,
      miniNodeQuestion: workspaceProjection.selectedMiniNode.question,
      sourceTitle: workspaceProjection.selectedSource.title,
      createdAtIso: now.toISOString(),
      createdAtLabel: studyNoteDateFormatter.format(now),
      createdAtEpochMs,
      createdAtDateKey: getLocalDateKey(now),
      iterationLabel: `Entry ${noteNumber}`,
      body: noteBody,
    };

    dispatchWorkspace({ type: "add_study_note", note });
  }

  return (
    <main className={styles.researchShell} data-component="research-workspace-root">
      <WorkspaceShell mode={flowStep}>
        {flowStep === "home" ? (
          <WorkspaceHome
            projection={workspaceHomeProjection}
            onNewWorkspace={() => openFlowStep("onboarding")}
            onOpenWorkspace={(workspace) => openFlowStep(workspace.openTarget)}
          />
        ) : flowStep === "onboarding" ? (
          <OnboardingFlow onOpenWorkspace={() => openFlowStep("overview")} />
        ) : flowStep === "overview" ? (
          <WorkspaceOverview
            projection={workspaceProjection}
            state={workspaceState}
            dispatch={dispatchWorkspace}
            onOpenSelectedNode={() => openFlowStep("session")}
          />
        ) : (
          <section
            className={stylesWorkspace.workspaceFrame}
            data-component="workspace-session"
          >
            <StudyPathRail
              projection={workspaceProjection}
              state={workspaceState}
              dispatch={dispatchWorkspace}
            />
            <SessionWorkbench
              projection={workspaceProjection}
              onSelectSource={(sourceId) =>
                dispatchWorkspace({ type: "select_source", sourceId })
              }
            />
            <aside className={stylesWorkspace.readinessPanel}>
              <StudySessionNotes
                courseTitle={workspaceState.studyCourseTitle}
                noteDraft={workspaceState.studyNoteDraft}
                notes={workspaceState.studyNotes}
                currentSessionTitle={workspaceProjection.selectedNode.sessionTitle}
                currentSourceTitle={workspaceProjection.selectedSource.title}
                onCourseTitleChange={(courseTitle) =>
                  dispatchWorkspace({ type: "set_study_course_title", courseTitle })
                }
                onNoteDraftChange={(noteDraft) =>
                  dispatchWorkspace({ type: "set_study_note_draft", noteDraft })
                }
                onAddNote={saveStudyNote}
              />

              {workspaceState.isReadinessPanelVisible ? (
                <section className={stylesWorkspace.guidePanel}>
                  <p className={stylesWorkspace.kicker}>Guide / readiness</p>
                  <h3>{workspaceProjection.selectedSource.title}</h3>
                  <p>{workspaceProjection.sessionHint}</p>
                  <ul>
                    <li>One concrete artifact from the current mini-node.</li>
                    <li>One evidence-backed conclusion.</li>
                    <li>{workspaceProjection.recallStatus}</li>
                    <li>{workspaceProjection.readinessLabel}</li>
                  </ul>
                  <button
                    type="button"
                    className={stylesWorkspace.panelToggle}
                    onClick={() => dispatchWorkspace({ type: "toggle_readiness_panel" })}
                  >
                    Hide compact panel
                  </button>
                </section>
              ) : (
                <section className={stylesWorkspace.guidePanel}>
                  <p className={stylesWorkspace.kicker}>Guide / readiness</p>
                  <button
                    type="button"
                    className={stylesWorkspace.panelShow}
                    onClick={() => dispatchWorkspace({ type: "toggle_readiness_panel" })}
                  >
                    Show compact panel
                  </button>
                </section>
              )}
            </aside>
          </section>
        )}
      </WorkspaceShell>
    </main>
  );
}
