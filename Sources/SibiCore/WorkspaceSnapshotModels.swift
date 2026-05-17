import Foundation

public struct WorkspaceSnapshotPayload: Codable, Sendable {
    public let fixture_path: String?
    public let workspace_url: String?

    public init(fixture_path: String? = nil, workspace_url: String? = nil) {
        self.fixture_path = fixture_path
        self.workspace_url = workspace_url
    }
}

public struct RuntimeWorkspaceOperation: Codable, Sendable {
    public let id: String
    public let kind: String
    public let prompt: String

    public init(id: String, kind: String, prompt: String) {
        self.id = id
        self.kind = kind
        self.prompt = prompt
    }
}

public struct RuntimeWorkspaceGap: Codable, Sendable {
    public let kind: String
    public let severity: String
    public let blocks_readiness: Bool

    public init(kind: String, severity: String, blocks_readiness: Bool) {
        self.kind = kind
        self.severity = severity
        self.blocks_readiness = blocks_readiness
    }
}

public struct RuntimeWorkspaceReadiness: Codable, Sendable {
    public let status: String
    public let scope: String
    public let blocked_claims: [String]

    public init(status: String, scope: String, blocked_claims: [String]) {
        self.status = status
        self.scope = scope
        self.blocked_claims = blocked_claims
    }
}

public struct RuntimeWorkspaceSnapshot: Codable, Sendable {
    public let snapshot_id: String
    public let loop_id: String
    public let goal: String
    public let active_operation: RuntimeWorkspaceOperation?
    public let readiness: RuntimeWorkspaceReadiness
    public let detected_gap: RuntimeWorkspaceGap?

    public init(
        snapshot_id: String,
        loop_id: String,
        goal: String,
        active_operation: RuntimeWorkspaceOperation?,
        readiness: RuntimeWorkspaceReadiness,
        detected_gap: RuntimeWorkspaceGap?
    ) {
        self.snapshot_id = snapshot_id
        self.loop_id = loop_id
        self.goal = goal
        self.active_operation = active_operation
        self.readiness = readiness
        self.detected_gap = detected_gap
    }
}

public struct RuntimeOpenWorkspaceAction: Codable, Sendable, Equatable {
    public let label: String
    public let target_url: String

    public init(label: String, target_url: String) {
        self.label = label
        self.target_url = target_url
    }
}

public struct RuntimeWorkspaceLensState: Codable, Sendable {
    public let snapshot: RuntimeWorkspaceSnapshot
    public let open_workspace: RuntimeOpenWorkspaceAction
    public let operation_state: RuntimeOperationState

    public init(
        snapshot: RuntimeWorkspaceSnapshot,
        open_workspace: RuntimeOpenWorkspaceAction,
        operation_state: RuntimeOperationState
    ) {
        self.snapshot = snapshot
        self.open_workspace = open_workspace
        self.operation_state = operation_state
    }
}
