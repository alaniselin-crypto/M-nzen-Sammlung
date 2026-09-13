import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveFirebaseAuthenticatedAppleAccountTokenRequest,
  type FirebaseAuthenticatedAppleAccountTokenDependencies,
} from './appleAccountTokenHttp';

const firebaseUid = 'firebase-user-123';
const appAccountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

function dependencies(): FirebaseAuthenticatedAppleAccountTokenDependencies & {
  verifiedTokens: Array<{ token: string; checkRevoked: boolean }>;
  provisionedUids: string[];
} {
  const verifiedTokens: Array<{ token: string; checkRevoked: boolean }> = [];
  const provisionedUids: string[] = [];
  return {
    verifiedTokens,
    provisionedUids,
    firebaseAuth: {
      async verifyIdToken(token, checkRevoked) {
        verifiedTokens.push({ token, checkRevoked });
        return { uid: firebaseUid };
      },
    },
    accountTokens: {
      async getOrCreateForFirebaseUid(uid, proposedToken) {
        provisionedUids.push(uid);
        assert.match(proposedToken, /^[0-9a-f-]{36}$/);
        return appAccountToken;
      },
    },
  };
}

test('provisions one server-owned appAccountToken for the authenticated Firebase user', async () => {
  const context = dependencies();

  assert.deepEqual(
    await resolveFirebaseAuthenticatedAppleAccountTokenRequest('Bearer firebase-id-token', context),
    { status: 200, body: { token: appAccountToken } },
  );
  assert.deepEqual(context.verifiedTokens, [{ token: 'firebase-id-token', checkRevoked: true }]);
  assert.deepEqual(context.provisionedUids, [firebaseUid]);
});

test('rejects missing or invalid Firebase credentials before provisioning', async () => {
  const missing = dependencies();
  assert.deepEqual(
    await resolveFirebaseAuthenticatedAppleAccountTokenRequest(undefined, missing),
    { status: 401, body: { error: 'auth/missing-token' } },
  );
  assert.equal(missing.provisionedUids.length, 0);

  const invalid = dependencies();
  invalid.firebaseAuth.verifyIdToken = async () => { throw new Error('rejected'); };
  assert.deepEqual(
    await resolveFirebaseAuthenticatedAppleAccountTokenRequest('Bearer invalid', invalid),
    { status: 401, body: { error: 'auth/invalid-token' } },
  );
  assert.equal(invalid.provisionedUids.length, 0);
});

test('fails closed with a non-sensitive response when provisioning is unavailable', async () => {
  const context = dependencies();
  context.accountTokens.getOrCreateForFirebaseUid = async () => {
    throw new Error('sensitive storage detail');
  };

  assert.deepEqual(
    await resolveFirebaseAuthenticatedAppleAccountTokenRequest('Bearer firebase-id-token', context),
    { status: 503, body: { error: 'subscription/unavailable' } },
  );
});
