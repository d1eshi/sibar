import Foundation

public struct ProcessResult: Sendable {
    public let status: Int32
    public let stdout: String
    public let stderr: String

    public init(status: Int32, stdout: String, stderr: String) {
        self.status = status
        self.stdout = stdout
        self.stderr = stderr
    }
}

public protocol ProcessRunning: Sendable {
    func run(executable: String, arguments: [String], standardInput: String) throws -> ProcessResult
}

public enum RuntimeClientError: LocalizedError {
    case invalidResponse
    case processFailure(String)

    public var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Runtime returned an invalid JSON response."
        case .processFailure(let message):
            return message
        }
    }
}

public struct SystemProcessRunner: ProcessRunning {
    private let workingDirectory: String?

    public init(workingDirectory: String? = nil) {
        self.workingDirectory = workingDirectory
    }

    public func run(executable: String, arguments: [String], standardInput: String) throws -> ProcessResult {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments
        if let workingDirectory {
            process.currentDirectoryURL = URL(fileURLWithPath: workingDirectory, isDirectory: true)
        }

        let inputPipe = Pipe()
        let outputPipe = Pipe()
        let errorPipe = Pipe()
        process.standardInput = inputPipe
        process.standardOutput = outputPipe
        process.standardError = errorPipe

        try process.run()

        if let data = standardInput.data(using: .utf8) {
            inputPipe.fileHandleForWriting.write(data)
        }
        try inputPipe.fileHandleForWriting.close()

        process.waitUntilExit()

        let stdoutData = try outputPipe.fileHandleForReading.readToEnd() ?? Data()
        let stderrData = try errorPipe.fileHandleForReading.readToEnd() ?? Data()

        return ProcessResult(
            status: process.terminationStatus,
            stdout: String(decoding: stdoutData, as: UTF8.self),
            stderr: String(decoding: stderrData, as: UTF8.self)
        )
    }
}

public final class RuntimeClient: Sendable {
    private let runner: ProcessRunning
    private let executable: String
    private let arguments: [String]
    private let repoRoot: String?

    public init(
        runner: ProcessRunning? = nil,
        executable: String = "/usr/bin/env",
        arguments: [String]? = nil,
        runtimePath: String? = nil
    ) {
        self.executable = executable

        let resolvedRuntimePath = runtimePath ?? Self.defaultRuntimePath()
        let resolvedRepoRoot = Self.resolveRepoRoot(runtimePath: resolvedRuntimePath)
        self.repoRoot = resolvedRepoRoot
        self.runner = runner ?? SystemProcessRunner(workingDirectory: resolvedRepoRoot)
        self.arguments = arguments ?? ["node", "--experimental-strip-types", resolvedRuntimePath]
    }

    static func resolveRepoRoot(runtimePath: String) -> String? {
        let runtimeURL = URL(fileURLWithPath: runtimePath).standardizedFileURL
        guard runtimeURL.lastPathComponent == "runtime.ts",
              runtimeURL.deletingLastPathComponent().lastPathComponent == "engine" else {
            return nil
        }
        return runtimeURL.deletingLastPathComponent().deletingLastPathComponent().path
    }

    static func defaultRuntimePath() -> String {
        resolveRuntimePath(
            environment: ProcessInfo.processInfo.environment,
            currentDirectory: FileManager.default.currentDirectoryPath,
            executablePath: CommandLine.arguments.first,
            bundleResourcePath: Bundle.main.resourcePath,
            sourceFilePath: #filePath,
            fileExists: { FileManager.default.fileExists(atPath: $0) }
        )
    }

    static func resolveRuntimePath(
        environment: [String: String],
        currentDirectory: String,
        executablePath: String?,
        bundleResourcePath: String? = nil,
        sourceFilePath: String = #filePath,
        fileExists: (String) -> Bool
    ) -> String {
        if let configured = nonEmpty(environment["SIBI_RUNTIME_PATH"]) {
            return configured
        }

        var directCandidates: [String] = []
        if let repoRoot = nonEmpty(environment["SIBI_REPO_ROOT"]) {
            directCandidates.append(URL(fileURLWithPath: repoRoot).appendingPathComponent("engine/runtime.ts").path)
        }
        if let bundleResourcePath = nonEmpty(bundleResourcePath) {
            directCandidates.append(URL(fileURLWithPath: bundleResourcePath).appendingPathComponent("engine/runtime.ts").path)
            directCandidates.append(URL(fileURLWithPath: bundleResourcePath).appendingPathComponent("runtime.ts").path)
        }
        directCandidates.append(URL(fileURLWithPath: currentDirectory).appendingPathComponent("engine/runtime.ts").path)

        for candidate in directCandidates where fileExists(candidate) {
            return candidate
        }

        var roots: [String] = []
        if let executablePath = nonEmpty(executablePath) {
            roots.append(URL(fileURLWithPath: executablePath).deletingLastPathComponent().path)
        }
        roots.append(URL(fileURLWithPath: sourceFilePath).deletingLastPathComponent().path)

        for root in roots {
            for ancestor in ancestors(startingAt: root) {
                let candidate = URL(fileURLWithPath: ancestor).appendingPathComponent("engine/runtime.ts").path
                if fileExists(candidate) {
                    return candidate
                }
            }
        }

        return URL(fileURLWithPath: currentDirectory).appendingPathComponent("engine/runtime.ts").path
    }

    private static func nonEmpty(_ value: String?) -> String? {
        guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
            return nil
        }
        return trimmed
    }

    private static func ancestors(startingAt path: String) -> [String] {
        var result: [String] = []
        var url = URL(fileURLWithPath: path, isDirectory: true).standardizedFileURL
        while true {
            result.append(url.path)
            let parent = url.deletingLastPathComponent()
            if parent.path == url.path { break }
            url = parent
        }
        return result
    }

    public func declareIntent(_ payload: DeclareIntentPayload) throws -> DeclareIntentResult {
        try send(command: "declare_intent", payload: payload)
    }

    public func prepareCodeQuestion(_ payload: PrepareCodeQuestionPayload) throws -> PrepareCodeQuestionResult {
        try send(command: "prepare_code_question", payload: payload)
    }

    public func generateQuestions(_ payload: GenerateQuestionsPayload = .init()) throws -> GenerateQuestionsResult {
        try send(command: "generate_questions", payload: payload)
    }

    public func answerQuestion(_ payload: AnswerQuestionPayload) throws -> AnswerQuestionResult {
        try send(command: "answer_question", payload: payload)
    }

    public func getSessionSummary(_ payload: SessionSummaryPayload = .init()) throws -> SessionSummaryResult {
        try send(command: "get_session_summary", payload: payload)
    }

    public func getStudyPanelState(_ payload: StudyPanelStatePayload = .init()) throws -> StudyPanelSnapshot {
        try send(command: "get_study_panel_state", payload: payload)
    }

    public func startWorkspaceSession(_ payload: StartWorkspaceSessionPayload) throws -> StartWorkspaceSessionResult {
        try send(command: "start_workspace_session", payload: payload)
    }

    public func submitWorkspaceAttempt(_ payload: SubmitWorkspaceAttemptPayload) throws -> StartWorkspaceSessionResult {
        try send(command: "submit_workspace_attempt", payload: payload)
    }

    func send<Response: Decodable, Payload: Encodable>(command: String, payload: Payload) throws -> Response {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let decoder = JSONDecoder()
        let requestData = try encoder.encode(RuntimeCommandRequest(command: command, payload: payload))
        guard let request = String(data: requestData, encoding: .utf8) else {
            throw RuntimeClientError.invalidResponse
        }

        let result = try runner.run(executable: executable, arguments: arguments, standardInput: request)
        guard let outputData = result.stdout.data(using: .utf8) else {
            throw RuntimeClientError.invalidResponse
        }

        do {
            let envelope = try decoder.decode(RuntimeEnvelope<Response>.self, from: outputData)
            if envelope.ok, let data = envelope.data {
                return data
            }

            if let error = envelope.error {
                throw error
            }
        } catch let error as RuntimeErrorPayload {
            throw error
        } catch {
            let fallback = result.stderr.trimmingCharacters(in: .whitespacesAndNewlines)
            if result.status != 0, !fallback.isEmpty {
                throw RuntimeClientError.processFailure(fallback)
            }
            throw RuntimeClientError.invalidResponse
        }

        let fallback = result.stderr.trimmingCharacters(in: .whitespacesAndNewlines)
        throw RuntimeClientError.processFailure(fallback.isEmpty ? "Runtime command failed." : fallback)
    }
}
