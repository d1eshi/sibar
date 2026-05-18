import Foundation
import SibiCore
import XCTest
@testable import SibiStudyShellKit

final class StudyPanelRootViewTests: XCTestCase {
    @MainActor
    func testPanelSurfacePrioritizesLiveWorkspaceBeforeSnapshot() async throws {
        let model = StudyPanelLiveModel(
            actions: .init(
                loadSnapshot: { _ in
                    try decodeStudyPanelSnapshot()
                },
                startWorkspaceSession: { _ in
                    try decodeStartWorkspaceSessionResult()
                },
                submitWorkspaceAttempt: { _ in
                    fatalError("not used in this test")
                },
                answerQuestion: { _ in
                    throw RuntimeClientError.processFailure("not used in this test")
                }
            )
        )

        await model.refreshNow()
        XCTAssertEqual(StudyPanelRootView(model: model, onToggleCollapsed: {}, onOpenCanvas: {}).panelSurface, .snapshot)

        await model.startLiveWorkspace(goal: "Explain", rootPath: "/tmp")
        XCTAssertEqual(model.liveWorkspaceSession?.workspace_session.artifact_session_id, "as-1")
        XCTAssertEqual(StudyPanelRootView(model: model, onToggleCollapsed: {}, onOpenCanvas: {}).panelSurface, .liveWorkspaceSession)
    }
}

private func decodeStudyPanelSnapshot() throws -> StudyPanelSnapshot {
    let envelope = try JSONDecoder().decode(
        RuntimeEnvelope<StudyPanelSnapshot>.self,
        from: Data(studyPanelSnapshotEnvelopeJSON.utf8)
    )
    return try XCTUnwrap(envelope.data)
}

private func decodeStartWorkspaceSessionResult() throws -> StartWorkspaceSessionResult {
    let envelope = try JSONDecoder().decode(
        RuntimeEnvelope<StartWorkspaceSessionResult>.self,
        from: Data(startWorkspaceSessionEnvelopeJSON.utf8)
    )
    return try XCTUnwrap(envelope.data)
}

private let studyPanelSnapshotEnvelopeJSON = #"""
{
  "ok": true,
  "data": {
    "artifact_session": {
      "artifact_session_id": "a1",
      "label": "Sibi fixture",
      "root_path": "/tmp/sibi",
      "source_type": "local_path",
      "learning_goal": "Learn runtime state",
      "confidence": "high",
      "included_paths": [],
      "excluded_paths": [],
      "created_at": "t0"
    },
    "concept_graph": null,
    "active_autopsy_step": null,
    "active_code_selection": null,
    "current_questions": [],
    "learning_gaps": [],
    "practice_challenges": [],
    "memory_summary": {
      "artifact_session_id": "a1",
      "label": "Sibi fixture",
      "root_path": "/tmp/sibi",
      "generated_at": "t0",
      "concept_states": [],
      "answer_history": [],
      "gaps": [],
      "challenges": [],
      "next_reviews": []
    },
    "readiness_report": {
      "artifact_session_id": "a1",
      "label": "Sibi fixture",
      "generated_at": "t1",
      "summary": {
        "readiness": "not ready yet",
        "statement": "Needs data from runtime.",
        "confidence": "low",
        "evidence_ids": []
      },
      "ready_areas": [],
      "risky_areas": [],
      "verified_concepts": [],
      "open_gaps": [],
      "practice_queue": [],
      "recommended_next_action": {
        "claim_id": "na",
        "title": "Keep going",
        "action": "noop",
        "claim": "No action available yet.",
        "readiness": "not ready",
        "confidence": "low",
        "evidence_ids": []
      },
      "evidence_index": []
    },
    "evidence_index": [],
    "operation_state": {
      "message": "Study snapshot loaded."
    }
  }
}
"""#

private let startWorkspaceSessionEnvelopeJSON = #"""
{
  "ok": true,
  "data": {
    "workspace_session": {
      "workspace_session_id": "ws-1",
      "artifact_session_id": "as-1",
      "runner": {
        "status": "completed",
        "accepted_signal_count": 1,
        "rejected_signal_count": 0
      },
      "loop": {
        "goal": "Explain this project A-Z",
        "evidence_inventory": [],
        "concept_slice": null,
        "thinking_artifacts": [],
        "active_operation": {
          "id": "OP-LIVE-1",
          "kind": "explain",
          "prompt": "Explain the runtime dispatcher.",
          "required_evidence": [],
          "success_criteria": []
        },
        "sample_attempt": null,
        "evidence_check": null,
        "detected_gap": null,
        "repair_action": null,
        "readiness_claim": null
      }
    },
    "snapshot": null
  }
}
"""#
