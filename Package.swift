// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "sibi",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "SibiCore", targets: ["SibiCore"]),
    ],
    targets: [
        .target(
            name: "SibiCore",
            path: "Sources/SibiCore",
            sources: [
                "RuntimeModels.swift",
                "RuntimeClient.swift",
            ]
        ),
        .testTarget(
            name: "SibiCoreTests",
            dependencies: ["SibiCore"],
            path: "Tests/SibiCoreTests",
            sources: [
                "RuntimeClientTests.swift",
            ]
        ),
    ]
)
