import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAppleProPurchaseDependencies,
  createAppleProSubscriptionActions,
} from './appleProPurchaseDependencies.ts';
import type { AppleStoreKitProductPresentation } from './appleStoreKit.ts';

const accountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

test('connects the purchase coordinator contract to StoreKit and server-authoritative APIs', async () => {
  const events: string[] = [];
  const dependencies = createAppleProPurchaseDependencies(
    async forceRefresh => {
      events.push(`firebase:${forceRefresh}`);
      return 'firebase-id-token';
    },
    {
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
        return {
          active: true,
          productId: 'com.alaniselin.numisma.pro.monthly',
          expiresAt: '2027-01-15T08:00:00.000Z',
        };
      },
    },
  );

  assert.equal(await dependencies.getFirebaseIdToken(true), 'firebase-id-token');
  assert.equal(await dependencies.requestAccountToken('firebase-id-token'), accountToken);
  assert.deepEqual(
    await dependencies.purchase({
      productId: 'com.alaniselin.numisma.pro.monthly',
      appAccountToken: accountToken,
    }),
    { signedTransaction: 'signed-purchase', transactionId: '12345' },
  );
  await dependencies.finish('12345');
  assert.equal(await dependencies.restore(), 'signed-restore');
  assert.deepEqual(
    await dependencies.requestEntitlement('firebase-id-token', 'signed-purchase'),
    {
      active: true,
      productId: 'com.alaniselin.numisma.pro.monthly',
      expiresAt: '2027-01-15T08:00:00.000Z',
    },
  );
  assert.deepEqual(events, [
    'firebase:true',
    'account:firebase-id-token',
    `purchase:com.alaniselin.numisma.pro.monthly:${accountToken}`,
    'finish:12345',
    'restore',
    'entitlement:firebase-id-token:signed-purchase',
  ]);
});

test('exposes product lookup purchase and restore as one UI-ready subscription boundary', async () => {
  const events: string[] = [];
  const products: AppleStoreKitProductPresentation[] = [{
    productId: 'com.alaniselin.numisma.pro.yearly',
    displayName: 'INUMIS Pro Yearly',
    displayPrice: '49,99 €',
  }];
  const actions = createAppleProSubscriptionActions(
    async forceRefresh => {
      events.push(`firebase:${forceRefresh}`);
      return 'firebase-id-token';
    },
    {
      listProducts: async () => {
        events.push('products');
        return products;
      },
      requestAccountToken: async () => accountToken,
      purchase: async ({ productId }) => {
        events.push(`purchase:${productId}`);
        return { signedTransaction: 'signed-purchase', transactionId: '12345' };
      },
      finish: async transactionId => {
        events.push(`finish:${transactionId}`);
      },
      restore: async () => {
        events.push('restore');
        return 'signed-restore';
      },
      requestEntitlement: async (_firebaseIdToken, signedTransaction) => {
        events.push(`entitlement:${signedTransaction}`);
        return {
          active: true,
          productId: 'com.alaniselin.numisma.pro.yearly',
          expiresAt: '2027-01-15T08:00:00.000Z',
        };
      },
    },
  );

  assert.deepEqual(await actions.listProducts(), products);
  assert.equal((await actions.purchase('com.alaniselin.numisma.pro.yearly')).active, true);
  assert.equal((await actions.restore()).active, true);
  assert.deepEqual(events, [
    'products',
    'firebase:true',
    'purchase:com.alaniselin.numisma.pro.yearly',
    'firebase:true',
    'entitlement:signed-purchase',
    'finish:12345',
    'firebase:true',
    'restore',
    'firebase:true',
    'entitlement:signed-restore',
  ]);
});
