import { randomUUID } from 'node:crypto';
import { isCanonicalAppAccountToken } from './appleSubscriptionTransaction';

export interface AppleAccountTokenProvisioningStore {
  getOrCreateForFirebaseUid(firebaseUid: string, proposedToken: string): Promise<string>;
}

export interface ProvisionedAppleAccountToken {
  token: string;
}

class AppleAccountTokenProvisioningError extends Error {
  readonly code: 'subscription/invalid-request' | 'subscription/unavailable';

  constructor(code: 'subscription/invalid-request' | 'subscription/unavailable') {
    super(code);
    this.name = 'AppleAccountTokenProvisioningError';
    this.code = code;
  }
}

function isValidFirebaseUid(value: string): boolean {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= 128;
}

export async function provisionAppleAccountToken(
  firebaseUid: string,
  store: AppleAccountTokenProvisioningStore,
  generateToken: () => string = randomUUID,
): Promise<ProvisionedAppleAccountToken> {
  if (!isValidFirebaseUid(firebaseUid)) {
    throw new AppleAccountTokenProvisioningError('subscription/invalid-request');
  }

  const proposedToken = generateToken();
  if (!isCanonicalAppAccountToken(proposedToken)) {
    throw new AppleAccountTokenProvisioningError('subscription/unavailable');
  }

  let token: string;
  try {
    token = await store.getOrCreateForFirebaseUid(firebaseUid, proposedToken);
  } catch {
    throw new AppleAccountTokenProvisioningError('subscription/unavailable');
  }

  if (!isCanonicalAppAccountToken(token)) {
    throw new AppleAccountTokenProvisioningError('subscription/unavailable');
  }

  return { token };
}
