import SibiCore
import SwiftUI

struct StudyPanelRootView: View {
    @ObservedObject var model: StudyPanelLiveModel
    let onToggleCollapsed: () -> Void
    let onOpenCanvas: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            toolbar
            Divider()
            content
        }
        .frame(width: StudyPanelController.expandedSize.width, height: StudyPanelController.expandedSize.height)
        .onAppear {
            Task {
                await model.refreshNow()
                model.startAutoRefresh()
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
                if model.isAutoRefreshing {
                    model.stopAutoRefresh()
                } else {
                    model.startAutoRefresh()
                }
            } label: {
                Label(model.isAutoRefreshing ? "Live" : "Paused", systemImage: model.isAutoRefreshing ? "bolt.fill" : "pause.fill")
            }

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

            if let snapshot = model.snapshot {
                StudyPanelView(snapshot: snapshot) { question, answer in
                    Task {
                        await model.submitAnswer(question: question, answer: answer)
                    }
                }
            } else {
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
