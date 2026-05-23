import {
  fail,
  now,
  toOperationState,
  type ArtifactSession,
  type EvidenceCitation,
  type LearningGap,
  type PracticeChallenge,
  type RuntimeSuccess,
  type UnderstandingMemoryConcept,
} from "../runtime/contracts.ts";
import { buildUnderstandingMemory } from "../memory/understanding-memory.ts";
import { getArtifactSession, readState, writeState } from "../persistence/state.ts";

type ReadinessLevel =
  | "ready to inspect"
  | "ready to explain"
  | "ready to modify with guardrails"
  | "ready to own"
  | "not ready yet";

type ReadinessConfidence = "low" | "medium" | "high";

type EvidenceIndexEntry = EvidenceCitation & {
  evidence_id: string;
  source: "confirmed_concept" | "learning_gap" | "concept_graph";
};

type ReadinessClaim = {
  claim_id: string;
  title: string;
  claim: string;
  readiness: ReadinessLevel;
  confidence: ReadinessConfidence;
  evidence_ids: string[];
  unsupported?: true;
};

type VerifiedConceptClaim = ReadinessClaim & {
  concept_id: string;
  concept_label: string;
};

type OpenGapClaim = ReadinessClaim & {
  gap_id: string;
  concept_id: string;
  concept_label: string;
  severity: LearningGap["severity"];
  repair_action: string;
};

type PracticeQueueClaim = ReadinessClaim & {
  challenge_id: string;
  gap_id: string;
  concept_id: string;
  due_after: PracticeChallenge["due_after"];
  revisit_after: string;
  prompt: string;
};

type RecommendedNextAction = ReadinessClaim & {
  action: string;
};

export type ReadinessReport = {
  artifact_session_id: string;
  label: string;
  generated_at: string;
  summary: {
    readiness: ReadinessLevel;
    statement: string;
    confidence: ReadinessConfidence;
    evidence_ids: string[];
    unsupported?: true;
  };
  ready_areas: ReadinessClaim[];
  risky_areas: ReadinessClaim[];
  verified_concepts: VerifiedConceptClaim[];
  open_gaps: OpenGapClaim[];
  practice_queue: PracticeQueueClaim[];
  recommended_next_action: RecommendedNextAction;
  evidence_index: EvidenceIndexEntry[];
};

function citationKey(citation: EvidenceCitation): string {
  return [
    citation.file_path,
    citation.start_line,
    citation.end_line,
    citation.excerpt,
  ].join("\u0000");
}

function createEvidenceIndexer(): {
  add: (source: EvidenceIndexEntry["source"], citations: EvidenceCitation[]) => string[];
  entries: () => EvidenceIndexEntry[];
} {
  const idsByKey = new Map<string, string>();
  const entries: EvidenceIndexEntry[] = [];
  return {
    add(source, citations) {
      return citations.map((citation) => {
        const key = citationKey(citation);
        const existing = idsByKey.get(key);
        if (existing) return existing;
        const evidenceID = `E${entries.length + 1}`;
        idsByKey.set(key, evidenceID);
        entries.push({ evidence_id: evidenceID, source, ...citation });
        return evidenceID;
      });
    },
    entries() {
      return entries;
    },
  };
}

function levelForConcept(concept: UnderstandingMemoryConcept): ReadinessLevel {
  if (concept.status === "gap_open" || concept.status === "unseen") return "not ready yet";
  if ((concept.observed_layer ?? 0) >= 5 && concept.confidence === "high") return "ready to own";
  if ((concept.observed_layer ?? 0) >= 4) return "ready to modify with guardrails";
  if ((concept.observed_layer ?? 0) >= 2) return "ready to explain";
  return "ready to inspect";
}

function claimWithEvidence<T extends ReadinessClaim>(claim: T): T | undefined {
  return claim.evidence_ids.length > 0 ? claim : undefined;
}

export function buildReadinessReport(artifactSession: ArtifactSession, referenceTime: string): ReadinessReport {
  const memory = buildUnderstandingMemory(artifactSession, referenceTime);
  const evidence = createEvidenceIndexer();
  const gapByID = new Map(memory.gaps.map((gap) => [gap.id, gap]));

  const verifiedConcepts = memory.concept_states
    .filter((concept) => concept.status === "confirmed" || concept.status === "needs_review")
    .map((concept): VerifiedConceptClaim | undefined => claimWithEvidence({
      claim_id: `verified-${concept.concept_id}`,
      concept_id: concept.concept_id,
      concept_label: concept.concept_label,
      title: concept.concept_label,
      claim: `${concept.concept_label} is ${levelForConcept(concept)} based on a confirmed answer and cited artifact evidence.`,
      readiness: levelForConcept(concept),
      confidence: concept.confidence ?? "medium",
      evidence_ids: evidence.add("confirmed_concept", concept.evidence),
    }))
    .filter((claim): claim is VerifiedConceptClaim => Boolean(claim));

  const readyAreas = verifiedConcepts.map((concept) => ({
    claim_id: `ready-${concept.concept_id}`,
    title: concept.title,
    claim: concept.claim,
    readiness: concept.readiness,
    confidence: concept.confidence,
    evidence_ids: concept.evidence_ids,
  }));

  const openGaps = memory.gaps
    .map((gap): OpenGapClaim | undefined => claimWithEvidence({
      claim_id: `gap-${gap.id}`,
      gap_id: gap.id,
      concept_id: gap.concept_id,
      concept_label: gap.concept_label,
      title: gap.concept_label,
      claim: `${gap.concept_label} is not ready yet because the latest answer showed: ${gap.suspected_misconception}`,
      readiness: "not ready yet",
      confidence: gap.confidence,
      severity: gap.severity,
      repair_action: gap.repair_action,
      evidence_ids: evidence.add("learning_gap", gap.artifact_evidence),
    }))
    .filter((claim): claim is OpenGapClaim => Boolean(claim));

  const riskyAreas = [
    ...openGaps.map((gap): ReadinessClaim => ({
      claim_id: `risk-${gap.gap_id}`,
      title: gap.title,
      claim: `Do not modify ${gap.concept_label} without guardrails until this gap is repaired.`,
      readiness: "not ready yet",
      confidence: gap.confidence,
      evidence_ids: gap.evidence_ids,
    })),
    ...memory.concept_states
      .filter((concept) => concept.status === "needs_review")
      .map((concept): ReadinessClaim | undefined => claimWithEvidence({
        claim_id: `review-risk-${concept.concept_id}`,
        title: concept.concept_label,
        claim: `${concept.concept_label} needs review before treating it as durable ownership.`,
        readiness: levelForConcept(concept),
        confidence: concept.confidence ?? "medium",
        evidence_ids: evidence.add("confirmed_concept", concept.evidence),
      }))
      .filter((claim): claim is ReadinessClaim => Boolean(claim)),
  ];

  const practiceQueue = memory.challenges
    .filter((challenge) => challenge.completion_state === "pending")
    .map((challenge): PracticeQueueClaim | undefined => {
      const gap = gapByID.get(challenge.gap_id);
      return gap && claimWithEvidence({
        claim_id: `practice-${challenge.id}`,
        challenge_id: challenge.id,
        gap_id: challenge.gap_id,
        concept_id: challenge.concept_id,
        title: gap.concept_label,
        claim: `Practice is queued for ${gap.concept_label} to repair gap ${gap.id}.`,
        readiness: "not ready yet",
        confidence: gap.confidence,
        due_after: challenge.due_after,
        revisit_after: challenge.revisit_after,
        prompt: challenge.prompt,
        evidence_ids: evidence.add("learning_gap", gap.artifact_evidence),
      });
    })
    .filter((claim): claim is PracticeQueueClaim => Boolean(claim));

  const nextSource = practiceQueue[0] ?? openGaps[0] ?? readyAreas[0];
  const recommendedNextAction: RecommendedNextAction = nextSource
    ? {
      claim_id: "next-action",
      title: "Recommended next action",
      action: practiceQueue[0]?.prompt ?? openGaps[0]?.repair_action ?? `Explain ${readyAreas[0].title} again without looking.`,
      claim: practiceQueue[0]
        ? `Start the queued practice for ${practiceQueue[0].title}.`
        : openGaps[0]
          ? `Repair the open gap in ${openGaps[0].title}.`
          : `Reinforce ${readyAreas[0].title} before expanding scope.`,
      readiness: nextSource.readiness,
      confidence: nextSource.confidence,
      evidence_ids: nextSource.evidence_ids,
    }
    : {
      claim_id: "next-action",
      title: "Recommended next action",
      action: "Create a concept graph, answer an autopsy prompt, and generate evidence before judging readiness.",
      claim: "No supported readiness action can be projected yet.",
      readiness: "not ready yet",
      confidence: "low",
      evidence_ids: [],
      unsupported: true,
    };
  const summaryEvidenceIDs = [...new Set([
    ...openGaps.flatMap((gap) => gap.evidence_ids),
    ...readyAreas.flatMap((area) => area.evidence_ids),
  ])];

  return {
    artifact_session_id: artifactSession.artifact_session_id,
    label: artifactSession.label,
    generated_at: now(),
    summary: {
      readiness: openGaps.length > 0 ? "not ready yet" : readyAreas[0]?.readiness ?? "not ready yet",
      statement: openGaps.length > 0
        ? `${openGaps.length} open gap(s) keep this artifact from being ready to own.`
        : readyAreas.length > 0
          ? `${readyAreas.length} area(s) have supported readiness claims.`
          : "No supported readiness claims are available yet.",
      confidence: openGaps[0]?.confidence ?? readyAreas[0]?.confidence ?? "low",
      evidence_ids: summaryEvidenceIDs,
      ...(summaryEvidenceIDs.length === 0 ? { unsupported: true as const } : {}),
    },
    ready_areas: readyAreas,
    risky_areas: riskyAreas,
    verified_concepts: verifiedConcepts,
    open_gaps: openGaps,
    practice_queue: practiceQueue,
    recommended_next_action: recommendedNextAction,
    evidence_index: evidence.entries(),
  };
}

function refs(ids: string[]): string {
  return ids.length > 0 ? ids.map((id) => `[${id}]`).join(" ") : "[unsupported]";
}

function claimLine(claim: ReadinessClaim): string {
  return `- ${claim.title}: ${claim.claim} ${refs(claim.evidence_ids)}`;
}

function markdownReport(report: ReadinessReport): string {
  return [
    `# Readiness Report: ${report.label}`,
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Summary",
    "",
    `- ${report.summary.statement} ${refs(report.summary.evidence_ids)}`,
    `- Overall readiness: ${report.summary.readiness}`,
    "",
    "## Ready Areas",
    "",
    ...(report.ready_areas.length > 0 ? report.ready_areas.map(claimLine) : ["- None with evidence yet."]),
    "",
    "## Risky Areas",
    "",
    ...(report.risky_areas.length > 0 ? report.risky_areas.map(claimLine) : ["- None with evidence yet."]),
    "",
    "## Verified Concepts",
    "",
    ...(report.verified_concepts.length > 0 ? report.verified_concepts.map(claimLine) : ["- None with evidence yet."]),
    "",
    "## Open Gaps",
    "",
    ...(report.open_gaps.length > 0 ? report.open_gaps.map((gap) =>
      `- ${gap.concept_label}: ${gap.repair_action} ${refs(gap.evidence_ids)}`,
    ) : ["- None with evidence yet."]),
    "",
    "## Practice Queue",
    "",
    ...(report.practice_queue.length > 0 ? report.practice_queue.map((challenge) =>
      `- ${challenge.title}: ${challenge.prompt} Due ${challenge.due_after}. ${refs(challenge.evidence_ids)}`,
    ) : ["- None with evidence yet."]),
    "",
    "## Recommended Next Action",
    "",
    `- ${report.recommended_next_action.action} ${refs(report.recommended_next_action.evidence_ids)}`,
    "",
    "## Evidence Index",
    "",
    ...(report.evidence_index.length > 0 ? report.evidence_index.map((entry) =>
      `- [${entry.evidence_id}] ${entry.file_path}:${entry.start_line}-${entry.end_line} (${entry.source}) ${entry.excerpt}`,
    ) : ["- No evidence indexed."]),
    "",
  ].join("\n");
}

export function readinessReportCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  artifact_session_id: string;
  readiness_report: ReadinessReport;
  markdown?: string;
  operation_state: { message: string };
}> {
  const state = readState();
  const artifactSession = getArtifactSession(state, payload.artifact_session_id as string | undefined);
  const format = (payload.format ?? "both") as string;
  if (!["json", "markdown", "both"].includes(format)) {
    fail("invalid_payload", "readiness_report format must be json, markdown, or both.");
  }

  const referenceTime = typeof payload.reference_time === "string" ? payload.reference_time : now();
  const report = buildReadinessReport(artifactSession, referenceTime);
  artifactSession.readiness_reports = [...(artifactSession.readiness_reports ?? []), report].slice(-5);
  writeState(state);

  return {
    ok: true,
    data: {
      artifact_session_id: artifactSession.artifact_session_id,
      readiness_report: report,
      ...(format === "markdown" || format === "both" ? { markdown: markdownReport(report) } : {}),
      operation_state: toOperationState("Readiness report generated from persisted understanding memory."),
    },
  };
}
