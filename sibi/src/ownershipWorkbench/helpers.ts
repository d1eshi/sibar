import type {
  BoundaryState,
  EvidenceByConfidence,
  EvidenceConfidence,
  EvidenceRef,
  LineSelection,
  OwnershipBoundary,
  TreeNode,
} from "./types";

const lineBoundaryByConfidence: Record<
  EvidenceConfidence,
  (acc: EvidenceByConfidence, entry: EvidenceRef) => EvidenceRef[]
> = {
  observed: (acc, entry) => {
    acc.observed.push(entry);
    return acc.observed;
  },
  inferred: (acc, entry) => {
    acc.inferred.push(entry);
    return acc.inferred;
  },
  unverified: (acc, entry) => {
    acc.unverified.push(entry);
    return acc.unverified;
  },
  conflict: (acc, entry) => {
    acc.conflict.push(entry);
    return acc.conflict;
  },
};

export const ownershipStatePriority: BoundaryState[] = [
  "blocked",
  "gap",
  "questionable",
  "partial",
  "attempted",
  "unvisited",
  "owned",
];

export function labelForState(state: BoundaryState): string {
  return state === "owned"
    ? "owned"
    : state === "questionable"
      ? "questionable"
      : state === "unvisited"
        ? "unvisited"
        : state === "attempted"
          ? "attempted"
          : state === "partial"
            ? "partial"
            : state === "gap"
              ? "gap"
              : "blocked";
}

export function getNodeState(node: TreeNode, fileStates: Record<string, BoundaryState>): BoundaryState {
  if (node.kind === "file") {
    return fileStates[node.path] ?? node.state;
  }

  const children = node.children ?? [];
  const childStates = children.map((child) => getNodeState(child, fileStates));

  for (const state of ownershipStatePriority) {
    if (state === "owned") continue;
    if (childStates.includes(state)) {
      return state;
    }
  }

  return "owned";
}

export function getNodeReason(node: TreeNode, fileStates: Record<string, BoundaryState>): string | undefined {
  if (node.kind === "file") {
    return fileStates[node.path] === "owned" ? undefined : node.reason;
  }

  const children = node.children ?? [];
  const firstProblem = children.find((child) => getNodeState(child, fileStates) !== "owned");
  if (!firstProblem) return undefined;
  return getNodeReason(firstProblem, fileStates);
}

export function getActiveBoundaryState(
  fileStates: Record<string, BoundaryState>,
  boundary: OwnershipBoundary,
): BoundaryState {
  return fileStates[boundary.filePath] ?? "unvisited";
}

export function withBoundaryFileState(
  fileStates: Record<string, BoundaryState>,
  boundary: OwnershipBoundary,
  state: BoundaryState,
): Record<string, BoundaryState> {
  return {
    ...fileStates,
    [boundary.filePath]: state,
  };
}

export function isInBoundary(filePath: string, lineNumber: number, boundary: OwnershipBoundary): boolean {
  if (filePath !== boundary.filePath) return false;
  return lineNumber >= boundary.startLine && lineNumber <= boundary.endLine;
}

export function evidenceForLine(
  evidence: EvidenceRef[],
  filePath: string,
  lineNumber: number,
): boolean {
  return evidence.some((entry) => {
    if (!entry.location.startsWith(filePath)) return false;
    const match = /\:(\d+)-(\d+)$/.exec(entry.location);
    if (!match) return false;
    const start = Number.parseInt(match[1], 10);
    const end = Number.parseInt(match[2], 10);
    return lineNumber >= start && lineNumber <= end;
  });
}

export function getEvidenceLineRange(entry: EvidenceRef): { filePath: string; startLine: number; endLine: number } | null {
  const match = /^(.*):(\d+)-(\d+)$/.exec(entry.location);
  if (!match) return null;

  return {
    filePath: match[1],
    startLine: Number.parseInt(match[2], 10),
    endLine: Number.parseInt(match[3], 10),
  };
}

export function evidenceOverlapsRange(
  entry: EvidenceRef,
  filePath: string,
  startLine: number,
  endLine: number,
): boolean {
  const lineRange = getEvidenceLineRange(entry);
  if (!lineRange || lineRange.filePath !== filePath) return false;
  return lineRange.startLine <= endLine && lineRange.endLine >= startLine;
}

export function evidenceForSelection(
  evidence: EvidenceRef[],
  filePath: string,
  selection: LineSelection | null,
): EvidenceRef[] {
  if (!selection) return [];
  const startLine = Math.min(selection.startLine, selection.endLine);
  const endLine = Math.max(selection.startLine, selection.endLine);
  return evidence.filter((entry) => evidenceOverlapsRange(entry, filePath, startLine, endLine));
}

export function getLineSelectionText(selection: LineSelection | null): string {
  if (!selection) return "No lines selected.";
  const startLine = selection.startLine;
  const endLine = selection.endLine;
  const isRange = startLine !== endLine;
  const sideText = (side?: "additions" | "deletions") =>
    side === "deletions" ? "old file" : side === "additions" ? "new file" : undefined;

  const startSide = sideText(selection.startSide);
  const endSide = sideText(selection.endSide);
  const rangeLabel =
    isRange && startSide && endSide && startSide === endSide
      ? `${startLine} to ${endLine} (${startSide})`
      : isRange && startSide && endSide
        ? `${startLine}→${endLine} (${startSide}→${endSide})`
        : isRange
          ? `${startLine}→${endLine}`
          : `${startLine}`;

  return `${isRange ? "Lines" : "Line"} ${rangeLabel} selected.`;
}

export function groupedEvidence(entries: EvidenceRef[]): EvidenceByConfidence {
  return entries.reduce(
    (acc, entry) => {
      lineBoundaryByConfidence[entry.confidence](acc, entry);
      return acc;
    },
    {
      observed: [],
      inferred: [],
      unverified: [],
      conflict: [],
    } as EvidenceByConfidence,
  );
}

export function evaluateAttempt(attempt: string, boundary: OwnershipBoundary): {
  state: BoundaryState;
  summary: string;
  gapReason?: string;
  smallestRepair: string;
  returnCondition: string;
} {
  const normalized = attempt.toLowerCase();
  const hasNullBranch = normalized.includes("204") || normalized.includes("null");
  const hasCaller = normalized.includes("call") || normalized.includes("consumer");
  const hasFailure = normalized.includes("throws") || normalized.includes("failure") || normalized.includes("unauthenticated");

  if (hasNullBranch && hasCaller && hasFailure) {
    return {
      state: "owned",
      summary: "Ownership demonstrated with boundary-level framing and caller constraints.",
      smallestRepair: "No repair needed.",
      returnCondition: boundary.returnCondition,
    };
  }

  if (hasNullBranch && hasCaller) {
    return {
      state: "partial",
      summary: "Partial ownership: boundary exists, but failure mode missing.",
      gapReason: "Attempt explained the null path but omitted what guarantees caller safety when auth checks fail.",
      smallestRepair: "Add one sentence about the caller behavior when `session === null`.",
      returnCondition: boundary.returnCondition,
    };
  }

  return {
    state: "gap",
    summary: "Gap remains: prompt was attempted but did not prove ownership contract.",
    gapReason: "No direct evidence was tied to the authentication failure path.",
    smallestRepair: "Show how API consumers must branch on `null` and prevent privileged calls.",
    returnCondition: boundary.returnCondition,
  };
}
