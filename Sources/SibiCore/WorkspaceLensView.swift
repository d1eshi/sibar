import SwiftUI

public struct WorkspaceLensRenderModel: Equatable, Sendable {
    public let goalTitle: String
    public let activeOperationPrompt: String
    public let statusChipText: String
    public let openWorkspaceAction: RuntimeOpenWorkspaceAction

    public init(lensState: RuntimeWorkspaceLensState) {
        self.goalTitle = lensState.snapshot.goal
        self.activeOperationPrompt = lensState.snapshot.active_operation?.prompt
            ?? "No active operation in snapshot."
        if let gap = lensState.snapshot.detected_gap {
            self.statusChipText = "Gap · \(gap.kind) · \(gap.severity)"
        } else {
            self.statusChipText = "Readiness · \(lensState.snapshot.readiness.status)"
        }
        self.openWorkspaceAction = lensState.open_workspace
    }
}

public struct WorkspaceLensSummaryView: View {
    private let model: WorkspaceLensRenderModel
    private let onOpenWorkspace: (RuntimeOpenWorkspaceAction) -> Void

    public init(
        model: WorkspaceLensRenderModel,
        onOpenWorkspace: @escaping (RuntimeOpenWorkspaceAction) -> Void
    ) {
        self.model = model
        self.onOpenWorkspace = onOpenWorkspace
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(model.goalTitle)
                .font(.headline)
                .lineLimit(2)
            Text(model.activeOperationPrompt)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)
            HStack(spacing: 10) {
                Text(model.statusChipText)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.secondary.opacity(0.14), in: Capsule())
                Button(model.openWorkspaceAction.label) {
                    onOpenWorkspace(model.openWorkspaceAction)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
    }
}
