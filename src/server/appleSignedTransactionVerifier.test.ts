import assert from 'node:assert/strict';
import test from 'node:test';
import { Environment } from '@apple/app-store-server-library';
import {
  createAppleSignedTransactionVerifier,
  SubscriptionVerifierConfigurationError,
} from './appleSignedTransactionVerifier';
import type { AppleSubscriptionConfiguration } from './appleSubscriptionConfig';

const configuration: AppleSubscriptionConfiguration = {
  bundleId: 'com.alaniselin.numisma',
  appAppleId: 1234567890,
  environment: 'production',
};

test('constructs the Apple verifier with trusted roots and strict production checks', () => {
  const roots = [Buffer.from('root-one'), Buffer.from('root-two')];
  const constructorCalls: unknown[][] = [];
  class CapturingVerifier {
    constructor(...args: unknown[]) {
      constructorCalls.push(args);
    }

    async verifyAndDecodeTransaction(): Promise<unknown> {
      return {};
    }
  }

  const verifier = createAppleSignedTransactionVerifier(
    configuration,
    roots,
    CapturingVerifier,
  );

  assert.ok(verifier instanceof CapturingVerifier);
  assert.deepEqual(constructorCalls, [[
    roots,
    true,
    Environment.PRODUCTION,
    configuration.bundleId,
    configuration.appAppleId,
  ]]);
});

test('fails closed before construction when trusted Apple roots are missing or malformed', () => {
  let constructorCalls = 0;
  class CapturingVerifier {
    constructor() {
      constructorCalls += 1;
    }

    async verifyAndDecodeTransaction(): Promise<unknown> {
      return {};
    }
  }

  for (const roots of [
    [],
    [Buffer.alloc(0)],
    ['not-a-certificate' as unknown as Buffer],
    undefined as unknown as Buffer[],
  ]) {
    assert.throws(
      () => createAppleSignedTransactionVerifier(configuration, roots, CapturingVerifier),
      (error: unknown) => {
        if (!(error instanceof SubscriptionVerifierConfigurationError)) return false;
        return (error as SubscriptionVerifierConfigurationError).code
          === 'subscription/verifier-not-configured';
      },
    );
  }
  assert.equal(constructorCalls, 0);
});
