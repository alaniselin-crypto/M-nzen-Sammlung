import Foundation
import StoreKit

public struct StoreProduct: Equatable, Sendable {
    public let id: String
    public let displayName: String
    public let displayPrice: String

    public init(id: String, displayName: String, displayPrice: String) {
        self.id = id
        self.displayName = displayName
        self.displayPrice = displayPrice
    }
}

public struct ProductPresentation: Equatable, Sendable {
    public let productId: String
    public let displayName: String
    public let displayPrice: String

    public init(productId: String, displayName: String, displayPrice: String) {
        self.productId = productId
        self.displayName = displayName
        self.displayPrice = displayPrice
    }
}

public struct AppleStoreKitProductsResponse: Equatable, Sendable {
    public let products: [ProductPresentation]

    public init(products: [ProductPresentation]) {
        self.products = products
    }
}

public struct AppleStoreKitProductPluginHandler: Sendable {
    private let loadProducts: @Sendable () async throws -> [ProductPresentation]

    public init(
        getProducts: @escaping @Sendable () async throws -> [ProductPresentation]
    ) {
        self.loadProducts = getProducts
    }

    public func getProducts() async throws -> AppleStoreKitProductsResponse {
        AppleStoreKitProductsResponse(products: try await loadProducts())
    }
}

public protocol ProductLoading: Sendable {
    func products(for identifiers: [String]) async throws -> [StoreProduct]
}

public struct StoreKitProductLoader: ProductLoading, Sendable {
    private let loadProducts: @Sendable ([String]) async throws -> [StoreProduct]

    public init() {
        self.loadProducts = { identifiers in
            let products = try await Product.products(for: identifiers)
            return products.map { product in
                StoreProduct(
                    id: product.id,
                    displayName: product.displayName,
                    displayPrice: product.displayPrice
                )
            }
        }
    }

    init(loadProducts: @escaping @Sendable ([String]) async throws -> [StoreProduct]) {
        self.loadProducts = loadProducts
    }

    public func products(for identifiers: [String]) async throws -> [StoreProduct] {
        try await loadProducts(identifiers)
    }
}

public enum AppleStoreKitProductError: Error, Equatable {
    case invalidProductResponse
}

public struct AppleStoreKitProductService: Sendable {
    private static let approvedProductIDs = [
        "com.alaniselin.numisma.pro.monthly",
        "com.alaniselin.numisma.pro.yearly",
    ]
    private static let approvedProductIDSet = Set(approvedProductIDs)

    private let loader: any ProductLoading

    public init(loader: any ProductLoading) {
        self.loader = loader
    }

    public func getProducts() async throws -> [ProductPresentation] {
        let products = try await loader.products(for: Self.approvedProductIDs)
        guard
            products.allSatisfy({
                Self.approvedProductIDSet.contains($0.id)
                    && !$0.displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    && !$0.displayPrice.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            }),
            Set(products.map(\.id)) == Self.approvedProductIDSet,
            products.count == Self.approvedProductIDs.count
        else {
            throw AppleStoreKitProductError.invalidProductResponse
        }
        return products.map { product in
            ProductPresentation(
                productId: product.id,
                displayName: product.displayName,
                displayPrice: product.displayPrice
            )
        }
    }
}

public struct AppleStoreKitPurchaseResponse: Equatable, Sendable {
    public let signedTransaction: String
    public let transactionId: String

    public init(signedTransaction: String, transactionId: String) {
        self.signedTransaction = signedTransaction
        self.transactionId = transactionId
    }
}

public struct AppleStoreKitPurchasePluginHandler: Sendable {
    private let performPurchase: @Sendable (String, String) async throws -> PurchasedTransaction

    public init(
        purchase: @escaping @Sendable (String, String) async throws -> PurchasedTransaction
    ) {
        self.performPurchase = purchase
    }

    public func purchase(
        productId: String,
        appAccountToken: String
    ) async throws -> AppleStoreKitPurchaseResponse {
        let transaction = try await performPurchase(productId, appAccountToken)
        return AppleStoreKitPurchaseResponse(
            signedTransaction: transaction.signedTransaction,
            transactionId: transaction.transactionId
        )
    }
}

public struct AppleStoreKitRestorePluginHandler: Sendable {
    private let performRestore: @Sendable () async throws -> String

    public init(
        restore: @escaping @Sendable () async throws -> String
    ) {
        self.performRestore = restore
    }

    public func restore() async throws -> AppleStoreKitPurchaseResponse {
        AppleStoreKitPurchaseResponse(
            signedTransaction: try await performRestore(),
            transactionId: ""
        )
    }
}

public struct AppleStoreKitPluginHandler: Sendable {
    private let products: AppleStoreKitProductPluginHandler
    private let purchaser: AppleStoreKitPurchasePluginHandler
    private let restorer: AppleStoreKitRestorePluginHandler
    private let finishTransaction: @Sendable (String) async throws -> Void

    public init() {
        let productService = AppleStoreKitProductService(loader: StoreKitProductLoader())
        let purchaseService = AppleStoreKitPurchaseService(purchaser: StoreKitProductPurchaser())
        let restoreService = AppleStoreKitRestoreService(restorer: StoreKitSubscriptionRestorer())
        let finishService = AppleStoreKitFinishService(finisher: StoreKitTransactionFinisher())
        self.init(
            getProducts: { try await productService.getProducts() },
            purchase: { productId, appAccountToken in
                try await purchaseService.purchase(
                    productId: productId,
                    appAccountToken: appAccountToken
                )
            },
            restore: { try await restoreService.restore() },
            finish: { try await finishService.finish(transactionId: $0) }
        )
    }

    public init(
        getProducts: @escaping @Sendable () async throws -> [ProductPresentation],
        purchase: @escaping @Sendable (String, String) async throws -> PurchasedTransaction,
        restore: @escaping @Sendable () async throws -> String,
        finish: @escaping @Sendable (String) async throws -> Void
    ) {
        self.products = AppleStoreKitProductPluginHandler(getProducts: getProducts)
        self.purchaser = AppleStoreKitPurchasePluginHandler(purchase: purchase)
        self.restorer = AppleStoreKitRestorePluginHandler(restore: restore)
        self.finishTransaction = finish
    }

    public func getProducts() async throws -> AppleStoreKitProductsResponse {
        try await products.getProducts()
    }

    public func purchase(
        productId: String,
        appAccountToken: String
    ) async throws -> AppleStoreKitPurchaseResponse {
        try await purchaser.purchase(
            productId: productId,
            appAccountToken: appAccountToken
        )
    }

    public func restore() async throws -> AppleStoreKitPurchaseResponse {
        try await restorer.restore()
    }

    public func finish(transactionId: String) async throws {
        try await finishTransaction(transactionId)
    }
}

public struct RestoredSubscriptionTransaction: Equatable, Sendable {
    public let productId: String
    public let signedTransaction: String

    public init(productId: String, signedTransaction: String) {
        self.productId = productId
        self.signedTransaction = signedTransaction
    }
}

public protocol SubscriptionRestoring: Sendable {
    func sync() async throws
    func currentEntitlements() async -> [RestoredSubscriptionTransaction]
}

public enum StoreKitRestoreOutcome: Equatable, Sendable {
    case verified(RestoredSubscriptionTransaction)
    case unverified
}

public struct StoreKitSubscriptionRestorer: SubscriptionRestoring, Sendable {
    private let synchronize: @Sendable () async throws -> Void
    private let loadCurrentEntitlements: @Sendable () async -> [StoreKitRestoreOutcome]

    public init() {
        self.synchronize = {
            try await AppStore.sync()
        }
        self.loadCurrentEntitlements = {
            var outcomes: [StoreKitRestoreOutcome] = []
            for await verification in Transaction.currentEntitlements {
                switch verification {
                case .verified(let transaction):
                    outcomes.append(.verified(RestoredSubscriptionTransaction(
                        productId: transaction.productID,
                        signedTransaction: verification.jwsRepresentation
                    )))
                case .unverified:
                    outcomes.append(.unverified)
                }
            }
            return outcomes
        }
    }

    init(
        sync: @escaping @Sendable () async throws -> Void,
        loadCurrentEntitlements: @escaping @Sendable () async -> [StoreKitRestoreOutcome]
    ) {
        self.synchronize = sync
        self.loadCurrentEntitlements = loadCurrentEntitlements
    }

    public func sync() async throws {
        try await synchronize()
    }

    public func currentEntitlements() async -> [RestoredSubscriptionTransaction] {
        await loadCurrentEntitlements().compactMap { outcome in
            guard case .verified(let transaction) = outcome else { return nil }
            return transaction
        }
    }
}

public enum AppleStoreKitRestoreError: Error, Equatable {
    case noVerifiedSubscription
}

public struct AppleStoreKitRestoreService: Sendable {
    private static let approvedProductIDs = Set([
        "com.alaniselin.numisma.pro.monthly",
        "com.alaniselin.numisma.pro.yearly",
    ])

    private let restorer: any SubscriptionRestoring

    public init(restorer: any SubscriptionRestoring) {
        self.restorer = restorer
    }

    public func restore() async throws -> String {
        try await restorer.sync()
        guard let transaction = await restorer.currentEntitlements().first(where: {
            Self.approvedProductIDs.contains($0.productId)
        }) else {
            throw AppleStoreKitRestoreError.noVerifiedSubscription
        }
        return transaction.signedTransaction
    }
}

public struct ProductPurchaseRequest: Equatable, Sendable {
    public let productId: String
    public let appAccountToken: UUID

    public init(productId: String, appAccountToken: UUID) {
        self.productId = productId
        self.appAccountToken = appAccountToken
    }
}

public protocol ProductPurchasing: Sendable {
    func purchase(_ request: ProductPurchaseRequest) async throws -> PurchasedTransaction
}

public struct PurchasedTransaction: Equatable, Sendable {
    public let signedTransaction: String
    public let transactionId: String

    public init(signedTransaction: String, transactionId: String) {
        self.signedTransaction = signedTransaction
        self.transactionId = transactionId
    }
}

public enum StoreKitPurchaseOutcome: Equatable, Sendable {
    case verified(signedTransaction: String, transactionId: UInt64)
    case unverified
    case cancelled
    case pending
}

public struct StoreKitProductPurchaser: ProductPurchasing, Sendable {
    private let performPurchase: @Sendable (ProductPurchaseRequest) async throws -> StoreKitPurchaseOutcome

    public init() {
        self.performPurchase = { request in
            let products = try await Product.products(for: [request.productId])
            guard let product = products.first(where: { $0.id == request.productId }) else {
                throw AppleStoreKitPurchaseError.invalidRequest
            }

            let result = try await product.purchase(options: [
                .appAccountToken(request.appAccountToken),
            ])
            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    return .verified(
                        signedTransaction: verification.jwsRepresentation,
                        transactionId: transaction.id
                    )
                case .unverified:
                    return .unverified
                }
            case .userCancelled:
                return .cancelled
            case .pending:
                return .pending
            @unknown default:
                throw AppleStoreKitPurchaseError.invalidRequest
            }
        }
    }

    init(
        performPurchase: @escaping @Sendable (ProductPurchaseRequest) async throws -> StoreKitPurchaseOutcome
    ) {
        self.performPurchase = performPurchase
    }

    public func purchase(_ request: ProductPurchaseRequest) async throws -> PurchasedTransaction {
        switch try await performPurchase(request) {
        case .verified(let signedTransaction, let transactionId):
            return PurchasedTransaction(
                signedTransaction: signedTransaction,
                transactionId: String(transactionId)
            )
        case .unverified:
            throw AppleStoreKitPurchaseError.unverifiedTransaction
        case .cancelled:
            throw AppleStoreKitPurchaseError.cancelled
        case .pending:
            throw AppleStoreKitPurchaseError.pending
        }
    }
}

public enum AppleStoreKitPurchaseError: Error, Equatable {
    case invalidRequest
    case unverifiedTransaction
    case cancelled
    case pending
}

public protocol TransactionFinishing: Sendable {
    func finish(transactionId: UInt64) async throws
}

public struct StoreKitTransactionFinisher: TransactionFinishing, Sendable {
    public init() {}

    public func finish(transactionId: UInt64) async throws {
        for await verification in Transaction.all {
            guard case .verified(let transaction) = verification else { continue }
            guard transaction.id == transactionId else { continue }
            await transaction.finish()
            return
        }
        throw AppleStoreKitPurchaseError.invalidRequest
    }
}

public struct AppleStoreKitFinishService: Sendable {
    private let finisher: any TransactionFinishing

    public init(finisher: any TransactionFinishing) {
        self.finisher = finisher
    }

    public func finish(transactionId: String) async throws {
        guard let identifier = UInt64(transactionId), identifier > 0 else {
            throw AppleStoreKitPurchaseError.invalidRequest
        }
        try await finisher.finish(transactionId: identifier)
    }
}

public struct AppleStoreKitPurchaseService: Sendable {
    private static let approvedProductIDs = Set([
        "com.alaniselin.numisma.pro.monthly",
        "com.alaniselin.numisma.pro.yearly",
    ])

    private let purchaser: any ProductPurchasing

    public init(purchaser: any ProductPurchasing) {
        self.purchaser = purchaser
    }

    public func purchase(productId: String, appAccountToken: String) async throws -> PurchasedTransaction {
        guard
            Self.approvedProductIDs.contains(productId),
            let accountToken = UUID(uuidString: appAccountToken)
        else {
            throw AppleStoreKitPurchaseError.invalidRequest
        }
        return try await purchaser.purchase(ProductPurchaseRequest(
            productId: productId,
            appAccountToken: accountToken
        ))
    }
}
