import SibiCore
import SwiftUI

@main
struct SibiStudyApp: App {
    var body: some Scene {
        WindowGroup("Sibi Study") {
            SibiStudyRootView()
                .frame(minWidth: 980, minHeight: 720)
        }
    }
}

private struct SibiStudyRootView: View {
    @StateObject private var model = StudyPanelLiveModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                toolbar
                Divider()
                content
            }
            .navigationTitle("Sibi Study")
        }
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
        HStack(spacing: 12) {
            TextField("Artifact session id", text: $model.artifactSessionID)
                .textFieldStyle(.roundedBorder)
                .frame(minWidth: 280)
                .onSubmit {
                    Task {
                        await model.refreshNow()
                    }
                }

            Button {
                Task {
                    await model.refreshNow()
                }
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
            .disabled(model.isRefreshing)

            Button {
                if model.isAutoRefreshing {
                    model.stopAutoRefresh()
                } else {
                    model.startAutoRefresh()
                }
            } label: {
                Label(model.isAutoRefreshing ? "Live" : "Paused", systemImage: model.isAutoRefreshing ? "bolt.fill" : "pause.fill")
            }

            Spacer()

            if model.isRefreshing {
                ProgressView()
                    .controlSize(.small)
            }
            Text(model.lastError.isEmpty ? model.statusText : model.lastError)
                .font(.caption)
                .foregroundStyle(model.lastError.isEmpty ? Color.secondary : Color.red)
                .lineLimit(1)
                .frame(maxWidth: 360, alignment: .trailing)
        }
        .padding(12)
        .background(.thinMaterial)
    }

    @ViewBuilder private var content: some View {
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
                description: Text("Runtime has not returned a study snapshot.")
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}
