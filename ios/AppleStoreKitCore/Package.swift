// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AppleStoreKitCore",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
    ],
    products: [
        .library(name: "AppleStoreKitCore", targets: ["AppleStoreKitCore"]),
        .library(name: "AppleStoreKitCapacitor", targets: ["AppleStoreKitCapacitor"]),
    ],
    dependencies: [
        .package(
            url: "https://github.com/ionic-team/capacitor-swift-pm.git",
            exact: "8.5.0"
        ),
    ],
    targets: [
        .target(name: "AppleStoreKitCore"),
        .target(
            name: "AppleStoreKitCapacitor",
            dependencies: [
                "AppleStoreKitCore",
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
            ]
        ),
        .testTarget(
            name: "AppleStoreKitCoreTests",
            dependencies: ["AppleStoreKitCore"]
        ),
        .testTarget(
            name: "AppleStoreKitCapacitorTests",
            dependencies: ["AppleStoreKitCapacitor"]
        ),
    ]
)
