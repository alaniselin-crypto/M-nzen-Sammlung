import type { AppleAccountTokenProvisioningStore } from './appleAccountTokenService';
import type { AppleAccountTokenStore } from './appleProEntitlementService';
import { isCanonicalAppAccountToken } from './appleSubscriptionTransaction';

export interface AppleAccountTokenDocumentSnapshot {
  readonly exists: boolean;
  data(): unknown;
}

export interface AppleAccountTokenDocumentReference {
  get(): Promise<AppleAccountTokenDocumentSnapshot>;
}

export interface FirestoreAppleAccountTokenStoreOptions {
  /**
   * The caller owns the Firestore path decision. This adapter deliberately does
   * not assume a production collection or document layout.
   */
  documentForFirebaseUid(firebaseUid: string): AppleAccountTokenDocumentReference;
  /** Exact top-level field containing Apple's appAccountToken UUID. */
  tokenField: string;
}

export interface AppleAccountTokenTransaction {
  get(reference: unknown): Promise<AppleAccountTokenDocumentSnapshot>;
  set(
    reference: unknown,
    data: Record<string, string>,
    options: { merge: boolean },
  ): void;
}

export interface FirestoreAppleAccountTokenProvisioningStoreOptions {
  documentForFirebaseUid(firebaseUid: string): unknown;
  tokenField: string;
  runTransaction<T>(
    operation: (transaction: AppleAccountTokenTransaction) => Promise<T>,
  ): Promise<T>;
}

export class FirestoreAppleAccountTokenStoreConfigurationError extends Error {
  constructor() {
    super('A safe Firestore appAccountToken field must be configured.');
    this.name = 'FirestoreAppleAccountTokenStoreConfigurationError';
  }
}

export class FirestoreAppleAccountTokenStoreDataError extends Error {
  constructor() {
    super('The stored Apple appAccountToken data is invalid.');
    this.name = 'FirestoreAppleAccountTokenStoreDataError';
  }
}

function isSafeTopLevelFieldName(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(value)
    && value !== '__proto__'
    && value !== 'constructor'
    && value !== 'prototype';
}

function isValidFirebaseUid(value: string): boolean {
  return value.trim().length > 0 && value.length <= 128;
}

function validateStoreOptions(options: {
  documentForFirebaseUid: unknown;
  tokenField: unknown;
}): void {
  if (
    !options
    || typeof options.documentForFirebaseUid !== 'function'
    || typeof options.tokenField !== 'string'
    || !isSafeTopLevelFieldName(options.tokenField)
  ) {
    throw new FirestoreAppleAccountTokenStoreConfigurationError();
  }
}

export function createFirestoreAppleAccountTokenStore(
  options: FirestoreAppleAccountTokenStoreOptions,
): AppleAccountTokenStore {
  validateStoreOptions(options);
  const { documentForFirebaseUid, tokenField } = options;

  return {
    async getForFirebaseUid(firebaseUid: string): Promise<string | null> {
      if (typeof firebaseUid !== 'string' || !isValidFirebaseUid(firebaseUid)) {
        throw new FirestoreAppleAccountTokenStoreDataError();
      }

      const snapshot = await documentForFirebaseUid(firebaseUid).get();
      if (!snapshot.exists) return null;

      const data = snapshot.data();
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new FirestoreAppleAccountTokenStoreDataError();
      }

      const storedToken = (data as Record<string, unknown>)[tokenField];
      if (storedToken === undefined) return null;
      if (!isCanonicalAppAccountToken(storedToken)) {
        throw new FirestoreAppleAccountTokenStoreDataError();
      }

      return storedToken;
    },
  };
}

export function createFirestoreAppleAccountTokenProvisioningStore(
  options: FirestoreAppleAccountTokenProvisioningStoreOptions,
): AppleAccountTokenProvisioningStore {
  validateStoreOptions(options);
  if (typeof options.runTransaction !== 'function') {
    throw new FirestoreAppleAccountTokenStoreConfigurationError();
  }

  const { documentForFirebaseUid, tokenField, runTransaction } = options;
  return {
    async getOrCreateForFirebaseUid(firebaseUid, proposedToken) {
      if (
        typeof firebaseUid !== 'string'
        || !isValidFirebaseUid(firebaseUid)
        || !isCanonicalAppAccountToken(proposedToken)
      ) {
        throw new FirestoreAppleAccountTokenStoreDataError();
      }

      const reference = documentForFirebaseUid(firebaseUid);
      return runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists) {
          const data = snapshot.data();
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new FirestoreAppleAccountTokenStoreDataError();
          }
          const storedToken = (data as Record<string, unknown>)[tokenField];
          if (storedToken !== undefined) {
            if (!isCanonicalAppAccountToken(storedToken)) {
              throw new FirestoreAppleAccountTokenStoreDataError();
            }
            return storedToken;
          }
        }

        transaction.set(reference, { [tokenField]: proposedToken }, { merge: true });
        return proposedToken;
      });
    },
  };
}
