// swift-tools-version: 5.10
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SGM",
    platforms: [.iOS("14.0")],
    products: [
        // Products define the executables and libraries a package produces, making them visible to other packages.
        .library(
            name: "SGM",
            targets: ["SGM"]),
    ],
    dependencies: [
        .package(name: "UltraliteSDK", url: "https://github.com/Vuzix/UltraliteSDK-releases-iOS", branch: "main"),
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .target(
            name: "SGM",
            dependencies: ["UltraliteSDK"],
            path: "Sources"),
        .testTarget(
            name: "SGMTests",
            dependencies: ["SGM"]),
    ]
)
