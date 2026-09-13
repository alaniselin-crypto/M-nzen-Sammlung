const APPLE_PRO_ENTITLEMENT_URL = 'https://inumis-node-backend.onrender.com/api/subscription/apple/entitlement';
const ENTITLEMENT_TIMEOUT_MS = 15_000;
const MAX_FIREBASE_ID_TOKEN_LENGTH = 8192;
const MAX_SIGNED_TRANSACTION_LENGTH = 64 * 1024;
const ALLOWED_PRODUCT_IDS = new Set([
  'com.alaniselin.numisma.pro.monthly',
  'com.alaniselin.numisma.pro.yearly',
]);
const INACTIVE_REASONS = new Set([
  'environment-mismatch',
  'revoked',
  'expired',
]);

export type AppleProEntitlementResponse =
  | {
      active: true;
      productId: string;
      expiresAt: string;
    }
  | {
      active: false;
      reason: 'environment-mismatch' | 'revoked' | 'expired';
    };

class AppleProEntitlementApiError extends Error {
  readonly code: 'subscription/invalid-request' | 'subscription/unavailable';

  constructor(code: 'subscription/invalid-request' | 'subscription/unavailable') {
    super(code);
    this.name = 'AppleProEntitlementApiError';
    this.code = code;
  }
}

function isNonEmptyCredential(value: string, maximumLength: number): boolean {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maximumLength;
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === [...expectedKeys].sort()[index]);
}

function parseEntitlementResponse(value: unknown): AppleProEntitlementResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;

  if (payload.active === true) {
    if (
      !hasExactKeys(payload, ['active', 'expiresAt', 'productId'])
      || typeof payload.productId !== 'string'
      || !ALLOWED_PRODUCT_IDS.has(payload.productId)
      || typeof payload.expiresAt !== 'string'
      || !Number.isFinite(Date.parse(payload.expiresAt))
      || new Date(payload.expiresAt).toISOString() !== payload.expiresAt
    ) {
      return null;
    }
    return {
      active: true,
      productId: payload.productId,
      expiresAt: payload.expiresAt,
    };
  }

  if (
    payload.active === false
    && hasExactKeys(payload, ['active', 'reason'])
    && typeof payload.reason === 'string'
    && INACTIVE_REASONS.has(payload.reason)
  ) {
    return payload as AppleProEntitlementResponse;
  }

  return null;
}

export async function fetchAppleProEntitlement(
  firebaseIdToken: string,
  signedTransaction: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<AppleProEntitlementResponse> {
  if (
    !isNonEmptyCredential(firebaseIdToken, MAX_FIREBASE_ID_TOKEN_LENGTH)
    || !isNonEmptyCredential(signedTransaction, MAX_SIGNED_TRANSACTION_LENGTH)
  ) {
    throw new AppleProEntitlementApiError('subscription/invalid-request');
  }

  try {
    const response = await fetchImplementation(APPLE_PRO_ENTITLEMENT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firebaseIdToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signedTransaction }),
      signal: AbortSignal.timeout(ENTITLEMENT_TIMEOUT_MS),
    });
    if (!response.ok) throw new AppleProEntitlementApiError('subscription/unavailable');

    const entitlement = parseEntitlementResponse(await response.json());
    if (entitlement === null) throw new AppleProEntitlementApiError('subscription/unavailable');
    return entitlement;
  } catch (error) {
    if (error instanceof AppleProEntitlementApiError) throw error;
    throw new AppleProEntitlementApiError('subscription/unavailable');
  }
}
