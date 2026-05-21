export type BoundaryState = "unvisited" | "attempted" | "owned" | "partial" | "gap" | "blocked" | "questionable";

export type TreeKind = "file" | "directory";

export type EvidenceConfidence = "observed" | "inferred" | "unverified" | "conflict";

export type ViewMode = "code" | "diff";

export type WorkbenchSurfaceMode = "default" | "lab";

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

export type ReviewQueueItem = {
  id: string;
  filePath: string;
  boundaryTitle: string;
  priority: 1 | 2 | 3 | 4 | 5;
  touched: boolean;
  orderReason: string;
  nextStep: string;
  state: BoundaryState;
};

export type OwnershipSessionGapReason = "no answer" | "inconclusive" | "could not connect caller/test";

export type OwnershipSessionObservation = {
  id: string;
  filePath: string;
  reason: OwnershipSessionGapReason;
  note: string;
};

export type OwnershipSessionQuestion = {
  id: string;
  filePath: string;
  title: string;
  prompt: string;
  intent: string;
  hintLadder: string[];
};

export type OwnershipSessionState = {
  currentIndex: number;
  isComplete: boolean;
  weakAttemptStreak: number;
  observations: OwnershipSessionObservation[];
  lastFeedback: string | null;
  showHintLadder: boolean;
};

export type OwnershipSessionAdvance =
  | {
      kind: "advanced";
      state: OwnershipSessionState;
      observation?: OwnershipSessionObservation;
    }
  | {
      kind: "complete";
      state: OwnershipSessionState;
      feedback: string;
      observation?: OwnershipSessionObservation;
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
