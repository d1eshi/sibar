import Foundation
import XCTest
@testable import SibiCore

final class StudyPanelTests: XCTestCase {
    func testSendsGetStudyPanelStateCommandAndDecodesSnapshot() throws {
        let runner = StudyPanelStubRunner(result: .init(
            status: 0,
            stdout: studyPanelEnvelopeJSON,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let snapshot = try client.getStudyPanelState(.init(artifact_session_id: "a1"))

        XCTAssertEqual(snapshot.artifact_session.artifact_session_id, "a1")
        XCTAssertEqual(snapshot.concept_graph?.nodes.first?.label, "Runtime boundary")
        XCTAssertEqual(snapshot.active_autopsy_step?.next_action, "collect_user_attempt")
        XCTAssertEqual(snapshot.current_questions.first?.question_id, "q1")
        XCTAssertEqual(snapshot.learning_gaps.first?.repair_action, "Trace the runtime state path.")
        XCTAssertEqual(snapshot.practice_challenges.first?.gap_id, "g1")
        XCTAssertEqual(snapshot.memory_summary.concept_states.first?.status, "gap_open")
        XCTAssertEqual(snapshot.readiness_report.summary.readiness, "not ready yet")
        XCTAssertEqual(snapshot.evidence_index.first?.source, "concept_graph")
        XCTAssertTrue(runner.standardInput.contains(#""command":"get_study_panel_state""#))
        XCTAssertTrue(runner.standardInput.contains(#""artifact_session_id":"a1""#))
    }

    func testStudyPanelRenderModelContainsAllRequiredRegions() throws {
        let data = Data(studyPanelEnvelopeJSON.utf8)
        let envelope = try JSONDecoder().decode(RuntimeEnvelope<StudyPanelSnapshot>.self, from: data)
        let snapshot = try XCTUnwrap(envelope.data)

        let model = StudyPanelRenderModel(snapshot: snapshot)

        XCTAssertEqual(model.sections.map(\.id), [
            "artifact-boundary",
            "concept-map",
            "autopsy",
            "evidence",
            "gaps-practice",
            "memory-readiness",
        ])
        XCTAssertTrue(model.rows(for: "artifact-boundary").contains("Learn runtime state"))
        XCTAssertTrue(model.rows(for: "autopsy").contains { $0.contains("Before any explanation") })
        XCTAssertTrue(model.rows(for: "gaps-practice").contains { $0.contains("Trace the runtime state path") })
        XCTAssertTrue(model.rows(for: "memory-readiness").contains { $0.contains("Readiness: not ready yet") })
    }
}

private final class StudyPanelStubRunner: ProcessRunning, @unchecked Sendable {
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

private let studyPanelEnvelopeJSON = #"""
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
        "id": "runtime-boundary",
        "label": "Runtime boundary",
        "kind": "architecture",
        "source_paths": ["/tmp/sibi/src/runtime.ts"],
        "why_it_matters": "It defines commands.",
        "prerequisite_concepts": [],
        "evidence": [{
          "file_path": "/tmp/sibi/src/runtime.ts",
          "start_line": 1,
          "end_line": 2,
          "excerpt": "handleRequest"
        }]
      }],
      "edges": [{
        "id": "flow-1",
        "from": "runtime-boundary",
        "to": "state-persistence",
        "relation": "persists",
        "label": "Runtime writes state",
        "evidence": [{
          "file_path": "/tmp/sibi/src/runtime-state.ts",
          "start_line": 3,
          "end_line": 4,
          "excerpt": "writeState"
        }]
      }]
    },
    "active_autopsy_step": {
      "autopsy_step_id": "step1",
      "artifact_session_id": "a1",
      "session_id": "s1",
      "question_id": "q1",
      "target_type": "concept",
      "selected_id": "runtime-boundary",
      "concept_id": "runtime-boundary",
      "edge_id": null,
      "prompt": "Before any explanation, predict the command boundary.",
      "bounded_evidence": [{
        "file_path": "/tmp/sibi/src/runtime.ts",
        "start_line": 1,
        "end_line": 2,
        "excerpt": "handleRequest"
      }],
      "evidence_basis": ["runtime.ts:1-2 handleRequest"],
      "next_action": "collect_user_attempt",
      "created_at": "t2"
    },
    "current_questions": [{
      "question_id": "q1",
      "created_at": "t2",
      "session_id": "s1",
      "prompt": "Before any explanation, predict the command boundary.",
      "target_area": "Runtime boundary",
      "why_it_matters": "It reveals the current model.",
      "evidence_basis": ["runtime.ts:1-2 handleRequest"],
      "answer_style": "short_explanation",
      "detected_layer": 2,
      "required_layer": 4,
      "answer": null,
      "answer_quality": null
    }],
    "learning_gaps": [{
      "id": "g1",
      "artifact_session_id": "a1",
      "session_id": "s1",
      "question_id": "q1",
      "concept_id": "runtime-boundary",
      "concept_label": "Runtime boundary",
      "expected_layer": 4,
      "observed_layer": 2,
      "observed_answer_or_uncertainty": "I am not sure.",
      "artifact_evidence": [{
        "file_path": "/tmp/sibi/src/runtime.ts",
        "start_line": 1,
        "end_line": 2,
        "excerpt": "handleRequest"
      }],
      "answer_evidence": ["answer=I am not sure."],
      "suspected_misconception": "State ownership is unclear.",
      "severity": "important",
      "confidence": "medium",
      "repair_action": "Trace the runtime state path.",
      "created_at": "t3"
    }],
    "practice_challenges": [{
      "id": "p1",
      "artifact_session_id": "a1",
      "session_id": "s1",
      "concept_id": "runtime-boundary",
      "gap_id": "g1",
      "challenge_type": "trace_path_across_files",
      "prompt": "Trace command to persisted state.",
      "expected_evidence": ["runtime.ts", "runtime-state.ts"],
      "difficulty": "medium",
      "due_after": "24h",
      "revisit_after": "t4",
      "completion_state": "pending",
      "created_at": "t3"
    }],
    "memory_summary": {
      "artifact_session_id": "a1",
      "label": "Sibi fixture",
      "root_path": "/tmp/sibi",
      "generated_at": "t4",
      "concept_states": [{
        "concept_id": "runtime-boundary",
        "concept_label": "Runtime boundary",
        "status": "gap_open",
        "confidence": "medium",
        "expected_layer": 4,
        "observed_layer": 2,
        "evidence": [{
          "file_path": "/tmp/sibi/src/runtime.ts",
          "start_line": 1,
          "end_line": 2,
          "excerpt": "handleRequest"
        }],
        "last_answered_at": "t3",
        "next_review_at": "t4",
        "open_gap_ids": ["g1"],
        "challenge_ids": ["p1"]
      }],
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
        "statement": "1 open gap keeps this artifact from being ready.",
        "confidence": "medium",
        "evidence_ids": ["E1"]
      },
      "ready_areas": [],
      "risky_areas": [],
      "verified_concepts": [],
      "open_gaps": [{
        "claim_id": "gap-g1",
        "gap_id": "g1",
        "concept_id": "runtime-boundary",
        "concept_label": "Runtime boundary",
        "title": "Runtime boundary",
        "claim": "Runtime boundary is not ready yet.",
        "readiness": "not ready yet",
        "confidence": "medium",
        "severity": "important",
        "repair_action": "Trace the runtime state path.",
        "evidence_ids": ["E1"]
      }],
      "practice_queue": [{
        "claim_id": "practice-p1",
        "challenge_id": "p1",
        "gap_id": "g1",
        "concept_id": "runtime-boundary",
        "title": "Runtime boundary",
        "claim": "Practice is queued.",
        "readiness": "not ready yet",
        "confidence": "medium",
        "due_after": "24h",
        "revisit_after": "t4",
        "prompt": "Trace command to persisted state.",
        "evidence_ids": ["E1"]
      }],
      "recommended_next_action": {
        "claim_id": "next-action",
        "title": "Recommended next action",
        "action": "Trace command to persisted state.",
        "claim": "Start queued practice.",
        "readiness": "not ready yet",
        "confidence": "medium",
        "evidence_ids": ["E1"]
      },
      "evidence_index": [{
        "evidence_id": "E1",
        "source": "learning_gap",
        "file_path": "/tmp/sibi/src/runtime.ts",
        "start_line": 1,
        "end_line": 2,
        "excerpt": "handleRequest"
      }]
    },
    "evidence_index": [{
      "evidence_id": "SP1",
      "source": "concept_graph",
      "file_path": "/tmp/sibi/src/runtime.ts",
      "start_line": 1,
      "end_line": 2,
      "excerpt": "handleRequest"
    }],
    "operation_state": {
      "message": "Study panel snapshot projected from runtime-owned state."
    }
  }
}
"""#
