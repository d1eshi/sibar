import Foundation
import SwiftUI

public struct StudyPanelRuntimeActions: Sendable {
    public let loadSnapshot: @Sendable (StudyPanelStatePayload) throws -> StudyPanelSnapshot
    public let loadWorkspaceSnapshot: @Sendable (WorkspaceSnapshotPayload) throws -> RuntimeWorkspaceLensState
    public let answerQuestion: @Sendable (AnswerQuestionPayload) throws -> AnswerQuestionResult

    public init(
        loadSnapshot: @escaping @Sendable (StudyPanelStatePayload) throws -> StudyPanelSnapshot,
        loadWorkspaceSnapshot: @escaping @Sendable (WorkspaceSnapshotPayload) throws -> RuntimeWorkspaceLensState = { _ in
            throw RuntimeClientError.processFailure("Workspace snapshot unavailable.")
        },
        answerQuestion: @escaping @Sendable (AnswerQuestionPayload) throws -> AnswerQuestionResult
    ) {
        self.loadSnapshot = loadSnapshot
        self.loadWorkspaceSnapshot = loadWorkspaceSnapshot
        self.answerQuestion = answerQuestion
    }

    public static func runtimeClient(_ client: RuntimeClient = RuntimeClient()) -> StudyPanelRuntimeActions {
        StudyPanelRuntimeActions(
            loadSnapshot: { payload in
                try client.getStudyPanelState(payload)
            },
            loadWorkspaceSnapshot: { payload in
                try client.getWorkspaceSnapshot(payload)
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
    @Published public private(set) var workspaceLensState: RuntimeWorkspaceLensState?
    @Published public private(set) var statusText: String
    @Published public private(set) var lastError: String
    @Published public private(set) var isRefreshing: Bool
    @Published public private(set) var isAutoRefreshing: Bool

    private let actions: StudyPanelRuntimeActions
    private var autoRefreshTask: Task<Void, Never>?

    public init(
        artifactSessionID: String = "",
        actions: StudyPanelRuntimeActions = .runtimeClient()
    ) {
        self.artifactSessionID = artifactSessionID
        self.actions = actions
        self.snapshot = nil
        self.workspaceLensState = nil
        self.statusText = "No study snapshot loaded."
        self.lastError = ""
        self.isRefreshing = false
        self.isAutoRefreshing = false
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
        let workspacePayload = WorkspaceSnapshotPayload()

        do {
            let loadedSnapshot = try await Task.detached(priority: .userInitiated) {
                try actions.loadSnapshot(payload)
            }.value
            let loadedLensState: RuntimeWorkspaceLensState?
            do {
                loadedLensState = try await Task.detached(priority: .userInitiated) {
                    try actions.loadWorkspaceSnapshot(workspacePayload)
                }.value
            } catch {
                loadedLensState = nil
                lastError = "Workspace snapshot unavailable: \(error.localizedDescription)"
            }
            snapshot = loadedSnapshot
            workspaceLensState = loadedLensState
            if loadedLensState != nil {
                lastError = ""
            }
            statusText = snapshot?.operation_state.message ?? "Study snapshot loaded."
        } catch is CancellationError {
            statusText = "Study refresh cancelled."
        } catch {
            lastError = error.localizedDescription
            statusText = "Study snapshot unavailable."
        }
    }

    public var workspaceLensModel: WorkspaceLensRenderModel? {
        guard let workspaceLensState else { return nil }
        return WorkspaceLensRenderModel(lensState: workspaceLensState)
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
