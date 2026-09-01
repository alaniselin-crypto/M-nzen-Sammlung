export type AccountDeletionProvider = 'password' | 'google.com' | 'apple.com';

const supportedProviders: AccountDeletionProvider[] = ['password', 'google.com', 'apple.com'];

export function resolveAccountDeletionProvider(
  providerIds: readonly string[],
  fallbackProviderIds: readonly string[] = [],
): AccountDeletionProvider | null {
  return supportedProviders.find(
    providerId => providerIds.includes(providerId) || fallbackProviderIds.includes(providerId),
  ) ?? null;
}
