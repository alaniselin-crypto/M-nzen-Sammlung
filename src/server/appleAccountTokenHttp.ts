import {
  provisionAppleAccountToken,
  type AppleAccountTokenProvisioningStore,
} from './appleAccountTokenService';
import type { FirebaseIdTokenVerifier } from './appleProEntitlementHttp';

interface AppleAccountTokenResponse {
  token: string;
}

interface AppleAccountTokenErrorResponse {
  error:
    | 'auth/missing-token'
    | 'auth/invalid-token'
    | 'subscription/unavailable';
}

export type FirebaseAuthenticatedAppleAccountTokenResult =
  | { status: 200; body: AppleAccountTokenResponse }
  | { status: 401; body: AppleAccountTokenErrorResponse }
  | { status: 503; body: AppleAccountTokenErrorResponse };

export interface FirebaseAuthenticatedAppleAccountTokenDependencies {
  firebaseAuth: FirebaseIdTokenVerifier;
  accountTokens: AppleAccountTokenProvisioningStore;
}

function bearerToken(authorization: string | undefined): string | null {
  if (typeof authorization !== 'string') return null;
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  if (!match || match[1].length > 8192) return null;
  return match[1];
}

function isValidFirebaseUid(uid: unknown): uid is string {
  return typeof uid === 'string'
    && uid.trim().length > 0
    && uid.length <= 128;
}

export async function resolveFirebaseAuthenticatedAppleAccountTokenRequest(
  authorization: string | undefined,
  dependencies: FirebaseAuthenticatedAppleAccountTokenDependencies,
): Promise<FirebaseAuthenticatedAppleAccountTokenResult> {
  const idToken = bearerToken(authorization);
  if (idToken === null) {
    return { status: 401, body: { error: 'auth/missing-token' } };
  }

  let firebaseUid: string;
  try {
    const decodedToken = await dependencies.firebaseAuth.verifyIdToken(idToken, true);
    if (!isValidFirebaseUid(decodedToken?.uid)) throw new Error('Invalid Firebase uid');
    firebaseUid = decodedToken.uid;
  } catch {
    return { status: 401, body: { error: 'auth/invalid-token' } };
  }

  try {
    const token = await provisionAppleAccountToken(firebaseUid, dependencies.accountTokens);
    return { status: 200, body: token };
  } catch {
    return { status: 503, body: { error: 'subscription/unavailable' } };
  }
}
