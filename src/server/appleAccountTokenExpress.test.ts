import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { createAppleAccountTokenHandler } from './appleAccountTokenExpress';
import type { FirebaseAuthenticatedAppleAccountTokenDependencies } from './appleAccountTokenHttp';

const firebaseUid = 'firebase-user-123';
const appAccountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

function dependencies(): FirebaseAuthenticatedAppleAccountTokenDependencies {
  return {
    firebaseAuth: {
      async verifyIdToken() {
        return { uid: firebaseUid };
      },
    },
    accountTokens: {
      async getOrCreateForFirebaseUid() {
        return appAccountToken;
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

function requestWithAuthorization(authorization: string | undefined): Request {
  return {
    get(name: string) {
      return name.toLowerCase() === 'authorization' ? authorization : undefined;
    },
  } as unknown as Request;
}

test('adapts an authenticated Express request to account-token provisioning', async () => {
  const handler = createAppleAccountTokenHandler(dependencies());
  const recorder = responseRecorder();

  await handler(
    requestWithAuthorization('Bearer firebase-id-token'),
    recorder.response,
    () => undefined,
  );

  assert.equal(recorder.result().status, 200);
  assert.deepEqual(recorder.result().body, { token: appAccountToken });
  assert.equal(recorder.result().headers.get('Cache-Control'), 'no-store');
  assert.equal(recorder.result().headers.get('Pragma'), 'no-cache');
});

test('preserves the non-sensitive missing-credential response and no-store headers', async () => {
  const handler = createAppleAccountTokenHandler(dependencies());
  const recorder = responseRecorder();

  await handler(requestWithAuthorization(undefined), recorder.response, () => undefined);

  assert.equal(recorder.result().status, 401);
  assert.deepEqual(recorder.result().body, { error: 'auth/missing-token' });
  assert.equal(recorder.result().headers.get('Cache-Control'), 'no-store');
  assert.equal(recorder.result().headers.get('Pragma'), 'no-cache');
});
