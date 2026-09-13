import express, { type RequestHandler, type Router } from 'express';

export interface AppleSubscriptionUnavailableRouterDependencies {
  allowedOrigins: ReadonlySet<string>;
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

export function createAppleSubscriptionUnavailableRouter(
  dependencies: AppleSubscriptionUnavailableRouterDependencies,
): Router {
  const router = express.Router();
  router.use(subscriptionCors(dependencies.allowedOrigins));
  router.get('/entitlement', (_request, response) => {
    response.status(503).json({ active: false, error: 'subscription/unavailable' });
  });
  router.post('/account-token', (_request, response) => {
    response.status(503).json({ error: 'subscription/unavailable' });
  });
  router.post('/entitlement', (_request, response) => {
    response.status(503).json({ active: false, error: 'subscription/unavailable' });
  });
  return router;
}
