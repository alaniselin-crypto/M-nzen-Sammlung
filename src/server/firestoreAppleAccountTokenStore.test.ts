import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFirestoreAppleAccountTokenProvisioningStore,
  createFirestoreAppleAccountTokenStore,
  FirestoreAppleAccountTokenStoreConfigurationError,
  type AppleAccountTokenDocumentSnapshot,
} from './firestoreAppleAccountTokenStore';

const firebaseUid = 'firebase-user-123';
const appAccountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

function snapshot(exists: boolean, data: unknown): AppleAccountTokenDocumentSnapshot {
  return {
    exists,
    data: () => data,
  };
}

test('reads the configured token field from the document selected for the Firebase uid', async () => {
  const selectedUids: string[] = [];
  const store = createFirestoreAppleAccountTokenStore({
    tokenField: 'appleAppAccountToken',
    documentForFirebaseUid(uid) {
      selectedUids.push(uid);
      return {
        async get() {
          return snapshot(true, {
            unrelated: 'preserved',
            appleAppAccountToken: appAccountToken,
          });
        },
      };
    },
  });

  assert.equal(await store.getForFirebaseUid(firebaseUid), appAccountToken);
  assert.deepEqual(selectedUids, [firebaseUid]);
});

test('returns null when the configured document or token field does not exist', async () => {
  const missingDocumentStore = createFirestoreAppleAccountTokenStore({
    tokenField: 'appleAppAccountToken',
    documentForFirebaseUid() {
      return { async get() { return snapshot(false, undefined); } };
    },
  });
  const missingFieldStore = createFirestoreAppleAccountTokenStore({
    tokenField: 'appleAppAccountToken',
    documentForFirebaseUid() {
      return { async get() { return snapshot(true, { anotherField: true }); } };
    },
  });

  assert.equal(await missingDocumentStore.getForFirebaseUid(firebaseUid), null);
  assert.equal(await missingFieldStore.getForFirebaseUid(firebaseUid), null);
});

test('fails closed for malformed stored token data', async () => {
  for (const storedValue of [
    '',
    'not-a-uuid',
    123,
    null,
    { token: appAccountToken },
  ]) {
    const store = createFirestoreAppleAccountTokenStore({
      tokenField: 'appleAppAccountToken',
      documentForFirebaseUid() {
        return {
          async get() {
            return snapshot(true, { appleAppAccountToken: storedValue });
          },
        };
      },
    });

    await assert.rejects(
      store.getForFirebaseUid(firebaseUid),
      { name: 'FirestoreAppleAccountTokenStoreDataError' },
    );
  }
});

test('rejects invalid uids before selecting or reading a Firestore document', async () => {
  let selectionCalls = 0;
  const store = createFirestoreAppleAccountTokenStore({
    tokenField: 'appleAppAccountToken',
    documentForFirebaseUid() {
      selectionCalls += 1;
      return { async get() { return snapshot(true, { appleAppAccountToken: appAccountToken }); } };
    },
  });

  for (const uid of ['', '   ', 'u'.repeat(129)]) {
    await assert.rejects(
      store.getForFirebaseUid(uid),
      { name: 'FirestoreAppleAccountTokenStoreDataError' },
    );
  }
  assert.equal(selectionCalls, 0);
});

test('requires an explicit safe top-level field name so no Firestore schema is guessed', () => {
  const documentForFirebaseUid = () => ({
    async get() {
      return snapshot(false, undefined);
    },
  });

  for (const tokenField of ['', '   ', 'subscription.appleToken', '__proto__', 'field/name']) {
    assert.throws(
      () => createFirestoreAppleAccountTokenStore({ tokenField, documentForFirebaseUid }),
      FirestoreAppleAccountTokenStoreConfigurationError,
    );
  }
});

test('atomically creates an appAccountToken without overwriting existing document fields', async () => {
  const writes: Array<{ data: Record<string, string>; merge: boolean }> = [];
  const document = {};
  const store = createFirestoreAppleAccountTokenProvisioningStore({
    tokenField: 'appleAppAccountToken',
    documentForFirebaseUid(uid) {
      assert.equal(uid, firebaseUid);
      return document;
    },
    async runTransaction(operation) {
      return operation({
        async get(reference) {
          assert.equal(reference, document);
          return snapshot(true, { unrelated: 'preserved' });
        },
        set(reference, data, options) {
          assert.equal(reference, document);
          writes.push({ data, merge: options.merge });
        },
      });
    },
  });

  assert.equal(await store.getOrCreateForFirebaseUid(firebaseUid, appAccountToken), appAccountToken);
  assert.deepEqual(writes, [{
    data: { appleAppAccountToken: appAccountToken },
    merge: true,
  }]);
});

test('returns the existing appAccountToken from the atomic transaction without writing', async () => {
  let writeCalls = 0;
  const store = createFirestoreAppleAccountTokenProvisioningStore({
    tokenField: 'appleAppAccountToken',
    documentForFirebaseUid() { return {}; },
    async runTransaction(operation) {
      return operation({
        async get() {
          return snapshot(true, { appleAppAccountToken: appAccountToken });
        },
        set() { writeCalls += 1; },
      });
    },
  });

  assert.equal(
    await store.getOrCreateForFirebaseUid(firebaseUid, '90b162b9-df2f-4ed0-b50b-7de6135df58d'),
    appAccountToken,
  );
  assert.equal(writeCalls, 0);
});

test('provisioning store rejects malformed input and stored data before writing', async () => {
  let transactionCalls = 0;
  let writeCalls = 0;
  const store = createFirestoreAppleAccountTokenProvisioningStore({
    tokenField: 'appleAppAccountToken',
    documentForFirebaseUid() { return {}; },
    async runTransaction(operation) {
      transactionCalls += 1;
      return operation({
        async get() {
          return snapshot(true, { appleAppAccountToken: 'malformed' });
        },
        set() { writeCalls += 1; },
      });
    },
  });

  await assert.rejects(
    store.getOrCreateForFirebaseUid(' ', appAccountToken),
    { name: 'FirestoreAppleAccountTokenStoreDataError' },
  );
  await assert.rejects(
    store.getOrCreateForFirebaseUid(firebaseUid, 'malformed'),
    { name: 'FirestoreAppleAccountTokenStoreDataError' },
  );
  assert.equal(transactionCalls, 0);

  await assert.rejects(
    store.getOrCreateForFirebaseUid(firebaseUid, appAccountToken),
    { name: 'FirestoreAppleAccountTokenStoreDataError' },
  );
  assert.equal(writeCalls, 0);
});
