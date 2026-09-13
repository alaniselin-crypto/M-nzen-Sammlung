export type AppleSubscriptionEnvironment = 'sandbox' | 'production';

export interface AppleSubscriptionConfiguration {
  bundleId: string;
  appAppleId: number | undefined;
  environment: AppleSubscriptionEnvironment;
}

export class SubscriptionConfigurationError extends Error {
  readonly code = 'subscription/server-not-configured';

  constructor() {
    super('Apple subscription server configuration is missing or invalid.');
    this.name = 'SubscriptionConfigurationError';
  }
}

function requiredString(value: string | undefined): string {
  if (!value || value.trim().length === 0) throw new SubscriptionConfigurationError();
  return value.trim();
}

function appAppleId(value: string | undefined, environment: AppleSubscriptionEnvironment): number | undefined {
  if (!value || value.trim().length === 0) {
    if (environment === 'sandbox') return undefined;
    throw new SubscriptionConfigurationError();
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new SubscriptionConfigurationError();
  return parsed;
}

export function readAppleSubscriptionConfiguration(
  environment: Record<string, string | undefined> = process.env,
): AppleSubscriptionConfiguration {
  const configuredEnvironment = environment.APPLE_IAP_ENVIRONMENT;
  if (configuredEnvironment !== 'sandbox' && configuredEnvironment !== 'production') {
    throw new SubscriptionConfigurationError();
  }

  return {
    bundleId: requiredString(environment.APPLE_BUNDLE_ID),
    appAppleId: appAppleId(environment.APPLE_APP_ID, configuredEnvironment),
    environment: configuredEnvironment,
  };
}
