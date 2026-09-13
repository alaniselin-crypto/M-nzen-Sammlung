#if canImport(Capacitor)
import Capacitor
import XCTest
@testable import AppleStoreKitCapacitor

final class AppleStoreKitPluginTests: XCTestCase {
    func testExportsTheCompleteJavaScriptBridgeContract() {
        let plugin = AppleStoreKitPlugin()

        XCTAssertEqual(plugin.identifier, "AppleStoreKitPlugin")
        XCTAssertEqual(plugin.jsName, "AppleStoreKit")
        XCTAssertEqual(
            plugin.pluginMethods.map(\.name),
            ["getProducts", "purchase", "finish", "restore"]
        )
        XCTAssertTrue(plugin.pluginMethods.allSatisfy {
            $0.returnType == CAPPluginReturnPromise
        })
    }
}
#endif