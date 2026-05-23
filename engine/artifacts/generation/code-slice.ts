import type {
  ConceptSlice,
  EvidenceInventoryEntry,
  EvidenceRef,
  ThinkingArtifact,
  UserOperationKind,
} from "../../runtime-deep-ownership.ts";
import { detectEvidenceRoleConflicts } from "./authority.ts";
import { resolveCreatedAt } from "./deterministic-clock.ts";
import {
  evidenceRefFromEntry,
  findBehaviorOracles,
  findPrimaryImplementation,
  formatEvidenceIdLabel,
  getConceptSliceEvidence,
} from "./evidence-helpers.ts";
import type { ArtifactGenerationOptions } from "./types.ts";

function buildCodeSlicePrompt(
  impl: EvidenceInventoryEntry,
  slice: ConceptSlice,
  roleConflict: { hasConflict: boolean },
): string {
  const base = `Examine the code in ${impl.path}. ` +
    `${slice.operation_target === "trace" ? "Trace" : "Explain"} how ` +
    `"${slice.label}" is implemented. ` +
    `Cite specific line numbers and evidence roles for every claim.`;

  if (roleConflict.hasConflict) {
    return base +
      ` Note: evidence from multiple roles exists for this concept. ` +
      `Resolve any contradictions by checking which evidence has higher authority ` +
      `(implementation over docs, tests over intent).`;
  }

  return base;
}

function buildCodeSliceSuccessCriteria(
  impl: EvidenceInventoryEntry,
  slice: ConceptSlice,
): string[] {
  const criteria = [
    `Identifies the main functions/symbols in ${impl.path} relevant to "${slice.label}"`,
    `Cites specific line ranges for each claim about the code`,
    `Explains the evidence role (${impl.role}) and why it is authoritative`,
  ];

  if (slice.behavior_evidence.length > 0) {
    criteria.push("Cross-references at least one behavior oracle (test) to validate understanding");
  }

  criteria.push(`Completes the ${slice.operation_target} operation with evidence-backed reasoning`);
  return criteria;
}

function extractSymbolNames(excerpt: string): string[] {
  const matches = excerpt.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) ?? [];
  const ignored = new Set(["the", "and", "for", "from", "with", "that", "this"]);
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const symbol of matches) {
    if (ignored.has(symbol.toLowerCase())) continue;
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    unique.push(symbol);
  }

  return unique.slice(0, 10);
}

export function generateCodeSliceArtifact(
  evidenceInventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
  options: ArtifactGenerationOptions = {},
): ThinkingArtifact {
  if (!Array.isArray(evidenceInventory) || evidenceInventory.length === 0) {
    throw new Error("Cannot generate code slice: evidence inventory is empty");
  }

  if (!conceptSlice.source_evidence || conceptSlice.source_evidence.length === 0) {
    throw new Error("Cannot generate code slice: concept slice has no source evidence");
  }

  const prefix = options.artifactIdPrefix ?? "TA-CS";
  const artifactId = `${prefix}-${conceptSlice.id}`;

  const primaryImpl = findPrimaryImplementation(evidenceInventory, conceptSlice);
  if (!primaryImpl) {
    throw new Error(
      `Cannot generate code slice: no implementation/source_truth evidence found in concept slice ${conceptSlice.id}`,
    );
  }

  const sliceEvidence = getConceptSliceEvidence(evidenceInventory, conceptSlice);
  const behaviorOracles = findBehaviorOracles(evidenceInventory, conceptSlice);

  const sourceEvidenceRefs: EvidenceRef[] = sliceEvidence.map((entry) => evidenceRefFromEntry(entry));
  const hiddenEvidenceRefs: EvidenceRef[] = [evidenceRefFromEntry(primaryImpl)];
  const roleConflict = detectEvidenceRoleConflicts(sourceEvidenceRefs);

  const ranges = [{
    start_line: 1,
    end_line: primaryImpl.line_count ?? 100,
    label: primaryImpl.excerpt.substring(0, 60),
    role: primaryImpl.role,
    evidence: [primaryImpl.id],
    is_inferred: false,
  }];

  const relatedTests = behaviorOracles.map((test) => ({
    file_path: test.path,
    start_line: 1,
    end_line: test.line_count ?? 100,
    label: test.excerpt.substring(0, 60),
    evidence: [test.id],
    is_inferred: false,
  }));

  const totalLines = primaryImpl.line_count ?? 100;
  const hiddenStart = Math.max(1, Math.floor(totalLines * 0.15));
  const hiddenEnd = Math.min(totalLines, Math.floor(totalLines * 0.85));
  const hiddenLines: number[] = [];
  for (let line = hiddenStart; line <= hiddenEnd; line++) hiddenLines.push(line);

  const operationKind: UserOperationKind = conceptSlice.operation_target;
  const operationPrompt = buildCodeSlicePrompt(primaryImpl, conceptSlice, roleConflict);
  const successCriteria = buildCodeSliceSuccessCriteria(primaryImpl, conceptSlice);

  const primaryIdLabel = formatEvidenceIdLabel(primaryImpl.id);
  const purposeText = roleConflict.hasConflict
    ? `Show the code region for ${primaryImpl.excerpt} (${primaryIdLabel}). ` +
      `Note: conflicting evidence roles detected — implementation authority overrides lower-ranked evidence. ` +
      `The operation target is ${conceptSlice.operation_target}.`
    : `Show the exact code region for ${primaryImpl.excerpt}. ` +
      `The user must ${conceptSlice.operation_target} the implementation, citing specific lines.`;

  const createdAt = resolveCreatedAt(options, {
    artifact_kind: "code_slice",
    concept_slice_id: conceptSlice.id,
    source_evidence_ids: sourceEvidenceRefs.map((ref) => ref.evidence_id),
    primary_path: primaryImpl.path,
    operation_kind: operationKind,
  });

  return {
    id: artifactId,
    kind: "code_slice",
    title: `Code Slice: ${primaryImpl.excerpt.substring(0, 50)}`,
    purpose: purposeText,
    concept_slice_id: conceptSlice.id,
    source_evidence: sourceEvidenceRefs,
    hidden_solution_evidence: hiddenEvidenceRefs,
    user_operation: {
      id: `OP-${artifactId}`,
      kind: operationKind,
      prompt: operationPrompt,
      artifact_ids: [artifactId],
      required_evidence: conceptSlice.source_evidence,
      allowed_hints: 3,
      blocked_shortcuts: [
        "cannot_answer_without_line_citations",
        "cannot_skip_evidence_role_explanation",
      ],
      success_criteria: successCriteria,
    },
    renderer: "code_slice",
    payload: {
      file_path: primaryImpl.path,
      ranges,
      collapsed_context: `Evidence inventory has ${evidenceInventory.length} entries. ` +
        `${behaviorOracles.length} test files serve as behavior oracles.`,
      related_tests: relatedTests,
      related_docs: [],
      selected_symbols: extractSymbolNames(primaryImpl.excerpt),
      hidden_lines: hiddenLines,
      prompt_focus: `How does ${conceptSlice.operation_target} the concept "${conceptSlice.label}" ` +
        `connect to the implementation in ${primaryImpl.path}?`,
    },
    success_criteria: successCriteria,
    created_at: createdAt,
  };
}
