import AppKit
import SibiCore
import XCTest
@testable import SibiStudyShellKit

@MainActor
final class StudyPanelControllerTests: XCTestCase {
    func testMakePanelUsesFloatingNonActivatingConfiguration() {
        let controller = StudyPanelController(model: makeModel())

        let panel = controller.makePanel()

        XCTAssertTrue((panel as AnyObject) is NSPanel)
        XCTAssertTrue(panel.styleMask.contains(.nonactivatingPanel))
        XCTAssertTrue(panel.styleMask.contains(.fullSizeContentView))
        XCTAssertEqual(panel.level, .floating)
        XCTAssertTrue(panel.isFloatingPanel)
        XCTAssertTrue(panel.collectionBehavior.contains(.canJoinAllSpaces))
        XCTAssertTrue(panel.collectionBehavior.contains(.fullScreenAuxiliary))
        XCTAssertEqual(panel.titleVisibility, .hidden)
        XCTAssertTrue(panel.titlebarAppearsTransparent)
        XCTAssertEqual(panel.backgroundColor, .windowBackgroundColor)
        XCTAssertTrue(panel.isOpaque)
        XCTAssertTrue(panel.standardWindowButton(.closeButton)?.isHidden ?? false)
        XCTAssertTrue(panel.standardWindowButton(.miniaturizeButton)?.isHidden ?? false)
        XCTAssertTrue(panel.standardWindowButton(.zoomButton)?.isHidden ?? false)
    }

    func testCommandMTogglesCollapsedWithoutDockMinimize() {
        let controller = StudyPanelController(model: makeModel())
        let panel = controller.existingOrCreatePanel()
        let event = NSEvent.keyEvent(
            with: .keyDown,
            location: .zero,
            modifierFlags: [.command],
            timestamp: 0,
            windowNumber: panel.windowNumber,
            context: nil,
            characters: "m",
            charactersIgnoringModifiers: "m",
            isARepeat: false,
            keyCode: 46
        )

        if let event {
            panel.keyDown(with: event)
        }

        XCTAssertTrue(controller.isCollapsed)
        XCTAssertFalse(panel.isMiniaturized)
    }

    func testCollapsedExpandedRoundTripReusesPanel() {
        let controller = StudyPanelController(model: makeModel())
        let panel = controller.existingOrCreatePanel()

        controller.toggleCollapsed()
        XCTAssertTrue(controller.isCollapsed)
        XCTAssertTrue(controller.existingOrCreatePanel() === panel)
        XCTAssertEqual(panel.contentView?.frame.size.width ?? 0, StudyPanelController.collapsedSize.width, accuracy: 0.5)

        controller.toggleCollapsed()
        XCTAssertFalse(controller.isCollapsed)
        XCTAssertTrue(controller.existingOrCreatePanel() === panel)
        XCTAssertEqual(panel.contentView?.frame.size.width ?? 0, StudyPanelController.expandedSize.width, accuracy: 0.5)
    }

    func testCanvasPanelOpensAsSeparateResizablePanel() throws {
        let controller = StudyPanelController(model: makeModel())

        controller.showCanvas()

        let panel = try XCTUnwrap(controller.canvasPanel)
        XCTAssertTrue(panel.styleMask.contains(.nonactivatingPanel))
        XCTAssertTrue(panel.styleMask.contains(.resizable))
        XCTAssertEqual(panel.title, "Sibi Graph + Code")
        XCTAssertEqual(panel.contentView?.frame.size.width ?? 0, StudyPanelController.canvasSize.width, accuracy: 0.5)
    }

}

@MainActor
private func makeModel() -> StudyPanelLiveModel {
    StudyPanelLiveModel(actions: .init(
        loadSnapshot: { _ in
            throw RuntimeClientError.processFailure("no runtime in panel test")
        },
        answerQuestion: { _ in
            throw RuntimeClientError.processFailure("no runtime in panel test")
        }
    ))
}
