import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAppleProEntitlement } from './appleProEntitlementApi.ts';

const endpoint = 'https://inumis-node-backend.onrender.com/api/subscription/apple/entitlement';

test('requests the server-authoritative entitlement with Firebase and Apple credentials', async () => {
  let request: { url: string; init?: RequestInit } | null = null;
  const fetchImplementation: typeof fetch = async (url, init) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({
      active: true,
      productId: 'com.alaniselin.numisma.pro.monthly',
      expiresAt: '2027-01-15T08:00:00.000Z',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await fetchAppleProEntitlement(
    'firebase-id-token',
    'signed-apple-transaction',
    fetchImplementation,
  );

  assert.deepEqual(result, {
    active: true,
    productId: 'com.alaniselin.numisma.pro.monthly',
    expiresAt: '2027-01-15T08:00:00.000Z',
  });
  assert.equal(request?.url, endpoint);
  assert.equal(request?.init?.method, 'POST');
  assert.deepEqual(request?.init?.headers, {
    Authorization: 'Bearer firebase-id-token',
    'Content-Type': 'application/json',
  });
  assert.equal(request?.init?.body, JSON.stringify({ signedTransaction: 'signed-apple-transaction' }));
  assert.ok(request?.init?.signal instanceof AbortSignal);
});

test('accepts a server-confirmed inactive entitlement without client-side inference', async () => {
  const fetchImplementation: typeof fetch = async () => new Response(JSON.stringify({
    active: false,
    reason: 'expired',
  }), { status: 200 });

  assert.deepEqual(
    await fetchAppleProEntitlement('firebase-id-token', 'signed-apple-transaction', fetchImplementation),
    { active: false, reason: 'expired' },
  );
});

test('fails closed for malformed success payloads and non-success responses', async () => {
  for (const response of [
    new Response(JSON.stringify({ active: true, productId: 'com.alaniselin.numisma.pro.monthly' }), { status: 200 }),
    new Response(JSON.stringify({ active: false, reason: 'unknown' }), { status: 200 }),
    new Response(JSON.stringify({ active: true, productId: 'other', expiresAt: '2027-01-15T08:00:00.000Z' }), { status: 200 }),
    new Response(JSON.stringify({ active: false, error: 'auth/invalid-token' }), { status: 401 }),
  ]) {
    const fetchImplementation: typeof fetch = async () => response;
    await assert.rejects(
      fetchAppleProEntitlement('firebase-id-token', 'signed-apple-transaction', fetchImplementation),
      (error: unknown) => error instanceof Error
        && (error as Error & { code?: string }).code === 'subscription/unavailable',
    );
  }
});

test('rejects missing credentials before making a network request', async () => {
  let calls = 0;
  const fetchImplementation: typeof fetch = async () => {
    calls += 1;
    return new Response('{}');
  };

  await assert.rejects(
    fetchAppleProEntitlement(' ', 'signed-apple-transaction', fetchImplementation),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/invalid-request',
  );
  await assert.rejects(
    fetchAppleProEntitlement('firebase-id-token', '', fetchImplementation),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/invalid-request',
  );
  assert.equal(calls, 0);
});
