import {
  resolveAppleProEntitlementRequest,
  type AppleProEntitlementControllerDependencies,
  type AppleProEntitlementControllerResult,
} from './appleProEntitlementController';

interface FirebaseAuthenticationErrorResponse {
  active: false;
  error: 'auth/missing-token' | 'auth/invalid-token';
}

export type FirebaseAuthenticatedAppleProEntitlementResult =
  | AppleProEntitlementControllerResult
  | { status: 401; body: FirebaseAuthenticationErrorResponse };

export interface FirebaseIdTokenVerifier {
  verifyIdToken(
    idToken: string,
    checkRevoked: boolean,
  ): Promise<{ uid: string }>;
}

export interface FirebaseAuthenticatedAppleProEntitlementDependencies {
  firebaseAuth: FirebaseIdTokenVerifier;
  entitlement: AppleProEntitlementControllerDependencies;
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

export async function resolveFirebaseAuthenticatedAppleProEntitlementRequest(
  authorization: string | undefined,
  body: unknown,
  dependencies: FirebaseAuthenticatedAppleProEntitlementDependencies,
): Promise<FirebaseAuthenticatedAppleProEntitlementResult> {
  const idToken = bearerToken(authorization);
  if (idToken === null) {
    return {
      status: 401,
      body: { active: false, error: 'auth/missing-token' },
    };
  }

  let firebaseUid: string;
  try {
    const decodedToken = await dependencies.firebaseAuth.verifyIdToken(idToken, true);
    if (!isValidFirebaseUid(decodedToken?.uid)) throw new Error('Invalid Firebase uid');
    firebaseUid = decodedToken.uid;
  } catch {
    return {
      status: 401,
      body: { active: false, error: 'auth/invalid-token' },
    };
  }

  return resolveAppleProEntitlementRequest(
    firebaseUid,
    body,
    dependencies.entitlement,
  );
}
