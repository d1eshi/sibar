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
  const title = reason ?? "";

  if (reason && nodeState !== "owned") {
    return {
      text: [labelForState(nodeState), makeReasonSnippet(reason)].filter(Boolean).join(" · "),
      title,
    };
  }

  return {
    text: [labelForState(nodeState)].filter(Boolean).join(" · "),
    ...(title.length === 0 ? {} : { title }),
  };
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
  const selectablePaths = React.useMemo(
    () => fileTreePaths.filter((path) => fileTreeNodeByPath[path]?.kind === "file"),
    [fileTreeNodeByPath, fileTreePaths],
  );

  React.useEffect(() => {
    const selectedNode = fileTreeNodeByPath[selectedPath];
    if (selectedNode?.kind !== "file") return;

    const selectedItem = model.getItem(selectedPath);
    if (selectedItem == null) return;

    const currentlySelectedPaths = model.getSelectedPaths();
    const isSingleSelection = currentlySelectedPaths.length === 1 && currentlySelectedPaths[0] === selectedPath;
    const isTargetSelected = currentlySelectedPaths.includes(selectedPath);

    if (!isSingleSelection) {
      for (const path of currentlySelectedPaths) {
        if (path === selectedPath) continue;
        model.getItem(path)?.deselect();
      }
    }

    if (!isTargetSelected) {
      selectedItem.select();
    }

    if (model.getFocusedPath() !== selectedPath) {
      selectedItem.focus();
    }

    model.scrollToPath(selectedPath, { focus: true, offset: "nearest" });
  }, [model, selectedPath, fileTreeNodeByPath]);

  return (
    <aside className="panel fileTreePanel">
      <header className="panelHeader">
        <span className="brand">Sibar</span>
        <p className="panelSub">Ownership Map</p>
      </header>
      <label className="treePathJump">
        <span>Review target</span>
        <select
          aria-label="Select review path"
          value={selectedPath}
          onChange={(event) => {
            onSelectFile(event.target.value);
          }}
        >
          {selectablePaths.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
      </label>
      <div className="treeHost">
        <FileTree model={model} style={{ height: "100%" }} />
      </div>
    </aside>
  );
}
