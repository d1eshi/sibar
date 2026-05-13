import Foundation
import SibiCore
import SwiftUI

struct StudyGraphCodeItem: Equatable, Identifiable, Sendable {
    let id: String
    let title: String
    let subtitle: String
    let evidence: [StudyPanelEvidenceCitation]
}

struct StudyCodePreviewRow: Equatable, Identifiable, Sendable {
    let id: Int
    let lineLabel: String
    let text: String
    let highlighted: Bool
}

struct StudyGraphCodeCanvasRenderModel: Equatable, Sendable {
    let items: [StudyGraphCodeItem]
    let selectedID: String?
    let previewTitle: String
    let previewRows: [StudyCodePreviewRow]

    init(snapshot: StudyPanelSnapshot, selectedID: String?) {
        let graphItems = Self.graphItems(snapshot.concept_graph)
        let selected = graphItems.first { $0.id == selectedID } ?? graphItems.first
        self.items = graphItems
        self.selectedID = selected?.id
        self.previewTitle = Self.previewTitle(selection: snapshot.active_code_selection, selected: selected)
        self.previewRows = Self.previewRows(selection: snapshot.active_code_selection, selected: selected)
    }

    private static func graphItems(_ graph: StudyPanelConceptGraph?) -> [StudyGraphCodeItem] {
        guard let graph else { return [] }
        let nodeItems = graph.nodes.map { node in
            StudyGraphCodeItem(
                id: "node:\(node.id)",
                title: node.label,
                subtitle: node.kind,
                evidence: node.evidence
            )
        }
        let edgeItems = graph.edges.map { edge in
            StudyGraphCodeItem(
                id: "edge:\(edge.id)",
                title: edge.label,
                subtitle: edge.relation,
                evidence: edge.evidence
            )
        }
        return nodeItems + edgeItems
    }

    private static func previewTitle(
        selection: RuntimeCodeSelection?,
        selected: StudyGraphCodeItem?
    ) -> String {
        if let selection, selectedMatchesSelection(selected, selection: selection) {
            return URL(fileURLWithPath: selection.file_path).lastPathComponent
        }
        return selected?.title ?? "Graph + Code"
    }

    private static func previewRows(
        selection: RuntimeCodeSelection?,
        selected: StudyGraphCodeItem?
    ) -> [StudyCodePreviewRow] {
        if let selection, selectedMatchesSelection(selected, selection: selection) {
            return codeRows(for: selection)
        }
        guard let selected, !selected.evidence.isEmpty else {
            return [StudyCodePreviewRow(id: 0, lineLabel: "", text: "No evidence in this snapshot.", highlighted: false)]
        }
        return selected.evidence.enumerated().map { index, evidence in
            StudyCodePreviewRow(
                id: index,
                lineLabel: "\(evidence.start_line)-\(evidence.end_line)",
                text: evidence.excerpt,
                highlighted: false
            )
        }
    }

    private static func selectedMatchesSelection(
        _ selected: StudyGraphCodeItem?,
        selection: RuntimeCodeSelection
    ) -> Bool {
        guard let selected else { return true }
        return selected.evidence.isEmpty || selected.evidence.contains { $0.file_path == selection.file_path }
    }

    static func codeRows(for selection: RuntimeCodeSelection) -> [StudyCodePreviewRow] {
        let parts = split(selection.surrounding_text, around: selection.selected_text)
        let beforeLines = parts.before.isEmpty ? [] : parts.before.components(separatedBy: .newlines)
        let selectedLines = parts.selected.components(separatedBy: .newlines)
        let afterLines = parts.after.isEmpty ? [] : parts.after.components(separatedBy: .newlines)
        let firstLine = max(1, selection.start_line - beforeLines.count)
        var rows: [StudyCodePreviewRow] = []
        var line = firstLine
        var id = 0

        for text in beforeLines {
            rows.append(.init(id: id, lineLabel: "\(line)", text: text, highlighted: false))
            id += 1
            line += 1
        }
        for text in selectedLines {
            rows.append(.init(id: id, lineLabel: "\(line)", text: text, highlighted: true))
            id += 1
            line += 1
        }
        for text in afterLines {
            rows.append(.init(id: id, lineLabel: "\(line)", text: text, highlighted: false))
            id += 1
            line += 1
        }

        return rows
    }

    private static func split(_ surroundingText: String, around selectedText: String) -> (
        before: String,
        selected: String,
        after: String
    ) {
        guard let range = surroundingText.range(of: selectedText) else {
            return ("", selectedText, "")
        }
        return (
            String(surroundingText[..<range.lowerBound]),
            String(surroundingText[range]),
            String(surroundingText[range.upperBound...])
        )
    }
}

struct StudyGraphCodeCanvasView: View {
    @ObservedObject var model: StudyPanelLiveModel
    @State private var selectedID: String?

    var body: some View {
        if let snapshot = model.snapshot {
            let renderModel = StudyGraphCodeCanvasRenderModel(snapshot: snapshot, selectedID: selectedID)
            HStack(alignment: .top, spacing: 0) {
                graphColumn(renderModel)
                    .frame(width: 300)
                Divider()
                codePreview(renderModel)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(width: StudyPanelController.canvasSize.width, height: StudyPanelController.canvasSize.height)
            .background(.regularMaterial)
        } else {
            ContentUnavailableView(
                "No Canvas Data",
                systemImage: "point.3.connected.trianglepath.dotted",
                description: Text("Runtime has not returned a study snapshot.")
            )
            .frame(width: StudyPanelController.canvasSize.width, height: StudyPanelController.canvasSize.height)
        }
    }

    private func graphColumn(_ renderModel: StudyGraphCodeCanvasRenderModel) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Graph")
                .font(.headline)
            if renderModel.items.isEmpty {
                Text("No concept graph in this snapshot.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(renderModel.items) { item in
                            Button {
                                selectedID = item.id
                            } label: {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(item.title)
                                        .font(.caption.weight(renderModel.selectedID == item.id ? .bold : .regular))
                                        .foregroundStyle(.primary)
                                    Text(item.subtitle)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(8)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(renderModel.selectedID == item.id ? Color.accentColor.opacity(0.14) : Color.black.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .padding(16)
    }

    private func codePreview(_ renderModel: StudyGraphCodeCanvasRenderModel) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(renderModel.previewTitle)
                .font(.headline)
            ScrollView([.vertical, .horizontal]) {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(renderModel.previewRows) { row in
                        HStack(alignment: .top, spacing: 10) {
                            Text(row.lineLabel)
                                .foregroundStyle(.secondary)
                                .frame(width: 60, alignment: .trailing)
                            Text(row.text.isEmpty ? " " : row.text)
                                .foregroundStyle(row.highlighted ? Color.accentColor : Color.primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .font(.system(.body, design: .monospaced))
                        .padding(.vertical, 2)
                        .padding(.horizontal, 8)
                        .background(row.highlighted ? Color.accentColor.opacity(0.13) : Color.clear)
                    }
                }
                .textSelection(.enabled)
                .padding(10)
            }
            .background(Color.black.opacity(0.07))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .padding(16)
    }
}
