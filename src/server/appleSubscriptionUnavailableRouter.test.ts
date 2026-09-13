import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';

test('returns an unavailable response for desktop entitlement when Apple subscriptions are not configured', async () => {
  const module = await import('./appleSubscriptionUnavailableRouter.ts');
  assert.equal(typeof module.createAppleSubscriptionUnavailableRouter, 'function');

  const app = express();
  app.use('/api/subscription/apple', module.createAppleSubscriptionUnavailableRouter({
    allowedOrigins: new Set(['capacitor://localhost']),
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/subscription/apple/entitlement`,
      { headers: { Origin: 'capacitor://localhost' } },
    );

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      active: false,
      error: 'subscription/unavailable',
    });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), 'capacitor://localhost');
  } finally {
    server.close();
    await once(server, 'close');
  }
});
