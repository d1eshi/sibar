import Foundation
import SibiCore
import XCTest
@testable import SibiStudyShellKit

final class StudyGraphCodeCanvasTests: XCTestCase {
    func testRenderModelUsesConceptGraphAndActiveCodeSelection() throws {
        let snapshot = try decodeSnapshot(activeCodeSelection: true)

        let model = StudyGraphCodeCanvasRenderModel(snapshot: snapshot, selectedID: "node:runtime")

        XCTAssertEqual(model.items.map(\.id), ["node:runtime", "edge:flow"])
        XCTAssertEqual(model.previewTitle, "runtime.ts")
        XCTAssertTrue(model.previewRows.contains { $0.highlighted && $0.text.contains("return request.command") })
    }

    func testRenderModelFallsBackToSelectedEvidenceExcerpt() throws {
        let snapshot = try decodeSnapshot(activeCodeSelection: false)

        let model = StudyGraphCodeCanvasRenderModel(snapshot: snapshot, selectedID: "edge:flow")

        XCTAssertEqual(model.previewTitle, "Runtime writes state")
        XCTAssertEqual(model.previewRows.first?.lineLabel, "3-4")
        XCTAssertTrue(model.previewRows.first?.text.contains("writeState") ?? false)
    }
}

private func decodeSnapshot(activeCodeSelection: Bool) throws -> StudyPanelSnapshot {
    try JSONDecoder().decode(StudyPanelSnapshot.self, from: Data(snapshotJSON(activeCodeSelection: activeCodeSelection).utf8))
}

private func snapshotJSON(activeCodeSelection: Bool) -> String {
    let activeSelection = activeCodeSelection
        ? #"""
        {
          "file_path": "/tmp/sibi/src/runtime.ts",
          "project_path": "/tmp/sibi",
          "language": "typescript",
          "start_line": 2,
          "end_line": 2,
          "selected_text": "return request.command;",
          "surrounding_text": "export function handleRequest(request) {\n  return request.command;\n}"
        }
        """#
        : "null"

    return #"""
    {
      "artifact_session": {
        "artifact_session_id": "a1",
        "label": "Sibi fixture",
        "root_path": "/tmp/sibi",
        "source_type": "local_path",
        "learning_goal": "Learn runtime state",
        "confidence": "high",
        "included_paths": ["/tmp/sibi/src"],
        "excluded_paths": [],
        "created_at": "t0"
      },
      "concept_graph": {
        "artifact_session_id": "a1",
        "generated_at": "t1",
        "scope": {
          "root_path": "/tmp/sibi",
          "included_paths": ["/tmp/sibi/src"],
          "excluded_paths": []
        },
        "nodes": [{
          "id": "runtime",
          "label": "Runtime boundary",
          "kind": "architecture",
          "source_paths": ["/tmp/sibi/src/runtime.ts"],
          "why_it_matters": "It defines commands.",
          "prerequisite_concepts": [],
          "evidence": [{
            "file_path": "/tmp/sibi/src/runtime.ts",
            "start_line": 2,
            "end_line": 2,
            "excerpt": "return request.command;"
          }]
        }],
        "edges": [{
          "id": "flow",
          "from": "runtime",
          "to": "state",
          "relation": "persists",
          "label": "Runtime writes state",
          "evidence": [{
            "file_path": "/tmp/sibi/src/runtime-state.ts",
            "start_line": 3,
            "end_line": 4,
            "excerpt": "writeState(value)"
          }]
        }]
      },
      "active_autopsy_step": null,
      "active_code_selection": \#(activeSelection),
      "current_questions": [],
      "learning_gaps": [],
      "practice_challenges": [],
      "memory_summary": {
        "artifact_session_id": "a1",
        "label": "Sibi fixture",
        "root_path": "/tmp/sibi",
        "generated_at": "t3",
        "concept_states": [],
        "answer_history": [],
        "gaps": [],
        "challenges": [],
        "next_reviews": []
      },
      "readiness_report": {
        "artifact_session_id": "a1",
        "label": "Sibi fixture",
        "generated_at": "t4",
        "summary": {
          "readiness": "not ready yet",
          "statement": "Needs more evidence.",
          "confidence": "low",
          "evidence_ids": [],
          "unsupported": true
        },
        "ready_areas": [],
        "risky_areas": [],
        "verified_concepts": [],
        "open_gaps": [],
        "practice_queue": [],
        "recommended_next_action": {
          "claim_id": "next",
          "title": "Answer current question",
          "action": "answer_current_question",
          "claim": "Answer the current question before moving on.",
          "readiness": "not_ready",
          "confidence": "low",
          "reason": "No answer yet.",
          "evidence_ids": [],
          "unsupported": true
        },
        "evidence_index": []
      },
      "evidence_index": [],
      "operation_state": {
        "message": "Study panel snapshot projected from runtime-owned state."
      }
    }
    """#
}
