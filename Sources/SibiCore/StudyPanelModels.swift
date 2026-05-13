import Foundation

public struct StudyPanelSnapshot: Codable, Sendable {
    public let artifact_session: StudyPanelArtifactSession
    public let concept_graph: StudyPanelConceptGraph?
    public let active_autopsy_step: StudyPanelAutopsyStep?
    public let current_questions: [RuntimeQuestion]
    public let learning_gaps: [StudyPanelLearningGap]
    public let practice_challenges: [StudyPanelPracticeChallenge]
    public let memory_summary: StudyPanelMemorySummary
    public let readiness_report: StudyPanelReadinessReport
    public let evidence_index: [StudyPanelEvidenceEntry]
    public let operation_state: RuntimeOperationState
}

public struct StudyPanelArtifactSession: Codable, Sendable, Identifiable {
    public var id: String { artifact_session_id }
    public let artifact_session_id: String
    public let label: String
    public let root_path: String
    public let source_type: String
    public let learning_goal: String
    public let confidence: String
    public let included_paths: [String]
    public let excluded_paths: [String]
    public let created_at: String
}

public struct StudyPanelEvidenceCitation: Codable, Sendable, Hashable {
    public let file_path: String
    public let start_line: Int
    public let end_line: Int
    public let excerpt: String
}

public struct StudyPanelEvidenceEntry: Codable, Sendable, Identifiable {
    public var id: String { evidence_id }
    public let evidence_id: String
    public let source: String
    public let file_path: String
    public let start_line: Int
    public let end_line: Int
    public let excerpt: String
}

public struct StudyPanelConceptGraph: Codable, Sendable {
    public let artifact_session_id: String
    public let generated_at: String
    public let scope: StudyPanelConceptScope
    public let nodes: [StudyPanelConceptNode]
    public let edges: [StudyPanelConceptEdge]
}

public struct StudyPanelConceptScope: Codable, Sendable {
    public let root_path: String
    public let included_paths: [String]
    public let excluded_paths: [String]
}

public struct StudyPanelConceptNode: Codable, Sendable, Identifiable {
    public let id: String
    public let label: String
    public let kind: String
    public let source_paths: [String]
    public let why_it_matters: String
    public let prerequisite_concepts: [String]
    public let evidence: [StudyPanelEvidenceCitation]
}

public struct StudyPanelConceptEdge: Codable, Sendable, Identifiable {
    public let id: String
    public let from: String
    public let to: String
    public let relation: String
    public let label: String
    public let evidence: [StudyPanelEvidenceCitation]
}

public struct StudyPanelAutopsyStep: Codable, Sendable, Identifiable {
    public var id: String { autopsy_step_id }
    public let autopsy_step_id: String
    public let artifact_session_id: String
    public let session_id: String
    public let question_id: String
    public let target_type: String
    public let selected_id: String
    public let concept_id: String?
    public let edge_id: String?
    public let prompt: String
    public let bounded_evidence: [StudyPanelEvidenceCitation]
    public let evidence_basis: [String]
    public let next_action: String
    public let created_at: String
}

public struct StudyPanelLearningGap: Codable, Sendable, Identifiable {
    public let id: String
    public let artifact_session_id: String?
    public let session_id: String
    public let question_id: String
    public let concept_id: String
    public let concept_label: String
    public let expected_layer: Int
    public let observed_layer: Int
    public let observed_answer_or_uncertainty: String
    public let artifact_evidence: [StudyPanelEvidenceCitation]
    public let answer_evidence: [String]
    public let suspected_misconception: String
    public let severity: String
    public let confidence: String
    public let repair_action: String
    public let created_at: String
}

public struct StudyPanelPracticeChallenge: Codable, Sendable, Identifiable {
    public let id: String
    public let artifact_session_id: String
    public let session_id: String
    public let concept_id: String
    public let gap_id: String
    public let challenge_type: String
    public let prompt: String
    public let expected_evidence: [String]
    public let difficulty: String
    public let due_after: String
    public let revisit_after: String
    public let completion_state: String
    public let created_at: String
}

public struct StudyPanelMemorySummary: Codable, Sendable {
    public let artifact_session_id: String
    public let label: String
    public let root_path: String
    public let generated_at: String
    public let concept_states: [StudyPanelMemoryConcept]
    public let answer_history: [StudyPanelMemoryAnswer]
    public let gaps: [StudyPanelLearningGap]
    public let challenges: [StudyPanelPracticeChallenge]
    public let next_reviews: [StudyPanelMemoryReview]
}

public struct StudyPanelMemoryConcept: Codable, Sendable, Identifiable {
    public var id: String { concept_id }
    public let concept_id: String
    public let concept_label: String
    public let status: String
    public let confidence: String?
    public let expected_layer: Int?
    public let observed_layer: Int?
    public let evidence: [StudyPanelEvidenceCitation]
    public let last_answered_at: String?
    public let next_review_at: String?
    public let open_gap_ids: [String]
    public let challenge_ids: [String]
}

public struct StudyPanelMemoryAnswer: Codable, Sendable, Identifiable {
    public var id: String { answer_id }
    public let answer_id: String
    public let session_id: String
    public let question_id: String
    public let concept_id: String
    public let concept_label: String
    public let answer: String
    public let outcome: String
    public let confidence: String
    public let created_at: String
    public let evidence: [StudyPanelEvidenceCitation]
}

public struct StudyPanelMemoryReview: Codable, Sendable, Identifiable {
    public var id: String { challenge_id ?? gap_id ?? concept_id }
    public let concept_id: String
    public let concept_label: String
    public let next_review_at: String
    public let reason: String
    public let challenge_id: String?
    public let gap_id: String?
}

public struct StudyPanelReadinessReport: Codable, Sendable {
    public let artifact_session_id: String
    public let label: String
    public let generated_at: String
    public let summary: StudyPanelReadinessSummary
    public let ready_areas: [StudyPanelReadinessClaim]
    public let risky_areas: [StudyPanelReadinessClaim]
    public let verified_concepts: [StudyPanelVerifiedConceptClaim]
    public let open_gaps: [StudyPanelOpenGapClaim]
    public let practice_queue: [StudyPanelPracticeQueueClaim]
    public let recommended_next_action: StudyPanelRecommendedNextAction
    public let evidence_index: [StudyPanelReadinessEvidenceEntry]
}

public struct StudyPanelReadinessSummary: Codable, Sendable {
    public let readiness: String
    public let statement: String
    public let confidence: String
    public let evidence_ids: [String]
    public let unsupported: Bool?
}

public struct StudyPanelReadinessClaim: Codable, Sendable, Identifiable {
    public var id: String { claim_id }
    public let claim_id: String
    public let title: String
    public let claim: String
    public let readiness: String
    public let confidence: String
    public let evidence_ids: [String]
    public let unsupported: Bool?
}

public struct StudyPanelVerifiedConceptClaim: Codable, Sendable, Identifiable {
    public var id: String { claim_id }
    public let claim_id: String
    public let concept_id: String
    public let concept_label: String
    public let title: String
    public let claim: String
    public let readiness: String
    public let confidence: String
    public let evidence_ids: [String]
    public let unsupported: Bool?
}

public struct StudyPanelOpenGapClaim: Codable, Sendable, Identifiable {
    public var id: String { claim_id }
    public let claim_id: String
    public let gap_id: String
    public let concept_id: String
    public let concept_label: String
    public let title: String
    public let claim: String
    public let readiness: String
    public let confidence: String
    public let severity: String
    public let repair_action: String
    public let evidence_ids: [String]
    public let unsupported: Bool?
}

public struct StudyPanelPracticeQueueClaim: Codable, Sendable, Identifiable {
    public var id: String { claim_id }
    public let claim_id: String
    public let challenge_id: String
    public let gap_id: String
    public let concept_id: String
    public let title: String
    public let claim: String
    public let readiness: String
    public let confidence: String
    public let due_after: String
    public let revisit_after: String
    public let prompt: String
    public let evidence_ids: [String]
    public let unsupported: Bool?
}

public struct StudyPanelRecommendedNextAction: Codable, Sendable {
    public let claim_id: String
    public let title: String
    public let action: String
    public let claim: String
    public let readiness: String
    public let confidence: String
    public let evidence_ids: [String]
    public let unsupported: Bool?
}

public struct StudyPanelReadinessEvidenceEntry: Codable, Sendable, Identifiable {
    public var id: String { evidence_id }
    public let evidence_id: String
    public let source: String
    public let file_path: String
    public let start_line: Int
    public let end_line: Int
    public let excerpt: String
}
