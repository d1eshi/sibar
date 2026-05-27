export type WorkspaceSessionState = {
  selectedNodeId: string;
  selectedMiniNodeId: string;
  selectedSourceId: string;
  isReadinessPanelVisible: boolean;
  studyCourseTitle: string;
  studyNoteDraft: string;
  studyNotes: readonly WorkspaceStudyNote[];
};

export type WorkspaceStudyNote = {
  id: string;
  courseTitle: string;
  sessionTitle: string;
  nodeName: string;
  miniNodeQuestion: string;
  sourceTitle: string;
  createdAtIso: string;
  createdAtLabel: string;
  createdAtEpochMs: number;
  createdAtDateKey: string;
  iterationLabel: string;
  body: string;
};

export type WorkspaceSessionAction =
  | {
      type: "select_node";
      nodeId: string;
      miniNodeId: string;
      sourceId: string;
    }
  | {
      type: "select_mini_node";
      miniNodeId: string;
      sourceId: string;
    }
  | {
      type: "select_source";
      sourceId: string;
    }
  | {
      type: "toggle_readiness_panel";
    }
  | {
      type: "set_study_course_title";
      courseTitle: string;
    }
  | {
      type: "set_study_note_draft";
      noteDraft: string;
    }
  | {
      type: "add_study_note";
      note: WorkspaceStudyNote;
    };

export function workspaceSessionReducer(
  state: WorkspaceSessionState,
  action: WorkspaceSessionAction,
): WorkspaceSessionState {
  if (action.type === "select_node") {
    return {
      ...state,
      selectedNodeId: action.nodeId,
      selectedMiniNodeId: action.miniNodeId,
      selectedSourceId: action.sourceId,
    };
  }

  if (action.type === "select_mini_node") {
    return {
      ...state,
      selectedMiniNodeId: action.miniNodeId,
      selectedSourceId: action.sourceId,
    };
  }

  if (action.type === "select_source") {
    return {
      ...state,
      selectedSourceId: action.sourceId,
    };
  }

  if (action.type === "toggle_readiness_panel") {
    return {
      ...state,
      isReadinessPanelVisible: !state.isReadinessPanelVisible,
    };
  }

  if (action.type === "set_study_course_title") {
    return {
      ...state,
      studyCourseTitle: action.courseTitle,
    };
  }

  if (action.type === "set_study_note_draft") {
    return {
      ...state,
      studyNoteDraft: action.noteDraft,
    };
  }

  if (action.type === "add_study_note") {
    return {
      ...state,
      studyNoteDraft: "",
      studyNotes: [action.note, ...state.studyNotes],
    };
  }

  return state;
}
