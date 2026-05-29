import type { RepoInventory } from "./repoInventoryTypes.ts";
import type { RepoSearchPayload } from "./repoSearchClient.ts";
import type { BoundaryState, TreeNode } from "./types.ts";

export const WORKBENCH_DATASET_SCHEMA = "sibi-workbench-dataset.v1";

export type WorkbenchDatasetDiagnostic = {
  code: "repo_search_out_of_inventory" | "repo_search_ready";
  severity: "info" | "warning";
  message: string;
  path?: string;
};

export type WorkbenchRepoSearchResult = {
  query: string;
  matches: Array<{
    path: string;
    line: number;
    excerpt: string;
    evidenceId: string;
  }>;
};

export type WorkbenchDataset = {
  schema: typeof WORKBENCH_DATASET_SCHEMA;
  mode: "live";
  sourceRoot: string;
  fileTreePaths: string[];
  fileTreeNodeByPath: Record<string, TreeNode>;
  fileStates: Record<string, BoundaryState>;
  fileStateReasons: Record<string, string>;
  repoSearch: WorkbenchRepoSearchResult[];
  diagnostics: WorkbenchDatasetDiagnostic[];
  selectedPath: string | null;
};

export type ProjectWorkbenchDatasetInput = {
  inventory: RepoInventory;
  repoSearches?: RepoSearchPayload[];
  selectedSourceRoot?: string;
  selectedPath?: string | null;
};

function normalizePath(path: string): string | null {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(part);
  }

  return parts.join("/");
}

function isInsideRoot(path: string, sourceRoot: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedRoot = normalizePath(sourceRoot);
  if (normalizedPath == null || normalizedRoot == null || normalizedRoot === "") return false;
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

function basename(path: string): string {
  const normalized = normalizePath(path);
  if (normalized == null) return "";
  const index = normalized.lastIndexOf("/");
  return index === -1 ? normalized : normalized.slice(index + 1);
}

function parentPath(path: string): string | null {
  const normalized = normalizePath(path);
  if (normalized == null) return null;
  const index = normalized.lastIndexOf("/");
  return index === -1 ? null : normalized.slice(0, index);
}

function makeDirectoryNode(path: string): TreeNode {
  return {
    id: path,
    path,
    name: basename(path),
    kind: "directory",
    state: "unvisited",
    children: [],
  };
}

function roleReason(role: RepoInventory["files"][number]["role"], lineCount: number): string {
  const lineLabel = lineCount === 1 ? "1 line" : `${lineCount} lines`;
  return `inventory: ${role} file, ${lineLabel}; ownership not evaluated yet.`;
}

function makeSearchEvidenceId(path: string, line: number, query: string): string {
  return `${path}:${line}-${line}:repo-search:${query}`;
}

function ensureDirectory(
  path: string,
  nodes: Record<string, TreeNode>,
): TreeNode {
  const normalized = normalizePath(path) ?? "";
  const existing = nodes[normalized];
  if (existing) return existing;

  const node = makeDirectoryNode(normalized);
  nodes[normalized] = node;

  const parent = parentPath(normalized);
  if (parent != null) {
    const parentNode = ensureDirectory(parent, nodes);
    parentNode.children = [...(parentNode.children ?? []), node];
  }

  return node;
}

function sortChildren(node: TreeNode): TreeNode {
  if (node.children == null) return node;

  node.children = node.children
    .map(sortChildren)
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === "directory" ? -1 : 1;
      }
      return left.path.localeCompare(right.path);
    });

  return node;
}

export function projectWorkbenchDataset({
  inventory,
  repoSearches = [],
  selectedSourceRoot = inventory.sourceRoot,
  selectedPath = null,
}: ProjectWorkbenchDatasetInput): WorkbenchDataset {
  const sourceRoot = normalizePath(selectedSourceRoot || inventory.sourceRoot) ?? normalizePath(inventory.sourceRoot) ?? "";
  const files = inventory.files
    .map((file) => {
      const normalizedPath = normalizePath(file.path);
      return normalizedPath == null ? null : { ...file, path: normalizedPath };
    })
    .filter((file): file is RepoInventory["files"][number] => file != null)
    .filter((file) => isInsideRoot(file.path, sourceRoot))
    .sort((left, right) => left.path.localeCompare(right.path));

  const fileTreeNodeByPath: Record<string, TreeNode> = {};
  ensureDirectory(sourceRoot, fileTreeNodeByPath);

  const fileTreePaths: string[] = [];
  const fileStates: Record<string, BoundaryState> = {};
  const fileStateReasons: Record<string, string> = {};
  const diagnostics: WorkbenchDatasetDiagnostic[] = [];

  for (const file of files) {
    const parent = parentPath(file.path);
    if (parent != null) {
      ensureDirectory(parent, fileTreeNodeByPath);
    }

    const node: TreeNode = {
      id: file.path,
      path: file.path,
      name: basename(file.path),
      kind: "file",
      state: "unvisited",
      reason: roleReason(file.role, file.lineCount),
    };

    fileTreeNodeByPath[file.path] = node;
    fileTreePaths.push(file.path);
    fileStates[file.path] = "unvisited";
    fileStateReasons[file.path] = node.reason ?? "inventory: ownership not evaluated yet.";

    if (parent != null) {
      const parentNode = ensureDirectory(parent, fileTreeNodeByPath);
      parentNode.children = [...(parentNode.children ?? []), node];
    }
  }

  const repoSearch: WorkbenchRepoSearchResult[] = repoSearches.map((search) => {
    const matches: WorkbenchRepoSearchResult["matches"] = [];

    for (const result of search.results) {
      const resultPath = normalizePath(result.path);
      if (resultPath == null || fileStates[resultPath] == null) {
        diagnostics.push({
          code: "repo_search_out_of_inventory",
          severity: "warning",
          message: `repo-search result '${result.path}' is outside the projected inventory and was ignored.`,
          path: result.path,
        });
        continue;
      }

      matches.push({
        path: resultPath,
        line: result.line,
        excerpt: result.excerpt,
        evidenceId: makeSearchEvidenceId(resultPath, result.line, search.query),
      });
    }

    if (matches.length > 0) {
      diagnostics.push({
        code: "repo_search_ready",
        severity: "info",
        message: `repo-search query '${search.query}' produced ${matches.length} in-scope textual matches.`,
      });
    }

    return {
      query: search.query,
      matches,
    };
  });

  const rootNode = fileTreeNodeByPath[sourceRoot];
  if (rootNode != null) {
    sortChildren(rootNode);
  }

  const normalizedSelectedPath = selectedPath == null ? null : normalizePath(selectedPath);
  const projectedSelectedPath =
    normalizedSelectedPath != null && fileStates[normalizedSelectedPath] != null
      ? normalizedSelectedPath
      : fileTreePaths[0] ?? null;

  return {
    schema: WORKBENCH_DATASET_SCHEMA,
    mode: "live",
    sourceRoot,
    fileTreePaths,
    fileTreeNodeByPath,
    fileStates,
    fileStateReasons,
    repoSearch,
    diagnostics,
    selectedPath: projectedSelectedPath,
  };
}
