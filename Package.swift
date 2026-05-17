// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "sibi",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "SibiStudyApp", targets: ["SibiStudyApp"]),
        .library(name: "SibiCore", targets: ["SibiCore"]),
        .library(name: "SibiStudyShellKit", targets: ["SibiStudyShellKit"]),
    ],
    targets: [
        .target(
            name: "SibiCore",
            path: "Sources/SibiCore",
            sources: [
                "RuntimeModels.swift",
                "RuntimeClient.swift",
                "WorkspaceSnapshotModels.swift",
                "WorkspaceLensView.swift",
                "StudyPanelModels.swift",
                "StudyPanelLiveModel.swift",
                "StudyPanelView.swift",
            ]
        ),
        .executableTarget(
            name: "SibiStudyApp",
            dependencies: ["SibiStudyShellKit"],
            path: "Sources/SibiStudyApp",
            sources: [
                "SibiStudyApp.swift",
            ]
        ),
        .target(
            name: "SibiStudyShellKit",
            dependencies: ["SibiCore"],
            path: "Sources/SibiStudyShellKit",
            sources: [
                "SibiStudyAppDelegate.swift",
                "StudyGraphCodeCanvasView.swift",
                "StudyPanelController.swift",
                "StudyPanelRootView.swift",
            ]
        ),
        .testTarget(
            name: "SibiCoreTests",
            dependencies: ["SibiCore"],
            path: "Tests/SibiCoreTests",
            sources: [
                "RuntimeClientTests.swift",
                "StudyPanelTests.swift",
                "WorkspaceLensTests.swift",
            ]
        ),
        .testTarget(
            name: "SibiStudyShellKitTests",
            dependencies: ["SibiStudyShellKit", "SibiCore"],
            path: "Tests/SibiStudyShellKitTests",
            sources: [
                "StudyGraphCodeCanvasTests.swift",
                "StudyPanelControllerTests.swift",
            ]
        ),
    ]
)
