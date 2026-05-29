import { stableFocusQuestionHash, type EvidencePackLike, type FocusCandidate } from "../focus-question/index.ts";
import type {
  BuildOwnershipQuestionPlanInput,
  OwnershipQuestionPlan,
  OwnershipUnit,
} from "./contracts.ts";
import { OWNERSHIP_QUESTION_PLAN_SCHEMA } from "./contracts.ts";
import { analyzeLargeFileHeuristics } from "./large-file-heuristics.ts";
import { segmentOwnershipUnits } from "./unit-segmentation.ts";
import { buildOwnershipQuestionPlanPrompt } from "./prompt-builder.ts";
import { verifyOwnershipQuestionPlan } from "./plan-verifier.ts";

function normalizePath(path: string): string {
  return String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

function buildBatchId(providerId: string, selectedFilePath: string, generatedAt: string, questionCount: number): string {
  return `question-batch:${stableFocusQuestionHash(`${providerId}|${selectedFilePath}|${generatedAt}|${questionCount}`)}`;
}

function buildSelectedEvidenceIds(evidencePack: EvidencePackLike, selectedFilePath: string): Set<string> {
  const evidenceIds = new Set<string>();
  for (const excerpt of evidencePack.excerpts) {
    if (normalizePath(excerpt.filePath) === selectedFilePath) {
      evidenceIds.add(excerpt.evidenceId);
    }
  }
  for (const symbol of evidencePack.symbols) {
    if (normalizePath(symbol.filePath) === selectedFilePath) {
      evidenceIds.add(symbol.evidenceId);
    }
  }
  return evidenceIds;
}

function unitEvidenceRank(unit: OwnershipUnit): number {
  const kindRisk = {
    architecture: 12,
    state: 22,
    effects_api: 24,
    rendering: 18,
    boundary: 16,
    repair_refactor: 26,
    imports: 4,
    misc: 10,
  };
  const span = Math.max(0, unit.endLine - unit.startLine);
  return (kindRisk[unit.kind as keyof typeof kindRisk] ?? 8) * 100 + span;
}

function selectedFileEvidenceBackedUnit(
  unit: OwnershipUnit,
  evidenceIds: Set<string>,
  selectedFilePath: string,
): OwnershipUnit | null {
  const evidenceBackedCitations = (unit.citations ?? []).filter((citation) =>
    normalizePath(citation.filePath) === selectedFilePath && evidenceIds.has(citation.evidenceId),
  );
  const evidenceBackedIds = (unit.evidenceIds ?? []).filter((id) => evidenceIds.has(id));
  if (evidenceBackedCitations.length === 0 && evidenceBackedIds.length === 0) return null;
  return {
    ...unit,
    citations: evidenceBackedCitations,
    evidenceIds: evidenceBackedIds,
  };
}

function buildRepairRefactorUnit(
  seed: OwnershipUnit,
  selectedFilePath: string,
  evidenceIds: Set<string>,
): OwnershipUnit | null {
  const evidenceBacked = selectedFileEvidenceBackedUnit(seed, evidenceIds, selectedFilePath);
  if (evidenceBacked == null) return null;
  return {
    ...evidenceBacked,
    id: `ownership-unit:${stableFocusQuestionHash(`${seed.focusCandidateId}|repair_refactor|${seed.startLine}-${seed.endLine}`)}`,
    kind: "repair_refactor",
  };
}

function selectRepairRefactorSeed(
  allUnits: OwnershipUnit[],
  evidenceIds: Set<string>,
  selectedFilePath: string,
  focusCandidatesById: Map<string, FocusCandidate>,
): OwnershipUnit | null {
  const evidenceBackedUnits = allUnits
    .map((unit) => selectedFileEvidenceBackedUnit(unit, evidenceIds, selectedFilePath))
    .filter((unit): unit is OwnershipUnit => unit != null);

  const explicitRepairUnits = evidenceBackedUnits
    .filter((unit) => unit.kind === "repair_refactor")
    .sort((left, right) => unitEvidenceRank(right) - unitEvidenceRank(left)
      || left.startLine - right.startLine);

  if (explicitRepairUnits.length > 0) {
    return explicitRepairUnits[0] ?? null;
  }

  const highestRiskUnit = evidenceBackedUnits
    .sort((left, right) => unitEvidenceRank(right) - unitEvidenceRank(left)
      || left.startLine - right.startLine)[0];

  if (highestRiskUnit == null) return null;

  const sourceCandidate = focusCandidatesById.get(highestRiskUnit.focusCandidateId);
  if (sourceCandidate == null) return buildRepairRefactorUnit(highestRiskUnit, selectedFilePath, evidenceIds);

  const sourceUnit: OwnershipUnit = {
    ...highestRiskUnit,
    focusCandidateId: sourceCandidate.id,
    startLine: sourceCandidate.startLine,
    endLine: sourceCandidate.endLine,
    citations: sourceCandidate.citations,
    evidenceIds: sourceCandidate.evidenceIds,
  };
  return buildRepairRefactorUnit(sourceUnit, selectedFilePath, evidenceIds);
}

function enforceRepairRefactorGate(
  selectedUnits: OwnershipUnit[],
  allUnits: OwnershipUnit[],
  selectedFilePath: string,
  evidenceIds: Set<string>,
  questionLimit: number,
  focusCandidatesById: Map<string, FocusCandidate>,
): OwnershipUnit[] {
  if (selectedUnits.some((unit) => unit.kind === "repair_refactor")) return selectedUnits;

  const repairSeed = selectRepairRefactorSeed(
    allUnits,
    evidenceIds,
    selectedFilePath,
    focusCandidatesById,
  );
  if (repairSeed == null) return selectedUnits;

  const plannedUnits = selectedUnits.slice(0, Math.min(selectedUnits.length, questionLimit));
  if (plannedUnits.length < questionLimit) {
    plannedUnits.push(repairSeed);
    return plannedUnits;
  }

  const replaceIndex = (() => {
    for (let index = plannedUnits.length - 1; index >= 0; index -= 1) {
      if (plannedUnits[index]?.kind === "imports") {
        return index;
      }
    }
    return plannedUnits.length - 1;
  })();

  plannedUnits[replaceIndex] = repairSeed;
  return plannedUnits;
}

export function buildOwnershipQuestionPlan(input: BuildOwnershipQuestionPlanInput): OwnershipQuestionPlan {
  const selectedFilePath = normalizePath(input.evidencePack.selectedFilePath);
  const heuristics = analyzeLargeFileHeuristics({
    evidencePack: input.evidencePack,
    focusCandidates: input.focusCandidates,
    fileContents: input.fileContents,
  });

  const useExpandedBudget = heuristics.isLargeFile || heuristics.isComposite;
  const smallFileMax = 6;
  const largeFileMax = 10;
  const defaultBudget = useExpandedBudget ? largeFileMax : smallFileMax;
  const requestedBudget = input.questionBudget == null ? defaultBudget : Math.max(1, input.questionBudget);
  const generationBudget = useExpandedBudget
    ? Math.min(largeFileMax, requestedBudget)
    : Math.min(smallFileMax, requestedBudget);

  const segmentation = segmentOwnershipUnits({
    evidencePack: input.evidencePack,
    focusCandidates: input.focusCandidates,
    fileContents: input.fileContents,
    heuristics,
  });

  const focusCandidatesById = new Map<string, FocusCandidate>();
  for (const candidate of input.focusCandidates) {
    focusCandidatesById.set(candidate.id, candidate);
  }

  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const providerId = input.providerId ?? "ownership-question-planner-local";
  const batchId = buildBatchId(providerId, selectedFilePath, generatedAt, generationBudget);

  const units = segmentation.units;
  const questionCountLimit = Math.max(1, Math.min(generationBudget, heuristics.maxQuestions, 10));
  const selectedEvidenceIds = buildSelectedEvidenceIds(input.evidencePack, selectedFilePath);
  const requiresRepairRefactorGate = heuristics.isLargeFile && heuristics.isComposite;
  const baseUnits = units.slice(0, Math.max(questionCountLimit, 1));
  const orderedUnits = requiresRepairRefactorGate
    ? enforceRepairRefactorGate(
      baseUnits,
      units,
      selectedFilePath,
      selectedEvidenceIds,
      questionCountLimit,
      focusCandidatesById,
    )
    : baseUnits;

  const questions = orderedUnits.map((unit, index) => {
    const question = buildOwnershipQuestionPlanPrompt({
      fileContents: input.fileContents,
      selectedFilePath,
      unit,
      unitIndex: index,
      focusCandidatesById,
      heuristics,
      generatedAt,
      providerId,
    });
    return { ...question, batchId };
  });

  const plan: OwnershipQuestionPlan = {
    schema: OWNERSHIP_QUESTION_PLAN_SCHEMA,
    providerId,
    generatedAt,
    selectedFilePath,
    units,
    questions,
    heuristics: {
      ...heuristics,
      maxQuestions: Math.min(heuristics.maxQuestions, 10),
    },
    verifierDisposition: "accepted",
    diagnostics: segmentation.diagnostics,
  };

  const verification = verifyOwnershipQuestionPlan({
    plan,
    evidencePack: input.evidencePack,
    fileContents: input.fileContents,
    maxQuestionBudget: generationBudget,
  });

  return {
    ...plan,
    verifierDisposition: verification.kind,
    questions: plan.questions,
    diagnostics: [...plan.diagnostics, ...verification.diagnostics.filter((entry) => entry.code === "unit_source_skipped")],
  };
}
