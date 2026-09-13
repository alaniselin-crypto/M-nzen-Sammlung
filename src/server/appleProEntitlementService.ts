import {
  resolveAppleProEntitlement,
  isValidSignedTransactionInput,
  type AppleSignedTransactionVerifier,
  type ResolvedAppleProEntitlement,
} from './appleProEntitlementResolver';
import type { AppleSubscriptionEnvironment } from './appleSubscriptionConfig';
import { isCanonicalAppAccountToken } from './appleSubscriptionTransaction';

export interface AppleAccountTokenStore {
  getForFirebaseUid(firebaseUid: string): Promise<string | null>;
}

export interface AuthenticatedAppleProEntitlementRequest {
  firebaseUid: string;
  signedTransaction: string;
  expectedEnvironment: AppleSubscriptionEnvironment;
  now: Date;
}

export type AuthenticatedAppleProEntitlement = ResolvedAppleProEntitlement | {
  active: false;
  reason:
    | 'account-token-not-found'
    | 'account-token-lookup-failed'
    | 'account-token-invalid'
    | 'invalid-request';
};

export async function resolveAuthenticatedAppleProEntitlement(
  request: AuthenticatedAppleProEntitlementRequest,
  accountTokens: AppleAccountTokenStore,
  verifier: AppleSignedTransactionVerifier,
): Promise<AuthenticatedAppleProEntitlement> {
  if (
    typeof request.firebaseUid !== 'string'
    || request.firebaseUid.trim().length === 0
    || request.firebaseUid.length > 128
    || !isValidSignedTransactionInput(request.signedTransaction)
    || (request.expectedEnvironment !== 'sandbox' && request.expectedEnvironment !== 'production')
    || !(request.now instanceof Date)
    || !Number.isFinite(request.now.getTime())
  ) {
    return { active: false, reason: 'invalid-request' };
  }

  let expectedAppAccountToken: string | null;
  try {
    expectedAppAccountToken = await accountTokens.getForFirebaseUid(request.firebaseUid);
  } catch {
    return { active: false, reason: 'account-token-lookup-failed' };
  }

  if (
    typeof expectedAppAccountToken !== 'string'
    || expectedAppAccountToken.trim().length === 0
  ) {
    return { active: false, reason: 'account-token-not-found' };
  }

  if (!isCanonicalAppAccountToken(expectedAppAccountToken)) {
    return { active: false, reason: 'account-token-invalid' };
  }

  return resolveAppleProEntitlement({
    signedTransaction: request.signedTransaction,
    expectedAppAccountToken,
    expectedEnvironment: request.expectedEnvironment,
    now: request.now,
  }, verifier);
}