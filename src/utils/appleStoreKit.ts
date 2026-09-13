import { registerPlugin } from '@capacitor/core';

export interface AppleStoreKitPurchaseRequest {
  productId: 'com.alaniselin.numisma.pro.monthly' | 'com.alaniselin.numisma.pro.yearly';
  appAccountToken: string;
}

interface AppleStoreKitTransactionResult {
  signedTransaction: string;
}

interface AppleStoreKitPurchaseResult extends AppleStoreKitTransactionResult {
  transactionId: string;
}

export interface AppleStoreKitProductPresentation {
  productId: 'com.alaniselin.numisma.pro.monthly' | 'com.alaniselin.numisma.pro.yearly';
  displayName: string;
  displayPrice: string;
}

export interface AppleStoreKitPlugin {
  getProducts(): Promise<{ products: AppleStoreKitProductPresentation[] }>;
  purchase(request: AppleStoreKitPurchaseRequest): Promise<AppleStoreKitPurchaseResult>;
  finish(request: { transactionId: string }): Promise<void>;
  restore(): Promise<AppleStoreKitTransactionResult>;
}

const AppleStoreKit = registerPlugin<AppleStoreKitPlugin>('AppleStoreKit');
const APPLE_PRO_PRODUCT_IDS = new Set([
  'com.alaniselin.numisma.pro.monthly',
  'com.alaniselin.numisma.pro.yearly',
]);

class AppleStoreKitError extends Error {
  readonly code = 'subscription/storekit-invalid-response';

  constructor() {
    super('subscription/storekit-invalid-response');
    this.name = 'AppleStoreKitError';
  }
}

function signedTransactionFrom(result: AppleStoreKitTransactionResult): string {
  if (
    typeof result?.signedTransaction !== 'string'
    || result.signedTransaction.trim().length === 0
    || result.signedTransaction.length > 64 * 1024
  ) {
    throw new AppleStoreKitError();
  }
  return result.signedTransaction;
}

export async function listAppleProProducts(
  plugin: AppleStoreKitPlugin = AppleStoreKit,
): Promise<AppleStoreKitProductPresentation[]> {
  const result = await plugin.getProducts();
  if (!Array.isArray(result?.products)) {
    throw new AppleStoreKitError();
  }
  if (result.products.some(product => (
    !APPLE_PRO_PRODUCT_IDS.has(product.productId)
    || typeof product.displayName !== 'string'
    || product.displayName.trim().length === 0
    || typeof product.displayPrice !== 'string'
    || product.displayPrice.trim().length === 0
  ))) {
    throw new AppleStoreKitError();
  }
  const returnedProductIds = new Set(result.products.map(product => product.productId));
  if (
    returnedProductIds.size !== result.products.length
    || returnedProductIds.size !== APPLE_PRO_PRODUCT_IDS.size
  ) {
    throw new AppleStoreKitError();
  }
  return result.products;
}

export async function purchaseAppleProProduct(
  request: AppleStoreKitPurchaseRequest,
  plugin: AppleStoreKitPlugin = AppleStoreKit,
): Promise<AppleStoreKitPurchaseResult> {
  const result = await plugin.purchase(request);
  const signedTransaction = signedTransactionFrom(result);
  if (typeof result?.transactionId !== 'string' || !/^\d{1,32}$/.test(result.transactionId)) {
    throw new AppleStoreKitError();
  }
  return { signedTransaction, transactionId: result.transactionId };
}

export async function finishAppleProTransaction(
  transactionId: string,
  plugin: AppleStoreKitPlugin = AppleStoreKit,
): Promise<void> {
  if (!/^\d{1,32}$/.test(transactionId)) throw new AppleStoreKitError();
  await plugin.finish({ transactionId });
}

export async function restoreAppleProTransactions(
  plugin: AppleStoreKitPlugin = AppleStoreKit,
): Promise<string> {
  const result = await plugin.restore();
  return signedTransactionFrom(result);
}
