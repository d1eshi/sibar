import SibiCore
import SwiftUI

struct StudyPanelRootView: View {
    @ObservedObject var model: StudyPanelLiveModel
    let onToggleCollapsed: () -> Void
    let onOpenCanvas: () -> Void

    enum PanelSurface: Equatable {
        case liveWorkspaceSession
        case snapshot
        case unavailable
    }

    var panelSurface: PanelSurface {
        if model.liveWorkspaceSession != nil {
            return .liveWorkspaceSession
        }
        if model.snapshot != nil {
            return .snapshot
        }
        return .unavailable
    }

    var body: some View {
        VStack(spacing: 0) {
            toolbar
            Divider()
            content
        }
        .frame(width: StudyPanelController.expandedSize.width, height: StudyPanelController.expandedSize.height)
        .background(Color(nsColor: .windowBackgroundColor))
        .onAppear {
            Task {
                await model.refreshNow()
            }
        }
        .onDisappear {
            model.stopAutoRefresh()
        }
    }

    private var toolbar: some View {
        HStack(spacing: 10) {
            TextField("Artifact session id", text: $model.artifactSessionID)
                .textFieldStyle(.roundedBorder)
                .frame(minWidth: 150)
                .onSubmit {
                    Task { await model.refreshNow() }
                }

            Button {
                Task { await model.refreshNow() }
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
            .disabled(model.isRefreshing)

            Button {
                onOpenCanvas()
            } label: {
                Label("Canvas", systemImage: "rectangle.split.2x1")
            }
            .disabled(model.snapshot == nil)

            Button {
                Task { await model.startLiveWorkspace() }
            } label: {
                Label(model.isStartingWorkspace ? "Starting" : "Start", systemImage: "bolt.fill")
            }
            .disabled(model.isStartingWorkspace)

            Button {
                onToggleCollapsed()
            } label: {
                Image(systemName: "minus")
            }
            .help("Collapse")
        }
        .padding(12)
        .background(.thinMaterial)
    }

    @ViewBuilder private var content: some View {
        VStack(spacing: 0) {
            if model.isRefreshing {
                ProgressView()
                    .controlSize(.small)
                    .padding(.top, 8)
            }

            switch panelSurface {
            case .liveWorkspaceSession:
                if let liveWorkspaceSession = model.liveWorkspaceSession {
                    LiveWorkspaceSessionView(
                        result: liveWorkspaceSession,
                        isSubmittingWorkspaceAttempt: model.isSubmittingWorkspaceAttempt,
                        onSubmitAttempt: { answerText, selectedEvidence, confidence, unknowns, action in
                            Task {
                                await model.submitWorkspaceAttempt(
                                    answerText: answerText,
                                    selectedEvidence: selectedEvidence,
                                    confidence: confidence,
                                    declaredUnknowns: unknowns,
                                    action: action
                                )
                            }
                        }
                    )
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                        .padding(.bottom, 4)
                }
            case .snapshot:
                if let snapshot = model.snapshot {
                    StudyPanelView(snapshot: snapshot) { question, answer in
                        Task {
                            await model.submitAnswer(question: question, answer: answer)
                        }
                    }
                }
            case .unavailable:
                ContentUnavailableView(
                    "No Study Session",
                    systemImage: "rectangle.stack.badge.person.crop",
                    description: Text(model.lastError.isEmpty ? model.statusText : model.lastError)
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}
