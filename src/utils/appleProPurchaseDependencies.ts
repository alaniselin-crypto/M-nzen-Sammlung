import { fetchAppleAccountToken } from './appleAccountTokenApi';
import { fetchAppleProEntitlement } from './appleProEntitlementApi';
import {
  purchaseApplePro,
  restoreApplePro,
  type AppleProProductId,
  type AppleProPurchaseCoordinatorDependencies,
} from './appleProPurchaseCoordinator';
import {
  finishAppleProTransaction,
  listAppleProProducts,
  purchaseAppleProProduct,
  restoreAppleProTransactions,
  type AppleStoreKitProductPresentation,
} from './appleStoreKit';

type AppleProPurchaseAdapters = Omit<
  AppleProPurchaseCoordinatorDependencies,
  'getFirebaseIdToken'
>;

const defaultAdapters: AppleProPurchaseAdapters = {
  requestAccountToken: fetchAppleAccountToken,
  purchase: purchaseAppleProProduct,
  finish: finishAppleProTransaction,
  restore: restoreAppleProTransactions,
  requestEntitlement: fetchAppleProEntitlement,
};

export function createAppleProPurchaseDependencies(
  getFirebaseIdToken: AppleProPurchaseCoordinatorDependencies['getFirebaseIdToken'],
  adapters: AppleProPurchaseAdapters = defaultAdapters,
): AppleProPurchaseCoordinatorDependencies {
  return {
    getFirebaseIdToken,
    ...adapters,
  };
}

type AppleProSubscriptionAdapters = AppleProPurchaseAdapters & {
  listProducts(): Promise<AppleStoreKitProductPresentation[]>;
};

const defaultSubscriptionAdapters: AppleProSubscriptionAdapters = {
  ...defaultAdapters,
  listProducts: listAppleProProducts,
};

export function createAppleProSubscriptionActions(
  getFirebaseIdToken: AppleProPurchaseCoordinatorDependencies['getFirebaseIdToken'],
  adapters: AppleProSubscriptionAdapters = defaultSubscriptionAdapters,
) {
  const dependencies = createAppleProPurchaseDependencies(getFirebaseIdToken, adapters);
  return {
    listProducts: adapters.listProducts,
    purchase: (productId: AppleProProductId) => purchaseApplePro(productId, dependencies),
    restore: () => restoreApplePro(dependencies),
  };
}
