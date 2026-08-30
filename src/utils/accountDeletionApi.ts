const APPLE_ACCOUNT_DELETION_URL = 'https://inumis-node-backend.onrender.com/api/account/apple/delete/test';
const ACCOUNT_DELETION_TIMEOUT_MS = 120_000;

export async function deleteTestAppleAccountOnServer(
  firebaseIdToken: string,
  authorizationCode: string,
): Promise<void> {
  const response = await fetch(APPLE_ACCOUNT_DELETION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${firebaseIdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ authorizationCode }),
    signal: AbortSignal.timeout(ACCOUNT_DELETION_TIMEOUT_MS),
  });

  if (response.ok) return;

  let code = 'account-deletion/server-error';
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === 'string') code = payload.error;
  } catch {
    // Keep the stable generic error code when the backend response is not JSON.
  }

  const error = new Error('Die Kontolöschung konnte nicht abgeschlossen werden.');
  (error as Error & { code: string }).code = code;
  throw error;
}
