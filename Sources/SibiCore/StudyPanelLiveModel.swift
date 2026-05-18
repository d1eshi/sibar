import Foundation
import SwiftUI

public struct StudyPanelRuntimeActions: Sendable {
    public let loadSnapshot: @Sendable (StudyPanelStatePayload) throws -> StudyPanelSnapshot
    public let startWorkspaceSession: @Sendable (StartWorkspaceSessionPayload) throws -> StartWorkspaceSessionResult
    public let submitWorkspaceAttempt: @Sendable (SubmitWorkspaceAttemptPayload) throws -> StartWorkspaceSessionResult
    public let answerQuestion: @Sendable (AnswerQuestionPayload) throws -> AnswerQuestionResult

    public init(
        loadSnapshot: @escaping @Sendable (StudyPanelStatePayload) throws -> StudyPanelSnapshot,
        startWorkspaceSession: @escaping @Sendable (StartWorkspaceSessionPayload) throws -> StartWorkspaceSessionResult = { _ in
            throw RuntimeClientError.processFailure("Live workspace sessions unavailable.")
        },
        submitWorkspaceAttempt: @escaping @Sendable (SubmitWorkspaceAttemptPayload) throws -> StartWorkspaceSessionResult = { _ in
            throw RuntimeClientError.processFailure("Live workspace attempts are unavailable.")
        },
        answerQuestion: @escaping @Sendable (AnswerQuestionPayload) throws -> AnswerQuestionResult
    ) {
        self.loadSnapshot = loadSnapshot
        self.startWorkspaceSession = startWorkspaceSession
        self.submitWorkspaceAttempt = submitWorkspaceAttempt
        self.answerQuestion = answerQuestion
    }

    public static func runtimeClient(_ client: RuntimeClient = RuntimeClient()) -> StudyPanelRuntimeActions {
        StudyPanelRuntimeActions(
            loadSnapshot: { payload in
                try client.getStudyPanelState(payload)
            },
            startWorkspaceSession: { payload in
                try client.startWorkspaceSession(payload)
            },
            submitWorkspaceAttempt: { payload in
                try client.submitWorkspaceAttempt(payload)
            },
            answerQuestion: { payload in
                try client.answerQuestion(payload)
            }
        )
    }
}

@MainActor
public final class StudyPanelLiveModel: ObservableObject {
    @Published public var artifactSessionID: String
    @Published public private(set) var snapshot: StudyPanelSnapshot?
    @Published public private(set) var liveWorkspaceSession: StartWorkspaceSessionResult?
    @Published public private(set) var statusText: String
    @Published public private(set) var lastError: String
    @Published public private(set) var isRefreshing: Bool
    @Published public private(set) var isAutoRefreshing: Bool
    @Published public private(set) var isStartingWorkspace: Bool
    @Published public private(set) var isSubmittingWorkspaceAttempt: Bool

    private let actions: StudyPanelRuntimeActions
    private var autoRefreshTask: Task<Void, Never>?

    public init(
        artifactSessionID: String = "",
        actions: StudyPanelRuntimeActions = .runtimeClient()
    ) {
        self.artifactSessionID = artifactSessionID
        self.actions = actions
        self.snapshot = nil
        self.liveWorkspaceSession = nil
        self.statusText = "No study snapshot loaded."
        self.lastError = ""
        self.isRefreshing = false
        self.isAutoRefreshing = false
        self.isStartingWorkspace = false
        self.isSubmittingWorkspaceAttempt = false
    }

    deinit {
        autoRefreshTask?.cancel()
    }

    public func refreshNow() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }

        let actions = actions
        let payload = StudyPanelStatePayload(artifact_session_id: normalizedArtifactSessionID)

        do {
            let loadedSnapshot = try await Task.detached(priority: .userInitiated) {
                try actions.loadSnapshot(payload)
            }.value
            snapshot = loadedSnapshot
            lastError = ""
            statusText = snapshot?.operation_state.message ?? "Study snapshot loaded."
        } catch is CancellationError {
            statusText = "Study refresh cancelled."
        } catch {
            lastError = error.localizedDescription
            statusText = "Study snapshot unavailable."
        }
    }

    public func startLiveWorkspace(
        goal: String = "Explain this project A-Z",
        rootPath: String = FileManager.default.currentDirectoryPath
    ) async {
        guard !isStartingWorkspace else { return }
        isStartingWorkspace = true
        defer { isStartingWorkspace = false }

        let trimmedGoal = goal.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = StartWorkspaceSessionPayload(
            goal: trimmedGoal.isEmpty ? "Explain this project A-Z" : trimmedGoal,
            root: rootPath,
            codex_command: "auto"
        )
        let actions = actions

        do {
            let result = try await Task.detached(priority: .userInitiated) {
                try actions.startWorkspaceSession(payload)
            }.value
            liveWorkspaceSession = result
            artifactSessionID = result.workspace_session.artifact_session_id
            lastError = ""
            statusText = "Live workspace session started."
        } catch is CancellationError {
            statusText = "Live workspace start cancelled."
        } catch {
            lastError = error.localizedDescription
            statusText = "Live workspace unavailable."
        }
    }

    public func submitWorkspaceAttempt(
        answerText: String,
        selectedEvidence: [String],
        confidence: String,
        declaredUnknowns: [String]
    ) async {
        guard !isSubmittingWorkspaceAttempt else { return }
        guard let workspaceSession = liveWorkspaceSession?.workspace_session else {
            let message = "Start a live workspace session first."
            lastError = message
            statusText = message
            return
        }

        isSubmittingWorkspaceAttempt = true
        defer { isSubmittingWorkspaceAttempt = false }

        let normalizedConfidence = confidence.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = SubmitWorkspaceAttemptPayload(
            workspace_session_id: workspaceSession.workspace_session_id,
            answer_text: answerText.trimmingCharacters(in: .whitespacesAndNewlines),
            selected_evidence: selectedEvidence,
            declared_confidence: normalizedConfidence.isEmpty ? "medium" : normalizedConfidence,
            declared_unknowns: declaredUnknowns
        )
        let actions = actions

        do {
            let result = try await Task.detached(priority: .userInitiated) {
                try actions.submitWorkspaceAttempt(payload)
            }.value
            liveWorkspaceSession = result
            artifactSessionID = result.workspace_session.artifact_session_id
            lastError = ""
            statusText = "Workspace attempt evaluated."
        } catch is CancellationError {
            statusText = "Workspace attempt submission cancelled."
        } catch {
            lastError = error.localizedDescription
            statusText = "Workspace attempt rejected."
        }
    }

    public func submitAnswer(question: RuntimeQuestion, answer: String) async {
        let trimmedAnswer = answer.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedAnswer.isEmpty else {
            lastError = "Answer is required."
            return
        }

        let actions = actions
        let payload = AnswerQuestionPayload(
            session_id: question.session_id,
            question_id: question.question_id,
            answer: trimmedAnswer
        )

        do {
            _ = try await Task.detached(priority: .userInitiated) {
                try actions.answerQuestion(payload)
            }.value
            lastError = ""
            statusText = "Answer sent to TypeScript runtime."
            await refreshNow()
        } catch is CancellationError {
            statusText = "Answer submission cancelled."
        } catch {
            lastError = error.localizedDescription
            statusText = "Answer was not accepted."
        }
    }

    public func startAutoRefresh(intervalSeconds: UInt64 = 2) {
        stopAutoRefresh()
        isAutoRefreshing = true
        autoRefreshTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refreshNow()
                try? await Task.sleep(nanoseconds: intervalSeconds * 1_000_000_000)
            }
        }
    }

    public func stopAutoRefresh() {
        autoRefreshTask?.cancel()
        autoRefreshTask = nil
        isAutoRefreshing = false
    }

    private var normalizedArtifactSessionID: String? {
        let trimmed = artifactSessionID.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
