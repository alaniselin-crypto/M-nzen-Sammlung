import type { AppleProEntitlementResponse } from './appleProEntitlementApi';

export type AppleProProductId =
  | 'com.alaniselin.numisma.pro.monthly'
  | 'com.alaniselin.numisma.pro.yearly';

const PRODUCT_IDS = new Set<string>([
  'com.alaniselin.numisma.pro.monthly',
  'com.alaniselin.numisma.pro.yearly',
]);
const MAX_FIREBASE_ID_TOKEN_LENGTH = 8192;
const MAX_SIGNED_TRANSACTION_LENGTH = 64 * 1024;

export interface AppleProPurchaseCoordinatorDependencies {
  getFirebaseIdToken(forceRefresh: boolean): Promise<string>;
  requestAccountToken(firebaseIdToken: string): Promise<string>;
  purchase(request: {
    productId: AppleProProductId;
    appAccountToken: string;
  }): Promise<{ signedTransaction: string; transactionId: string }>;
  finish(transactionId: string): Promise<void>;
  restore(): Promise<string>;
  requestEntitlement(
    firebaseIdToken: string,
    signedTransaction: string,
  ): Promise<AppleProEntitlementResponse>;
}

class AppleProPurchaseCoordinatorError extends Error {
  readonly code: 'subscription/invalid-product' | 'subscription/unavailable';

  constructor(code: 'subscription/invalid-product' | 'subscription/unavailable') {
    super(code);
    this.name = 'AppleProPurchaseCoordinatorError';
    this.code = code;
  }
}

function validCredential(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maximumLength;
}

function validAccountToken(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function authenticateAndBind(
  dependencies: AppleProPurchaseCoordinatorDependencies,
): Promise<{ firebaseIdToken: string; appAccountToken: string }> {
  const firebaseIdToken = await dependencies.getFirebaseIdToken(true);
  if (!validCredential(firebaseIdToken, MAX_FIREBASE_ID_TOKEN_LENGTH)) {
    throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
  }

  const appAccountToken = await dependencies.requestAccountToken(firebaseIdToken);
  if (!validAccountToken(appAccountToken)) {
    throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
  }
  return { firebaseIdToken, appAccountToken };
}

async function verify(
  firebaseIdToken: string,
  signedTransaction: string,
  dependencies: AppleProPurchaseCoordinatorDependencies,
): Promise<AppleProEntitlementResponse> {
  if (!validCredential(signedTransaction, MAX_SIGNED_TRANSACTION_LENGTH)) {
    throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
  }
  return dependencies.requestEntitlement(firebaseIdToken, signedTransaction);
}

export async function purchaseApplePro(
  productId: AppleProProductId,
  dependencies: AppleProPurchaseCoordinatorDependencies,
): Promise<AppleProEntitlementResponse> {
  if (!PRODUCT_IDS.has(productId)) {
    throw new AppleProPurchaseCoordinatorError('subscription/invalid-product');
  }

  try {
    const { firebaseIdToken, appAccountToken } = await authenticateAndBind(dependencies);
    const purchase = await dependencies.purchase({ productId, appAccountToken });
    if (!validCredential(purchase?.transactionId, 32) || !/^\d+$/.test(purchase.transactionId)) {
      throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
    }
    const verificationToken = await dependencies.getFirebaseIdToken(true);
    if (!validCredential(verificationToken, MAX_FIREBASE_ID_TOKEN_LENGTH)) {
      throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
    }
    const entitlement = await verify(verificationToken, purchase.signedTransaction, dependencies);
    if (!entitlement.active) {
      throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
    }
    await dependencies.finish(purchase.transactionId);
    return entitlement;
  } catch (error) {
    if (error instanceof AppleProPurchaseCoordinatorError) throw error;
    throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
  }
}

export async function restoreApplePro(
  dependencies: AppleProPurchaseCoordinatorDependencies,
): Promise<AppleProEntitlementResponse> {
  try {
    await authenticateAndBind(dependencies);
    const signedTransaction = await dependencies.restore();
    const verificationToken = await dependencies.getFirebaseIdToken(true);
    if (!validCredential(verificationToken, MAX_FIREBASE_ID_TOKEN_LENGTH)) {
      throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
    }
    return await verify(verificationToken, signedTransaction, dependencies);
  } catch (error) {
    if (error instanceof AppleProPurchaseCoordinatorError) throw error;
    throw new AppleProPurchaseCoordinatorError('subscription/unavailable');
  }
}
