import { stableFocusQuestionHash } from "../focus-question/index.ts";
import type { EvidenceCitationLike, FocusCandidate } from "../focus-question/index.ts";
import type { LargeFileHeuristicResult } from "./contracts.ts";
import type { OwnershipUnit, PlannedOwnershipQuestion } from "./contracts.ts";

type BuildOwnershipQuestionPlanPromptInput = {
  fileContents: Record<string, string>;
  selectedFilePath: string;
  unit: OwnershipUnit;
  unitIndex: number;
  focusCandidatesById: Map<string, FocusCandidate>;
  heuristics: LargeFileHeuristicResult;
  generatedAt: string;
  providerId: string;
};

type PromptPhase = "architecture" | "file_role" | "focused_behavior" | "risk_edge" | "repair_refactor";

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

function lineLabel(startLine: number, endLine: number): string {
  return startLine === endLine ? `line ${startLine}` : `lines ${startLine}-${endLine}`;
}

function sanitizePrompt(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function phaseForIndex(index: number, unitKind: string): PromptPhase {
  if (unitKind === "architecture" || unitKind === "imports") return "architecture";
  if (unitKind === "repair_refactor") return "repair_refactor";
  const phases: PromptPhase[] = ["file_role", "focused_behavior", "risk_edge", "focused_behavior", "risk_edge"];
  return phases[index % phases.length];
}

function phaseTemplate(phase: PromptPhase, unit: OwnershipUnit, candidate?: FocusCandidate): string {
  const symbolHint = candidate?.symbol == null ? "" : ` (${candidate.symbol})`;
  if (phase === "architecture") {
    return `What ownership boundary does ${unit.startLine === unit.endLine ? `line ${unit.startLine}` : `lines ${unit.startLine}-${unit.endLine}`}`
      + `${symbolHint} establish in this selected file scope?`;
  }
  if (phase === "file_role") {
    return `What is the file role of ${unit.kind}${symbolHint} and how does it coordinate behavior with nearby local ranges?`;
  }
  if (phase === "focused_behavior") {
    return `Walk through the behavior in ${unit.kind}${symbolHint} and explain what ownership obligations this range implies locally.`;
  }
  if (phase === "risk_edge") {
    return `What are the nearest risk/edge cases at this range and what evidence would change that ownership judgment?`;
  }
  return `If this range is too coupled, what is the smallest repair/refactor or decoupling step you would attempt next?`;
}

function whyThisMattersFromPhase(phase: PromptPhase): string {
  if (phase === "architecture") return "This asks for local ownership boundaries before broad claims are made.";
  if (phase === "file_role") return "This confirms the selected local range has a coherent file responsibility.";
  if (phase === "focused_behavior") return "This forces concrete interpretation from visible code and local evidence.";
  if (phase === "risk_edge") return "This catches hidden assumptions before changes broaden scope.";
  return "This keeps coupling risk contained by requesting the smallest viable repair path.";
}

function answerPlaceholderFromPhase(phase: PromptPhase): string {
  if (phase === "repair_refactor") {
    return "Name one minimal repair/refactor and the exact evidence that justifies doing it next.";
  }
  return "Point to concrete file-local lines and explain ownership from that evidence.";
}

function fallbackCitationForScope(
  fileLines: string[],
  selectedFilePath: string,
  startLine: number,
  endLine: number,
): EvidenceCitationLike[] {
  const clippedStart = Math.max(1, Math.min(startLine, fileLines.length || 1));
  const clippedEnd = Math.max(clippedStart, Math.min(endLine, Math.max(fileLines.length, clippedStart)));
  return [{
    evidenceId: `synthetic:${selectedFilePath}:${clippedStart}-${clippedEnd}`,
    filePath: selectedFilePath,
    startLine: clippedStart,
    endLine: clippedEnd,
    symbol: `scope:${clippedStart}-${clippedEnd}`,
  }];
}

export function buildOwnershipQuestionPlanPrompt(
  input: BuildOwnershipQuestionPlanPromptInput,
): PlannedOwnershipQuestion {
  const selectedFilePath = normalizePath(input.selectedFilePath);
  const fileLines = splitLines(input.fileContents[selectedFilePath] ?? "");
  const candidate = input.focusCandidatesById.get(input.unit.focusCandidateId) ?? null;
  const phase = phaseForIndex(input.unitIndex, input.unit.kind);
  const heading = `${lineLabel(input.unit.startLine, input.unit.endLine)} in ${selectedFilePath}`;
  const baseText = `${heading}: ${phaseTemplate(phase, input.unit, candidate ?? undefined)}`
    .replace(/\s+/g, " ");
  const questionText = sanitizePrompt(baseText);

  const citations = candidate?.citations.length
    ? [...candidate.citations]
    : (input.unit.citations && input.unit.citations.length > 0
      ? [...input.unit.citations]
      : fallbackCitationForScope(fileLines, selectedFilePath, input.unit.startLine, input.unit.endLine));

  const evidenceIds = Array.from(new Set(citations.map((citation) => citation.evidenceId)));

  return {
    id: `question:${stableFocusQuestionHash(`${selectedFilePath}|${input.unit.id}|${input.unit.startLine}-${input.unit.endLine}|${phase}`)}`,
    batchId: `question-batch:${stableFocusQuestionHash(`${selectedFilePath}|${input.providerId}|${input.generatedAt}`)}`,
    schema: "sibi-ownership-question.v1",
    focusCandidateId: input.unit.focusCandidateId,
    phase,
    questionText,
    filePath: selectedFilePath,
    citations,
    evidenceIds,
    verifierDisposition: "accepted",
    whyThisMatters: whyThisMattersFromPhase(phase),
    answerPlaceholder: answerPlaceholderFromPhase(phase),
    selectedFilePath,
  };
}
