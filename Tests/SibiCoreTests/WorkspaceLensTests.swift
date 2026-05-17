import Foundation
import XCTest
@testable import SibiCore

final class WorkspaceLensTests: XCTestCase {
    func testRuntimeClientSendsGetWorkspaceSnapshotCommandAndDecodesLensState() throws {
        let runner = WorkspaceLensStubRunner(result: .init(
            status: 0,
            stdout: workspaceSnapshotEnvelopeJSON,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let lensState = try client.getWorkspaceSnapshot(.init())

        XCTAssertEqual(lensState.snapshot.snapshot_id, "SNAP-loop-1")
        XCTAssertEqual(lensState.snapshot.goal, "Trace runtime gap detection to readiness limits.")
        XCTAssertEqual(lensState.snapshot.active_operation?.prompt, "Trace the attempt through evidence check.")
        XCTAssertEqual(lensState.snapshot.readiness.status, "limited")
        XCTAssertEqual(lensState.snapshot.detected_gap?.kind, "shallow_trace")
        XCTAssertEqual(lensState.open_workspace.target_url, "http://127.0.0.1:4180/workspace.html")
        XCTAssertTrue(runner.standardInput.contains(#""command":"get_workspace_snapshot""#))
    }

    func testWorkspaceLensRenderModelUsesSnapshotFieldsForGoalOperationAndGapChip() throws {
        let lensState = try decodeLensState(from: workspaceSnapshotEnvelopeJSON)

        let model = WorkspaceLensRenderModel(lensState: lensState)

        XCTAssertEqual(model.goalTitle, "Trace runtime gap detection to readiness limits.")
        XCTAssertEqual(model.activeOperationPrompt, "Trace the attempt through evidence check.")
        XCTAssertEqual(model.statusChipText, "Gap · shallow_trace · important")
        XCTAssertEqual(model.openWorkspaceAction.target_url, "http://127.0.0.1:4180/workspace.html")
    }

    func testWorkspaceLensRenderModelFallsBackToReadinessChipWhenGapAbsent() throws {
        let lensState = try decodeLensState(from: workspaceSnapshotWithoutGapEnvelopeJSON)

        let model = WorkspaceLensRenderModel(lensState: lensState)

        XCTAssertEqual(model.goalTitle, "Trace runtime gap detection to readiness limits.")
        XCTAssertEqual(model.activeOperationPrompt, "No active operation in snapshot.")
        XCTAssertEqual(model.statusChipText, "Readiness · ready")
    }
}

private final class WorkspaceLensStubRunner: ProcessRunning, @unchecked Sendable {
    let result: ProcessResult
    var standardInput = ""

    init(result: ProcessResult) {
        self.result = result
    }

    func run(executable: String, arguments: [String], standardInput: String) throws -> ProcessResult {
        self.standardInput = standardInput
        return result
    }
}

private func decodeLensState(from json: String) throws -> RuntimeWorkspaceLensState {
    let envelope = try JSONDecoder().decode(
        RuntimeEnvelope<RuntimeWorkspaceLensState>.self,
        from: Data(json.utf8)
    )
    return try XCTUnwrap(envelope.data)
}

private let workspaceSnapshotEnvelopeJSON = #"""
{
  "ok": true,
  "data": {
    "snapshot": {
      "snapshot_id": "SNAP-loop-1",
      "loop_id": "loop-1",
      "goal": "Trace runtime gap detection to readiness limits.",
      "active_operation": {
        "id": "op-1",
        "kind": "trace",
        "prompt": "Trace the attempt through evidence check.",
        "required_evidence": ["EV-1"],
        "success_criteria": ["Names missing evidence paths."]
      },
      "readiness": {
        "status": "limited",
        "scope": "trace operation for runtime gap slice",
        "blocked_claims": ["Cannot claim modify readiness yet."]
      },
      "detected_gap": {
        "kind": "shallow_trace",
        "severity": "important",
        "blocks_readiness": true
      }
    },
    "open_workspace": {
      "label": "Open Workspace",
      "target_url": "http://127.0.0.1:4180/workspace.html"
    },
    "operation_state": {
      "message": "Workspace snapshot projected from runtime-owned state."
    }
  }
}
"""#

private let workspaceSnapshotWithoutGapEnvelopeJSON = #"""
{
  "ok": true,
  "data": {
    "snapshot": {
      "snapshot_id": "SNAP-loop-1",
      "loop_id": "loop-1",
      "goal": "Trace runtime gap detection to readiness limits.",
      "active_operation": null,
      "readiness": {
        "status": "ready",
        "scope": "trace operation for runtime gap slice",
        "blocked_claims": []
      },
      "detected_gap": null
    },
    "open_workspace": {
      "label": "Open Workspace",
      "target_url": "http://127.0.0.1:4180/workspace.html"
    },
    "operation_state": {
      "message": "Workspace snapshot projected from runtime-owned state."
    }
  }
}
"""#
