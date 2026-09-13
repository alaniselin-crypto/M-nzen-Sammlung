import type { RequestHandler } from 'express';
import {
  resolveFirebaseAuthenticatedAppleAccountTokenRequest,
  type FirebaseAuthenticatedAppleAccountTokenDependencies,
} from './appleAccountTokenHttp';

/** Express transport adapter for authenticated appAccountToken provisioning. */
export function createAppleAccountTokenHandler(
  dependencies: FirebaseAuthenticatedAppleAccountTokenDependencies,
): RequestHandler {
  return async (request, response): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');

    const result = await resolveFirebaseAuthenticatedAppleAccountTokenRequest(
      request.get('authorization'),
      dependencies,
    );

    response.status(result.status).json(result.body);
  };
}
