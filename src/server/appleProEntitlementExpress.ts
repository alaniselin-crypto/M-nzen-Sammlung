import type { RequestHandler } from 'express';
import {
  resolveFirebaseAuthenticatedAppleProEntitlementRequest,
  type FirebaseAuthenticatedAppleProEntitlementDependencies,
} from './appleProEntitlementHttp';

/**
 * Express transport adapter for the authenticated entitlement boundary.
 * Route naming, JSON limits, CORS, Firebase Admin construction, Firestore paths,
 * and Apple trust configuration remain explicit composition-root decisions.
 */
export function createAppleProEntitlementHandler(
  dependencies: FirebaseAuthenticatedAppleProEntitlementDependencies,
): RequestHandler {
  return async (request, response): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');

    const result = await resolveFirebaseAuthenticatedAppleProEntitlementRequest(
      request.get('authorization'),
      request.body,
      dependencies,
    );

    response.status(result.status).json(result.body);
  };
}
