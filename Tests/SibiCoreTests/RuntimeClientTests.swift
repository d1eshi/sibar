import Foundation
import XCTest
@testable import SibiCore

private struct StubPayload: Codable {
    let value: String
}

private struct StubResponse: Codable, Equatable {
    let message: String
}

private final class StubRunner: ProcessRunning, @unchecked Sendable {
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

final class RuntimeClientTests: XCTestCase {
    func testDecodesSuccessfulEnvelope() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: #"{"ok":true,"data":{"message":"ready"}}"#,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let response: StubResponse = try sendStub(client)

        XCTAssertEqual(response, .init(message: "ready"))
    }

    func testThrowsRuntimeErrorEnvelope() {
        let runner = StubRunner(result: .init(
            status: 1,
            stdout: #"{"ok":false,"error":{"code":"missing_session","message":"Session not found"}}"#,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        XCTAssertThrowsError(try sendStub(client)) { error in
            let runtimeError = error as? RuntimeErrorPayload
            XCTAssertEqual(runtimeError?.code, "missing_session")
            XCTAssertEqual(runtimeError?.message, "Session not found")
        }
    }

    func testThrowsProcessFailureWhenRuntimeExitsWithoutJSON() {
        let runner = StubRunner(result: .init(status: 1, stdout: "", stderr: "node failed"))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        XCTAssertThrowsError(try sendStub(client)) { error in
            XCTAssertEqual(error.localizedDescription, "node failed")
        }
    }

    func testSendsDeclareIntentCommand() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: #"{"ok":true,"data":{"session_id":"s1","declared_intent":{"intent_id":"i1","created_at":"t1","project_label":"sibi","project_path":"/tmp/sibi","statement":"Understand runtime","uncertainty":"Need the bridge contract","expected_work_area":"runtime","desired_help":"generate_questions"},"operation_state":{"message":"declared"}}}"#,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.declareIntent(.init(
            project_label: "sibi",
            project_path: "/tmp/sibi",
            statement: "Understand runtime",
            uncertainty: "Need the bridge contract",
            expected_work_area: "runtime"
        ))

        XCTAssertEqual(result.session_id, "s1")
        XCTAssertEqual(result.declared_intent.project_label, "sibi")
        XCTAssertTrue(runner.standardInput.contains(#""command":"declare_intent""#))
        XCTAssertTrue(runner.standardInput.contains(#""statement":"Understand runtime""#))
    }

    func testSendsPrepareCodeQuestionCommandAndDecodesRuntimeLayers() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: #"{"ok":true,"data":{"session_id":"s-code","selection":{"file_path":"/tmp/A.ts","project_path":"/tmp","language":"typescript","start_line":1,"end_line":2,"selected_text":"export const a = 1;","surrounding_text":"export const a = 1;"},"question":{"question_id":"q-code","created_at":"t1","session_id":"s-code","prompt":"Prompt?","target_area":"A.ts","why_it_matters":"why","evidence_basis":["file_path=/tmp/A.ts"],"answer_style":"risk_analysis","detected_layer":2,"required_layer":4,"answer":null,"answer_quality":null},"operation_state":{"message":"prepared"}}}"#,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.prepareCodeQuestion(.init(
            project_label: "sibi",
            project_path: "/tmp",
            file_path: "/tmp/A.ts",
            start_line: 1,
            end_line: 2
        ))

        XCTAssertEqual(result.session_id, "s-code")
        XCTAssertEqual(result.selection.language, "typescript")
        XCTAssertEqual(result.question.detected_layer, 2)
        XCTAssertEqual(result.question.required_layer, 4)
        XCTAssertTrue(runner.standardInput.contains(#""command":"prepare_code_question""#))
    }

    func testSendsGenerateQuestionsCommand() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: #"{"ok":true,"data":{"session_id":"s1","questions":[{"question_id":"q1","created_at":"t1","session_id":"s1","prompt":"Prompt?","target_area":"runtime","why_it_matters":"why","evidence_basis":["e"],"answer_style":"risk_analysis","detected_layer":2,"required_layer":4,"answer":null,"answer_quality":null}],"learning_signals":[{"signal_id":"sig1","created_at":"t1","source":"ownership_question","project_label":"sibi","project_path":null,"concept_or_area":"runtime","reason":"gap","evidence":["e"],"severity":"important","confidence":"high"}],"operation_state":{"message":"generated"}}}"#,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.generateQuestions(.init(session_id: "s1"))

        XCTAssertEqual(result.questions.first?.question_id, "q1")
        XCTAssertEqual(result.learning_signals.first?.signal_id, "sig1")
        XCTAssertTrue(runner.standardInput.contains(#""command":"generate_questions""#))
    }

    func testSendsAnswerQuestionCommandAndDecodesSummary() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: #"{"ok":true,"data":{"session_id":"s-code","question":{"question_id":"q-code","created_at":"t1","session_id":"s-code","prompt":"Prompt?","target_area":"A.ts","why_it_matters":"why","evidence_basis":["e"],"answer_style":"risk_analysis","detected_layer":2,"required_layer":4,"answer":"It owns the boundary because state stays in TypeScript.","answer_quality":"verified"},"session_summary":{"session_id":"s-code","project_label":"sibi","started_at":"t1","ended_at":"t2","declared_intent":null,"observed_tools":["typescript-runtime","code-range-selection"],"learning_signals":[],"ownership_questions":[{"question_id":"q-code","created_at":"t1","session_id":"s-code","prompt":"Prompt?","target_area":"A.ts","why_it_matters":"why","evidence_basis":["e"],"answer_style":"risk_analysis","detected_layer":2,"required_layer":4,"answer":"It owns the boundary because state stays in TypeScript.","answer_quality":"verified"}],"export_state":"ready_for_review","code_selection":{"file_path":"/tmp/A.ts","project_path":"/tmp","language":"typescript","start_line":1,"end_line":2,"selected_text":"export const a = 1;","surrounding_text":"export const a = 1;"}},"operation_state":{"message":"verified"}}}"#,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.answerQuestion(.init(
            session_id: "s-code",
            question_id: "q-code",
            answer: "It owns the boundary because state stays in TypeScript."
        ))

        XCTAssertEqual(result.question.answer_quality, "verified")
        XCTAssertEqual(result.session_summary.code_selection?.language, "typescript")
        XCTAssertEqual(result.session_summary.ownership_questions.first?.required_layer, 4)
        XCTAssertTrue(runner.standardInput.contains(#""command":"answer_question""#))
    }

    func testSendsGetSessionSummaryCommand() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: #"{"ok":true,"data":{"session_summary":{"session_id":"s1","project_label":"sibi","started_at":"t1","ended_at":null,"declared_intent":null,"observed_tools":["typescript-runtime"],"learning_signals":[],"ownership_questions":[],"export_state":"not_exported","code_selection":null},"operation_state":{"message":"loaded"}}}"#,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.getSessionSummary(.init(session_id: "s1"))

        XCTAssertEqual(result.session_summary.session_id, "s1")
        XCTAssertEqual(result.session_summary.observed_tools, ["typescript-runtime"])
        XCTAssertTrue(runner.standardInput.contains(#""command":"get_session_summary""#))
    }

    func testRuntimeClientCallsActualTypeScriptRuntime() throws {
        let fileManager = FileManager.default
        let tempRoot = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("sibi-swift-runtime-\(UUID().uuidString)", isDirectory: true)
        try fileManager.createDirectory(at: tempRoot, withIntermediateDirectories: true)
        defer { try? fileManager.removeItem(at: tempRoot) }

        setenv("SIBI_RUNTIME_HOME", tempRoot.appendingPathComponent("runtime-home").path, 1)
        defer { unsetenv("SIBI_RUNTIME_HOME") }

        let runtimePath = URL(fileURLWithPath: fileManager.currentDirectoryPath)
            .appendingPathComponent("engine/runtime.ts")
            .path
        let client = RuntimeClient(runtimePath: runtimePath)

        let declared = try client.declareIntent(.init(
            project_label: "sibi",
            project_path: nil,
            statement: "Validate the Swift bridge against the TypeScript runtime.",
            uncertainty: "Need to prove the native bridge keeps state in TypeScript.",
            expected_work_area: "Swift bridge"
        ))

        let generated = try client.generateQuestions(.init(session_id: declared.session_id))
        XCTAssertFalse(generated.questions.isEmpty)

        let fileURL = tempRoot.appendingPathComponent("BridgeTarget.ts")
        try "export function bridgeTarget() {\n  return \"typescript\";\n}\n".write(to: fileURL, atomically: true, encoding: .utf8)

        let prepared = try client.prepareCodeQuestion(.init(
            project_label: "sibi",
            project_path: tempRoot.path,
            file_path: fileURL.path,
            start_line: 1,
            end_line: 3
        ))

        XCTAssertEqual(prepared.selection.language, "typescript")
        XCTAssertGreaterThanOrEqual(prepared.question.detected_layer, 1)
        XCTAssertLessThanOrEqual(prepared.question.detected_layer, 5)
        XCTAssertEqual(prepared.question.required_layer, 4)

        let answered = try client.answerQuestion(.init(
            session_id: prepared.session_id,
            question_id: prepared.question.question_id,
            answer: "This selection owns the native bridge boundary because Swift only sends payloads while TypeScript owns state and evidence."
        ))

        XCTAssertEqual(answered.session_summary.session_id, prepared.session_id)
        XCTAssertEqual(answered.question.answer_quality, "verified")

        let summary = try client.getSessionSummary(.init(session_id: prepared.session_id))
        XCTAssertEqual(summary.session_summary.session_id, prepared.session_id)
        XCTAssertEqual(
            URL(fileURLWithPath: summary.session_summary.code_selection?.file_path ?? "").lastPathComponent,
            "BridgeTarget.ts"
        )
        XCTAssertTrue(summary.session_summary.code_selection?.file_path.contains(tempRoot.lastPathComponent) ?? false)
    }

    func testRuntimePathResolvesFromConfiguredEnvironment() {
        let path = RuntimeClient.resolveRuntimePath(
            environment: ["SIBI_RUNTIME_PATH": "/tmp/custom-runtime.ts"],
            currentDirectory: "/",
            executablePath: nil,
            fileExists: { _ in false }
        )

        XCTAssertEqual(path, "/tmp/custom-runtime.ts")
    }

    func testRuntimePathResolvesFromRepoRootEnvironment() {
        let path = RuntimeClient.resolveRuntimePath(
            environment: ["SIBI_REPO_ROOT": "/tmp/sibi"],
            currentDirectory: "/",
            executablePath: nil,
            fileExists: { $0 == "/tmp/sibi/engine/runtime.ts" }
        )

        XCTAssertEqual(path, "/tmp/sibi/engine/runtime.ts")
    }

    func testRuntimePathResolvesFromExecutableAncestor() {
        let repoRoot = "/tmp/sibi"
        let runtime = repoRoot + "/engine/runtime.ts"
        let executable = repoRoot + "/.build/debug/SibiCoreTests"

        let path = RuntimeClient.resolveRuntimePath(
            environment: [:],
            currentDirectory: "/",
            executablePath: executable,
            sourceFilePath: "/missing/Sources/SibiCore/RuntimeClient.swift",
            fileExists: { $0 == runtime }
        )

        XCTAssertEqual(path, runtime)
    }

    func testRepoRootResolvesFromEngineRuntimePath() {
        XCTAssertEqual(
            RuntimeClient.resolveRepoRoot(runtimePath: "/tmp/sibi/engine/runtime.ts"),
            "/tmp/sibi"
        )
        XCTAssertNil(RuntimeClient.resolveRepoRoot(runtimePath: "/tmp/sibi/src/runtime.ts"))
    }

    func testSendsStartWorkspaceSessionCommand() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: startWorkspaceSessionEnvelopeJSON,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.startWorkspaceSession(.init(
            goal: "Explain project ownership boundaries.",
            root: "/tmp/sibi",
            codex_command: "auto"
        ))

        XCTAssertEqual(result.workspace_session.workspace_session_id, "ws-1")
        XCTAssertEqual(result.workspace_session.runner.status, "completed")

        let requestData = try XCTUnwrap(runner.standardInput.data(using: .utf8))
        let requestObject = try JSONSerialization.jsonObject(with: requestData) as? [String: Any]
        let payload = try XCTUnwrap(requestObject?["payload"] as? [String: Any])

        XCTAssertEqual(requestObject?["command"] as? String, "start_workspace_session")
        XCTAssertEqual(payload["goal"] as? String, "Explain project ownership boundaries.")
        XCTAssertEqual(payload["root"] as? String, "/tmp/sibi")
        XCTAssertEqual(payload["root_path"] as? String, "/tmp/sibi")
        XCTAssertEqual(payload["codex_command"] as? String, "auto")
        XCTAssertNil(payload["fixture_model_response_path"])
    }

    func testSendsStartWorkspaceSessionCommandWithFixtureModelResponsePath() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: startWorkspaceSessionEnvelopeJSON,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        _ = try client.startWorkspaceSession(.init(
            goal: "Explain project ownership boundaries.",
            root: "/tmp/sibi",
            codex_command: "auto",
            fixture_model_response_path: "evals/deep-ownership-workspace/fixtures/live-workspace-session.json"
        ))

        let requestData = try XCTUnwrap(runner.standardInput.data(using: .utf8))
        let requestObject = try JSONSerialization.jsonObject(with: requestData) as? [String: Any]
        let payload = try XCTUnwrap(requestObject?["payload"] as? [String: Any])

        XCTAssertEqual(requestObject?["command"] as? String, "start_workspace_session")
        XCTAssertEqual(payload["fixture_model_response_path"] as? String, "evals/deep-ownership-workspace/fixtures/live-workspace-session.json")
    }

    func testSendsSubmitWorkspaceAttemptCommand() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: submitWorkspaceAttemptEnvelopeJSON,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.submitWorkspaceAttempt(.init(
            workspace_session_id: "ws-1",
            answer_text: "The project handles command dispatch by reading the input.",
            selected_evidence: ["EV-LIVE-1"],
            declared_confidence: "medium",
            declared_unknowns: ["I am not sure about edge cases."]
        ))

        XCTAssertEqual(result.workspace_session.workspace_session_id, "ws-1")
        XCTAssertEqual(result.workspace_session.loop?.sample_attempt?.declared_confidence, "medium")
        XCTAssertEqual(result.workspace_session.loop?.evidence_check?.result, "confirmed")

        let requestData = try XCTUnwrap(runner.standardInput.data(using: .utf8))
        let requestObject = try JSONSerialization.jsonObject(with: requestData) as? [String: Any]
        let payload = try XCTUnwrap(requestObject?["payload"] as? [String: Any])

        XCTAssertEqual(requestObject?["command"] as? String, "submit_workspace_attempt")
        XCTAssertEqual(payload["workspace_session_id"] as? String, "ws-1")
        XCTAssertEqual(payload["answer_text"] as? String, "The project handles command dispatch by reading the input.")
        XCTAssertEqual((payload["selected_evidence"] as? [String]), ["EV-LIVE-1"])
        XCTAssertEqual(payload["declared_confidence"] as? String, "medium")
        XCTAssertEqual((payload["declared_unknowns"] as? [String]), ["I am not sure about edge cases."])
        XCTAssertEqual(payload["action"] as? String, "submit")
    }

    func testSendsSubmitWorkspaceAttemptCommandWithExplicitAction() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: submitWorkspaceAttemptEnvelopeJSON,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.submitWorkspaceAttempt(.init(
            workspace_session_id: "ws-1",
            answer_text: "I am not sure on purpose.",
            selected_evidence: [],
            declared_confidence: "medium",
            declared_unknowns: [],
            action: .i_do_not_know
        ))

        XCTAssertEqual(result.workspace_session.workspace_session_id, "ws-1")

        let requestData = try XCTUnwrap(runner.standardInput.data(using: .utf8))
        let requestObject = try JSONSerialization.jsonObject(with: requestData) as? [String: Any]
        let payload = try XCTUnwrap(requestObject?["payload"] as? [String: Any])
        XCTAssertEqual(payload["action"] as? String, "i_do_not_know")
    }

    func testStartWorkspaceSessionResponseDecodesLiveWorkspaceContract() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: startWorkspaceSessionLiveWorkspaceEnvelopeJSON,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.startWorkspaceSession(.init(
            goal: "Understand ownership boundaries.",
            root: "/tmp/sibi",
            codex_command: "auto"
        ))

        let liveSession = try XCTUnwrap(result.workspace_session.live_workspace)
        XCTAssertEqual(liveSession.session_id, "ws-1")
        XCTAssertEqual(liveSession.project_label, "Ownership Runtime Slice")
        XCTAssertEqual(liveSession.phase, "GapOrReady")
        XCTAssertEqual(liveSession.active_operation?.operation_id, "OP-1")
        XCTAssertEqual(liveSession.artifact_previews.first?.artifact_id, "TA-1")
        XCTAssertNil(liveSession.last_attempt_evaluation)
        XCTAssertNil(liveSession.submitted_attempt)
        XCTAssertEqual(liveSession.ui_reproduction.test_path, "Tests/workspace-live-session.test.ts")
        XCTAssertNil(liveSession.ui_reproduction.fixture_path)
        XCTAssertNil(liveSession.ui_reproduction.demo_path)
    }

    func testSubmitWorkspaceAttemptResponseDecodesAttemptEvaluationContract() throws {
        let runner = StubRunner(result: .init(
            status: 0,
            stdout: submitWorkspaceAttemptWithEvaluationEnvelopeJSON,
            stderr: ""
        ))
        let client = RuntimeClient(runner: runner, arguments: ["node", "runtime.js"])

        let result = try client.submitWorkspaceAttempt(.init(
            workspace_session_id: "ws-1",
            answer_text: "The project routes command through request.command.",
            selected_evidence: ["EV-1"],
            declared_confidence: "medium",
            declared_unknowns: []
        ))

        let evaluation = try XCTUnwrap(result.workspace_session.live_workspace?.last_attempt_evaluation)
        XCTAssertEqual(evaluation.attempt_id, "AT-1")
        XCTAssertEqual(evaluation.evidence_check.result, "confirmed")
        XCTAssertEqual(evaluation.scoped_readiness.status, "ready")
        XCTAssertEqual(evaluation.updated_workspace_session?.next_action, "continue")
        XCTAssertNil(evaluation.repair_action)
        let submittedAttempt = try XCTUnwrap(result.workspace_session.live_workspace?.submitted_attempt)
        XCTAssertEqual(submittedAttempt.operation_id, "OP-1")
        XCTAssertEqual(submittedAttempt.action, "submit")
        XCTAssertEqual(submittedAttempt.selected_evidence_ids, ["EV-1"])
    }

    private func sendStub(_ client: RuntimeClient) throws -> StubResponse {
        try client.send(command: "stub", payload: StubPayload(value: "x"))
    }
}

private let startWorkspaceSessionEnvelopeJSON = #"{"ok":true,"data":{"workspace_session":{"workspace_session_id":"ws-1","artifact_session_id":"as-1","runner":{"status":"completed","accepted_signal_count":1,"rejected_signal_count":0}}}}"#

private let submitWorkspaceAttemptEnvelopeJSON = #"""
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
        "evidence_inventory": [
          {
            "id": "EV-LIVE-1",
            "path": "src/runtime.ts",
            "role": "implementation",
            "excerpt": "Runtime dispatcher",
            "content_hash": "sha256:abc"
          }
        ],
        "concept_slice": null,
        "thinking_artifacts": [],
        "active_operation": {
          "id": "OP-LIVE-1",
          "kind": "explain",
          "prompt": "Explain the command dispatcher.",
          "required_evidence": ["EV-LIVE-1"],
          "success_criteria": ["Cites command dispatch behavior."]
        },
        "sample_attempt": {
          "id": "AT-1",
          "operation_id": "OP-LIVE-1",
          "answer_text": "The project handles command dispatch by reading the input.",
          "selected_evidence": ["EV-LIVE-1"],
          "declared_confidence": "medium",
          "declared_unknowns": ["I am not sure about edge cases."]
        },
        "evidence_check": {
          "id": "EC-1",
          "attempt_id": "AT-1",
          "required_claims": ["Runtime has a command input"],
          "observed_claims": ["Runtime has a command input"],
          "missing_claims": [],
          "contradicted_claims": [],
          "unsupported_claims": [],
          "cited_evidence": [{
            "evidence_id": "EV-LIVE-1",
            "file_path": "src/runtime.ts",
            "start_line": 1,
            "end_line": 3,
            "excerpt": "Runtime dispatcher",
            "role": "implementation"
          }],
          "artifact_counterevidence": [],
          "result": "confirmed"
        }
      }
    },
    "snapshot": null
  }
}
"""#

private let startWorkspaceSessionLiveWorkspaceEnvelopeJSON = #"""
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
      "live_workspace": {
        "session_id": "ws-1",
        "repo_root": "/tmp/sibi",
        "project_label": "Ownership Runtime Slice",
        "source_control_summary": {
          "available": true,
          "branch": "main",
          "head": null,
          "status_short": "workspace clean",
          "diff_stat": "",
          "diff_name_status": ""
        },
        "worktree": {
          "root_path": "/tmp/sibi",
          "paths": [
            "src/runtime.ts",
            "package.json"
          ]
        },
        "artifact_tree": {
          "root_path": "/tmp/sibi",
          "paths": [
            "src/runtime.ts"
          ]
        },
        "selected": [".", "src"],
        "excluded": [".git", "dist"],
        "unknown": [],
        "artifact_previews": [
          {
            "artifact_id": "TA-1",
            "path": "src/runtime.ts",
            "title": "runtime.ts",
            "artifact_type": "code",
            "language": "ts",
            "excerpt": "export function start() {}",
            "slice_content": null,
            "line_start": 1,
            "line_end": 1,
            "preview_fallback_reason": null,
            "evidence_ids": ["EV-1"]
          }
        ],
        "required_evidence": ["EV-1"],
        "success_criteria": ["explain request dispatch"],
        "current_prompt": "Explain runtime ownership for command dispatch.",
        "phase": "GapOrReady",
        "next_action": "review readiness and repair if needed",
        "evidence": [
          {
            "evidence_id": "EV-1",
            "artifact_id": "A-1",
            "path": "src/runtime.ts",
            "title": "runtime.ts",
            "line_range": {
              "line_start": 1,
              "line_end": 3
            },
            "location": "src/runtime.ts",
            "label": "implementation",
            "excerpt": "export function start() {}",
            "required": true,
            "optional": false
          }
        ],
        "active_operation": {
          "operation_id": "OP-1",
          "slice_id": "CS-1",
          "operation_kind": "explain",
          "prompt": "Explain this project boundary.",
          "required_evidence": ["EV-1"],
          "success_criteria": ["explain request dispatch"]
        },
        "ui_reproduction": {
          "fixture_path": null,
          "demo_path": null,
          "test_path": "Tests/workspace-live-session.test.ts"
        }
      }
    },
    "snapshot": null
  }
}
"""#

private let submitWorkspaceAttemptWithEvaluationEnvelopeJSON = #"""
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
        "goal": "Explain this project",
        "evidence_inventory": [],
        "concept_slice": {
          "id": "CS-1",
          "label": "request command contract",
          "domain": "runtime",
          "operation_target": "explain",
          "prerequisite_concepts": [],
          "source_evidence": [],
          "behavior_evidence": [],
          "risk_evidence": [],
          "expected_user_operations": ["explain"]
        },
        "thinking_artifacts": [],
        "active_operation": {
          "id": "OP-1",
          "kind": "explain",
          "prompt": "Explain this project boundary.",
          "required_evidence": ["EV-1"],
          "success_criteria": ["explain request dispatch"]
        },
        "sample_attempt": {
          "id": "AT-1",
          "operation_id": "OP-1",
          "answer_text": "The project routes command through request.command.",
          "selected_evidence": ["EV-1"],
          "declared_confidence": "medium",
          "declared_unknowns": []
        },
        "evidence_check": {
          "id": "EC-1",
          "attempt_id": "AT-1",
          "required_claims": ["explain request dispatch"],
          "observed_claims": ["explain request dispatch"],
          "missing_claims": [],
          "contradicted_claims": [],
          "unsupported_claims": [],
          "cited_evidence": [
            {
              "evidence_id": "EV-1",
              "file_path": "src/runtime.ts",
              "start_line": 1,
              "end_line": 3,
              "excerpt": "export function start() {}",
              "role": "implementation"
            }
          ],
          "artifact_counterevidence": [],
          "result": "confirmed"
        }
      },
      "live_workspace": {
        "session_id": "ws-1",
        "repo_root": "/tmp/sibi",
        "project_label": "Ownership Runtime Slice",
        "source_control_summary": {
          "available": true,
          "branch": "main",
          "head": null,
          "status_short": "workspace clean",
          "diff_stat": "",
          "diff_name_status": ""
        },
        "worktree": {
          "root_path": "/tmp/sibi",
          "paths": [
            "src/runtime.ts",
            "package.json"
          ]
        },
        "artifact_tree": {
          "root_path": "/tmp/sibi",
          "paths": [
            "src/runtime.ts"
          ]
        },
        "selected": [".", "src"],
        "excluded": [".git", "dist"],
        "unknown": [],
        "artifact_previews": [
          {
            "artifact_id": "TA-1",
            "path": "src/runtime.ts",
            "title": "runtime.ts",
            "artifact_type": "code",
            "language": "ts",
            "excerpt": "export function start() {}",
            "slice_content": null,
            "line_start": 1,
            "line_end": 1,
            "preview_fallback_reason": null,
            "evidence_ids": ["EV-1"]
          }
        ],
        "required_evidence": ["EV-1"],
        "success_criteria": ["explain request dispatch"],
        "current_prompt": "Explain runtime ownership for command dispatch.",
        "phase": "GapOrReady",
        "next_action": "continue",
        "last_attempt_evaluation": {
          "attempt_id": "AT-1",
          "evidence_check": {
            "result": "confirmed",
            "required_claims": ["explain request dispatch"],
            "observed_claims": ["explain request dispatch"],
            "missing_claims": [],
            "contradicted_claims": [],
            "unsupported_claims": [],
            "cited_evidence": [
              {
                "evidence_id": "EV-1",
                "artifact_id": "A-1",
                "path": "src/runtime.ts",
                "title": "runtime.ts",
                "line_range": {
                  "line_start": 1,
                  "line_end": 3
                },
                "location": "src/runtime.ts",
                "label": "implementation",
                "excerpt": "export function start() {}",
                "required": true,
                "optional": false
              }
            ]
          },
          "missing_evidence": [],
          "detected_gap": null,
          "repair_action": null,
          "reattempt_prompt": "Retry with evidence references.",
          "scoped_readiness": {
            "status": "ready",
            "scope": "Attempt confirmed by cited evidence.",
            "blocked_claims": []
          },
          "updated_workspace_session": {
            "session_id": "ws-1",
            "phase": "GapOrReady",
            "next_action": "continue"
          }
        },
        "evidence": [
          {
            "evidence_id": "EV-1",
            "artifact_id": "A-1",
            "path": "src/runtime.ts",
            "title": "runtime.ts",
            "line_range": {
              "line_start": 1,
              "line_end": 3
            },
            "location": "src/runtime.ts",
            "label": "implementation",
            "excerpt": "export function start() {}",
            "required": true,
            "optional": false
          }
        ],
        "active_operation": {
          "operation_id": "OP-1",
          "slice_id": "CS-1",
          "operation_kind": "explain",
          "prompt": "Explain this project boundary.",
          "required_evidence": ["EV-1"],
          "success_criteria": ["explain request dispatch"]
        },
        "submitted_attempt": {
          "session_id": "ws-1",
          "operation_id": "OP-1",
          "slice_id": "CS-1",
          "answer_text": "The project routes command through request.command.",
          "selected_evidence_ids": ["EV-1"],
          "confidence": "medium",
          "declared_unknowns": [],
          "action": "submit"
        },
        "ui_reproduction": {
          "fixture_path": null,
          "demo_path": null,
          "test_path": "Tests/workspace-live-session.test.ts"
        }
      }
    },
    "snapshot": null
  }
}
"""#
