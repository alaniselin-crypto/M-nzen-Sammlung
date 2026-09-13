import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { createAppleProEntitlementHandler } from './appleProEntitlementExpress';
import type { FirebaseAuthenticatedAppleProEntitlementDependencies } from './appleProEntitlementHttp';

const firebaseUid = 'firebase-user-123';
const appAccountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

function dependencies(): FirebaseAuthenticatedAppleProEntitlementDependencies {
  return {
    firebaseAuth: {
      async verifyIdToken() {
        return { uid: firebaseUid };
      },
    },
    entitlement: {
      expectedEnvironment: 'sandbox',
      now: () => new Date('2027-01-15T07:59:59.999Z'),
      accountTokens: {
        async getForFirebaseUid() {
          return appAccountToken;
        },
      },
      entitlements: {
        async recordForFirebaseUid() {},
      },
      verifier: {
        async verifyAndDecodeTransaction() {
          return {
            productId: 'com.alaniselin.numisma.pro.monthly',
            transactionId: '2000000123456789',
            originalTransactionId: '2000000123456789',
            appAccountToken,
            expiresDate: 1_800_000_000_000,
            environment: 'Sandbox',
          };
        },
      },
    },
  };
}

function responseRecorder() {
  const headers = new Map<string, string>();
  let status: number | undefined;
  let body: unknown;
  const response = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    status(value: number) {
      status = value;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
  };
  return {
    response: response as unknown as Response,
    result: () => ({ headers, status, body }),
  };
}

test('adapts an Express request to the authenticated entitlement boundary without exposing internals', async () => {
  const handler = createAppleProEntitlementHandler(dependencies());
  const request = {
    body: { signedTransaction: 'signed-apple-transaction' },
    get(name: string) {
      return name.toLowerCase() === 'authorization' ? 'Bearer firebase-id-token' : undefined;
    },
  } as unknown as Request;
  const recorder = responseRecorder();

  await handler(request, recorder.response, () => undefined);

  assert.equal(recorder.result().status, 200);
  assert.deepEqual(recorder.result().body, {
    active: true,
    productId: 'com.alaniselin.numisma.pro.monthly',
    expiresAt: '2027-01-15T08:00:00.000Z',
  });
  assert.equal(recorder.result().headers.get('Cache-Control'), 'no-store');
  assert.equal(recorder.result().headers.get('Pragma'), 'no-cache');
});

test('returns the existing non-sensitive authentication response for a missing bearer token', async () => {
  const handler = createAppleProEntitlementHandler(dependencies());
  const request = {
    body: { signedTransaction: 'signed-apple-transaction' },
    get() {
      return undefined;
    },
  } as unknown as Request;
  const recorder = responseRecorder();

  await handler(request, recorder.response, () => undefined);

  assert.equal(recorder.result().status, 401);
  assert.deepEqual(recorder.result().body, {
    active: false,
    error: 'auth/missing-token',
  });
  assert.equal(recorder.result().headers.get('Cache-Control'), 'no-store');
});
