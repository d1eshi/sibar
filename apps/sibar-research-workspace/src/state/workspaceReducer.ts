export type WorkspaceSessionActionKind = "read" | "code" | "recall";

export type WorkspaceSessionState = {
  selectedNodeId: string;
  selectedMiniNodeId: string;
  selectedSourceId: string;
  activeAction: WorkspaceSessionActionKind;
  isReadinessPanelVisible: boolean;
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
      type: "set_active_action";
      action: WorkspaceSessionActionKind;
    }
  | {
      type: "toggle_readiness_panel";
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
      activeAction: "read",
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

  if (action.type === "set_active_action") {
    return {
      ...state,
      activeAction: action.action,
    };
  }

  if (action.type === "toggle_readiness_panel") {
    return {
      ...state,
      isReadinessPanelVisible: !state.isReadinessPanelVisible,
    };
  }

  return state;
}
