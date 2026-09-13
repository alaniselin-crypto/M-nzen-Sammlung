import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAppleAccountToken } from './appleAccountTokenApi.ts';

const endpoint = 'https://inumis-node-backend.onrender.com/api/subscription/apple/account-token';
const accountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

test('requests the server-owned appAccountToken with the authenticated Firebase credential', async () => {
  let request: { url: string; init?: RequestInit } | null = null;
  const fetchImplementation: typeof fetch = async (url, init) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({ token: accountToken }), { status: 200 });
  };

  assert.equal(
    await fetchAppleAccountToken('firebase-id-token', fetchImplementation),
    accountToken,
  );
  assert.equal(request?.url, endpoint);
  assert.equal(request?.init?.method, 'POST');
  assert.deepEqual(request?.init?.headers, {
    Authorization: 'Bearer firebase-id-token',
    'Content-Type': 'application/json',
  });
  assert.equal(request?.init?.body, '{}');
  assert.ok(request?.init?.signal instanceof AbortSignal);
});

test('fails closed for malformed token responses and unsuccessful requests', async () => {
  for (const response of [
    new Response(JSON.stringify({ token: 'not-a-uuid' }), { status: 200 }),
    new Response(JSON.stringify({ token: accountToken, extra: true }), { status: 200 }),
    new Response(JSON.stringify({ error: 'auth/invalid-token' }), { status: 401 }),
  ]) {
    await assert.rejects(
      fetchAppleAccountToken('firebase-id-token', async () => response),
      (error: unknown) => error instanceof Error
        && (error as Error & { code?: string }).code === 'subscription/unavailable',
    );
  }
});

test('rejects a missing Firebase credential before making a request', async () => {
  let calls = 0;
  await assert.rejects(
    fetchAppleAccountToken(' ', async () => {
      calls += 1;
      return new Response('{}');
    }),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/invalid-request',
  );
  assert.equal(calls, 0);
});
