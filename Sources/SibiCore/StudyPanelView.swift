import SwiftUI

public struct StudyPanelSection: Equatable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let rows: [String]
}

public struct StudyPanelRenderModel: Equatable, Sendable {
    public let sections: [StudyPanelSection]

    public init(snapshot: StudyPanelSnapshot) {
        let artifact = snapshot.artifact_session
        sections = [
            .init(
                id: "artifact-boundary",
                title: "Artifact",
                rows: [
                    "Artifact session: \(artifact.artifact_session_id)",
                    artifact.label,
                    artifact.learning_goal,
                    "Root: \(artifact.root_path)",
                    "Includes: \(artifact.included_paths.joined(separator: ", "))",
                    "Excludes: \(artifact.excluded_paths.isEmpty ? "None" : artifact.excluded_paths.joined(separator: ", "))",
                    "Confidence: \(artifact.confidence)",
                ]
            ),
            .init(
                id: "concept-map",
                title: "Concept Map",
                rows: conceptRows(snapshot.concept_graph)
            ),
            .init(
                id: "autopsy",
                title: "Autopsy",
                rows: autopsyRows(snapshot.active_autopsy_step, questions: snapshot.current_questions)
            ),
            .init(
                id: "evidence",
                title: "Evidence",
                rows: evidenceRows(snapshot.evidence_index)
            ),
            .init(
                id: "gaps-practice",
                title: "Gaps And Practice",
                rows: gapPracticeRows(snapshot.learning_gaps, challenges: snapshot.practice_challenges)
            ),
            .init(
                id: "memory-readiness",
                title: "Memory And Readiness",
                rows: memoryReadinessRows(snapshot.memory_summary, readiness: snapshot.readiness_report)
            ),
        ]
    }

    public func rows(for sectionID: String) -> [String] {
        sections.first { $0.id == sectionID }?.rows ?? []
    }
}

public struct StudyPanelView: View {
    private let snapshot: StudyPanelSnapshot
    private let onSubmitAnswer: (RuntimeQuestion, String) -> Void
    @State private var draftAnswer = ""

    public init(
        snapshot: StudyPanelSnapshot,
        onSubmitAnswer: @escaping (RuntimeQuestion, String) -> Void = { _, _ in }
    ) {
        self.snapshot = snapshot
        self.onSubmitAnswer = onSubmitAnswer
    }

    public var body: some View {
        let model = StudyPanelRenderModel(snapshot: snapshot)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                ForEach(model.sections) { section in
                    StudyPanelSectionView(section: section)
                }
                answerComposer
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Study Panel")
    }

    @ViewBuilder private var answerComposer: some View {
        if let question = snapshot.current_questions.first {
            VStack(alignment: .leading, spacing: 8) {
                Text("Answer")
                    .font(.headline)
                TextEditor(text: $draftAnswer)
                    .frame(minHeight: 96)
                    .border(Color.secondary.opacity(0.35))
                Button("Submit Answer") {
                    let answer = draftAnswer.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !answer.isEmpty else { return }
                    onSubmitAnswer(question, answer)
                    draftAnswer = ""
                }
                .disabled(draftAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        } else {
            Text("No active question. Prepare an autopsy step in the runtime.")
                .foregroundStyle(.secondary)
        }
    }
}

public struct LiveWorkspaceSessionView: View {
    private let result: StartWorkspaceSessionResult

    public init(result: StartWorkspaceSessionResult) {
        self.result = result
    }

    public var body: some View {
        let loop = result.workspace_session.loop
        VStack(alignment: .leading, spacing: 12) {
            header(loop: loop)
            if let operation = loop?.active_operation {
                operationBlock(operation)
            }
            if let artifact = loop?.thinking_artifacts.first {
                codeBlock(artifact)
            } else {
                Text("No LLM-backed code slice yet. Sibi will not synthesize code without cited runtime output.")
                    .foregroundStyle(.secondary)
            }
            evidenceBlock(loop?.evidence_inventory ?? [], required: loop?.active_operation?.required_evidence ?? [])
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 8))
    }

    private func header(loop: StartWorkspaceLoop?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(loop?.goal ?? "Live workspace")
                .font(.headline)
                .textSelection(.enabled)
            Text("Session \(result.workspace_session.workspace_session_id)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
            Text("Runner \(result.workspace_session.runner.status)")
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.secondary.opacity(0.14), in: Capsule())
        }
    }

    private func operationBlock(_ operation: StartWorkspaceOperation) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("What Sibi Will Judge")
                .font(.subheadline.weight(.semibold))
            Text(operation.prompt)
                .textSelection(.enabled)
            if !operation.success_criteria.isEmpty {
                Text("Success criteria")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                ForEach(operation.success_criteria, id: \.self) { criterion in
                    Text("• \(criterion)")
                        .font(.caption)
                        .textSelection(.enabled)
                }
            }
        }
    }

    private func codeBlock(_ artifact: StartWorkspaceArtifact) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(artifact.title)
                .font(.subheadline.weight(.semibold))
            Text(artifact.payload?.file_path ?? artifact.source_evidence.first?.file_path ?? "No file path")
                .font(.caption.monospaced())
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
            if let lines = artifact.payload?.lines, !lines.isEmpty {
                ScrollView(.horizontal) {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(lines) { line in
                            HStack(alignment: .top, spacing: 10) {
                                Text("\(line.line)")
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                                    .frame(width: 34, alignment: .trailing)
                                Text(line.text)
                                    .font(.caption.monospaced())
                                    .textSelection(.enabled)
                            }
                        }
                    }
                    .padding(10)
                }
                .frame(maxHeight: 220)
                .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 6))
            } else {
                Text("No source lines attached by runtime.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func evidenceBlock(_ evidence: [StartWorkspaceEvidence], required: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Evidence")
                .font(.subheadline.weight(.semibold))
            ForEach(evidence.prefix(8)) { item in
                HStack(alignment: .top, spacing: 8) {
                    Text(required.contains(item.id) ? "required" : item.role)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.secondary.opacity(0.14), in: Capsule())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.path)
                            .font(.caption.monospaced())
                            .textSelection(.enabled)
                        if let excerpt = item.excerpt {
                            Text(excerpt)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .textSelection(.enabled)
                        }
                    }
                }
            }
        }
    }
}

private struct StudyPanelSectionView: View {
    let section: StudyPanelSection

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(section.title)
                .font(.headline)
            ForEach(Array(section.rows.enumerated()), id: \.offset) { _, row in
                Text(row)
                    .font(.body)
                    .textSelection(.enabled)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 4)
    }
}

private func conceptRows(_ graph: StudyPanelConceptGraph?) -> [String] {
    guard let graph else {
        return ["No concept graph yet. Build the concept graph in the runtime."]
    }
    let nodeRows = graph.nodes.map { "\($0.label) (\($0.kind))" }
    let flowRows = graph.edges.prefix(1).map { "Selected flow: \($0.label)" }
    return nodeRows + (flowRows.isEmpty ? ["No selected flow in the snapshot."] : flowRows)
}

private func autopsyRows(_ step: StudyPanelAutopsyStep?, questions: [RuntimeQuestion]) -> [String] {
    guard let step else {
        return ["No active autopsy step. Prepare one from a concept or flow."]
    }
    let question = questions.first
    return [
        "Runtime session: \(step.session_id)",
        "Question: \(step.question_id)",
        step.prompt,
        "Next action: \(step.next_action)",
        "Answer style: \(question?.answer_style ?? "runtime-defined")",
        "Evidence items: \(step.bounded_evidence.count)",
    ]
}

private func evidenceRows(_ evidence: [StudyPanelEvidenceEntry]) -> [String] {
    guard !evidence.isEmpty else {
        return ["No evidence indexed yet."]
    }
    return evidence.map { entry in
        "\(entry.evidence_id) \(entry.source): \(entry.file_path):\(entry.start_line)-\(entry.end_line)"
    }
}

private func gapPracticeRows(
    _ gaps: [StudyPanelLearningGap],
    challenges: [StudyPanelPracticeChallenge]
) -> [String] {
    let gapRows = gaps.isEmpty
        ? ["No open gaps in this snapshot."]
        : gaps.map { "Gap: \($0.concept_label) - \($0.repair_action)" }
    let challengeRows = challenges.isEmpty
        ? ["No practice challenges queued."]
        : challenges.map { "Practice: \($0.prompt) Due \($0.due_after)" }
    return gapRows + challengeRows
}

private func memoryReadinessRows(
    _ memory: StudyPanelMemorySummary,
    readiness: StudyPanelReadinessReport
) -> [String] {
    let memoryRows = memory.concept_states.isEmpty
        ? ["No concept memory yet."]
        : memory.concept_states.map { "\($0.concept_label): \($0.status)" }
    return memoryRows + [
        "Readiness: \(readiness.summary.readiness)",
        readiness.summary.statement,
        "Next: \(readiness.recommended_next_action.action)",
    ]
}
