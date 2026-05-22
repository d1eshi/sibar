import * as React from "react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import type { FileTreeRowDecoration } from "@pierre/trees";
import type { BoundaryState, TreeNode } from "../types";
import { getNodeReason, getNodeState, labelForState } from "../helpers";
import { makeReasonSnippet } from "../fileTreeReasonFormatting.ts";

interface FileTreePanelProps {
  fileTreePaths: string[];
  fileTreeNodeByPath: Record<string, TreeNode>;
  fileStates: Record<string, BoundaryState>;
  fileStateReasons?: Record<string, string>;
  selectedPath: string;
  onSelectFile: (path: string) => void;
}

function makeRowDecoration(
  node: TreeNode,
  fileStates: Record<string, BoundaryState>,
  fileStateReasons?: Record<string, string>,
): FileTreeRowDecoration {
  const nodeState = getNodeState(node, fileStates);
  const reason = getNodeReason(node, fileStates, fileStateReasons ?? {});

  if (reason && nodeState !== "owned") {
    return {
      text: `${labelForState(nodeState)} · ${makeReasonSnippet(reason)}`,
      title: reason,
    };
  }

  return { text: labelForState(nodeState) };
}

export function FileTreePanel({
  fileTreePaths,
  fileTreeNodeByPath,
  fileStates,
  fileStateReasons,
  selectedPath,
  onSelectFile,
}: FileTreePanelProps): React.ReactElement {
  const { model } = useFileTree({
    initialExpansion: "open",
    paths: fileTreePaths,
    initialSelectedPaths: [selectedPath],
    onSelectionChange: (selected) => {
      const first = selected[0];
      if (!first) return;
      const node = fileTreeNodeByPath[first];
      if (!node || node.kind !== "file") return;
      onSelectFile(first);
    },
    renderRowDecoration: (context) => {
      const node = fileTreeNodeByPath[context.item.path];
      if (!node) return null;

      return makeRowDecoration(node, fileStates, fileStateReasons);
    },
  });

  return (
    <aside className="panel fileTreePanel">
      <header className="panelHeader">
        <span className="brand">Sibi</span>
        <p className="panelSub">Ownership Map</p>
      </header>
      <div className="treeHost">
        <FileTree model={model} style={{ height: "100%" }} />
      </div>
    </aside>
  );
}
