import Foundation

public struct RuntimeCommandRequest<Payload: Encodable>: Encodable {
    public let command: String
    public let payload: Payload

    public init(command: String, payload: Payload) {
        self.command = command
        self.payload = payload
    }
}

public struct RuntimeEnvelope<DataType: Decodable>: Decodable {
    public let ok: Bool
    public let data: DataType?
    public let error: RuntimeErrorPayload?
}

public struct RuntimeErrorPayload: Decodable, Error {
    public let code: String
    public let message: String
}

public struct RuntimeOperationState: Codable, Sendable {
    public let message: String
}

public struct RuntimeDeclaredIntent: Codable, Sendable {
    public let intent_id: String
    public let created_at: String
    public let project_label: String
    public let project_path: String?
    public let statement: String
    public let uncertainty: String
    public let expected_work_area: String?
    public let desired_help: String
}

public struct RuntimeSignal: Codable, Sendable, Identifiable {
    public var id: String { signal_id }
    public let signal_id: String
    public let created_at: String
    public let source: String
    public let project_label: String
    public let project_path: String?
    public let concept_or_area: String
    public let reason: String
    public let evidence: [String]
    public let severity: String
    public let confidence: String
}

public struct RuntimeQuestion: Codable, Sendable, Identifiable {
    public var id: String { question_id }
    public let question_id: String
    public let created_at: String
    public let session_id: String
    public let prompt: String
    public let target_area: String
    public let why_it_matters: String
    public let evidence_basis: [String]
    public let answer_style: String
    public let detected_layer: Int
    public let required_layer: Int
    public let answer: String?
    public let answer_quality: String?
}

public struct RuntimeCodeSelection: Codable, Sendable, Equatable {
    public let file_path: String
    public let project_path: String?
    public let language: String
    public let start_line: Int
    public let end_line: Int
    public let selected_text: String
    public let surrounding_text: String

    public init(
        file_path: String,
        project_path: String? = nil,
        language: String,
        start_line: Int,
        end_line: Int,
        selected_text: String,
        surrounding_text: String
    ) {
        self.file_path = file_path
        self.project_path = project_path
        self.language = language
        self.start_line = start_line
        self.end_line = end_line
        self.selected_text = selected_text
        self.surrounding_text = surrounding_text
    }
}

public struct RuntimeSessionSummary: Codable, Sendable {
    public let session_id: String
    public let project_label: String
    public let started_at: String
    public let ended_at: String?
    public let declared_intent: RuntimeDeclaredIntent?
    public let observed_tools: [String]
    public let learning_signals: [RuntimeSignal]
    public let ownership_questions: [RuntimeQuestion]
    public let export_state: String
    public let code_selection: RuntimeCodeSelection?
}

public struct DeclareIntentPayload: Codable, Sendable {
    public let project_label: String
    public let project_path: String?
    public let statement: String
    public let uncertainty: String
    public let expected_work_area: String?
    public let desired_help: String

    public init(
        project_label: String,
        project_path: String? = nil,
        statement: String,
        uncertainty: String,
        expected_work_area: String? = nil,
        desired_help: String = "generate_questions"
    ) {
        self.project_label = project_label
        self.project_path = project_path
        self.statement = statement
        self.uncertainty = uncertainty
        self.expected_work_area = expected_work_area
        self.desired_help = desired_help
    }
}

public struct PrepareCodeQuestionPayload: Codable, Sendable {
    public let project_label: String
    public let project_path: String?
    public let file_path: String
    public let start_line: Int
    public let end_line: Int?

    public init(
        project_label: String,
        project_path: String? = nil,
        file_path: String,
        start_line: Int,
        end_line: Int? = nil
    ) {
        self.project_label = project_label
        self.project_path = project_path
        self.file_path = file_path
        self.start_line = start_line
        self.end_line = end_line
    }
}

public struct GenerateQuestionsPayload: Codable, Sendable {
    public let session_id: String?

    public init(session_id: String? = nil) {
        self.session_id = session_id
    }
}

public struct AnswerQuestionPayload: Codable, Sendable {
    public let session_id: String?
    public let question_id: String
    public let answer: String
    public let answer_quality: String?

    public init(
        session_id: String? = nil,
        question_id: String,
        answer: String,
        answer_quality: String? = nil
    ) {
        self.session_id = session_id
        self.question_id = question_id
        self.answer = answer
        self.answer_quality = answer_quality
    }
}

public struct SessionSummaryPayload: Codable, Sendable {
    public let session_id: String?

    public init(session_id: String? = nil) {
        self.session_id = session_id
    }
}

public struct StudyPanelStatePayload: Codable, Sendable {
    public let artifact_session_id: String?
    public let reference_time: String?

    public init(artifact_session_id: String? = nil, reference_time: String? = nil) {
        self.artifact_session_id = artifact_session_id
        self.reference_time = reference_time
    }
}

public struct DeclareIntentResult: Codable, Sendable {
    public let session_id: String
    public let declared_intent: RuntimeDeclaredIntent
    public let operation_state: RuntimeOperationState
}

public struct PrepareCodeQuestionResult: Codable, Sendable {
    public let session_id: String
    public let selection: RuntimeCodeSelection
    public let question: RuntimeQuestion
    public let operation_state: RuntimeOperationState
}

public struct GenerateQuestionsResult: Codable, Sendable {
    public let session_id: String
    public let questions: [RuntimeQuestion]
    public let learning_signals: [RuntimeSignal]
    public let operation_state: RuntimeOperationState
}

public struct AnswerQuestionResult: Codable, Sendable {
    public let session_id: String
    public let question: RuntimeQuestion
    public let session_summary: RuntimeSessionSummary
    public let operation_state: RuntimeOperationState
}

public struct SessionSummaryResult: Codable, Sendable {
    public let session_summary: RuntimeSessionSummary
    public let operation_state: RuntimeOperationState
}
