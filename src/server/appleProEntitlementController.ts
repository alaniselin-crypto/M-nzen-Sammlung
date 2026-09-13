import type { AppleSubscriptionEnvironment } from './appleSubscriptionConfig';
import {
  resolveAuthenticatedAppleProEntitlement,
  type AppleAccountTokenStore,
} from './appleProEntitlementService';
import {
  isValidSignedTransactionInput,
  type AppleSignedTransactionVerifier,
} from './appleProEntitlementResolver';

interface ActiveEntitlementResponse {
  active: true;
  productId: string;
  expiresAt: string;
}

interface InactiveEntitlementResponse {
  active: false;
  reason: 'environment-mismatch' | 'revoked' | 'expired';
}

export interface RecordedAppleProEntitlement {
  schemaVersion: 1;
  status: 'active' | 'expired' | 'revoked';
  source: 'app-store';
  environment: AppleSubscriptionEnvironment;
  productId: string;
  originalTransactionId: string;
  latestTransactionId: string;
  expiresAt: string;
  trialEndsAt: null;
  updatedAt: string;
}

export interface AppleProEntitlementRecordStore {
  recordForFirebaseUid(
    firebaseUid: string,
    entitlement: RecordedAppleProEntitlement,
  ): Promise<void>;
}

interface RecordableAppleProTransaction {
  environment: AppleSubscriptionEnvironment;
  productId: string;
  originalTransactionId: string;
  latestTransactionId: string;
  expiresAt: string;
}

function toRecordedEntitlement(
  transaction: RecordableAppleProTransaction,
  status: 'active' | 'expired' | 'revoked',
  updatedAt: string,
): RecordedAppleProEntitlement {
  return {
    schemaVersion: 1,
    status,
    source: 'app-store',
    environment: transaction.environment,
    productId: transaction.productId,
    originalTransactionId: transaction.originalTransactionId,
    latestTransactionId: transaction.latestTransactionId,
    expiresAt: transaction.expiresAt,
    trialEndsAt: null,
    updatedAt,
  };
}

interface EntitlementErrorResponse {
  active: false;
  error: 'subscription/invalid-request' | 'subscription/unavailable';
}

export type AppleProEntitlementControllerResult =
  | { status: 200; body: ActiveEntitlementResponse | InactiveEntitlementResponse }
  | { status: 400; body: EntitlementErrorResponse }
  | { status: 503; body: EntitlementErrorResponse };

export interface AppleProEntitlementControllerDependencies {
  expectedEnvironment: AppleSubscriptionEnvironment;
  now: () => Date;
  accountTokens: AppleAccountTokenStore;
  entitlements: AppleProEntitlementRecordStore;
  verifier: AppleSignedTransactionVerifier;
}

function signedTransactionFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'signedTransaction') return null;

  const signedTransaction = (body as Record<string, unknown>).signedTransaction;
  return isValidSignedTransactionInput(signedTransaction) ? signedTransaction : null;
}

export async function resolveAppleProEntitlementRequest(
  firebaseUid: string,
  body: unknown,
  dependencies: AppleProEntitlementControllerDependencies,
): Promise<AppleProEntitlementControllerResult> {
  const signedTransaction = signedTransactionFromBody(body);
  if (signedTransaction === null) {
    return {
      status: 400,
      body: { active: false, error: 'subscription/invalid-request' },
    };
  }

  try {
    const now = dependencies.now();
    if (
      (dependencies.expectedEnvironment !== 'sandbox'
        && dependencies.expectedEnvironment !== 'production')
      || !(now instanceof Date)
      || !Number.isFinite(now.getTime())
    ) {
      return {
        status: 503,
        body: { active: false, error: 'subscription/unavailable' },
      };
    }

    const entitlement = await resolveAuthenticatedAppleProEntitlement({
      firebaseUid,
      signedTransaction,
      expectedEnvironment: dependencies.expectedEnvironment,
      now,
    }, dependencies.accountTokens, dependencies.verifier);

    if (entitlement.active === true) {
      const body: ActiveEntitlementResponse = {
        active: true,
        productId: entitlement.productId,
        expiresAt: entitlement.expiresAt,
      };
      await dependencies.entitlements.recordForFirebaseUid(
        firebaseUid,
        toRecordedEntitlement(entitlement, 'active', now.toISOString()),
      );
      return {
        status: 200,
        body,
      };
    }

    if (
      entitlement.reason === 'environment-mismatch'
      || entitlement.reason === 'revoked'
      || entitlement.reason === 'expired'
    ) {
      const body: InactiveEntitlementResponse = {
        active: false,
        reason: entitlement.reason,
      };
      if (entitlement.reason === 'expired' || entitlement.reason === 'revoked') {
        await dependencies.entitlements.recordForFirebaseUid(
          firebaseUid,
          toRecordedEntitlement(entitlement, entitlement.reason, now.toISOString()),
        );
      }
      return {
        status: 200,
        body,
      };
    }

    if (entitlement.reason === 'invalid-request') {
      return {
        status: 400,
        body: { active: false, error: 'subscription/invalid-request' },
      };
    }

    return {
      status: 503,
      body: { active: false, error: 'subscription/unavailable' },
    };
  } catch {
    return {
      status: 503,
      body: { active: false, error: 'subscription/unavailable' },
    };
  }
}
