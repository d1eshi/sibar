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

public struct StartWorkspaceSessionPayload: Codable, Sendable {
    public let goal: String
    public let root: String
    public let codex_command: String
    public let workspace_url: String?

    public init(goal: String, root: String, codex_command: String = "auto", workspace_url: String? = nil) {
        self.goal = goal
        self.root = root
        self.codex_command = codex_command
        self.workspace_url = workspace_url
    }

    private enum CodingKeys: String, CodingKey {
        case goal
        case root
        case root_path
        case codex_command
        case workspace_url
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        goal = try container.decode(String.self, forKey: .goal)
        root = try container.decodeIfPresent(String.self, forKey: .root)
            ?? container.decode(String.self, forKey: .root_path)
        codex_command = try container.decodeIfPresent(String.self, forKey: .codex_command) ?? "auto"
        workspace_url = try container.decodeIfPresent(String.self, forKey: .workspace_url)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(goal, forKey: .goal)
        try container.encode(root, forKey: .root)
        try container.encode(root, forKey: .root_path)
        try container.encode(codex_command, forKey: .codex_command)
        try container.encodeIfPresent(workspace_url, forKey: .workspace_url)
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
}

public struct StartWorkspaceSessionResult: Codable, Sendable {
    public let workspace_session: StartWorkspaceSessionWorkspaceState
}
