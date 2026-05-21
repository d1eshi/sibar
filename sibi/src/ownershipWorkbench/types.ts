export type BoundaryState = "unvisited" | "attempted" | "owned" | "partial" | "gap" | "blocked" | "questionable";

export type TreeKind = "file" | "directory";

export type EvidenceConfidence = "observed" | "inferred" | "unverified" | "conflict";

export type ViewMode = "code" | "diff";

export type EvidenceRef = {
  id: string;
  title: string;
  detail: string;
  location: string;
  confidence: EvidenceConfidence;
};

export type WorkbenchLineKind = "ownership-boundary" | "evidence";

export type WorkbenchLineMetadata = {
  kind: WorkbenchLineKind;
  label: string;
  detail: string;
};

export type OwnershipBoundary = {
  id: string;
  title: string;
  filePath: string;
  startLine: number;
  endLine: number;
  whyMatters: string;
  prompt: string[];
  returnCondition: string;
};

export type LineSelection = {
  startLine: number;
  endLine: number;
  startSide?: "additions" | "deletions";
  endSide?: "additions" | "deletions";
};

export type TreeNode = {
  id: string;
  path: string;
  name: string;
  kind: TreeKind;
  state: BoundaryState;
  reason?: string;
  changes?: number;
  evidenceDensity?: number;
  children?: TreeNode[];
};

export type AttemptResult = {
  state: BoundaryState;
  summary: string;
  gapReason?: string;
  smallestRepair: string;
  returnCondition: string;
};

export type EvidenceByConfidence = Record<EvidenceConfidence, EvidenceRef[]>;
