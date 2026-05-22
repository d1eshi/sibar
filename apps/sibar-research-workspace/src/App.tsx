import * as React from "react";
import styles from "./App.module.css";
import { OnboardingFlow } from "./flows/onboarding/OnboardingFlow";
import { WorkspaceShell } from "./flows/workspace/WorkspaceShell";
import { WorkspaceHome } from "./flows/workspace/WorkspaceHome";
import { WorkspaceOverview } from "./flows/workspace/WorkspaceOverview";
import { StudyPathRail } from "./flows/workspace/StudyPathRail";
import { StudySessionNotes } from "./flows/workspace/StudySessionNotes";
import { WorkspaceSessionLayout } from "./flows/workspace/WorkspaceSessionLayout";
import stylesWorkspace from "./flows/workspace/workspace.module.css";
import {
  firstWorkspaceSessionFixture,
  workspaceHomeProjection,
} from "./data/workspaceCatalog";
import {
  createInitialWorkspaceStateFromFixture,
  projectWorkspaceSession,
} from "./state/workspaceProjection";
import { workspaceSessionReducer } from "./state/workspaceReducer";
import { projectWorkspaceStudyNoteMetrics } from "./state/workspaceStudyMetrics";
import { createWorkspaceStudyNote } from "./state/workspaceStudySession";
import {
  readStoredStudyNotesState,
  writeStoredStudyNotesState,
} from "./state/workspaceStudyStorage";

export default function App() {
  type AppFlowStep = "home" | "onboarding" | "overview" | "session";
  const [flowStep, setFlowStep] = React.useState<AppFlowStep>("session");
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
  const currentStudyNoteTitle = workspaceProjection.selectedSource.title;
  const studyNoteMetrics = projectWorkspaceStudyNoteMetrics(workspaceState.studyNotes);

  React.useEffect(() => {
    writeStoredStudyNotesState({
      version: 2,
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

    const note = createWorkspaceStudyNote(noteBody, {
      courseTitle: workspaceState.studyCourseTitle,
      selectedNode: workspaceProjection.selectedNode,
      selectedMiniNode: workspaceProjection.selectedMiniNode,
      selectedSource: workspaceProjection.selectedSource,
      noteCount: workspaceState.studyNotes.length,
    });

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
          <WorkspaceSessionLayout
            leftRail={
              <StudyPathRail
                projection={workspaceProjection}
                state={workspaceState}
                dispatch={dispatchWorkspace}
                courseTitle={workspaceState.studyCourseTitle}
                notes={workspaceState.studyNotes}
                currentNoteTitle={currentStudyNoteTitle}
              />
            }
            mainSurface={
              <section className={stylesWorkspace.studyNotesWorkbench}>
                <StudySessionNotes
                  courseTitle={workspaceState.studyCourseTitle}
                  noteTitle={currentStudyNoteTitle}
                  noteDraft={workspaceState.studyNoteDraft}
                  notes={workspaceState.studyNotes}
                  metrics={studyNoteMetrics}
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
              </section>
            }
          />
        )}
      </WorkspaceShell>
    </main>
  );
}
