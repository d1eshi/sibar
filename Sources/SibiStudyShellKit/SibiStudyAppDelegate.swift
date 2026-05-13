import AppKit

@MainActor
public final class SibiStudyAppDelegate: NSObject, NSApplicationDelegate {
    private let panelController: StudyPanelController

    public override convenience init() {
        self.init(panelController: StudyPanelController())
    }

    init(panelController: StudyPanelController) {
        self.panelController = panelController
        super.init()
    }

    public func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        panelController.show()
    }
}
