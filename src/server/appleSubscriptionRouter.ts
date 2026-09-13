import express, { type RequestHandler, type Router } from 'express';
import { createAppleAccountTokenHandler } from './appleAccountTokenExpress';
import type { FirebaseAuthenticatedAppleAccountTokenDependencies } from './appleAccountTokenHttp';
import { createAppleProEntitlementHandler } from './appleProEntitlementExpress';
import type { FirebaseAuthenticatedAppleProEntitlementDependencies } from './appleProEntitlementHttp';
import type { AppleSubscriptionEnvironment } from './appleSubscriptionConfig';
import { isAllowedAppleProProductId } from './appleSubscriptionTransaction';

interface DesktopEntitlementDependencies {
  firebaseAuth: FirebaseAuthenticatedAppleProEntitlementDependencies['firebaseAuth'];
  expectedEnvironment: AppleSubscriptionEnvironment;
  now: () => Date;
  entitlements: {
    getForFirebaseUid(firebaseUid: string): Promise<unknown>;
  };
}

export interface AppleSubscriptionRouterDependencies {
  allowedOrigins: ReadonlySet<string>;
  desktopEntitlement: DesktopEntitlementDependencies;
  accountToken: FirebaseAuthenticatedAppleAccountTokenDependencies;
  entitlement: FirebaseAuthenticatedAppleProEntitlementDependencies;
}

function subscriptionCors(allowedOrigins: ReadonlySet<string>): RequestHandler {
  return (request, response, next): void => {
    const origin = request.get('origin');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');

    if (origin && !allowedOrigins.has(origin)) {
      response.status(403).json({ error: 'auth/origin-not-allowed' });
      return;
    }

    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }
    next();
  };
}

/** Routes shared by iPhone purchase/restore and desktop entitlement refresh. */
export function createAppleSubscriptionRouter(
  dependencies: AppleSubscriptionRouterDependencies,
): Router {
  const router = express.Router();
  router.use(subscriptionCors(dependencies.allowedOrigins));
  router.get('/entitlement', async (request, response) => {
    const authorization = request.get('authorization');
    const match = authorization?.match(/^Bearer ([^\s]+)$/);
    if (!match || match[1].length > 8192) {
      response.status(401).json({ active: false, error: 'auth/missing-token' });
      return;
    }

    try {
      const decodedToken = await dependencies.desktopEntitlement.firebaseAuth.verifyIdToken(match[1], true);
      const firebaseUid = decodedToken?.uid;
      if (typeof firebaseUid !== 'string' || firebaseUid.trim().length === 0 || firebaseUid.length > 128) {
        throw new Error('Invalid Firebase uid');
      }
      const now = dependencies.desktopEntitlement.now();
      const record = await dependencies.desktopEntitlement.entitlements.getForFirebaseUid(firebaseUid);
      if (
        record
        && typeof record === 'object'
        && !Array.isArray(record)
        && (record as Record<string, unknown>).schemaVersion === 1
        && (record as Record<string, unknown>).status === 'active'
        && (record as Record<string, unknown>).source === 'app-store'
        && (record as Record<string, unknown>).environment === dependencies.desktopEntitlement.expectedEnvironment
        && isAllowedAppleProProductId((record as Record<string, unknown>).productId)
        && typeof (record as Record<string, unknown>).expiresAt === 'string'
        && Number.isFinite(now.getTime())
        && Date.parse((record as Record<string, string>).expiresAt) > now.getTime()
      ) {
        response.status(200).json({
          active: true,
          productId: (record as Record<string, string>).productId,
          expiresAt: (record as Record<string, string>).expiresAt,
        });
        return;
      }
      if (
        record
        && typeof record === 'object'
        && !Array.isArray(record)
        && (record as Record<string, unknown>).status === 'revoked'
      ) {
        response.status(200).json({ active: false, reason: 'revoked' });
        return;
      }
      response.status(200).json({ active: false, reason: 'expired' });
    } catch {
      response.status(503).json({ active: false, error: 'subscription/unavailable' });
    }
  });
  router.post(
    '/account-token',
    express.json({ limit: '1kb', type: 'application/json' }),
    createAppleAccountTokenHandler(dependencies.accountToken),
  );
  router.post(
    '/entitlement',
    express.json({ limit: '70kb', type: 'application/json' }),
    createAppleProEntitlementHandler(dependencies.entitlement),
  );
  return router;
}
