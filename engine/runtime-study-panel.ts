import { buildUnderstandingMemory } from "./memory/understanding-memory.ts";
import { buildReadinessReport, type ReadinessReport } from "./runtime-readiness.ts";
import { getArtifactSession, readState } from "./persistence/state.ts";
import type { RuntimeCodeSelection } from "./code-selection.ts";
import {
  now,
  toOperationState,
  type ArtifactSession,
  type AutopsyStep,
  type ConceptGraph,
  type EvidenceCitation,
  type LearningGap,
  type PracticeChallenge,
  type RuntimeQuestion,
  type RuntimeState,
  type RuntimeSuccess,
  type UnderstandingMemory,
} from "./runtime-support.ts";

export type StudyPanelEvidenceEntry = EvidenceCitation & {
  evidence_id: string;
  source:
    | "concept_graph"
    | "active_autopsy_step"
    | "learning_gap"
    | "practice_challenge"
    | "readiness_report";
};

export type StudyPanelSnapshot = {
  artifact_session: ArtifactSession;
  concept_graph: ConceptGraph | null;
  active_autopsy_step: AutopsyStep | null;
  active_code_selection: RuntimeCodeSelection | null;
  current_questions: RuntimeQuestion[];
  learning_gaps: LearningGap[];
  practice_challenges: PracticeChallenge[];
  memory_summary: UnderstandingMemory;
  readiness_report: ReadinessReport;
  evidence_index: StudyPanelEvidenceEntry[];
  operation_state: { message: string };
};

function activeQuestions(state: RuntimeState, artifactSession: ArtifactSession): RuntimeQuestion[] {
  const step = artifactSession.active_autopsy_step;
  if (!step) return [];
  return state.sessions[step.session_id]?.ownership_questions
    .filter((question) => question.question_id === step.question_id)
    ?? [];
}

function activeCodeSelection(state: RuntimeState, artifactSession: ArtifactSession): RuntimeCodeSelection | null {
  const step = artifactSession.active_autopsy_step;
  if (!step) return null;
  return state.sessions[step.session_id]?.code_selection ?? null;
}

function citationKey(citation: EvidenceCitation): string {
  return `${citation.file_path}\u0000${citation.start_line}\u0000${citation.end_line}\u0000${citation.excerpt}`;
}

function buildEvidenceIndex(input: {
  conceptGraph: ConceptGraph | null;
  activeAutopsyStep: AutopsyStep | null;
  learningGaps: LearningGap[];
  practiceChallenges: PracticeChallenge[];
  readinessReport: ReadinessReport;
}): StudyPanelEvidenceEntry[] {
  const entries: StudyPanelEvidenceEntry[] = [];
  const idsByKey = new Map<string, string>();

  function add(source: StudyPanelEvidenceEntry["source"], citations: EvidenceCitation[]): void {
    for (const citation of citations) {
      const key = citationKey(citation);
      if (idsByKey.has(key)) continue;
      const evidenceID = `SP${entries.length + 1}`;
      idsByKey.set(key, evidenceID);
      entries.push({ evidence_id: evidenceID, source, ...citation });
    }
  }

  add("concept_graph", input.conceptGraph?.nodes.flatMap((node) => node.evidence) ?? []);
  add("concept_graph", input.conceptGraph?.edges.flatMap((edge) => edge.evidence) ?? []);
  add("active_autopsy_step", input.activeAutopsyStep?.bounded_evidence ?? []);
  for (const gap of input.learningGaps) add("learning_gap", gap.artifact_evidence);
  for (const challenge of input.practiceChallenges) {
    const gap = input.learningGaps.find((entry) => entry.id === challenge.gap_id);
    if (gap) add("practice_challenge", gap.artifact_evidence);
  }
  add("readiness_report", input.readinessReport.evidence_index);

  return entries;
}

export function getStudyPanelStateCommand(payload: Record<string, unknown>): RuntimeSuccess<StudyPanelSnapshot> {
  const state = readState();
  const artifactSession = getArtifactSession(state, payload.artifact_session_id as string | undefined);
  const referenceTime = typeof payload.reference_time === "string" ? payload.reference_time : now();
  const conceptGraph = artifactSession.concept_graph ?? null;
  const learningGaps = [...(artifactSession.learning_gaps ?? [])];
  const practiceChallenges = [...(artifactSession.practice_challenges ?? [])];
  const readinessReport = artifactSession.readiness_reports?.at(-1)
    ?? buildReadinessReport(artifactSession, referenceTime);

  return {
    ok: true,
    data: {
      artifact_session: artifactSession,
      concept_graph: conceptGraph,
      active_autopsy_step: artifactSession.active_autopsy_step ?? null,
      active_code_selection: activeCodeSelection(state, artifactSession),
      current_questions: activeQuestions(state, artifactSession),
      learning_gaps: learningGaps,
      practice_challenges: practiceChallenges,
      memory_summary: buildUnderstandingMemory(artifactSession, referenceTime),
      readiness_report: readinessReport,
      evidence_index: buildEvidenceIndex({
        conceptGraph,
        activeAutopsyStep: artifactSession.active_autopsy_step ?? null,
        learningGaps,
        practiceChallenges,
        readinessReport,
      }),
      operation_state: toOperationState("Study panel snapshot projected from runtime-owned state."),
    },
  };
}
