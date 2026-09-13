#if canImport(Capacitor)
import AppleStoreKitCore
import Capacitor
import Foundation

@objc(AppleStoreKitPlugin)
public final class AppleStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleStoreKitPlugin"
    public let jsName = "AppleStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    private let handler: AppleStoreKitPluginHandler

    public override init() {
        self.handler = AppleStoreKitPluginHandler()
        super.init()
    }

    init(handler: AppleStoreKitPluginHandler) {
        self.handler = handler
        super.init()
    }

    @objc public func getProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let response = try await handler.getProducts()
                call.resolve([
                    "products": response.products.map { product in
                        [
                            "productId": product.productId,
                            "displayName": product.displayName,
                            "displayPrice": product.displayPrice,
                        ]
                    },
                ])
            } catch {
                reject(call, error: error)
            }
        }
    }

    @objc public func purchase(_ call: CAPPluginCall) {
        guard
            let productId = call.getString("productId"),
            let appAccountToken = call.getString("appAccountToken")
        else {
            call.reject(
                "The StoreKit purchase request is invalid.",
                "subscription/storekit-invalid-request"
            )
            return
        }

        Task {
            do {
                let response = try await handler.purchase(
                    productId: productId,
                    appAccountToken: appAccountToken
                )
                call.resolve([
                    "signedTransaction": response.signedTransaction,
                    "transactionId": response.transactionId,
                ])
            } catch {
                reject(call, error: error)
            }
        }
    }

    @objc public func finish(_ call: CAPPluginCall) {
        guard let transactionId = call.getString("transactionId") else {
            call.reject(
                "The StoreKit finish request is invalid.",
                "subscription/storekit-invalid-request"
            )
            return
        }
        Task {
            do {
                try await handler.finish(transactionId: transactionId)
                call.resolve()
            } catch {
                reject(call, error: error)
            }
        }
    }

    @objc public func restore(_ call: CAPPluginCall) {
        Task {
            do {
                let response = try await handler.restore()
                call.resolve(["signedTransaction": response.signedTransaction])
            } catch {
                reject(call, error: error)
            }
        }
    }

    private func reject(_ call: CAPPluginCall, error: Error) {
        let code: String
        switch error {
        case AppleStoreKitPurchaseError.cancelled:
            code = "subscription/storekit-cancelled"
        case AppleStoreKitPurchaseError.pending:
            code = "subscription/storekit-pending"
        case AppleStoreKitRestoreError.noVerifiedSubscription:
            code = "subscription/storekit-no-subscription"
        case AppleStoreKitPurchaseError.invalidRequest:
            code = "subscription/storekit-invalid-request"
        default:
            code = "subscription/storekit-failed"
        }
        call.reject("The StoreKit operation failed.", code, error)
    }
}
#endif
