import { stableFocusQuestionHash } from "../focus-question/index.ts";
import type { EvidencePackLike, FocusCandidate } from "../focus-question/index.ts";
import type {
  OwnershipPlannerDiagnostic,
  OwnershipUnit,
  OwnershipUnitKind,
} from "./contracts.ts";
import type { LargeFileHeuristicResult } from "./contracts.ts";

function normalizePath(path: string): string {
  return String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

function splitLines(value: string): string[] {
  if (value.length === 0) return [];
  return value.replace(/\r/g, "").split("\n");
}

type SegmentOwnershipUnitsInput = {
  evidencePack: EvidencePackLike;
  focusCandidates: FocusCandidate[];
  fileContents: Record<string, string>;
  heuristics: LargeFileHeuristicResult;
};

export type OwnershipUnitSegmentResult = {
  units: OwnershipUnit[];
  skippedUnits: OwnershipUnit[];
  diagnostics: OwnershipPlannerDiagnostic[];
  selectedFileLineCount: number;
};

const ORDERED_UNIT_KINDS: OwnershipUnitKind[] = [
  "architecture",
  "state",
  "effects_api",
  "rendering",
  "boundary",
  "repair_refactor",
  "imports",
  "misc",
];
const MAX_IMPORT_UNITS_PER_SELECTION = 2;

function candidateKind(candidate: FocusCandidate): OwnershipUnitKind {
  const lower = `${candidate.excerpt} ${candidate.title} ${candidate.symbol ?? ""}`.toLowerCase();
  if (candidate.kind === "component") return "rendering";
  if (candidate.kind === "route_handler") return "boundary";
  if (candidate.kind === "hook_state") return "state";
  if (candidate.kind === "api_call") return "effects_api";
  if (candidate.kind === "doc" || candidate.kind === "test") return "architecture";
  if (/\bimport\s+/.test(candidate.excerpt.toLowerCase())) return "imports";
  if (/\b(repair|refactor|uncertainty|debt|coupling|cleanup|fallback)\b/.test(lower)) return "repair_refactor";
  return "misc";
}

function unitSourceDiagnostic(unit: OwnershipUnit): OwnershipPlannerDiagnostic {
  return {
    code: "unit_source_skipped",
    severity: "warning",
    message: `Unit ${unit.id} has no direct candidate citations; evidence will be resolved from file-local excerpts.`,
    focusCandidateId: unit.focusCandidateId,
  };
}

function backlogDiagnostic(unsortedUnits: OwnershipUnit[], skippedUnits: OwnershipUnit[]): OwnershipPlannerDiagnostic {
  return {
    code: "unit_backlog",
    severity: "warning",
    message: `Large selected file produced ${unsortedUnits.length} ownership units; ${skippedUnits.length} moved to backlog.`,
    focusCandidateId: skippedUnits[0]?.focusCandidateId,
  };
}

function toUnit(candidate: FocusCandidate, kind: OwnershipUnitKind, chunkIndex: number): OwnershipUnit {
  const baseId = `${candidate.filePath}|${candidate.startLine}-${candidate.endLine}|${kind}|${chunkIndex}`;
  return {
    id: `ownership-unit:${stableFocusQuestionHash(baseId)}`,
    focusCandidateId: candidate.id,
    startLine: candidate.startLine,
    endLine: candidate.endLine,
    kind,
    citations: [...candidate.citations],
    evidenceIds: [...candidate.evidenceIds],
  };
}

function createImportFallbackUnits(fileLines: string[], filePath: string, candidates: FocusCandidate[]): FocusCandidate[] {
  if (candidates.some((candidate) => /\bimport\s+/.test(candidate.excerpt.toLowerCase()))) {
    return candidates;
  }

  const syntheticImports = fileLines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter((entry) => /^\s*import\s+/.test(entry.line))
    .slice(0, 1);

  if (syntheticImports.length === 0) return candidates;
  const importLine = syntheticImports[0]?.lineNumber ?? 1;
  return candidates.concat([{
    schema: "sibi-ui-focus-candidate.v1",
    id: `synthetic-import:${filePath}:${importLine}`,
    filePath,
    startLine: importLine,
    endLine: importLine,
    kind: "unknown",
    symbol: "imports",
    title: "imports",
    excerpt: fileLines[importLine - 1] ?? "",
    evidenceIds: [],
    citations: [],
    confidence: "observed",
    source: "manual_selection",
    ui: {
      priority: 2,
      displayRangeLabel: `line ${importLine}`,
      reason: "derived import boundary for planning",
    },
    deterministicSignals: ["synthetic-import"],
  }]);
}

function createTopLevelFallback(fileLines: string[], filePath: string): FocusCandidate[] {
  const first = fileLines.findIndex((line) => line.trim().length > 0);
  const firstLine = first === -1 ? 1 : first + 1;
  const lastLine = Math.min(fileLines.length, firstLine + 12);
  return [{
    schema: "sibi-ui-focus-candidate.v1",
    id: `synthetic-top:${filePath}:${firstLine}-${lastLine}`,
    filePath,
    startLine: firstLine,
    endLine: lastLine,
    kind: "unknown",
    symbol: "file architecture",
    title: "file architecture and ownership context",
    excerpt: fileLines.slice(firstLine - 1, lastLine).join("\n"),
    evidenceIds: [],
    citations: [],
    confidence: "observed",
    source: "manual_selection",
    ui: {
      priority: 1,
      displayRangeLabel: `lines ${firstLine}-${lastLine}`,
      reason: "fallback ownership context scope",
    },
    deterministicSignals: ["synthetic-architecture"],
  }];
}

function splitCandidateRange(candidate: FocusCandidate): FocusCandidate[] {
  const MAX_SPAN = 60;
  const span = candidate.endLine - candidate.startLine + 1;
  if (span <= MAX_SPAN) return [candidate];

  const splitCandidates: FocusCandidate[] = [];
  const baseEvidenceIds = [...candidate.evidenceIds];
  const baseCitations = [...candidate.citations];
  let cursor = candidate.startLine;
  while (cursor <= candidate.endLine) {
    const next = Math.min(candidate.endLine, cursor + MAX_SPAN - 1);
    splitCandidates.push({
      ...candidate,
      id: `${candidate.id}:chunk:${cursor}-${next}`,
      startLine: cursor,
      endLine: next,
      citations: baseCitations.length > 0
        ? baseCitations
        : [{
          evidenceId: `${candidate.id}:${cursor}-${next}`,
          filePath: candidate.filePath,
          startLine: cursor,
          endLine: next,
          symbol: candidate.symbol,
        }],
      evidenceIds: baseEvidenceIds.length > 0 ? baseEvidenceIds : [candidate.id],
      ui: {
        ...candidate.ui,
        displayRangeLabel: `lines ${cursor}-${next}`,
      },
    });
    cursor = next + 1;
  }
  return splitCandidates;
}

function limitUnitsWithImportCap(
  units: OwnershipUnit[],
  hardLimit: number,
  importCap: number,
): { selectedUnits: OwnershipUnit[]; skippedUnits: OwnershipUnit[] } {
  const selectedUnits: OwnershipUnit[] = [];
  const skippedUnits: OwnershipUnit[] = [];
  let importUnits = 0;

  for (const unit of units) {
    if (unit.kind === "imports" && importUnits >= importCap) {
      skippedUnits.push(unit);
      continue;
    }

    if (selectedUnits.length < hardLimit) {
      if (unit.kind === "imports") {
        importUnits += 1;
      }
      selectedUnits.push(unit);
      continue;
    }

    skippedUnits.push(unit);
  }

  return { selectedUnits, skippedUnits };
}

export function segmentOwnershipUnits(input: SegmentOwnershipUnitsInput): OwnershipUnitSegmentResult {
  const selectedFilePath = normalizePath(input.evidencePack.selectedFilePath);
  const fileText = input.fileContents[selectedFilePath] ?? "";
  const fileLines = splitLines(fileText);
  const baseCandidates = input.focusCandidates
    .filter((candidate) => normalizePath(candidate.filePath) === selectedFilePath)
    .filter((candidate) => candidate.startLine >= 1 && candidate.endLine >= candidate.startLine);

  const candidatesWithFallback = baseCandidates.length === 0
    ? createTopLevelFallback(fileLines, selectedFilePath)
    : createImportFallbackUnits(fileLines, selectedFilePath, baseCandidates);

  const buckets = new Map<OwnershipUnitKind, FocusCandidate[]>();
  for (const kind of ORDERED_UNIT_KINDS) {
    buckets.set(kind, []);
  }

  const expanded: FocusCandidate[] = [];
  for (const candidate of candidatesWithFallback) {
    const split = splitCandidateRange(candidate);
    expanded.push(...split);
  }

  for (const candidate of expanded) {
    const kind = candidateKind(candidate);
    const bucket = buckets.get(kind);
    if (bucket != null) {
      bucket.push(candidate);
    }
  }

  for (const bucket of buckets.values()) {
    bucket.sort((left, right) =>
      left.startLine - right.startLine || left.endLine - right.endLine || left.id.localeCompare(right.id),
    );
  }

  const orderedUnits: OwnershipUnit[] = [];
  let sequence = 0;
  for (const kind of ORDERED_UNIT_KINDS) {
    const bucket = buckets.get(kind) ?? [];
    for (const candidate of bucket) {
      orderedUnits.push(toUnit(candidate, kind, sequence++));
    }
  }

  const { selectedUnits, skippedUnits } = limitUnitsWithImportCap(
    orderedUnits,
    input.heuristics.isLargeFile ? 24 : 16,
    MAX_IMPORT_UNITS_PER_SELECTION,
  );
  const diagnostics: OwnershipPlannerDiagnostic[] = [];

  if (skippedUnits.length > 0) {
    diagnostics.push(backlogDiagnostic(orderedUnits, skippedUnits));
  }

  if (orderedUnits.length === 0) {
    const fallback: OwnershipUnit = {
      id: `ownership-unit:${selectedFilePath}:fallback-1`,
      focusCandidateId: `ownership-candidate:${selectedFilePath}:fallback`,
      startLine: 1,
      endLine: Math.max(1, Math.min(fileLines.length, 1)),
      kind: "architecture",
      citations: [],
      evidenceIds: [],
    };
    return {
      units: [fallback],
      skippedUnits: [],
      diagnostics: [{
        code: "unit_source_skipped",
        severity: "warning",
        message: `No usable candidate bounds were available for ${selectedFilePath}; using synthetic fallback unit.`,
      }],
      selectedFileLineCount: fileLines.length,
    };
  }

  return {
    units: selectedUnits,
    skippedUnits,
      diagnostics: [
        ...diagnostics,
        ...selectedUnits
          .filter((unit) => (unit.citations?.length ?? 0) === 0)
          .map(unitSourceDiagnostic),
      ],
    selectedFileLineCount: fileLines.length,
  };
}
