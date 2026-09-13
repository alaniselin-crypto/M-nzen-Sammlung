import assert from 'node:assert/strict';
import test from 'node:test';
import {
  finishAppleProTransaction,
  listAppleProProducts,
  purchaseAppleProProduct,
  restoreAppleProTransactions,
  type AppleStoreKitPlugin,
} from './appleStoreKit.ts';

const accountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

test('returns the native transaction identifier and exposes transaction finishing', async () => {
  const requests: unknown[] = [];
  const events: string[] = [];
  const plugin = {
    getProducts: async () => ({ products: [] }),
    purchase: async request => {
      requests.push(request);
      return { signedTransaction: 'signed-transaction', transactionId: '12345' };
    },
    finish: async ({ transactionId }: { transactionId: string }) => {
      events.push(`finish:${transactionId}`);
    },
    restore: async () => ({ signedTransaction: 'unused' }),
  } as unknown as AppleStoreKitPlugin;

  assert.deepEqual(
    await purchaseAppleProProduct(
      { productId: 'com.alaniselin.numisma.pro.monthly', appAccountToken: accountToken },
      plugin,
    ),
    { signedTransaction: 'signed-transaction', transactionId: '12345' },
  );
  await finishAppleProTransaction('12345', plugin);
  assert.deepEqual(requests, [{
    productId: 'com.alaniselin.numisma.pro.monthly',
    appAccountToken: accountToken,
  }]);
  assert.deepEqual(events, ['finish:12345']);
});

test('requests App Store synchronization before returning the restored transaction', async () => {
  const events: string[] = [];
  const plugin: AppleStoreKitPlugin = {
    getProducts: async () => ({ products: [] }),
    purchase: async () => ({ signedTransaction: 'unused', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => {
      events.push('restore');
      return { signedTransaction: 'signed-restored-transaction' };
    },
  };

  assert.equal(
    await restoreAppleProTransactions(plugin),
    'signed-restored-transaction',
  );
  assert.deepEqual(events, ['restore']);
});

test('rejects malformed transaction results from the native bridge', async () => {
  const plugin = {
    getProducts: async () => ({ products: [] }),
    purchase: async () => ({ signedTransaction: ' ', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => ({ signedTransaction: '' }),
  } as AppleStoreKitPlugin;

  await assert.rejects(
    purchaseAppleProProduct(
      { productId: 'com.alaniselin.numisma.pro.yearly', appAccountToken: accountToken },
      plugin,
    ),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/storekit-invalid-response',
  );
  await assert.rejects(
    restoreAppleProTransactions(plugin),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/storekit-invalid-response',
  );
});

test('returns StoreKit product presentation for the allowed Pro subscriptions', async () => {
  const plugin: AppleStoreKitPlugin = {
    getProducts: async () => ({
      products: [
        {
          productId: 'com.alaniselin.numisma.pro.monthly',
          displayName: 'INUMIS Pro Monthly',
          displayPrice: '€4.99',
        },
        {
          productId: 'com.alaniselin.numisma.pro.yearly',
          displayName: 'INUMIS Pro Yearly',
          displayPrice: '€49.99',
        },
      ],
    }),
    purchase: async () => ({ signedTransaction: 'unused', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => ({ signedTransaction: 'unused' }),
  };

  assert.deepEqual(await listAppleProProducts(plugin), [
    {
      productId: 'com.alaniselin.numisma.pro.monthly',
      displayName: 'INUMIS Pro Monthly',
      displayPrice: '€4.99',
    },
    {
      productId: 'com.alaniselin.numisma.pro.yearly',
      displayName: 'INUMIS Pro Yearly',
      displayPrice: '€49.99',
    },
  ]);
});

test('rejects an incomplete Pro product catalog returned by the native bridge', async () => {
  const plugin: AppleStoreKitPlugin = {
    getProducts: async () => ({
      products: [{
        productId: 'com.alaniselin.numisma.pro.monthly',
        displayName: 'INUMIS Pro Monthly',
        displayPrice: '€4.99',
      }],
    }),
    purchase: async () => ({ signedTransaction: 'unused', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => ({ signedTransaction: 'unused' }),
  };

  await assert.rejects(
    listAppleProProducts(plugin),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/storekit-invalid-response',
  );
});

test('rejects an unapproved product returned by the native bridge', async () => {
  const plugin = {
    getProducts: async () => ({
      products: [{
        productId: 'com.alaniselin.numisma.pro.forged',
        displayName: 'Forged Pro',
        displayPrice: '€0.01',
      }],
    }),
    purchase: async () => ({ signedTransaction: 'unused', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => ({ signedTransaction: 'unused' }),
  } as unknown as AppleStoreKitPlugin;

  await assert.rejects(
    listAppleProProducts(plugin),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/storekit-invalid-response',
  );
});

test('rejects duplicate products returned by the native bridge', async () => {
  const plugin: AppleStoreKitPlugin = {
    getProducts: async () => ({
      products: [
        {
          productId: 'com.alaniselin.numisma.pro.monthly',
          displayName: 'INUMIS Pro Monthly',
          displayPrice: '€4.99',
        },
        {
          productId: 'com.alaniselin.numisma.pro.monthly',
          displayName: 'INUMIS Pro Monthly',
          displayPrice: '€4.99',
        },
      ],
    }),
    purchase: async () => ({ signedTransaction: 'unused', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => ({ signedTransaction: 'unused' }),
  };

  await assert.rejects(
    listAppleProProducts(plugin),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/storekit-invalid-response',
  );
});

test('rejects malformed product presentation returned by the native bridge', async () => {
  const plugin = {
    getProducts: async () => ({
      products: [{
        productId: 'com.alaniselin.numisma.pro.yearly',
        displayName: ' ',
        displayPrice: '€49.99',
      }],
    }),
    purchase: async () => ({ signedTransaction: 'unused', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => ({ signedTransaction: 'unused' }),
  } as AppleStoreKitPlugin;

  await assert.rejects(
    listAppleProProducts(plugin),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/storekit-invalid-response',
  );
});

test('rejects an empty localized price returned by the native bridge', async () => {
  const plugin: AppleStoreKitPlugin = {
    getProducts: async () => ({
      products: [{
        productId: 'com.alaniselin.numisma.pro.yearly',
        displayName: 'INUMIS Pro Yearly',
        displayPrice: '',
      }],
    }),
    purchase: async () => ({ signedTransaction: 'unused', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => ({ signedTransaction: 'unused' }),
  };

  await assert.rejects(
    listAppleProProducts(plugin),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/storekit-invalid-response',
  );
});

test('rejects a malformed product-list container from the native bridge', async () => {
  const plugin = {
    getProducts: async () => ({ products: null }),
    purchase: async () => ({ signedTransaction: 'unused', transactionId: '12345' }),
    finish: async () => {},
    restore: async () => ({ signedTransaction: 'unused' }),
  } as unknown as AppleStoreKitPlugin;

  await assert.rejects(
    listAppleProProducts(plugin),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'subscription/storekit-invalid-response',
  );
});
