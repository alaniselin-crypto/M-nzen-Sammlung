const ALLOWED_PRODUCT_IDS = new Set([
  'com.alaniselin.numisma.pro.monthly',
  'com.alaniselin.numisma.pro.yearly',
]);

export function isAllowedAppleProProductId(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_PRODUCT_IDS.has(value);
}

export interface NormalizedAppleSubscriptionTransaction {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  appAccountToken: string;
  expiresAt: string;
  revokedAt?: string;
  environment: 'sandbox' | 'production';
}

export class SubscriptionTransactionError extends Error {
  constructor(readonly code:
    | 'subscription/account-token-mismatch'
    | 'subscription/product-not-allowed'
    | 'subscription/invalid-transaction') {
    super(code);
    this.name = 'SubscriptionTransactionError';
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function appleTransactionId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]{1,64}$/.test(value);
}

function appleTimestamp(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0
    && Number.isFinite(new Date(value).getTime());
}

export function isCanonicalAppAccountToken(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizedEnvironment(value: unknown): 'sandbox' | 'production' | null {
  if (value === 'Sandbox') return 'sandbox';
  if (value === 'Production') return 'production';
  return null;
}

export function normalizeVerifiedSubscriptionTransaction(
  value: unknown,
  expectedAppAccountToken: string,
): NormalizedAppleSubscriptionTransaction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SubscriptionTransactionError('subscription/invalid-transaction');
  }

  const transaction = value as Record<string, unknown>;
  const productId = transaction.productId;
  if (!isAllowedAppleProProductId(productId)) {
    throw new SubscriptionTransactionError('subscription/product-not-allowed');
  }

  if (
    !isCanonicalAppAccountToken(expectedAppAccountToken)
    || !isCanonicalAppAccountToken(transaction.appAccountToken)
  ) {
    throw new SubscriptionTransactionError('subscription/invalid-transaction');
  }

  if (transaction.appAccountToken !== expectedAppAccountToken) {
    throw new SubscriptionTransactionError('subscription/account-token-mismatch');
  }

  const environment = normalizedEnvironment(transaction.environment);
  const expiresDate = transaction.expiresDate;
  const revocationDate = transaction.revocationDate;
  if (
    !appleTransactionId(transaction.transactionId)
    || !appleTransactionId(transaction.originalTransactionId)
    || !nonEmptyString(transaction.appAccountToken)
    || environment === null
    || !appleTimestamp(expiresDate)
    || (revocationDate !== undefined && !appleTimestamp(revocationDate))
  ) {
    throw new SubscriptionTransactionError('subscription/invalid-transaction');
  }

  return {
    productId,
    transactionId: transaction.transactionId,
    originalTransactionId: transaction.originalTransactionId,
    appAccountToken: transaction.appAccountToken,
    expiresAt: new Date(expiresDate).toISOString(),
    ...(typeof revocationDate === 'number'
      ? { revokedAt: new Date(revocationDate).toISOString() }
      : {}),
    environment,
  };
}
