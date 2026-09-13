import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import { createAppleSubscriptionRouter } from './appleSubscriptionRouter';

const accountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

async function withServer(
  operation: (baseUrl: string) => Promise<void>,
  recordedEntitlement: unknown = {
    schemaVersion: 1,
    status: 'active',
    source: 'app-store',
    environment: 'sandbox',
    productId: 'com.alaniselin.numisma.pro.monthly',
    originalTransactionId: '2000000123456789',
    latestTransactionId: '2000000123456789',
    expiresAt: '2027-01-15T08:00:00.000Z',
    trialEndsAt: null,
    updatedAt: '2027-01-15T07:59:59.999Z',
  },
): Promise<void> {
  const app = express();
  app.use('/api/subscription/apple', createAppleSubscriptionRouter({
    allowedOrigins: new Set(['capacitor://localhost']),
    desktopEntitlement: {
      firebaseAuth: {
        async verifyIdToken() {
          return { uid: 'firebase-user-123' };
        },
      },
      now: () => new Date('2027-01-15T07:59:59.999Z'),
      expectedEnvironment: 'sandbox',
      entitlements: {
        async getForFirebaseUid() {
          return recordedEntitlement;
        },
      },
    },
    accountToken: {
      firebaseAuth: {
        async verifyIdToken() {
          return { uid: 'firebase-user-123' };
        },
      },
      accountTokens: {
        async getOrCreateForFirebaseUid() {
          return accountToken;
        },
      },
    },
    entitlement: {
      firebaseAuth: {
        async verifyIdToken() {
          return { uid: 'firebase-user-123' };
        },
      },
      entitlement: {
        expectedEnvironment: 'sandbox',
        now: () => new Date('2027-01-15T07:59:59.999Z'),
        accountTokens: {
          async getForFirebaseUid() {
            return accountToken;
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
              appAccountToken: accountToken,
              expiresDate: 1_800_000_000_000,
              environment: 'Sandbox',
            };
          },
        },
      },
    },
  }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    await operation(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('mounts the account-token and entitlement endpoints with strict JSON and CORS boundaries', async () => {
  await withServer(async baseUrl => {
    const headers = {
      Authorization: 'Bearer firebase-id-token',
      'Content-Type': 'application/json',
      Origin: 'capacitor://localhost',
    };
    const tokenResponse = await fetch(`${baseUrl}/api/subscription/apple/account-token`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    assert.equal(tokenResponse.status, 200);
    assert.deepEqual(await tokenResponse.json(), { token: accountToken });
    assert.equal(tokenResponse.headers.get('access-control-allow-origin'), 'capacitor://localhost');
    assert.equal(tokenResponse.headers.get('cache-control'), 'no-store');

    const entitlementResponse = await fetch(`${baseUrl}/api/subscription/apple/entitlement`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ signedTransaction: 'signed-apple-transaction' }),
    });
    assert.equal(entitlementResponse.status, 200);
    assert.deepEqual(await entitlementResponse.json(), {
      active: true,
      productId: 'com.alaniselin.numisma.pro.monthly',
      expiresAt: '2027-01-15T08:00:00.000Z',
    });
  });
});

test('returns a server-recorded unexpired entitlement for desktop access', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/subscription/apple/entitlement`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer firebase-id-token',
        Origin: 'capacitor://localhost',
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      active: true,
      productId: 'com.alaniselin.numisma.pro.monthly',
      expiresAt: '2027-01-15T08:00:00.000Z',
    });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });
});

test('fails closed when a stored desktop entitlement names an unapproved product', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/subscription/apple/entitlement`, {
      method: 'GET',
      headers: { Authorization: 'Bearer firebase-id-token' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { active: false, reason: 'expired' });
  }, {
    schemaVersion: 1,
    status: 'active',
    source: 'app-store',
    environment: 'sandbox',
    productId: 'com.alaniselin.numisma.pro.forged',
    expiresAt: '2027-01-15T08:00:00.000Z',
  });
});

test('reports a complete revoked desktop entitlement without granting access', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/subscription/apple/entitlement`, {
      method: 'GET',
      headers: { Authorization: 'Bearer firebase-id-token' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { active: false, reason: 'revoked' });
  }, {
    schemaVersion: 1,
    status: 'revoked',
    source: 'app-store',
    environment: 'sandbox',
    productId: 'com.alaniselin.numisma.pro.yearly',
    originalTransactionId: '2000000123456789',
    latestTransactionId: '2000000123456790',
    expiresAt: '2027-01-15T08:00:00.000Z',
    trialEndsAt: null,
    updatedAt: '2027-01-15T07:59:59.999Z',
  });
});

test('rejects untrusted browser origins before authentication or persistence', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/subscription/apple/account-token`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer firebase-id-token',
        'Content-Type': 'application/json',
        Origin: 'https://attacker.invalid',
      },
      body: '{}',
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'auth/origin-not-allowed' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });
});
