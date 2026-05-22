export type RepoInventoryFileRole = "source" | "test" | "doc" | "config" | "unknown";

export type RepoInventoryFile = {
  path: string;
  extension: string;
  sizeBytes: number;
  lineCount: number;
  role: RepoInventoryFileRole;
  excerpt: string;
};

export type RepoInventoryTreeNode = {
  path: string;
  kind: "directory" | "file";
  fileCount: number;
  totalSizeBytes: number;
  children?: RepoInventoryTreeNode[];
};

export type RepoInventory = {
  sourceRoot: string;
  generatedAt: string;
  files: RepoInventoryFile[];
  tree: RepoInventoryTreeNode;
};

export type RepoInventoryRuntimeOptions = {
  generatedAt?: string;
  sourceRootLabel?: string;
  skipNames?: string[];
  maxFileSizeBytes?: number;
};

export type RepoInventoryStatus =
  | {
      kind: "loading";
    }
  | {
      kind: "ready";
      inventory: RepoInventory;
    }
  | {
      kind: "unavailable";
      reason: string;
    };
