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

public struct LiveWorkspaceRenderModel: Equatable, Sendable {
    public struct LeftPanel: Equatable, Sendable {
        public let title: String
        public let worktreePaths: [String]
        public let artifactPaths: [String]
        public let selectedPaths: [String]
        public let excludedPaths: [String]
        public let unknownPaths: [String]
        public let activeMarker: String
    }

    public struct CenterPanel: Equatable, Sendable {
        public let title: String
        public let artifactTitle: String
        public let artifactPath: String
        public let artifactType: String
        public let artifactLineSpan: String
        public let requiredEvidenceIDs: [String]
        public let hasArtifact: Bool
    }

    public struct RightPanel: Equatable, Sendable {
        public let title: String
        public let phase: String
        public let currentPrompt: String
        public let nextAction: String
        public let operationPrompt: String
        public let operationSuccessCriteria: [String]
        public let requiredEvidenceIDs: [String]
        public let hasActiveOperation: Bool
        public let activeOperationID: String
        public let evaluationReadiness: String?
    }

    public let left: LeftPanel
    public let center: CenterPanel
    public let right: RightPanel

    public init(result: StartWorkspaceSessionResult) {
        let liveWorkspace = result.workspace_session.live_workspace
        let loop = result.workspace_session.loop

        let selectedOperation = liveWorkspace?.active_operation ?? loopOperation(from: loop)
        let requiredEvidence = deduplicatedEvidence(
            liveWorkspace?.active_operation?.required_evidence
                ?? liveWorkspace?.required_evidence
                ?? loop?.active_operation?.required_evidence
                ?? []
        )
        let marker = operationMarker(for: liveWorkspace?.active_operation?.slice_id)

        left = LeftPanel(
            title: "Worktree / Artifact Directory",
            worktreePaths: liveWorkspace?.worktree.paths ?? [],
            artifactPaths: liveWorkspace?.artifact_tree.paths ?? [],
            selectedPaths: liveWorkspace?.selected ?? [],
            excludedPaths: liveWorkspace?.excluded ?? [],
            unknownPaths: liveWorkspace?.unknown ?? [],
            activeMarker: marker
        )

        center = CenterPanel(
            title: "Artifact Workspace",
            artifactTitle: liveWorkspace?.artifact_previews.first?.title
                ?? loop?.thinking_artifacts.first?.title ?? "",
            artifactPath: liveWorkspace?.artifact_previews.first?.path
                ?? loop?.thinking_artifacts.first?.payload?.file_path
                ?? loop?.thinking_artifacts.first?.source_evidence.first?.file_path
                ?? "",
            artifactType: liveWorkspace?.artifact_previews.first?.artifact_type
                ?? loop?.thinking_artifacts.first?.kind ?? "",
            artifactLineSpan: artifactLineSpan(
                live: liveWorkspace?.artifact_previews.first,
                loop: loop?.thinking_artifacts.first
            ),
            requiredEvidenceIDs: requiredEvidence,
            hasArtifact: liveWorkspace?.artifact_previews.first != nil
                || loop?.thinking_artifacts.first != nil
        )

        right = RightPanel(
            title: "Sibi Ownership Panel",
            phase: liveWorkspace?.phase ?? "Legacy loop",
            currentPrompt: liveWorkspace?.current_prompt
                ?? loop?.goal
                ?? "No current prompt.",
            nextAction: liveWorkspace?.next_action ?? "No next action.",
            operationPrompt: selectedOperation?.prompt ?? "No active operation.",
            operationSuccessCriteria: selectedOperation?.success_criteria ?? [],
            requiredEvidenceIDs: requiredEvidence,
            hasActiveOperation: !(selectedOperation?.operation_id.isEmpty ?? true),
            activeOperationID: selectedOperation?.operation_id ?? "",
            evaluationReadiness: liveWorkspace?.last_attempt_evaluation?.scoped_readiness.status
                ?? loop?.readiness_claim?.status
        )
    }
}

private func loopOperation(from loop: StartWorkspaceLoop?) -> StartWorkspaceActiveOperation? {
    guard let operation = loop?.active_operation else {
        return nil
    }
    return StartWorkspaceActiveOperation(
        operation_id: operation.id,
        slice_id: nil,
        operation_kind: operation.kind,
        prompt: operation.prompt,
        required_evidence: operation.required_evidence,
        success_criteria: operation.success_criteria
    )
}

private func operationMarker(for sliceID: String?) -> String {
    guard let sliceID, !sliceID.isEmpty else {
        return "No active slice"
    }
    return "Slice \(sliceID)"
}

private func artifactLineSpan(
    live: StartWorkspaceArtifactPreview?,
    loop: StartWorkspaceArtifact?
) -> String {
    let startLine = live?.line_start ?? loop?.source_evidence.first?.start_line
    let endLine = live?.line_end ?? loop?.source_evidence.first?.end_line
    guard let startLine else {
        return ""
    }
    guard let endLine else {
        return "\(startLine)"
    }
    return startLine == endLine ? "\(startLine)" : "\(startLine)-\(endLine)"
}

private func deduplicatedEvidence(_ evidence: [String]) -> [String] {
    var seen = Set<String>()
    var ordered: [String] = []
    for item in evidence where !item.isEmpty {
        if seen.insert(item).inserted {
            ordered.append(item)
        }
    }
    return ordered
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

private struct LiveWorkspaceEvidenceItem: Identifiable {
    let id: String
    let path: String
    let tag: String
    let excerpt: String?
    let required: Bool
    let lineRange: String?
}

private struct LiveWorkspaceCodeLine: Identifiable {
    let id: Int
    let line: String
    let text: String
    let isHighlighted: Bool
}

public struct LiveWorkspaceSessionView: View {
    private let result: StartWorkspaceSessionResult
    private let onSubmitAttempt: (String, [String], String, [String]) -> Void
    @State private var draftAnswer = ""
    @State private var selectedEvidenceIDs = Set<String>()
    @State private var confidence = "medium"
    @State private var declaredUnknownsText = ""

    public init(
        result: StartWorkspaceSessionResult,
        onSubmitAttempt: @escaping (String, [String], String, [String]) -> Void = { _, _, _, _ in }
    ) {
        self.result = result
        self.onSubmitAttempt = onSubmitAttempt
    }

    public var body: some View {
        let loop = result.workspace_session.loop
        let liveWorkspace = result.workspace_session.live_workspace
        let renderModel = LiveWorkspaceRenderModel(result: result)
        let activeOperationID = renderModel.right.activeOperationID
        let requiredEvidence = renderModel.right.requiredEvidenceIDs
        let evidenceItems = evidenceItems(
            live: liveWorkspace,
            loop: loop,
            requiredEvidence: requiredEvidence
        )

        ScrollView([.horizontal, .vertical]) {
            HStack(alignment: .top, spacing: 12) {
                leftPanel(model: renderModel.left, workspace: liveWorkspace, loop: loop)
                    .frame(minWidth: 210, maxWidth: 260, alignment: .leading)
                Divider()
                centerPanel(model: renderModel.center, workspace: liveWorkspace, loop: loop)
                    .frame(minWidth: 220, maxWidth: .infinity, alignment: .leading)
                Divider()
                rightPanel(
                    model: renderModel.right,
                    workspace: liveWorkspace,
                    loop: loop,
                    requiredEvidence: renderModel.right.requiredEvidenceIDs,
                    evidenceItems: evidenceItems,
                    operationActive: renderModel.right.hasActiveOperation
                )
                .frame(minWidth: 210, maxWidth: .infinity, alignment: .leading)
            }
            .padding(12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 8))
        .onAppear {
            selectedEvidenceIDs = Set(requiredEvidence)
        }
        .onChange(of: result.workspace_session.workspace_session_id) { _, _ in
            selectedEvidenceIDs = Set(requiredEvidence)
            draftAnswer = ""
            declaredUnknownsText = ""
        }
        .onChange(of: activeOperationID) { _, _ in
            selectedEvidenceIDs = Set(requiredEvidence)
            draftAnswer = ""
            declaredUnknownsText = ""
        }
    }

    private func leftPanel(
        model: LiveWorkspaceRenderModel.LeftPanel,
        workspace: StartWorkspaceLiveSessionContract?,
        loop: StartWorkspaceLoop?
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(model.title)
            if let workspace {
                Text("Repository")
                    .font(.subheadline.weight(.semibold))
                Text(workspace.repo_root)
                    .font(.caption.monospaced())
                    .textSelection(.enabled)

                treeSection("Worktree", paths: model.worktreePaths)
                treeSection("Artifact Directory", paths: model.artifactPaths)
                selectedArtifactSection(workspace.artifact_previews)
                Text("Active marker")
                    .font(.caption.weight(.semibold))
                Text(model.activeMarker)
                    .font(.caption2)
                    .textSelection(.enabled)
                if !model.selectedPaths.isEmpty {
                    Text("Selected scope: \(model.selectedPaths.joined(separator: ", "))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)
                }
                if !model.excludedPaths.isEmpty {
                    pathSection("Excluded", paths: model.excludedPaths)
                }
                if !model.unknownPaths.isEmpty {
                    pathSection("Unknown", paths: model.unknownPaths)
                }
            } else {
                Text("Legacy loop fallback active.")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                if let operation = loop?.active_operation {
                    Text("Active operation: \(operation.id)")
                        .font(.caption)
                        .textSelection(.enabled)
                    Text(operation.prompt)
                        .font(.caption2)
                        .textSelection(.enabled)
                } else {
                    Text("No active loop operation.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func centerPanel(
        model: LiveWorkspaceRenderModel.CenterPanel,
        workspace: StartWorkspaceLiveSessionContract?,
        loop: StartWorkspaceLoop?
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionHeader(model.title)
            if let artifact = workspace?.artifact_previews.first {
                liveWorkspaceArtifactPreview(artifact)
                let required = model.requiredEvidenceIDs
                if !required.isEmpty {
                    requiredEvidenceStrip(required)
                }
            } else if let artifact = loop?.thinking_artifacts.first {
                loopCodeBlock(artifact)
                    .padding(.bottom, 6)
                if !model.requiredEvidenceIDs.isEmpty {
                    requiredEvidenceStrip(model.requiredEvidenceIDs)
                }
            } else {
                Text("No selected artifact preview in this session.")
                    .foregroundStyle(.secondary)
                    .font(.caption)
            }
        }
    }

    private func rightPanel(
        model: LiveWorkspaceRenderModel.RightPanel,
        workspace: StartWorkspaceLiveSessionContract?,
        loop: StartWorkspaceLoop?,
        requiredEvidence: [String],
        evidenceItems: [LiveWorkspaceEvidenceItem],
        operationActive: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(model.title)

            if let workspace {
                Text("Session: \(workspace.session_id)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
                Text("Phase: \(model.phase)")
                    .font(.caption)
                    .textSelection(.enabled)
                Text("Current prompt")
                    .font(.caption.weight(.semibold))
                Text(model.currentPrompt)
                    .font(.caption)
                    .textSelection(.enabled)
                Text("Next action: \(model.nextAction)")
                    .font(.caption)
                    .textSelection(.enabled)

                if let activeOperation = workspace.active_operation {
                    Text("Active operation")
                        .font(.caption.weight(.semibold))
                        .padding(.top, 2)
                    Text("\(activeOperation.operation_kind) • \(activeOperation.operation_id)")
                        .font(.caption)
                        .textSelection(.enabled)
                    Text(model.operationPrompt)
                        .font(.caption2)
                        .textSelection(.enabled)

                    if !model.operationSuccessCriteria.isEmpty {
                        Text("What must be true")
                            .font(.caption.weight(.semibold))
                        ForEach(model.operationSuccessCriteria, id: \.self) { criterion in
                            Text("• \(criterion)")
                                .font(.caption2)
                                .textSelection(.enabled)
                        }
                    }
                }

                let uniqueRequirements = deduplicatedEvidence(requiredEvidence)
                if !uniqueRequirements.isEmpty {
                    Text("Required evidence")
                        .font(.caption.weight(.semibold))
                    requiredEvidenceStrip(uniqueRequirements)
                }
                if let evaluation = workspace.last_attempt_evaluation {
                    Divider()
                    attemptEvaluationSummary(evaluation)
                    if let evaluationReadiness = model.evaluationReadiness {
                        Text("Evaluation readiness: \(evaluationReadiness)")
                            .font(.caption2)
                    }
                }
            } else if let loop {
                Text("Legacy loop mode")
                    .font(.caption.weight(.semibold))
                Text("Goal: \(loop.goal)")
                    .font(.caption)
                    .textSelection(.enabled)
                if let operation = loop.active_operation {
                    Text("Active operation: \(operation.id)")
                        .font(.caption)
                        .textSelection(.enabled)
                    Text(operation.prompt)
                        .font(.caption2)
                        .textSelection(.enabled)
                }
                if let evaluationReadiness = model.evaluationReadiness {
                    Text("Evaluation readiness: \(evaluationReadiness)")
                        .font(.caption2)
                }
                postAttemptSummary(loop: loop)
            }

            Divider()
            attemptComposer(
                requiredEvidence: requiredEvidence,
                operationActive: operationActive,
                evidenceItems: evidenceItems
            )
        }
    }

    private func treeSection(_ title: String, paths: [String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
            pathSection(title, paths: paths)
        }
    }

    private func pathSection(_ title: String, paths: [String]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            if paths.isEmpty {
                Text("No \(title.lowercased()) paths.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(paths, id: \.self) { path in
                    Text(path)
                        .font(.caption)
                        .textSelection(.enabled)
                }
            }
        }
    }

    private func selectedArtifactSection(_ previews: [StartWorkspaceArtifactPreview]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Selected artifacts")
                .font(.caption.weight(.semibold))
            if previews.isEmpty {
                Text("No selected artifacts.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(previews, id: \.artifact_id) { preview in
                    Text(preview.title)
                        .font(.caption)
                        .textSelection(.enabled)
                }
            }
        }
    }

    private func liveWorkspaceArtifactPreview(_ artifact: StartWorkspaceArtifactPreview) -> some View {
        let lines = workspaceCodeLines(from: artifact)
        let lineSpan = artifact.line_start.flatMap { startLine in
            "\(startLine)-\(artifact.line_end ?? startLine)"
        }
        return VStack(alignment: .leading, spacing: 6) {
            Text(artifact.title)
                .font(.subheadline.weight(.semibold))
            Text(artifact.path)
                .font(.caption.monospaced())
                .textSelection(.enabled)
                .foregroundStyle(.secondary)
            Text("Type: \(artifact.artifact_type)")
                .font(.caption2)
                .foregroundStyle(.secondary)
            if let language = artifact.language {
                Text("Language: \(language)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            if let excerpt = artifact.excerpt, !excerpt.isEmpty {
                Text("Excerpt")
                    .font(.caption.weight(.semibold))
                Text(excerpt)
                    .font(.caption2)
                    .textSelection(.enabled)
            }
            if let reason = artifact.preview_fallback_reason {
                Text("Fallback reason: \(reason)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            if let lineSpan {
                Text("Line span: \(lineSpan)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            if lines.isEmpty {
                Text("No source preview available for this artifact.")
                    .foregroundStyle(.secondary)
            } else {
                ScrollView(.horizontal) {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(lines) { line in
                            HStack(alignment: .top, spacing: 10) {
                                Text(line.line)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                                    .frame(width: 44, alignment: .trailing)
                                Text(line.text.isEmpty ? " " : line.text)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(line.isHighlighted ? Color.accentColor : Color.primary)
                                    .textSelection(.enabled)
                            }
                            .padding(.horizontal, 4)
                            .background(line.isHighlighted ? Color.accentColor.opacity(0.08) : Color.clear)
                        }
                    }
                    .padding(10)
                }
                .frame(maxHeight: 220)
                .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 6))
            }
        }
    }

    private func loopCodeBlock(_ artifact: StartWorkspaceArtifact) -> some View {
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

    private func requiredEvidenceStrip(_ evidenceIDs: [String]) -> some View {
        ScrollView(.horizontal) {
            HStack(spacing: 6) {
                ForEach(evidenceIDs, id: \.self) { evidenceID in
                    Text(evidenceID)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.secondary.opacity(0.16), in: Capsule())
                }
            }
        }
    }

    private func attemptEvaluationSummary(_ evaluation: StartWorkspaceAttemptEvaluationContract) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionHeader("Attempt evaluation")
            Text("Result: \(evaluation.evidence_check.result)")
                .font(.caption)
            Text("Observed: \(evaluation.evidence_check.observed_claims.count), Missing: \(evaluation.evidence_check.missing_claims.count), Unsupported: \(evaluation.evidence_check.unsupported_claims.count), Contradicted: \(evaluation.evidence_check.contradicted_claims.count)")
                .font(.caption2)
                .textSelection(.enabled)
            Text("Readiness: \(evaluation.scoped_readiness.status)")
                .font(.caption)
            Text(evaluation.scoped_readiness.scope)
                .font(.caption2)
                .textSelection(.enabled)
            if let repair = evaluation.repair_action {
                Text("Repair action")
                    .font(.caption.weight(.semibold))
                Text(repair.prompt)
                    .font(.caption2)
                    .textSelection(.enabled)
            }
            Text("Reattempt prompt")
                .font(.caption.weight(.semibold))
            Text(evaluation.reattempt_prompt)
                .font(.caption2)
                .textSelection(.enabled)
        }
    }

    private func evidenceItems(
        live: StartWorkspaceLiveSessionContract?,
        loop: StartWorkspaceLoop?,
        requiredEvidence: [String]
    ) -> [LiveWorkspaceEvidenceItem] {
        let requiredEvidenceSet = Set(requiredEvidence)
        if let live {
            return live.evidence.map { item in
                LiveWorkspaceEvidenceItem(
                    id: item.evidence_id,
                    path: item.path,
                    tag: item.label,
                    excerpt: item.excerpt,
                    required: item.required || requiredEvidenceSet.contains(item.evidence_id),
                    lineRange: "\(item.line_range.line_start)-\(item.line_range.line_end)"
                )
            }
        }
        return loop?.evidence_inventory.map { item in
            LiveWorkspaceEvidenceItem(
                id: item.id,
                path: item.path,
                tag: item.role,
                excerpt: item.excerpt,
                required: requiredEvidenceSet.contains(item.id),
                lineRange: nil
            )
        } ?? []
    }

    private func workspaceCodeLines(from artifact: StartWorkspaceArtifactPreview) -> [LiveWorkspaceCodeLine] {
        let source = artifact.slice_content ?? artifact.excerpt ?? ""
        guard !source.isEmpty else {
            return []
        }
        let startLine = artifact.line_start ?? 1
        let endLine = artifact.line_end ?? startLine
        return source.components(separatedBy: .newlines).enumerated().map { offset, text in
            let lineNumber = startLine + offset
            return LiveWorkspaceCodeLine(
                id: offset,
                line: "\(lineNumber)",
                text: text,
                isHighlighted: lineNumber >= startLine && lineNumber <= endLine
            )
        }
    }

    private func attemptComposer(
        requiredEvidence: [String],
        operationActive: Bool,
        evidenceItems: [LiveWorkspaceEvidenceItem]
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if operationActive {
                Text("Attempt this operation")
                    .font(.subheadline.weight(.semibold))

                TextEditor(text: $draftAnswer)
                    .frame(minHeight: 110)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                    )
                    .textSelection(.enabled)

                Picker("Confidence", selection: $confidence) {
                    Text("Low").tag("low")
                    Text("Medium").tag("medium")
                    Text("High").tag("high")
                }
                .pickerStyle(.segmented)
                .labelsHidden()

                Text("Declared unknowns")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextEditor(text: $declaredUnknownsText)
                    .frame(minHeight: 48)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                    )

                VStack(alignment: .leading, spacing: 6) {
                    Text("Select evidence")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if evidenceItems.isEmpty {
                        Text("No evidence available in this session yet.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else {
                        let requiredEvidenceSet = Set(requiredEvidence)
                        ForEach(evidenceItems) { item in
                            Toggle(isOn: binding(for: item.id, requiredEvidence: requiredEvidenceSet)) {
                                VStack(alignment: .leading, spacing: 3) {
                                    HStack(alignment: .center, spacing: 8) {
                                        Text(item.id)
                                            .font(.caption2.monospaced())
                                        Text(item.required ? "required" : "optional")
                                            .font(.caption2.weight(.semibold))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.secondary.opacity(0.16), in: Capsule())
                                        Text(item.tag)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                        if let range = item.lineRange {
                                            Text(range)
                                                .font(.caption2.monospaced())
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    if let excerpt = item.excerpt {
                                        Text(excerpt)
                                            .font(.caption2)
                                            .lineLimit(2)
                                            .textSelection(.enabled)
                                    }
                                }
                            }
                            .toggleStyle(.checkbox)
                            .disabled(item.required)
                        }
                    }
                }

                HStack(spacing: 10) {
                    Button("Submit attempt") {
                        submitAttempt(isUnknown: false)
                    }
                    .disabled(draftAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    Button("I do not know") {
                        submitAttempt(isUnknown: true)
                    }
                }
            } else {
                Text("No active operation to attempt yet.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func postAttemptSummary(loop: StartWorkspaceLoop?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let attempt = loop?.sample_attempt {
                sectionHeader("Attempt recorded")
                Text("Confidence: \(attempt.declared_confidence)")
                    .font(.caption)
                if !attempt.selected_evidence.isEmpty {
                    Text("Evidence selected: \(attempt.selected_evidence.joined(separator: ", "))")
                        .font(.caption)
                        .textSelection(.enabled)
                }
                if !attempt.declared_unknowns.isEmpty {
                    Text("Declared unknowns: \(attempt.declared_unknowns.joined(separator: ", "))")
                        .font(.caption)
                        .textSelection(.enabled)
                }
            }

            if let check = loop?.evidence_check {
                Divider()
                sectionHeader("Evidence check: \(check.result)")
                Text("Observed claims: \(check.observed_claims.count), Missing: \(check.missing_claims.count), Unsupported: \(check.unsupported_claims.count), Contradictions: \(check.contradicted_claims.count)")
                    .font(.caption)
                    .textSelection(.enabled)

                if !check.missing_claims.isEmpty {
                    claimList("Missing claims", claims: check.missing_claims)
                }
                if !check.unsupported_claims.isEmpty {
                    claimList("Unsupported claims", claims: check.unsupported_claims)
                }
                if !check.contradicted_claims.isEmpty {
                    claimList("Contradicted claims", claims: check.contradicted_claims)
                }
            }

            if let gap = loop?.detected_gap {
                Divider()
                sectionHeader("Detected gap")
                Text("Kind: \(gap.kind)")
                Text("Severity: \(gap.severity)")
                Text("Blocks readiness: \(gap.blocks_readiness ? "yes" : "no")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let repair = loop?.repair_action {
                Divider()
                sectionHeader("Repair action")
                Text("Operation: \(repair.operation_kind)")
                    .font(.caption)
                Text(repair.prompt)
                    .font(.caption2)
                    .textSelection(.enabled)
            }

            if let readiness = loop?.readiness_claim {
                Divider()
                sectionHeader("Scoped readiness")
                Text("Status: \(readiness.status)")
                    .font(.caption)
                Text(readiness.scope)
                    .font(.caption)
                    .textSelection(.enabled)
                if !readiness.blocked_claims.isEmpty {
                    claimList("Blocked claims", claims: readiness.blocked_claims)
                }
            }
        }
    }

    private func binding(for evidenceID: String, requiredEvidence: Set<String>) -> Binding<Bool> {
        Binding(
            get: { selectedEvidenceIDs.contains(evidenceID) },
            set: { isSelected in
                if isSelected {
                    selectedEvidenceIDs.insert(evidenceID)
                } else if !requiredEvidence.contains(evidenceID) {
                    selectedEvidenceIDs.remove(evidenceID)
                }
            }
        )
    }

    private func submitAttempt(isUnknown: Bool) {
        let parsedUnknowns = declaredUnknownsText
            .split(whereSeparator: \.isNewline)
            .map { part in
                part.trimmingCharacters(in: .whitespacesAndNewlines)
            }
            .filter { !$0.isEmpty }
        let submittedUnknowns = isUnknown && parsedUnknowns.isEmpty ? ["I do not know"] : parsedUnknowns
        let submittedAnswer = isUnknown ? "I do not know." : draftAnswer
        onSubmitAttempt(
            submittedAnswer.trimmingCharacters(in: .whitespacesAndNewlines),
            Array(selectedEvidenceIDs),
            confidence,
            submittedUnknowns
        )
        draftAnswer = ""
        declaredUnknownsText = ""
    }

    private func sectionHeader(_ text: String) -> some View {
        Text(text)
            .font(.subheadline.weight(.semibold))
    }

    private func claimList(_ title: String, claims: [String]) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption.weight(.semibold))
            ForEach(claims, id: \.self) { claim in
                Text("• \(claim)")
                    .font(.caption2)
                    .textSelection(.enabled)
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
