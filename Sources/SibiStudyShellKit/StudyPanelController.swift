import AppKit
import SibiCore
import SwiftUI

final class SibiStudyPanel: NSPanel {
    var onToggleCollapsed: (() -> Void)?

    override func keyDown(with event: NSEvent) {
        if event.modifierFlags.intersection(.deviceIndependentFlagsMask).contains(.command),
           event.charactersIgnoringModifiers?.lowercased() == "m" {
            onToggleCollapsed?()
            return
        }
        super.keyDown(with: event)
    }
}

@MainActor
public final class StudyPanelController {
    static let expandedSize = NSSize(width: 520, height: 680)
    static let collapsedSize = NSSize(width: 96, height: 44)
    static let canvasSize = NSSize(width: 980, height: 680)

    private(set) var panel: NSPanel?
    private(set) var canvasPanel: NSPanel?
    private(set) var isCollapsed = false
    private var keyMonitor: Any?
    private let model: StudyPanelLiveModel
    private let openURL: @MainActor (URL) -> Void

    public convenience init() {
        self.init(
            model: StudyPanelLiveModel(),
            openURL: { url in
                NSWorkspace.shared.open(url)
            }
        )
    }

    init(
        model: StudyPanelLiveModel,
        openURL: @escaping @MainActor (URL) -> Void = { url in
            NSWorkspace.shared.open(url)
        }
    ) {
        self.model = model
        self.openURL = openURL
    }

    deinit {
        if let keyMonitor {
            NSEvent.removeMonitor(keyMonitor)
        }
    }

    public func show() {
        let panel = existingOrCreatePanel()
        applyExpandedMode(to: panel)
        panel.orderFrontRegardless()
    }

    func toggleCollapsed() {
        let panel = existingOrCreatePanel()
        if isCollapsed {
            applyExpandedMode(to: panel)
        } else {
            applyCollapsedMode(to: panel)
        }
        panel.orderFrontRegardless()
    }

    func existingOrCreatePanel() -> NSPanel {
        if let panel {
            installKeyMonitorIfNeeded()
            return panel
        }

        let panel = makePanel()
        panel.contentView = NSHostingView(rootView: makeRootView())
        panel.onToggleCollapsed = { [weak self] in
            self?.toggleCollapsed()
        }
        self.panel = panel
        installKeyMonitorIfNeeded()
        return panel
    }

    func makePanel() -> SibiStudyPanel {
        let panel = SibiStudyPanel(
            contentRect: NSRect(origin: .zero, size: Self.expandedSize),
            styleMask: [.nonactivatingPanel, .titled, .closable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        panel.title = "Sibi"
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.titlebarAppearsTransparent = true
        panel.titleVisibility = .hidden
        panel.isMovableByWindowBackground = true
        panel.hidesOnDeactivate = false
        panel.backgroundColor = .windowBackgroundColor
        panel.isOpaque = true
        panel.hasShadow = true
        panel.standardWindowButton(.closeButton)?.isHidden = true
        panel.standardWindowButton(.miniaturizeButton)?.isHidden = true
        panel.standardWindowButton(.zoomButton)?.isHidden = true
        return panel
    }

    func showCanvas() {
        let panel = existingOrCreateCanvasPanel()
        panel.contentView = NSHostingView(rootView: StudyGraphCodeCanvasView(model: model))
        panel.orderFrontRegardless()
    }

    func closeCanvas() {
        canvasPanel?.orderOut(nil)
    }

    func existingOrCreateCanvasPanel() -> NSPanel {
        if let canvasPanel {
            return canvasPanel
        }
        let panel = NSPanel(
            contentRect: NSRect(origin: .zero, size: Self.canvasSize),
            styleMask: [.nonactivatingPanel, .titled, .closable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        panel.title = "Sibi Graph + Code"
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.titlebarAppearsTransparent = true
        panel.titleVisibility = .visible
        panel.isMovableByWindowBackground = true
        panel.hidesOnDeactivate = false
        panel.contentView = NSHostingView(rootView: StudyGraphCodeCanvasView(model: model))
        panel.setContentSize(Self.canvasSize)
        positionCanvas(panel)
        self.canvasPanel = panel
        return panel
    }

    func applyExpandedMode(to panel: NSPanel, screen: NSScreen? = nil) {
        isCollapsed = false
        panel.contentView = NSHostingView(rootView: makeRootView())
        panel.setContentSize(Self.expandedSize)
        positionExpanded(panel, screen: screen)
    }

    func applyCollapsedMode(to panel: NSPanel, screen: NSScreen? = nil) {
        isCollapsed = true
        panel.contentView = NSHostingView(rootView: CollapsedStudyPillView { [weak self] in
            self?.toggleCollapsed()
        })
        panel.setContentSize(Self.collapsedSize)
        positionCollapsed(panel, screen: screen)
    }

    func positionExpanded(_ panel: NSPanel, screen: NSScreen? = nil) {
        guard let screen = screen ?? panel.screen ?? NSScreen.main else { return }
        let frame = screen.visibleFrame
        let padding: CGFloat = 20
        let x = frame.maxX - panel.frame.width - padding
        let y = frame.maxY - panel.frame.height - padding
        panel.setFrameOrigin(NSPoint(x: x, y: y))
    }

    func positionCollapsed(_ panel: NSPanel, screen: NSScreen? = nil) {
        guard let screen = screen ?? panel.screen ?? NSScreen.main else { return }
        let frame = screen.visibleFrame
        let rightInset: CGFloat = 8
        let x = frame.maxX - panel.frame.width - rightInset
        let y = frame.midY - panel.frame.height / 2
        panel.setFrameOrigin(NSPoint(x: x, y: y))
    }

    func positionCanvas(_ panel: NSPanel, screen: NSScreen? = nil) {
        guard let screen = screen ?? panel.screen ?? NSScreen.main else { return }
        let frame = screen.visibleFrame
        let x = frame.midX - panel.frame.width / 2
        let y = frame.midY - panel.frame.height / 2
        panel.setFrameOrigin(NSPoint(x: x, y: y))
    }

    private func makeRootView() -> StudyPanelRootView {
        StudyPanelRootView(
            model: model,
            onToggleCollapsed: { [weak self] in self?.toggleCollapsed() },
            onOpenCanvas: { [weak self] in self?.showCanvas() },
            onOpenWorkspace: { [weak self] action in
                self?.openWorkspace(action: action)
            }
        )
    }

    func openWorkspace(action: RuntimeOpenWorkspaceAction) {
        guard let url = URL(string: action.target_url) else { return }
        openURL(url)
    }

    private func installKeyMonitorIfNeeded() {
        guard keyMonitor == nil else { return }
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard event.modifierFlags.intersection(.deviceIndependentFlagsMask).contains(.command),
                  event.charactersIgnoringModifiers?.lowercased() == "m" else {
                return event
            }
            Task { @MainActor in self?.toggleCollapsed() }
            return nil
        }
    }
}

struct CollapsedStudyPillView: View {
    let onRestore: () -> Void

    var body: some View {
        Button(action: onRestore) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Color.primary.opacity(0.38))
                    .frame(width: 7, height: 7)
                Text("Sibi")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.primary.opacity(0.9))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background {
                Capsule(style: .continuous)
                    .fill(.regularMaterial)
            }
        }
        .buttonStyle(.plain)
    }
}
