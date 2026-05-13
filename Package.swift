// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "sibi",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "SibiStudyApp", targets: ["SibiStudyApp"]),
        .library(name: "SibiCore", targets: ["SibiCore"]),
    ],
    targets: [
        .target(
            name: "SibiCore",
            path: "Sources/SibiCore",
            sources: [
                "RuntimeModels.swift",
                "RuntimeClient.swift",
                "StudyPanelModels.swift",
                "StudyPanelLiveModel.swift",
                "StudyPanelView.swift",
            ]
        ),
        .executableTarget(
            name: "SibiStudyApp",
            dependencies: ["SibiCore"],
            path: "Sources/SibiStudyApp",
            sources: [
                "SibiStudyApp.swift",
            ]
        ),
        .testTarget(
            name: "SibiCoreTests",
            dependencies: ["SibiCore"],
            path: "Tests/SibiCoreTests",
            sources: [
                "RuntimeClientTests.swift",
                "StudyPanelTests.swift",
            ]
        ),
    ]
)
