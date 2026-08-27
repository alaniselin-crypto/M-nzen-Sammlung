import { Coin } from '../types';

const STORAGE_KEY = 'coin_collection_tracker_data_v1';
const FOLDERS_STORAGE_KEY = 'coin_collection_custom_folders_v1';
const PLATFORMS_STORAGE_KEY = 'coin_collection_custom_platforms_v1';

const USER_COINS_STORAGE_KEY = 'coin_collection_tracker_data_v2';
const USER_FOLDERS_STORAGE_KEY = 'coin_collection_custom_folders_v2';
const USER_PLATFORMS_STORAGE_KEY = 'coin_collection_custom_platforms_v2';
const USER_TOMBSTONES_STORAGE_KEY = 'coin_collection_tombstones_v1';
const USER_PENDING_MUTATIONS_STORAGE_KEY = 'coin_collection_pending_mutations_v1';

export interface LocalCoinTombstone {
  coinId: string;
  deletedAt: string;
}

export type PendingMutationType = 'upsertCoin' | 'deleteCoin' | 'saveSettings';

export interface PendingMutation {
  id: string;
  type: PendingMutationType;
  createdAt: string;
  attempts: number;
  coinId?: string;
  coin?: Coin;
  settings?: {
    folders?: string[];
    platforms?: string[];
  };
  lastError?: string;
}

function getUserStorageKey(baseKey: string, uid: string): string {
  if (typeof uid !== 'string' || uid.length === 0) {
    throw new Error('A Firebase UID is required for user-scoped local storage.');
  }
  return `${baseKey}:${encodeURIComponent(uid)}`;
}

function readUserArray<T>(baseKey: string, uid: string, isValid: (value: unknown) => value is T): T[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(baseKey, uid));
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch (error) {
    console.error(`Failed to load UID-scoped local data from ${baseKey}:`, error);
    return [];
  }
}

function writeUserArray<T>(baseKey: string, uid: string, values: T[]): void {
  try {
    localStorage.setItem(getUserStorageKey(baseKey, uid), JSON.stringify(values));
  } catch (error) {
    console.error(`Failed to save UID-scoped local data to ${baseKey}:`, error);
  }
}

function isCoin(value: unknown): value is Coin {
  return Boolean(value && typeof value === 'object' && typeof (value as Coin).id === 'string');
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isLocalCoinTombstone(value: unknown): value is LocalCoinTombstone {
  if (!value || typeof value !== 'object') return false;
  const tombstone = value as LocalCoinTombstone;
  return typeof tombstone.coinId === 'string' && typeof tombstone.deletedAt === 'string';
}

function isPendingMutation(value: unknown): value is PendingMutation {
  if (!value || typeof value !== 'object') return false;
  const mutation = value as PendingMutation;
  return typeof mutation.id === 'string'
    && ['upsertCoin', 'deleteCoin', 'saveSettings'].includes(mutation.type)
    && typeof mutation.createdAt === 'string'
    && typeof mutation.attempts === 'number';
}

export function isPendingMutationPayloadValid(mutation: PendingMutation): boolean {
  if (mutation.type === 'upsertCoin') {
    return typeof mutation.coinId === 'string'
      && mutation.coinId.length > 0
      && Boolean(mutation.coin && typeof mutation.coin === 'object' && mutation.coin.id === mutation.coinId);
  }
  if (mutation.type === 'deleteCoin') {
    return typeof mutation.coinId === 'string' && mutation.coinId.length > 0;
  }
  if (mutation.type === 'saveSettings') {
    if (!mutation.settings || typeof mutation.settings !== 'object') return false;
    return (mutation.settings.folders === undefined || (
      Array.isArray(mutation.settings.folders) && mutation.settings.folders.every(isString)
    )) && (mutation.settings.platforms === undefined || (
      Array.isArray(mutation.settings.platforms) && mutation.settings.platforms.every(isString)
    ));
  }
  return false;
}

function createPendingMutationId(): string {
  return `mutation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadUserCoinsFromStorage(uid: string): Coin[] {
  return readUserArray(USER_COINS_STORAGE_KEY, uid, isCoin);
}

export function saveUserCoinsToStorage(uid: string, coins: Coin[]): void {
  writeUserArray(USER_COINS_STORAGE_KEY, uid, coins);
}

export function loadUserFoldersFromStorage(uid: string): string[] {
  return readUserArray(USER_FOLDERS_STORAGE_KEY, uid, isString);
}

export function saveUserFoldersToStorage(uid: string, folders: string[]): void {
  writeUserArray(USER_FOLDERS_STORAGE_KEY, uid, folders);
}

export function loadUserPlatformsFromStorage(uid: string): string[] {
  return readUserArray(USER_PLATFORMS_STORAGE_KEY, uid, isString);
}

export function saveUserPlatformsToStorage(uid: string, platforms: string[]): void {
  writeUserArray(USER_PLATFORMS_STORAGE_KEY, uid, platforms);
}

export function loadUserCoinTombstones(uid: string): LocalCoinTombstone[] {
  return readUserArray(USER_TOMBSTONES_STORAGE_KEY, uid, isLocalCoinTombstone);
}

export function saveUserCoinTombstones(uid: string, tombstones: LocalCoinTombstone[]): void {
  writeUserArray(USER_TOMBSTONES_STORAGE_KEY, uid, tombstones);
}

export function upsertUserCoinTombstone(
  uid: string,
  coinId: string,
  deletedAt: string = new Date().toISOString()
): LocalCoinTombstone {
  const tombstone = { coinId, deletedAt };
  const remaining = loadUserCoinTombstones(uid).filter(existing => existing.coinId !== coinId);
  saveUserCoinTombstones(uid, [...remaining, tombstone]);
  return tombstone;
}

export function removeUserCoinTombstone(uid: string, coinId: string): void {
  saveUserCoinTombstones(
    uid,
    loadUserCoinTombstones(uid).filter(tombstone => tombstone.coinId !== coinId)
  );
}

export function loadUserPendingMutations(uid: string): PendingMutation[] {
  return readUserArray(USER_PENDING_MUTATIONS_STORAGE_KEY, uid, isPendingMutation);
}

export function saveUserPendingMutations(uid: string, mutations: PendingMutation[]): void {
  writeUserArray(USER_PENDING_MUTATIONS_STORAGE_KEY, uid, mutations);
}

export function enqueueUserPendingMutation(
  uid: string,
  mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'attempts'>
): PendingMutation {
  const pendingMutation: PendingMutation = {
    ...mutation,
    id: createPendingMutationId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  const existing = loadUserPendingMutations(uid);
  const remaining = existing.filter(item => {
    if (mutation.type === 'saveSettings') return item.type !== 'saveSettings';
    return !mutation.coinId || item.coinId !== mutation.coinId;
  });
  saveUserPendingMutations(uid, [...remaining, pendingMutation]);
  return pendingMutation;
}

export function markUserCoinPending(uid: string, coin: Coin): PendingMutation {
  return enqueueUserPendingMutation(uid, {
    type: 'upsertCoin',
    coinId: coin.id,
    coin,
  });
}

export function markUserCoinDeletionPending(
  uid: string,
  coinId: string,
  deletedAt: string = new Date().toISOString()
): PendingMutation {
  upsertUserCoinTombstone(uid, coinId, deletedAt);
  return enqueueUserPendingMutation(uid, {
    type: 'deleteCoin',
    coinId,
  });
}

export function getPendingUserCoinIds(uid: string): Set<string> {
  return new Set(
    loadUserPendingMutations(uid)
      .filter(mutation => mutation.coinId)
      .map(mutation => mutation.coinId as string)
  );
}

export function removeUserPendingMutation(uid: string, mutationId: string): void {
  saveUserPendingMutations(
    uid,
    loadUserPendingMutations(uid).filter(mutation => mutation.id !== mutationId)
  );
}

export function recordUserPendingMutationFailure(uid: string, mutationId: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const updated = loadUserPendingMutations(uid).map(mutation => mutation.id === mutationId
    ? { ...mutation, attempts: mutation.attempts + 1, lastError: message }
    : mutation
  );
  saveUserPendingMutations(uid, updated);
}

export const DEFAULT_INITIAL_FOLDERS = [
  'Ordner 1 - Schweiz',
  'Ordner 2 - Europa',
  'Ordner 3 - Weltmünzen',
  'Münzalbum Gold & Silber',
  'Münzkassette A',
  'Tresor / Bankfach'
];

export const DEFAULT_INITIAL_PLATFORMS = [
  'Ricardo.ch',
  'eBay',
  'Tutti.ch',
  'Anibis.ch',
  'Catawiki',
  'Facebook Marketplace',
  'Auktionshaus / Auktion',
  'Privat / Direktverkauf',
  'Münzbörse / Shop'
];

export const INITIAL_SAMPLE_COINS: Coin[] = [
  {
    id: 'coin-1',
    catalogNumber: '00001',
    storageLocation: 'Ordner 1 - Anlagemünzen',
    name: 'Südafrika Krügerrand 1 oz Gold',
    country: 'Südafrika',
    faceValue: '1',
    currency: 'Unze Gold',
    year: 2021,
    condition: 'stgl',
    purchasePrice: 1780.00,
    currentValue: 2450.00,
    purchaseDate: '2021-04-15',
    notes: 'Anlagemünze in Feingold 916.6 (22 Karat). Perfekter Zustand.',
    mintMark: 'SA Mint',
    material: 'Gold (916/1000)',
    weight: '33.93g (31.1g Feingold)',
    diameter: '32.77 mm',
    mintage: 'Unbegrenzt',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=600&q=80',
    isFavorite: true,
    createdAt: '2021-04-15T10:00:00.000Z',
    updatedAt: '2021-04-15T10:00:00.000Z',
  },
  {
    id: 'coin-2',
    catalogNumber: '00002',
    storageLocation: 'Ordner 2 - 2-Euro Gedenk',
    name: '2 Euro Gedenkmünze "Elbphilharmonie Hamburg"',
    country: 'Deutschland',
    faceValue: '2',
    currency: 'EUR',
    year: 2023,
    condition: 'PP',
    purchasePrice: 12.50,
    currentValue: 18.00,
    purchaseDate: '2023-02-10',
    notes: 'Bundesländerserie II Hamburg. Im offiziellen Blister der Verkaufsstelle.',
    mintMark: 'J',
    material: 'Bimetall (Kupfer-Nickel)',
    weight: '8.50 g',
    diameter: '25.75 mm',
    mintage: '30.000 PP',
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80',
    isFavorite: false,
    createdAt: '2023-02-10T12:00:00.000Z',
    updatedAt: '2023-02-10T12:00:00.000Z',
  },
  {
    id: 'coin-3',
    catalogNumber: '00003',
    storageLocation: 'Ordner 3 - Antike Münzen',
    name: 'Römischer Denar - Kaiser Marcus Aurelius',
    country: 'Römisches Reich',
    faceValue: '1',
    currency: 'Denar',
    year: 168,
    condition: 'vz',
    purchasePrice: 210.00,
    currentValue: 290.00,
    purchaseDate: '2022-09-05',
    notes: 'Avers: Kopf mit Lorbeerkranz n.r. Revers: Concordia sitzend mit Patera. Schöne graue Tönung.',
    mintMark: 'Rom',
    material: 'Silber (900/1000)',
    weight: '3.38 g',
    diameter: '18.5 mm',
    mintage: 'Historisches Unikat',
    imageUrl: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=600&q=80',
    isFavorite: true,
    createdAt: '2022-09-05T14:30:00.000Z',
    updatedAt: '2022-09-05T14:30:00.000Z',
  },
  {
    id: 'coin-4',
    catalogNumber: '00004',
    storageLocation: 'Münzkassette A',
    name: 'USA Morgan Silver Dollar',
    country: 'USA',
    faceValue: '1',
    currency: 'USD',
    year: 1921,
    condition: 'ss',
    purchasePrice: 32.00,
    currentValue: 45.00,
    purchaseDate: '2020-11-20',
    notes: 'Klassischer amerikanischer Silberdollar. Letztes Prägejahr der Morgan-Serie.',
    mintMark: 'S',
    material: 'Silber (900/1000)',
    weight: '26.73 g',
    diameter: '38.1 mm',
    mintage: '21.690.000',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    isFavorite: false,
    createdAt: '2020-11-20T09:15:00.000Z',
    updatedAt: '2020-11-20T09:15:00.000Z',
  },
  {
    id: 'coin-5',
    catalogNumber: '00005',
    storageLocation: 'Ordner 1 - Anlagemünzen',
    name: 'Deutsches Kaiserreich 20 Mark Gold Wilhelm II.',
    country: 'Deutsches Reich',
    faceValue: '20',
    currency: 'Mark',
    year: 1913,
    condition: 'vz',
    purchasePrice: 420.00,
    currentValue: 560.00,
    purchaseDate: '2019-06-18',
    notes: 'Preußen König Wilhelm II. Uniformbild. 7,16g Feingold.',
    mintMark: 'A',
    material: 'Gold (900/1000)',
    weight: '7.96 g',
    diameter: '22.5 mm',
    mintage: '1.432.000',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=600&q=80',
    isFavorite: true,
    createdAt: '2019-06-18T16:00:00.000Z',
    updatedAt: '2019-06-18T16:00:00.000Z',
  },
  {
    id: 'coin-6',
    catalogNumber: '00006',
    storageLocation: 'Ordner 1 - Anlagemünzen',
    name: 'Österreich 1 Unze Silber Wiener Philharmoniker',
    country: 'Österreich',
    faceValue: '1.50',
    currency: 'EUR',
    year: 2022,
    condition: 'stgl',
    purchasePrice: 24.50,
    currentValue: 31.00,
    purchaseDate: '2022-01-12',
    notes: 'Europäische Bestseller-Silberanlagemünze. Reines Feinsilber 999.9.',
    mintMark: 'Münze Österreich',
    material: 'Silber (999/1000)',
    weight: '31.10 g (1 oz)',
    diameter: '37.0 mm',
    mintage: 'Unbegrenzt',
    imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80',
    isFavorite: false,
    createdAt: '2022-01-12T11:20:00.000Z',
    updatedAt: '2022-01-12T11:20:00.000Z',
  }
];

export function generateNextCatalogNumber(coins: Coin[], numDigits: number = 5): string {
  let maxNum = 0;
  coins.forEach(c => {
    if (c.catalogNumber) {
      // Extract numeric digits
      const match = c.catalogNumber.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    }
  });

  const nextVal = maxNum + 1;
  return nextVal.toString().padStart(numDigits, '0');
}

export function loadCoinsFromStorage(): Coin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let coins: Coin[] = INITIAL_SAMPLE_COINS;
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        coins = parsed;
      }
    }

    // Ensure every coin has a 5-digit catalogNumber
    let highestNum = 0;
    coins.forEach(c => {
      if (c.catalogNumber) {
        const num = parseInt(c.catalogNumber, 10);
        if (!isNaN(num) && num > highestNum) highestNum = num;
      }
    });

    let modified = false;
    const fixedCoins = coins.map(c => {
      if (!c.catalogNumber) {
        highestNum++;
        modified = true;
        return {
          ...c,
          catalogNumber: highestNum.toString().padStart(5, '0')
        };
      }
      return c;
    });

    if (modified || raw === null) {
      saveCoinsToStorage(fixedCoins);
    }

    return fixedCoins;
  } catch (error) {
    console.error('Failed to load coin collection from localStorage:', error);
    return [];
  }
}

export function saveCoinsToStorage(coins: Coin[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coins));
  } catch (error) {
    console.error('Failed to save coin collection to localStorage:', error);
  }
}

export function resetCoinsToSampleData(): Coin[] {
  saveCoinsToStorage(INITIAL_SAMPLE_COINS);
  return INITIAL_SAMPLE_COINS;
}

export function formatCurrency(amount: number, currencySymbol: string = 'CHF'): string {
  try {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    return `${amount.toFixed(2)} CHF`;
  }
}

export function getConditionLabel(condition: string): { label: string; full: string; color: string } {
  switch (condition) {
    case 'PP':
      return { label: 'PP', full: 'Polierte Platte (Proof)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    case 'stgl':
      return { label: 'stgl', full: 'Stempelglanz', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    case 'vz':
      return { label: 'vz', full: 'Vorzüglich', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    case 'ss':
      return { label: 'ss', full: 'Sehr schön', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    case 's':
      return { label: 's', full: 'Schön', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
    case 'ge':
      return { label: 'ge', full: 'Gering erhalten', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    default:
      return { label: condition, full: condition, color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
  }
}

// -------------------------------------------------------------
// Custom Folders / Storage Locations Management
// -------------------------------------------------------------

export function loadCustomFolders(coins: Coin[] = []): string[] {
  try {
    let savedFolders: string[] = [];
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (raw) {
      savedFolders = JSON.parse(raw);
    }
    if (!Array.isArray(savedFolders) || savedFolders.length === 0) {
      savedFolders = [...DEFAULT_INITIAL_FOLDERS];
    }

    // Extract all unique storage locations existing in current coins
    const existingCoinLocations = coins
      .map(c => c.storageLocation)
      .filter((loc): loc is string => Boolean(loc && loc.trim()));

    // Merge without duplicates
    const combined = Array.from(new Set([...savedFolders, ...existingCoinLocations])).filter(Boolean);
    return combined;
  } catch (error) {
    console.error('Failed to load custom folders from localStorage:', error);
    return DEFAULT_INITIAL_FOLDERS;
  }
}

export function saveCustomFolders(folders: string[]): void {
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (error) {
    console.error('Failed to save custom folders to localStorage:', error);
  }
}

export function renameFolderInCoinsAndStorage(
  oldName: string,
  newName: string,
  coins: Coin[],
  currentFolders: string[]
): { updatedCoins: Coin[]; updatedFolders: string[] } {
  const trimmedNew = newName.trim();
  if (!trimmedNew || oldName === trimmedNew) {
    return { updatedCoins: coins, updatedFolders: currentFolders };
  }

  // 1. Update coins
  const updatedCoins = coins.map(c => {
    if (c.storageLocation === oldName) {
      return {
        ...c,
        storageLocation: trimmedNew,
        updatedAt: new Date().toISOString()
      };
    }
    return c;
  });
  saveCoinsToStorage(updatedCoins);

  // 2. Update folders list
  const updatedFoldersSet = new Set(
    currentFolders.map(f => (f === oldName ? trimmedNew : f))
  );
  updatedFoldersSet.add(trimmedNew);
  const updatedFolders = Array.from(updatedFoldersSet);
  saveCustomFolders(updatedFolders);

  return { updatedCoins, updatedFolders };
}

export function deleteFolderInStorage(
  folderName: string,
  coins: Coin[],
  currentFolders: string[]
): { updatedCoins: Coin[]; updatedFolders: string[] } {
  // 1. Unassign folder from coins
  const updatedCoins = coins.map(c => {
    if (c.storageLocation === folderName) {
      return {
        ...c,
        storageLocation: '',
        updatedAt: new Date().toISOString()
      };
    }
    return c;
  });
  saveCoinsToStorage(updatedCoins);

  // 2. Remove from folders list
  const updatedFolders = currentFolders.filter(f => f !== folderName);
  saveCustomFolders(updatedFolders);

  return { updatedCoins, updatedFolders };
}

// -------------------------------------------------------------
// Custom Sales Platforms Management
// -------------------------------------------------------------

export function loadCustomPlatforms(coins: Coin[] = []): string[] {
  try {
    let savedPlatforms: string[] = [];
    const raw = localStorage.getItem(PLATFORMS_STORAGE_KEY);
    if (raw) {
      savedPlatforms = JSON.parse(raw);
    }
    if (!Array.isArray(savedPlatforms) || savedPlatforms.length === 0) {
      savedPlatforms = [...DEFAULT_INITIAL_PLATFORMS];
    }

    // Extract all unique listing platforms existing in current coins
    const existingCoinPlatforms = coins
      .map(c => c.listingPlatform)
      .filter((plat): plat is string => Boolean(plat && plat.trim()));

    // Merge without duplicates
    const combined = Array.from(new Set([...savedPlatforms, ...existingCoinPlatforms])).filter(Boolean);
    return combined;
  } catch (error) {
    console.error('Failed to load custom platforms from localStorage:', error);
    return DEFAULT_INITIAL_PLATFORMS;
  }
}

export function saveCustomPlatforms(platforms: string[]): void {
  try {
    localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(platforms));
  } catch (error) {
    console.error('Failed to save custom platforms to localStorage:', error);
  }
}

export function renamePlatformInCoinsAndStorage(
  oldName: string,
  newName: string,
  coins: Coin[],
  currentPlatforms: string[]
): { updatedCoins: Coin[]; updatedPlatforms: string[] } {
  const trimmedNew = newName.trim();
  if (!trimmedNew || oldName === trimmedNew) {
    return { updatedCoins: coins, updatedPlatforms: currentPlatforms };
  }

  // 1. Update coins
  const updatedCoins = coins.map(c => {
    if (c.listingPlatform === oldName) {
      return {
        ...c,
        listingPlatform: trimmedNew,
        updatedAt: new Date().toISOString()
      };
    }
    return c;
  });
  saveCoinsToStorage(updatedCoins);

  // 2. Update platforms list
  const updatedPlatformsSet = new Set(
    currentPlatforms.map(p => (p === oldName ? trimmedNew : p))
  );
  updatedPlatformsSet.add(trimmedNew);
  const updatedPlatforms = Array.from(updatedPlatformsSet);
  saveCustomPlatforms(updatedPlatforms);

  return { updatedCoins, updatedPlatforms };
}

export function deletePlatformInStorage(
  platformName: string,
  coins: Coin[],
  currentPlatforms: string[]
): { updatedCoins: Coin[]; updatedPlatforms: string[] } {
  // 1. Unassign platform from coins
  const updatedCoins = coins.map(c => {
    if (c.listingPlatform === platformName) {
      return {
        ...c,
        listingPlatform: '',
        updatedAt: new Date().toISOString()
      };
    }
    return c;
  });
  saveCoinsToStorage(updatedCoins);

  // 2. Remove from platforms list
  const updatedPlatforms = currentPlatforms.filter(p => p !== platformName);
  saveCustomPlatforms(updatedPlatforms);

  return { updatedCoins, updatedPlatforms };
}

export function formatSKU(sku?: string): string {
  if (!sku) return '';
  const trimmed = sku.trim();
  if (!trimmed) return '';

  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 0 && /^\d+$/.test(trimmed)) {
    return String(num).padStart(5, '0');
  }

  return trimmed;
}

export function getCoinTitle(coin: Partial<Coin>): string {
  let name = (coin.name || '').trim();
  if (name) {
    name = name
      .replace(/\.(jpg|jpeg|png|webp|heic|csv)$/i, '')
      .replace(/_/g, ' ')
      .trim();
  }

  if (name) {
    return name;
  }

  const val = coin.faceValue || '';
  const curr = coin.currency || 'CHF';
  const country = coin.country || '';
  const yrStr = coin.year && coin.year > 0 ? String(coin.year) : '';

  const parts: string[] = [];
  if (val) parts.push(`${val} ${curr}`.trim());
  if (country) parts.push(country);
  if (yrStr) parts.push(`(${yrStr})`);

  const generated = parts.join(' ');
  return generated.trim() || 'Münze';
}
