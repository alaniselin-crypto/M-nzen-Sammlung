import { Coin } from '../types';

export interface CatalogNumberStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseCatalogNumber(value?: string): number | null {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) return null;

  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function getHighestCatalogNumber(coins: Coin[]): number {
  return coins.reduce((highest, coin) => {
    const value = parseCatalogNumber(coin.catalogNumber);
    return value !== null && value > highest ? value : highest;
  }, 0);
}

export function formatCatalogNumber(value: number, digits = 5): string {
  return String(value).padStart(digits, '0');
}

export function getNextCatalogNumberValue(lastIssued: number, coins: Coin[]): number {
  return Math.max(lastIssued, getHighestCatalogNumber(coins)) + 1;
}

export function ensureLocalCatalogNumberCounter(
  storage: CatalogNumberStorage,
  storageKey: string,
  coins: Coin[],
): number {
  const storedValue = Number.parseInt(storage.getItem(storageKey) || '0', 10);
  const lastIssued = Number.isSafeInteger(storedValue) && storedValue >= 0 ? storedValue : 0;
  const initializedValue = Math.max(lastIssued, getHighestCatalogNumber(coins));
  storage.setItem(storageKey, String(initializedValue));
  return initializedValue;
}

export function reserveNextLocalCatalogNumber(
  storage: CatalogNumberStorage,
  storageKey: string,
  coins: Coin[],
  digits = 5,
): string {
  const lastIssued = ensureLocalCatalogNumberCounter(storage, storageKey, coins);
  const nextValue = getNextCatalogNumberValue(lastIssued, coins);
  storage.setItem(storageKey, String(nextValue));
  return formatCatalogNumber(nextValue, digits);
}
