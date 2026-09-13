import assert from 'node:assert/strict';
import test from 'node:test';
import {
  purchaseApplePro,
  restoreApplePro,
  type AppleProPurchaseCoordinatorDependencies,
} from './appleProPurchaseCoordinator.ts';

const accountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';
const activeEntitlement = {
  active: true as const,
  productId: 'com.alaniselin.numisma.pro.monthly',
  expiresAt: '2027-01-15T08:00:00.000Z',
};

function dependencies(events: string[]): AppleProPurchaseCoordinatorDependencies {
  return {
    getFirebaseIdToken: async forceRefresh => {
      events.push(`firebase:${forceRefresh}`);
      return 'firebase-id-token';
    },
    requestAccountToken: async firebaseIdToken => {
      events.push(`account:${firebaseIdToken}`);
      return accountToken;
    },
    purchase: async request => {
      events.push(`purchase:${request.productId}:${request.appAccountToken}`);
      return { signedTransaction: 'signed-purchase', transactionId: '12345' };
    },
    finish: async transactionId => {
      events.push(`finish:${transactionId}`);
    },
    restore: async () => {
      events.push('restore');
      return 'signed-restore';
    },
    requestEntitlement: async (firebaseIdToken, signedTransaction) => {
      events.push(`entitlement:${firebaseIdToken}:${signedTransaction}`);
      return activeEntitlement;
    },
  };
}

test('finishes an iPhone purchase only after the server grants entitlement', async () => {
  const events: string[] = [];

  assert.deepEqual(
    await purchaseApplePro('com.alaniselin.numisma.pro.monthly', dependencies(events)),
    activeEntitlement,
  );
  assert.deepEqual(events, [
    'firebase:true',
    'account:firebase-id-token',
    `purchase:com.alaniselin.numisma.pro.monthly:${accountToken}`,
    'firebase:true',
    'entitlement:firebase-id-token:signed-purchase',
    'finish:12345',
  ]);
});

test('refreshes the Firebase credential after StoreKit returns before server verification', async () => {
  const events: string[] = [];
  let tokenRequest = 0;
  const deps = dependencies(events);
  deps.getFirebaseIdToken = async forceRefresh => {
    tokenRequest += 1;
    events.push(`firebase:${forceRefresh}:${tokenRequest}`);
    return `firebase-id-token-${tokenRequest}`;
  };

  await purchaseApplePro('com.alaniselin.numisma.pro.monthly', deps);

  assert.deepEqual(events, [
    'firebase:true:1',
    'account:firebase-id-token-1',
    `purchase:com.alaniselin.numisma.pro.monthly:${accountToken}`,
    'firebase:true:2',
    'entitlement:firebase-id-token-2:signed-purchase',
    'finish:12345',
  ]);
});

test('does not finish a purchase when the server denies entitlement', async () => {
  const events: string[] = [];
  const deps = dependencies(events);
  deps.requestEntitlement = async (firebaseIdToken, signedTransaction) => {
    events.push(`entitlement:${firebaseIdToken}:${signedTransaction}`);
    return { active: false, reason: 'expired' };
  };

  await assert.rejects(
    purchaseApplePro('com.alaniselin.numisma.pro.monthly', deps),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/unavailable',
  );
  assert.deepEqual(events, [
    'firebase:true',
    'account:firebase-id-token',
    `purchase:com.alaniselin.numisma.pro.monthly:${accountToken}`,
    'firebase:true',
    'entitlement:firebase-id-token:signed-purchase',
  ]);
});

test('restores through StoreKit and lets the server decide the entitlement', async () => {
  const events: string[] = [];

  assert.deepEqual(await restoreApplePro(dependencies(events)), activeEntitlement);
  assert.deepEqual(events, [
    'firebase:true',
    'account:firebase-id-token',
    'restore',
    'firebase:true',
    'entitlement:firebase-id-token:signed-restore',
  ]);
});

test('refreshes the Firebase credential after App Store restore before server verification', async () => {
  const events: string[] = [];
  let tokenRequest = 0;
  const deps = dependencies(events);
  deps.getFirebaseIdToken = async forceRefresh => {
    tokenRequest += 1;
    events.push(`firebase:${forceRefresh}:${tokenRequest}`);
    return `firebase-id-token-${tokenRequest}`;
  };

  await restoreApplePro(deps);

  assert.deepEqual(events, [
    'firebase:true:1',
    'account:firebase-id-token-1',
    'restore',
    'firebase:true:2',
    'entitlement:firebase-id-token-2:signed-restore',
  ]);
});

test('rejects unsupported products before authentication or StoreKit', async () => {
  const events: string[] = [];

  await assert.rejects(
    purchaseApplePro('com.alaniselin.numisma.pro.lifetime' as 'com.alaniselin.numisma.pro.monthly', dependencies(events)),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/invalid-product',
  );
  assert.deepEqual(events, []);
});

test('fails closed when authentication or StoreKit returns malformed credentials', async () => {
  for (const override of [
    { getFirebaseIdToken: async () => ' ' },
    { requestAccountToken: async () => 'not-a-uuid' },
    { purchase: async () => ({ signedTransaction: '', transactionId: '12345' }) },
    { restore: async () => '' },
  ]) {
    const deps = { ...dependencies([]), ...override };
    const operation = 'restore' in override
      ? restoreApplePro(deps)
      : purchaseApplePro('com.alaniselin.numisma.pro.yearly', deps);
    await assert.rejects(
      operation,
      (error: unknown) => error instanceof Error
        && (error as Error & { code?: string }).code === 'subscription/unavailable',
    );
  }
});
