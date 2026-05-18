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
            .appendingPathComponent("src/runtime.ts")
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
            fileExists: { $0 == "/tmp/sibi/src/runtime.ts" }
        )

        XCTAssertEqual(path, "/tmp/sibi/src/runtime.ts")
    }

    func testRuntimePathResolvesFromExecutableAncestor() {
        let repoRoot = "/tmp/sibi"
        let runtime = repoRoot + "/src/runtime.ts"
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
