const APPLE_ACCOUNT_TOKEN_URL = 'https://inumis-node-backend.onrender.com/api/subscription/apple/account-token';
const ACCOUNT_TOKEN_TIMEOUT_MS = 15_000;
const MAX_FIREBASE_ID_TOKEN_LENGTH = 8192;

class AppleAccountTokenApiError extends Error {
  readonly code: 'subscription/invalid-request' | 'subscription/unavailable';

  constructor(code: 'subscription/invalid-request' | 'subscription/unavailable') {
    super(code);
    this.name = 'AppleAccountTokenApiError';
    this.code = code;
  }
}

function parseAccountToken(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).length !== 1 || typeof payload.token !== 'string') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.token)
    ? payload.token
    : null;
}

export async function fetchAppleAccountToken(
  firebaseIdToken: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<string> {
  if (
    typeof firebaseIdToken !== 'string'
    || firebaseIdToken.trim().length === 0
    || firebaseIdToken.length > MAX_FIREBASE_ID_TOKEN_LENGTH
  ) {
    throw new AppleAccountTokenApiError('subscription/invalid-request');
  }

  try {
    const response = await fetchImplementation(APPLE_ACCOUNT_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firebaseIdToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(ACCOUNT_TOKEN_TIMEOUT_MS),
    });
    if (!response.ok) throw new AppleAccountTokenApiError('subscription/unavailable');

    const token = parseAccountToken(await response.json());
    if (token === null) throw new AppleAccountTokenApiError('subscription/unavailable');
    return token;
  } catch (error) {
    if (error instanceof AppleAccountTokenApiError) throw error;
    throw new AppleAccountTokenApiError('subscription/unavailable');
  }
}
