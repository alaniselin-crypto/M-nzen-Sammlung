import assert from 'node:assert/strict';
import test from 'node:test';
import {
  provisionAppleAccountToken,
  type AppleAccountTokenProvisioningStore,
} from './appleAccountTokenService';

const generatedToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';
const existingToken = '90b162b9-df2f-4ed0-b50b-7de6135df58d';

function store(returnedToken: string = generatedToken): AppleAccountTokenProvisioningStore & {
  calls: Array<{ firebaseUid: string; proposedToken: string }>;
} {
  const calls: Array<{ firebaseUid: string; proposedToken: string }> = [];
  return {
    calls,
    async getOrCreateForFirebaseUid(firebaseUid, proposedToken) {
      calls.push({ firebaseUid, proposedToken });
      return returnedToken;
    },
  };
}

test('atomically provisions a canonical appAccountToken for the authenticated Firebase user', async () => {
  const tokens = store();

  assert.deepEqual(await provisionAppleAccountToken(
    'firebase-user-123',
    tokens,
    () => generatedToken,
  ), { token: generatedToken });
  assert.deepEqual(tokens.calls, [{
    firebaseUid: 'firebase-user-123',
    proposedToken: generatedToken,
  }]);
});

test('returns the existing token selected atomically by the store', async () => {
  const tokens = store(existingToken);

  assert.deepEqual(await provisionAppleAccountToken(
    'firebase-user-123',
    tokens,
    () => generatedToken,
  ), { token: existingToken });
});

test('rejects invalid identity, generated tokens, and stored tokens without persisting unsafe data', async () => {
  const invalidUidStore = store();
  await assert.rejects(
    provisionAppleAccountToken(' ', invalidUidStore, () => generatedToken),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/invalid-request',
  );
  assert.equal(invalidUidStore.calls.length, 0);

  const invalidGeneratedStore = store();
  await assert.rejects(
    provisionAppleAccountToken('firebase-user-123', invalidGeneratedStore, () => 'not-a-uuid'),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/unavailable',
  );
  assert.equal(invalidGeneratedStore.calls.length, 0);

  await assert.rejects(
    provisionAppleAccountToken('firebase-user-123', store('not-a-uuid'), () => generatedToken),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/unavailable',
  );
});

test('maps store failures to a non-sensitive unavailable error', async () => {
  const tokens: AppleAccountTokenProvisioningStore = {
    async getOrCreateForFirebaseUid() {
      throw new Error('sensitive database detail');
    },
  };

  await assert.rejects(
    provisionAppleAccountToken('firebase-user-123', tokens, () => generatedToken),
    (error: unknown) => error instanceof Error
      && error.message === 'subscription/unavailable'
      && (error as Error & { code?: string }).code === 'subscription/unavailable',
  );
});
