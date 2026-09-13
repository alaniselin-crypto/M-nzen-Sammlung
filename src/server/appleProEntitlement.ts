import type { AppleSubscriptionEnvironment } from './appleSubscriptionConfig';
import type { NormalizedAppleSubscriptionTransaction } from './appleSubscriptionTransaction';

export type AppleProEntitlement =
  | {
      active: true;
      productId: string;
      originalTransactionId: string;
      latestTransactionId: string;
      expiresAt: string;
      environment: AppleSubscriptionEnvironment;
    }
  | {
      active: false;
      reason: 'expired' | 'revoked';
      productId: string;
      originalTransactionId: string;
      latestTransactionId: string;
      expiresAt: string;
      environment: AppleSubscriptionEnvironment;
    }
  | {
      active: false;
      reason: 'environment-mismatch' | 'invalid-time';
    };

export function evaluateAppleProEntitlement(
  transaction: NormalizedAppleSubscriptionTransaction,
  expectedEnvironment: AppleSubscriptionEnvironment,
  now: Date,
): AppleProEntitlement {
  if (transaction.environment !== expectedEnvironment) {
    return { active: false, reason: 'environment-mismatch' };
  }

  if (transaction.revokedAt !== undefined) {
    return {
      active: false,
      reason: 'revoked',
      productId: transaction.productId,
      originalTransactionId: transaction.originalTransactionId,
      latestTransactionId: transaction.transactionId,
      expiresAt: transaction.expiresAt,
      environment: transaction.environment,
    };
  }

  const expiresAt = Date.parse(transaction.expiresAt);
  const evaluatedAt = now.getTime();
  if (!Number.isFinite(expiresAt) || !Number.isFinite(evaluatedAt)) {
    return { active: false, reason: 'invalid-time' };
  }

  if (expiresAt <= evaluatedAt) {
    return {
      active: false,
      reason: 'expired',
      productId: transaction.productId,
      originalTransactionId: transaction.originalTransactionId,
      latestTransactionId: transaction.transactionId,
      expiresAt: transaction.expiresAt,
      environment: transaction.environment,
    };
  }

  return {
    active: true,
    productId: transaction.productId,
    originalTransactionId: transaction.originalTransactionId,
    latestTransactionId: transaction.transactionId,
    expiresAt: transaction.expiresAt,
    environment: transaction.environment,
  };
}
