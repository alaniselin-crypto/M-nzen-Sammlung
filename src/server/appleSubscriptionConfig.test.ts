import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readAppleSubscriptionConfiguration,
  SubscriptionConfigurationError,
} from './appleSubscriptionConfig';

const privateKey = '-----BEGIN PRIVATE KEY-----\nunit-test-key\n-----END PRIVATE KEY-----';

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    APPLE_IAP_KEY_ID: 'ABCDEFGHIJ',
    APPLE_IAP_ISSUER_ID: '11111111-2222-3333-4444-555555555555',
    APPLE_IAP_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
    APPLE_BUNDLE_ID: 'com.alaniselin.numisma',
    APPLE_APP_ID: '1234567890',
    APPLE_IAP_ENVIRONMENT: 'production',
    ...overrides,
  };
}

test('reads a complete production transaction-verification configuration', () => {
  const config = readAppleSubscriptionConfiguration(environment());

  assert.equal(config.bundleId, 'com.alaniselin.numisma');
  assert.equal(config.appAppleId, 1234567890);
  assert.equal(config.environment, 'production');
});

test('allows a sandbox configuration without a production app Apple ID', () => {
  const config = readAppleSubscriptionConfiguration(environment({
    APPLE_IAP_ENVIRONMENT: 'sandbox',
    APPLE_APP_ID: undefined,
  }));

  assert.equal(config.environment, 'sandbox');
  assert.equal(config.appAppleId, undefined);
});

test('allows transaction verification without unused App Store API signing credentials', () => {
  const config = readAppleSubscriptionConfiguration({
    APPLE_BUNDLE_ID: 'com.alaniselin.numisma.test',
    APPLE_IAP_ENVIRONMENT: 'sandbox',
  });

  assert.equal(config.bundleId, 'com.alaniselin.numisma.test');
  assert.equal(config.environment, 'sandbox');
  assert.equal(config.appAppleId, undefined);
});

test('rejects missing and malformed configuration without exposing secret values', () => {
  assert.throws(
    () => readAppleSubscriptionConfiguration(environment({ APPLE_BUNDLE_ID: undefined })),
    (error: unknown) => error instanceof SubscriptionConfigurationError && error.code === 'subscription/server-not-configured',
  );
  assert.throws(
    () => readAppleSubscriptionConfiguration(environment({ APPLE_APP_ID: 'not-a-number' })),
    (error: unknown) => error instanceof SubscriptionConfigurationError && error.code === 'subscription/server-not-configured',
  );
});
