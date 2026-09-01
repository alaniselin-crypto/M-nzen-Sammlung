import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deleteAccountOnServer,
  deleteTestAppleAccountOnServer,
} from './accountDeletionApi.ts';

test('routes password/google deletion through the server-authoritative endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let request: { url: string; init?: RequestInit } | null = null;
  globalThis.fetch = async (url, init) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  try {
    await deleteAccountOnServer('test-id-token');
    assert.equal(request?.url, 'https://inumis-node-backend.onrender.com/api/account/delete');
    assert.equal(request?.init?.method, 'POST');
    assert.equal((request?.init?.headers as Record<string, string>).Authorization, 'Bearer test-id-token');
    assert.equal(request?.init?.body, '{}');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('keeps Apple authorization-code deletion on its dedicated endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let request: { url: string; init?: RequestInit } | null = null;
  globalThis.fetch = async (url, init) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  try {
    await deleteTestAppleAccountOnServer('test-id-token', 'test-authorization-code');
    assert.equal(request?.url, 'https://inumis-node-backend.onrender.com/api/account/apple/delete/test');
    assert.equal(request?.init?.body, JSON.stringify({ authorizationCode: 'test-authorization-code' }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
