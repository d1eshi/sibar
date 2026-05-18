import Foundation

public struct StartWorkspaceSessionPayload: Codable, Sendable {
    public let goal: String
    public let root: String
    public let codex_command: String

    public init(goal: String, root: String, codex_command: String = "auto") {
        self.goal = goal
        self.root = root
        self.codex_command = codex_command
    }

    private enum CodingKeys: String, CodingKey {
        case goal
        case root
        case root_path
        case codex_command
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        goal = try container.decode(String.self, forKey: .goal)
        root = try container.decodeIfPresent(String.self, forKey: .root)
            ?? container.decode(String.self, forKey: .root_path)
        codex_command = try container.decodeIfPresent(String.self, forKey: .codex_command) ?? "auto"
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(goal, forKey: .goal)
        try container.encode(root, forKey: .root)
        try container.encode(root, forKey: .root_path)
        try container.encode(codex_command, forKey: .codex_command)
    }
}

public enum SubmitWorkspaceAttemptAction: String, Codable, Sendable {
    case submit
    case i_do_not_know = "i_do_not_know"
}

public struct SubmitWorkspaceAttemptPayload: Codable, Sendable {
    public let workspace_session_id: String
    public let answer_text: String
    public let selected_evidence: [String]
    public let declared_confidence: String
    public let declared_unknowns: [String]
    public let action: SubmitWorkspaceAttemptAction

    public init(
        workspace_session_id: String,
        answer_text: String,
        selected_evidence: [String] = [],
        declared_confidence: String = "medium",
        declared_unknowns: [String] = [],
        action: SubmitWorkspaceAttemptAction = .submit
    ) {
        self.workspace_session_id = workspace_session_id
        self.answer_text = answer_text
        self.selected_evidence = selected_evidence
        self.declared_confidence = declared_confidence
        self.declared_unknowns = declared_unknowns
        self.action = action
    }
}

public struct StartWorkspaceSessionRunner: Codable, Sendable {
    public let status: String
    public let blocked_reason: String?
    public let model_runner: String?
    public let model_name: String?
    public let reasoning_effort: String?
    public let accepted_signal_count: Int?
    public let rejected_signal_count: Int?
}

public struct StartWorkspaceSessionWorkspaceState: Codable, Sendable {
    public let workspace_session_id: String
    public let artifact_session_id: String
    public let runner: StartWorkspaceSessionRunner
    public let loop: StartWorkspaceLoop?
    public let live_workspace: StartWorkspaceLiveSessionContract?
}

public struct StartWorkspaceSessionResult: Codable, Sendable {
    public let workspace_session: StartWorkspaceSessionWorkspaceState
    public let snapshot: StartWorkspaceSnapshot?
}

public struct StartWorkspaceLiveSessionContract: Codable, Sendable {
    public let session_id: String
    public let repo_root: String
    public let project_label: String
    public let source_control_summary: StartWorkspaceSourceControlSummary
    public let worktree: StartWorkspaceTreeSnapshot
    public let artifact_tree: StartWorkspaceTreeSnapshot
    public let selected: [String]
    public let excluded: [String]
    public let unknown: [String]
    public let artifact_previews: [StartWorkspaceArtifactPreview]
    public let required_evidence: [String]
    public let success_criteria: [String]
    public let current_prompt: String
    public let phase: String
    public let last_attempt_evaluation: StartWorkspaceAttemptEvaluationContract?
    public let next_action: String
    public let evidence: [StartWorkspaceEvidenceContract]
    public let submitted_attempt: StartWorkspaceSubmittedAttemptContract?
    public let ui_reproduction: StartWorkspaceUIReproductionContract
    public let active_operation: StartWorkspaceActiveOperation?
}

public struct StartWorkspaceSubmittedAttemptContract: Codable, Sendable {
    public let session_id: String
    public let operation_id: String
    public let slice_id: String?
    public let answer_text: String
    public let selected_evidence_ids: [String]
    public let confidence: String
    public let declared_unknowns: [String]
    public let action: String
}

public struct StartWorkspaceSourceControlSummary: Codable, Sendable {
    public let available: Bool
    public let branch: String?
    public let head: String?
    public let status_short: String
    public let diff_stat: String
    public let diff_name_status: String
}

public struct StartWorkspaceTreeSnapshot: Codable, Sendable {
    public let root_path: String
    public let paths: [String]
}

public struct StartWorkspaceArtifactPreview: Codable, Sendable {
    public let artifact_id: String
    public let path: String
    public let title: String
    public let artifact_type: String
    public let language: String?
    public let excerpt: String?
    public let slice_content: String?
    public let line_start: Int?
    public let line_end: Int?
    public let preview_fallback_reason: String?
    public let evidence_ids: [String]
}

public struct StartWorkspaceEvidenceContract: Codable, Sendable {
    public let evidence_id: String
    public let artifact_id: String
    public let path: String
    public let title: String
    public let line_range: StartWorkspaceLineRange
    public let location: String
    public let label: String
    public let excerpt: String
    public let required: Bool
    public let optional: Bool
}

public struct StartWorkspaceLineRange: Codable, Sendable {
    public let line_start: Int
    public let line_end: Int
}

public struct StartWorkspaceActiveOperation: Codable, Sendable {
    public let operation_id: String
    public let slice_id: String?
    public let operation_kind: String
    public let prompt: String
    public let required_evidence: [String]
    public let success_criteria: [String]
}

public struct StartWorkspaceAttemptContract: Codable, Sendable {
    public let session_id: String
    public let operation_id: String
    public let slice_id: String?
    public let answer_text: String
    public let selected_evidence_ids: [String]
    public let confidence: String
    public let declared_unknowns: [String]
    public let action: String
}

public struct StartWorkspaceAttemptEvaluationContract: Codable, Sendable {
    public let attempt_id: String
    public let evidence_check: StartWorkspaceAttemptEvidenceCheck
    public let missing_evidence: [String]
    public let detected_gap: StartWorkspaceDetectedGap?
    public let repair_action: StartWorkspaceRepairAction?
    public let reattempt_prompt: String
    public let scoped_readiness: StartWorkspaceScopedReadiness
    public let updated_workspace_session: StartWorkspaceWorkspaceSessionEquivalent?
}

public struct StartWorkspaceAttemptEvidenceCheck: Codable, Sendable {
    public let result: String
    public let required_claims: [String]
    public let observed_claims: [String]
    public let missing_claims: [String]
    public let contradicted_claims: [String]
    public let unsupported_claims: [String]
    public let cited_evidence: [StartWorkspaceEvidenceContract]
}

public struct StartWorkspaceDetectedGap: Codable, Sendable {
    public let kind: String
    public let severity: String
    public let blocks_readiness: Bool
}

public struct StartWorkspaceRepairAction: Codable, Sendable {
    public let id: String
    public let operation_kind: String
    public let prompt: String
    public let required_evidence: [String]?
}

public struct StartWorkspaceScopedReadiness: Codable, Sendable {
    public let status: String
    public let scope: String
    public let blocked_claims: [String]
}

public struct StartWorkspaceWorkspaceSessionEquivalent: Codable, Sendable {
    public let session_id: String
    public let phase: String
    public let next_action: String
}

public struct StartWorkspaceUIReproductionContract: Codable, Sendable {
    public let fixture_path: String?
    public let demo_path: String?
    public let test_path: String?
}

public struct StartWorkspaceSnapshot: Codable, Sendable {
    public let loop_state: String?
}

public struct StartWorkspaceEvidenceRef: Codable, Sendable {
    public let evidence_id: String
    public let file_path: String
    public let start_line: Int
    public let end_line: Int
    public let excerpt: String
    public let role: String?
}

public struct StartWorkspaceAttempt: Codable, Sendable {
    public let id: String
    public let operation_id: String
    public let answer_text: String
    public let selected_evidence: [String]
    public let declared_confidence: String
    public let declared_unknowns: [String]
}

public struct StartWorkspaceEvidenceCheck: Codable, Sendable {
    public let id: String
    public let attempt_id: String
    public let required_claims: [String]
    public let observed_claims: [String]
    public let missing_claims: [String]
    public let contradicted_claims: [String]
    public let unsupported_claims: [String]
    public let cited_evidence: [StartWorkspaceEvidenceRef]
    public let artifact_counterevidence: [StartWorkspaceEvidenceRef]
    public let result: String
}

public struct StartWorkspaceGap: Codable, Sendable {
    public let id: String
    public let kind: String
    public let severity: String
    public let blocks_readiness: Bool
}

public struct StartWorkspaceReadiness: Codable, Sendable {
    public let status: String
    public let scope: String
    public let blocked_claims: [String]
}

public struct StartWorkspaceLoop: Codable, Sendable {
    public let goal: String
    public let evidence_inventory: [StartWorkspaceEvidence]
    public let concept_slice: StartWorkspaceConceptSlice?
    public let thinking_artifacts: [StartWorkspaceArtifact]
    public let active_operation: StartWorkspaceOperation?
    public let sample_attempt: StartWorkspaceAttempt?
    public let evidence_check: StartWorkspaceEvidenceCheck?
    public let detected_gap: StartWorkspaceGap?
    public let repair_action: StartWorkspaceRepairAction?
    public let readiness_claim: StartWorkspaceReadiness?
}

public struct StartWorkspaceEvidence: Codable, Sendable, Identifiable {
    public let id: String
    public let path: String
    public let role: String
    public let excerpt: String?
    public let content_hash: String?
}

public struct StartWorkspaceConceptSlice: Codable, Sendable {
    public let label: String
    public let domain: String?
}

public struct StartWorkspaceOperation: Codable, Sendable {
    public let id: String
    public let kind: String
    public let prompt: String
    public let required_evidence: [String]
    public let success_criteria: [String]
}

public struct StartWorkspaceArtifact: Codable, Sendable, Identifiable {
    public let id: String
    public let kind: String
    public let title: String
    public let purpose: String
    public let source_evidence: [StartWorkspaceArtifactEvidence]
    public let payload: StartWorkspaceArtifactPayload?
}

public struct StartWorkspaceArtifactEvidence: Codable, Sendable {
    public let evidence_id: String
    public let file_path: String
    public let start_line: Int?
    public let end_line: Int?
    public let excerpt: String?
    public let role: String?
}

public struct StartWorkspaceArtifactPayload: Codable, Sendable {
    public let file_path: String?
    public let lines: [StartWorkspaceCodeLine]?
}

public struct StartWorkspaceCodeLine: Codable, Sendable, Identifiable {
    public var id: Int { line }
    public let line: Int
    public let text: String
}
