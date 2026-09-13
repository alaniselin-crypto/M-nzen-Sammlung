import XCTest
@testable import AppleStoreKitCore

final class AppleStoreKitProductServiceTests: XCTestCase {
    func testUnifiedPluginHandlerExposesAProductionStoreKitInitializer() {
        let handler = AppleStoreKitPluginHandler()
        XCTAssertTrue(type(of: handler) == AppleStoreKitPluginHandler.self)
    }

    func testUnifiedPluginHandlerExposesProductsPurchaseAndRestoreThroughOneBridge() async throws {
        let events = RestoreEventRecorder()
        let handler = AppleStoreKitPluginHandler(
            getProducts: {
                await events.record("products")
                return [ProductPresentation(
                    productId: "com.alaniselin.numisma.pro.monthly",
                    displayName: "INUMIS Pro Monthly",
                    displayPrice: "4,99 €"
                )]
            },
            purchase: { productId, appAccountToken in
                await events.record("purchase:\(productId):\(appAccountToken)")
                return PurchasedTransaction(
                    signedTransaction: "signed-purchase",
                    transactionId: "12345"
                )
            },
            restore: {
                await events.record("restore")
                return "signed-restore"
            },
            finish: { transactionId in
                await events.record("finish:\(transactionId)")
            }
        )

        let products = try await handler.getProducts()
        let purchase = try await handler.purchase(
            productId: "com.alaniselin.numisma.pro.monthly",
            appAccountToken: "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7"
        )
        let restore = try await handler.restore()

        XCTAssertEqual(products.products.count, 1)
        XCTAssertEqual(purchase.signedTransaction, "signed-purchase")
        XCTAssertEqual(restore.signedTransaction, "signed-restore")
        let recordedEvents = await events.values
        XCTAssertEqual(recordedEvents, [
            "products",
            "purchase:com.alaniselin.numisma.pro.monthly:f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7",
            "restore",
        ])
    }

    func testPluginHandlerReturnsTheWebGetProductsContract() async throws {
        let handler = AppleStoreKitProductPluginHandler(
            getProducts: {
                [
                    ProductPresentation(
                        productId: "com.alaniselin.numisma.pro.monthly",
                        displayName: "INUMIS Pro Monthly",
                        displayPrice: "4,99 €"
                    ),
                ]
            }
        )

        let response = try await handler.getProducts()

        XCTAssertEqual(
            response,
            AppleStoreKitProductsResponse(products: [
                ProductPresentation(
                    productId: "com.alaniselin.numisma.pro.monthly",
                    displayName: "INUMIS Pro Monthly",
                    displayPrice: "4,99 €"
                ),
            ])
        )
    }

    func testStoreKitLoaderDelegatesRequestedIdentifiersToTheStore() async throws {
        let recorder = RequestedIdentifiersRecorder()
        let loader = StoreKitProductLoader { identifiers in
            await recorder.record(identifiers)
            return [
                StoreProduct(
                    id: "com.alaniselin.numisma.pro.monthly",
                    displayName: "INUMIS Pro Monthly",
                    displayPrice: "4,99 €"
                ),
            ]
        }

        let products = try await loader.products(for: ["com.alaniselin.numisma.pro.monthly"])

        let requestedIdentifiers = await recorder.values
        XCTAssertEqual(requestedIdentifiers, [["com.alaniselin.numisma.pro.monthly"]])
        XCTAssertEqual(products, [
            StoreProduct(
                id: "com.alaniselin.numisma.pro.monthly",
                displayName: "INUMIS Pro Monthly",
                displayPrice: "4,99 €"
            ),
        ])
    }

    func testLoadsOnlyTheApprovedProductsAndReturnsLocalizedPresentation() async throws {
        let loader = RecordingProductLoader(products: [
            StoreProduct(
                id: "com.alaniselin.numisma.pro.yearly",
                displayName: "INUMIS Pro Yearly",
                displayPrice: "49,99 €"
            ),
            StoreProduct(
                id: "com.alaniselin.numisma.pro.monthly",
                displayName: "INUMIS Pro Monthly",
                displayPrice: "4,99 €"
            ),
        ])
        let service = AppleStoreKitProductService(loader: loader)

        let products = try await service.getProducts()

        XCTAssertEqual(loader.requestedProductIDs, [[
            "com.alaniselin.numisma.pro.monthly",
            "com.alaniselin.numisma.pro.yearly",
        ]])
        XCTAssertEqual(products, [
            ProductPresentation(
                productId: "com.alaniselin.numisma.pro.yearly",
                displayName: "INUMIS Pro Yearly",
                displayPrice: "49,99 €"
            ),
            ProductPresentation(
                productId: "com.alaniselin.numisma.pro.monthly",
                displayName: "INUMIS Pro Monthly",
                displayPrice: "4,99 €"
            ),
        ])
    }

    func testRejectsAnIncompleteApprovedProductCatalog() async {
        let service = AppleStoreKitProductService(
            loader: RecordingProductLoader(products: [
                StoreProduct(
                    id: "com.alaniselin.numisma.pro.monthly",
                    displayName: "INUMIS Pro Monthly",
                    displayPrice: "4,99 €"
                ),
            ])
        )

        do {
            _ = try await service.getProducts()
            XCTFail("Expected an incomplete product catalog to be rejected")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitProductError, .invalidProductResponse)
        }
    }

    func testRejectsAProductOutsideTheApprovedContract() async {
        let loader = RecordingProductLoader(products: [
            StoreProduct(
                id: "com.alaniselin.numisma.pro.forged",
                displayName: "Forged Pro",
                displayPrice: "0,01 €"
            ),
        ])
        let service = AppleStoreKitProductService(loader: loader)

        do {
            _ = try await service.getProducts()
            XCTFail("Expected the product contract to be rejected")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitProductError, .invalidProductResponse)
        }
    }

    func testRejectsDuplicateProductsFromACompleteStoreKitCatalog() async {
        let duplicate = StoreProduct(
            id: "com.alaniselin.numisma.pro.monthly",
            displayName: "INUMIS Pro Monthly",
            displayPrice: "4,99 €"
        )
        let service = AppleStoreKitProductService(
            loader: RecordingProductLoader(products: [
                duplicate,
                duplicate,
                StoreProduct(
                    id: "com.alaniselin.numisma.pro.yearly",
                    displayName: "INUMIS Pro Yearly",
                    displayPrice: "49,99 €"
                ),
            ])
        )

        do {
            _ = try await service.getProducts()
            XCTFail("Expected duplicate products to be rejected")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitProductError, .invalidProductResponse)
        }
    }

    func testRejectsAProductWithAnEmptyLocalizedName() async {
        let service = AppleStoreKitProductService(
            loader: RecordingProductLoader(products: [
                StoreProduct(
                    id: "com.alaniselin.numisma.pro.monthly",
                    displayName: "   ",
                    displayPrice: "4,99 €"
                ),
            ])
        )

        do {
            _ = try await service.getProducts()
            XCTFail("Expected the empty localized name to be rejected")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitProductError, .invalidProductResponse)
        }
    }

    func testRejectsAProductWithAnEmptyLocalizedPrice() async {
        let service = AppleStoreKitProductService(
            loader: RecordingProductLoader(products: [
                StoreProduct(
                    id: "com.alaniselin.numisma.pro.monthly",
                    displayName: "INUMIS Pro Monthly",
                    displayPrice: "  \n"
                ),
            ])
        )

        do {
            _ = try await service.getProducts()
            XCTFail("Expected the empty localized price to be rejected")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitProductError, .invalidProductResponse)
        }
    }

    func testPurchasePluginHandlerReturnsTheWebPurchaseContract() async throws {
        let handler = AppleStoreKitPurchasePluginHandler(
            purchase: { productId, appAccountToken in
                XCTAssertEqual(productId, "com.alaniselin.numisma.pro.monthly")
                XCTAssertEqual(appAccountToken, "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7")
                return PurchasedTransaction(
                    signedTransaction: "signed-transaction",
                    transactionId: "12345"
                )
            }
        )

        let response = try await handler.purchase(
            productId: "com.alaniselin.numisma.pro.monthly",
            appAccountToken: "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7"
        )

        XCTAssertEqual(
            response,
            AppleStoreKitPurchaseResponse(
                signedTransaction: "signed-transaction",
                transactionId: "12345"
            )
        )
    }

    func testRestorePluginHandlerReturnsTheWebRestoreContract() async throws {
        let handler = AppleStoreKitRestorePluginHandler(
            restore: {
                "signed-restored-transaction"
            }
        )

        let response = try await handler.restore()

        XCTAssertEqual(
            response,
            AppleStoreKitPurchaseResponse(
                signedTransaction: "signed-restored-transaction",
                transactionId: ""
            )
        )
    }

    func testPurchasePassesApprovedProductAndAccountTokenToStoreKit() async throws {
        let purchaser = RecordingProductPurchaser(signedTransaction: "signed-transaction")
        let service = AppleStoreKitPurchaseService(purchaser: purchaser)
        let accountToken = "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7"

        let signedTransaction = try await service.purchase(
            productId: "com.alaniselin.numisma.pro.monthly",
            appAccountToken: accountToken
        )

        XCTAssertEqual(signedTransaction.signedTransaction, "signed-transaction")
        XCTAssertEqual(signedTransaction.transactionId, "12345")
        XCTAssertEqual(
            purchaser.requests,
            [ProductPurchaseRequest(
                productId: "com.alaniselin.numisma.pro.monthly",
                appAccountToken: UUID(uuidString: accountToken)!
            )]
        )
    }

    func testStoreKitPurchaserExposesAProductionStoreKitInitializer() {
        let purchaser: any ProductPurchasing = StoreKitProductPurchaser()
        XCTAssertTrue(purchaser is StoreKitProductPurchaser)
    }

    func testStoreKitPurchaserReturnsTheVerifiedSignedTransaction() async throws {
        let request = ProductPurchaseRequest(
            productId: "com.alaniselin.numisma.pro.monthly",
            appAccountToken: UUID(uuidString: "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7")!
        )
        let recorder = PurchaseRequestRecorder()
        let purchaser = StoreKitProductPurchaser { receivedRequest in
            await recorder.record(receivedRequest)
            return .verified(signedTransaction: "signed-transaction", transactionId: 12345)
        }

        let transaction = try await purchaser.purchase(request)

        let requests = await recorder.values
        XCTAssertEqual(requests, [request])
        XCTAssertEqual(transaction.signedTransaction, "signed-transaction")
        XCTAssertEqual(transaction.transactionId, "12345")
    }

    func testStoreKitPurchaserRejectsAnUnverifiedTransaction() async {
        let purchaser = StoreKitProductPurchaser { _ in .unverified }

        do {
            _ = try await purchaser.purchase(ProductPurchaseRequest(
                productId: "com.alaniselin.numisma.pro.monthly",
                appAccountToken: UUID(uuidString: "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7")!
            ))
            XCTFail("Expected the unverified transaction to be rejected")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitPurchaseError, .unverifiedTransaction)
        }
    }

    func testStoreKitPurchaserReportsUserCancellation() async {
        let purchaser = StoreKitProductPurchaser { _ in .cancelled }

        do {
            _ = try await purchaser.purchase(ProductPurchaseRequest(
                productId: "com.alaniselin.numisma.pro.monthly",
                appAccountToken: UUID(uuidString: "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7")!
            ))
            XCTFail("Expected cancellation to be reported")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitPurchaseError, .cancelled)
        }
    }

    func testStoreKitPurchaserReportsAPendingPurchase() async {
        let purchaser = StoreKitProductPurchaser { _ in .pending }

        do {
            _ = try await purchaser.purchase(ProductPurchaseRequest(
                productId: "com.alaniselin.numisma.pro.monthly",
                appAccountToken: UUID(uuidString: "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7")!
            ))
            XCTFail("Expected the pending purchase to be reported")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitPurchaseError, .pending)
        }
    }

    func testRestoreSynchronizesTheAppStoreBeforeReturningAVerifiedProTransaction() async throws {
        let restorer = RecordingSubscriptionRestorer(
            transactions: [
                RestoredSubscriptionTransaction(
                    productId: "com.alaniselin.numisma.pro.monthly",
                    signedTransaction: "signed-restored-transaction"
                ),
            ]
        )
        let service = AppleStoreKitRestoreService(restorer: restorer)

        let signedTransaction = try await service.restore()

        XCTAssertEqual(signedTransaction, "signed-restored-transaction")
        XCTAssertEqual(restorer.events, ["sync", "currentEntitlements"])
    }

    func testStoreKitRestorerSynchronizesAndExposesOnlyVerifiedTransactions() async throws {
        let events = RestoreEventRecorder()
        let restorer = StoreKitSubscriptionRestorer(
            sync: {
                await events.record("sync")
            },
            loadCurrentEntitlements: {
                await events.record("currentEntitlements")
                return [
                    .unverified,
                    .verified(RestoredSubscriptionTransaction(
                        productId: "com.alaniselin.numisma.pro.yearly",
                        signedTransaction: "signed-yearly"
                    )),
                ]
            }
        )

        try await restorer.sync()
        let transactions = await restorer.currentEntitlements()

        let recordedEvents = await events.values
        XCTAssertEqual(recordedEvents, ["sync", "currentEntitlements"])
        XCTAssertEqual(transactions, [
            RestoredSubscriptionTransaction(
                productId: "com.alaniselin.numisma.pro.yearly",
                signedTransaction: "signed-yearly"
            ),
        ])
    }

    func testPurchaseRejectsMalformedAccountTokenBeforeStoreKit() async {
        let purchaser = RecordingProductPurchaser(signedTransaction: "unused")
        let service = AppleStoreKitPurchaseService(purchaser: purchaser)

        do {
            _ = try await service.purchase(
                productId: "com.alaniselin.numisma.pro.monthly",
                appAccountToken: "not-a-uuid"
            )
            XCTFail("Expected the malformed account token to be rejected")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitPurchaseError, .invalidRequest)
        }
        XCTAssertEqual(purchaser.requests, [])
    }

    func testPurchaseRejectsUnsupportedProductBeforeStoreKit() async {
        let purchaser = RecordingProductPurchaser(signedTransaction: "unused")
        let service = AppleStoreKitPurchaseService(purchaser: purchaser)

        do {
            _ = try await service.purchase(
                productId: "com.alaniselin.numisma.pro.forged",
                appAccountToken: "f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7"
            )
            XCTFail("Expected the unsupported product to be rejected")
        } catch {
            XCTAssertEqual(error as? AppleStoreKitPurchaseError, .invalidRequest)
        }
        XCTAssertEqual(purchaser.requests, [])
    }

    func testFinishesTheServerVerifiedTransactionIdentifier() async throws {
        let finisher = RecordingTransactionFinisher()
        let service = AppleStoreKitFinishService(finisher: finisher)

        try await service.finish(transactionId: "12345")

        XCTAssertEqual(finisher.transactionIDs, [12345])
    }
}

private actor RequestedIdentifiersRecorder {
    private(set) var values: [[String]] = []

    func record(_ identifiers: [String]) {
        values.append(identifiers)
    }
}

private actor PurchaseRequestRecorder {
    private(set) var values: [ProductPurchaseRequest] = []

    func record(_ request: ProductPurchaseRequest) {
        values.append(request)
    }
}

private actor RestoreEventRecorder {
    private(set) var values: [String] = []

    func record(_ event: String) {
        values.append(event)
    }
}

private final class RecordingProductLoader: ProductLoading, @unchecked Sendable {
    private(set) var requestedProductIDs: [[String]] = []
    private let products: [StoreProduct]

    init(products: [StoreProduct]) {
        self.products = products
    }

    func products(for identifiers: [String]) async throws -> [StoreProduct] {
        requestedProductIDs.append(identifiers)
        return products
    }
}

private final class RecordingSubscriptionRestorer: SubscriptionRestoring, @unchecked Sendable {
    private(set) var events: [String] = []
    private let transactions: [RestoredSubscriptionTransaction]

    init(transactions: [RestoredSubscriptionTransaction]) {
        self.transactions = transactions
    }

    func sync() async throws {
        events.append("sync")
    }

    func currentEntitlements() async -> [RestoredSubscriptionTransaction] {
        events.append("currentEntitlements")
        return transactions
    }
}

private final class RecordingProductPurchaser: ProductPurchasing, @unchecked Sendable {
    private(set) var requests: [ProductPurchaseRequest] = []
    private let signedTransaction: String

    init(signedTransaction: String) {
        self.signedTransaction = signedTransaction
    }

    func purchase(_ request: ProductPurchaseRequest) async throws -> PurchasedTransaction {
        requests.append(request)
        return PurchasedTransaction(
            signedTransaction: signedTransaction,
            transactionId: "12345"
        )
    }
}

private final class RecordingTransactionFinisher: TransactionFinishing, @unchecked Sendable {
    private(set) var transactionIDs: [UInt64] = []

    func finish(transactionId: UInt64) async throws {
        transactionIDs.append(transactionId)
    }
}
