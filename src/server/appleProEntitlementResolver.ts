import {
  evaluateAppleProEntitlement,
  type AppleProEntitlement,
} from './appleProEntitlement';
import type { AppleSubscriptionEnvironment } from './appleSubscriptionConfig';
import {
  isCanonicalAppAccountToken,
  normalizeVerifiedSubscriptionTransaction,
} from './appleSubscriptionTransaction';

export interface AppleSignedTransactionVerifier {
  verifyAndDecodeTransaction(signedTransaction: string): Promise<unknown>;
}

export interface AppleProEntitlementRequest {
  signedTransaction: string;
  expectedAppAccountToken: string;
  expectedEnvironment: AppleSubscriptionEnvironment;
  now: Date;
}

export type ResolvedAppleProEntitlement = AppleProEntitlement | {
  active: false;
  reason: 'verification-failed';
};

const MAX_SIGNED_TRANSACTION_LENGTH = 64 * 1024;

export function isValidSignedTransactionInput(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= MAX_SIGNED_TRANSACTION_LENGTH;
}

export async function resolveAppleProEntitlement(
  request: AppleProEntitlementRequest,
  verifier: AppleSignedTransactionVerifier,
): Promise<ResolvedAppleProEntitlement> {
  if (
    !isValidSignedTransactionInput(request.signedTransaction)
    || !isCanonicalAppAccountToken(request.expectedAppAccountToken)
    || (request.expectedEnvironment !== 'sandbox' && request.expectedEnvironment !== 'production')
    || !(request.now instanceof Date)
    || !Number.isFinite(request.now.getTime())
  ) {
    return { active: false, reason: 'verification-failed' };
  }

  try {
    const decodedTransaction = await verifier.verifyAndDecodeTransaction(request.signedTransaction);
    const transaction = normalizeVerifiedSubscriptionTransaction(
      decodedTransaction,
      request.expectedAppAccountToken,
    );
    return evaluateAppleProEntitlement(transaction, request.expectedEnvironment, request.now);
  } catch {
    return { active: false, reason: 'verification-failed' };
  }
}
