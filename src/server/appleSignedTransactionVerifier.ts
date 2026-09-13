import {
  Environment,
  SignedDataVerifier,
} from '@apple/app-store-server-library';
import type { AppleSubscriptionConfiguration } from './appleSubscriptionConfig';
import type { AppleSignedTransactionVerifier } from './appleProEntitlementResolver';

type SignedDataVerifierConstructor = new (
  appleRootCertificates: Buffer[],
  enableOnlineChecks: boolean,
  environment: Environment,
  bundleId: string,
  appAppleId?: number,
) => AppleSignedTransactionVerifier;

export class SubscriptionVerifierConfigurationError extends Error {
  readonly code = 'subscription/verifier-not-configured';

  constructor() {
    super('Apple signed transaction verifier configuration is missing or invalid.');
    this.name = 'SubscriptionVerifierConfigurationError';
  }
}

export function createAppleSignedTransactionVerifier(
  configuration: AppleSubscriptionConfiguration,
  appleRootCertificates: Buffer[],
  Verifier: SignedDataVerifierConstructor = SignedDataVerifier,
): AppleSignedTransactionVerifier {
  if (
    !Array.isArray(appleRootCertificates)
    || appleRootCertificates.length === 0
    || appleRootCertificates.some((certificate) => (
      !Buffer.isBuffer(certificate) || certificate.length === 0
    ))
  ) {
    throw new SubscriptionVerifierConfigurationError();
  }

  const environment = configuration.environment === 'production'
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

  return new Verifier(
    appleRootCertificates,
    true,
    environment,
    configuration.bundleId,
    configuration.appAppleId,
  );
}
