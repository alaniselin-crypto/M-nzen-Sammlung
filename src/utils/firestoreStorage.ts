import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Coin } from '../types';
import {
  formatCatalogNumber,
  getHighestCatalogNumber,
} from './catalogNumberCounter';

const USERS_COLLECTION = 'users';
const COINS_COLLECTION = 'coins';
const TOMBSTONES_COLLECTION = 'coinTombstones';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOCUMENT = 'app';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: { providerId?: string | null; email?: string | null }[];
  };
}

export interface CoinTombstone {
  coinId: string;
  deletedAt: unknown;
}

export interface CoinSyncSnapshot {
  coins: Coin[];
  tombstones: CoinTombstone[];
}

export interface UserAppSettings {
  folders?: string[];
  platforms?: string[];
  lastIssuedCatalogNumber?: number;
}

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  skippedByTombstone: number;
  settingsUpdated: boolean;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function requireUid(uid: string): string {
  if (typeof uid !== 'string' || uid.length === 0) {
    throw new Error('A Firebase UID is required for Firestore access.');
  }
  return uid;
}

function userPath(uid: string): string {
  return `${USERS_COLLECTION}/${requireUid(uid)}`;
}

function userCoinsCollection(uid: string) {
  return collection(db, USERS_COLLECTION, requireUid(uid), COINS_COLLECTION);
}

function userCoinDocument(uid: string, coinId: string) {
  return doc(db, USERS_COLLECTION, requireUid(uid), COINS_COLLECTION, coinId);
}

function userTombstonesCollection(uid: string) {
  return collection(db, USERS_COLLECTION, requireUid(uid), TOMBSTONES_COLLECTION);
}

function userTombstoneDocument(uid: string, coinId: string) {
  return doc(db, USERS_COLLECTION, requireUid(uid), TOMBSTONES_COLLECTION, coinId);
}

function userSettingsDocument(uid: string) {
  return doc(db, USERS_COLLECTION, requireUid(uid), SETTINGS_COLLECTION, SETTINGS_DOCUMENT);
}

function sortCoins(coins: Coin[]): Coin[] {
  return coins.sort((a, b) => {
    const catA = parseInt(a.catalogNumber || '0', 10);
    const catB = parseInt(b.catalogNumber || '0', 10);
    return catA - catB;
  });
}

function cleanCoinData(coin: Coin): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  Object.entries(coin).forEach(([key, value]) => {
    if (key !== 'userId' && value !== undefined) data[key] = value;
  });
  return data;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const child = (value as Record<string, unknown>)[key];
        if (child !== undefined && key !== 'userId') result[key] = canonicalize(child);
        return result;
      }, {});
  }
  return value;
}

export function coinsDifferForSync(localCoin: Coin, cloudCoin: Coin): boolean {
  return JSON.stringify(canonicalize(localCoin)) !== JSON.stringify(canonicalize(cloudCoin));
}

function arraysEqual(left: string[] = [], right: string[] = []): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export async function fetchUserCoinSyncSnapshot(uid: string): Promise<CoinSyncSnapshot> {
  const validUid = requireUid(uid);
  try {
    const [coinSnapshot, tombstoneSnapshot] = await Promise.all([
      getDocs(userCoinsCollection(validUid)),
      getDocs(userTombstonesCollection(validUid)),
    ]);
    const tombstones = tombstoneSnapshot.docs.map(document => {
      const data = document.data();
      return {
        coinId: typeof data.coinId === 'string' ? data.coinId : document.id,
        deletedAt: data.deletedAt ?? null,
      };
    });
    const tombstoneIds = new Set(tombstones.map(tombstone => tombstone.coinId));
    const coins = coinSnapshot.docs
      .filter(document => !tombstoneIds.has(document.id))
      .map(document => ({ ...document.data(), id: document.id } as Coin));
    return { coins: sortCoins(coins), tombstones };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${userPath(validUid)}/${COINS_COLLECTION}`);
  }
}

export async function fetchUserSettings(uid: string): Promise<UserAppSettings> {
  const validUid = requireUid(uid);
  try {
    const snapshot = await getDoc(userSettingsDocument(validUid));
    if (!snapshot.exists()) return {};
    const data = snapshot.data();
    return {
      folders: Array.isArray(data.folders) ? data.folders.filter((value): value is string => typeof value === 'string') : undefined,
      platforms: Array.isArray(data.platforms) ? data.platforms.filter((value): value is string => typeof value === 'string') : undefined,
      lastIssuedCatalogNumber: Number.isSafeInteger(data.lastIssuedCatalogNumber) && data.lastIssuedCatalogNumber >= 0
        ? data.lastIssuedCatalogNumber
        : undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${userPath(validUid)}/${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT}`);
  }
}

export async function ensureCatalogNumberCounterForUser(uid: string, knownCoins: Coin[]): Promise<number> {
  const validUid = requireUid(uid);
  const settingsPath = `${userPath(validUid)}/${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT}`;
  try {
    const observedHighest = getHighestCatalogNumber(knownCoins);
    return await runTransaction(db, async transaction => {
      const settingsRef = userSettingsDocument(validUid);
      const settings = await transaction.get(settingsRef);
      const storedValue = settings.data()?.lastIssuedCatalogNumber;
      const lastIssued = Number.isSafeInteger(storedValue) && storedValue >= 0 ? storedValue : 0;
      const initializedValue = Math.max(lastIssued, observedHighest);

      transaction.set(settingsRef, { lastIssuedCatalogNumber: initializedValue }, { merge: true });
      return initializedValue;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, settingsPath);
  }
}

export async function reserveNextCatalogNumberForUser(uid: string, knownCoins: Coin[]): Promise<string> {
  const validUid = requireUid(uid);
  const settingsPath = `${userPath(validUid)}/${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT}`;
  try {
    const cloudSnapshot = await getDocs(userCoinsCollection(validUid));
    const cloudCoins = cloudSnapshot.docs.map(document => document.data() as Coin);
    const observedHighest = Math.max(
      getHighestCatalogNumber(knownCoins),
      getHighestCatalogNumber(cloudCoins),
    );

    return await runTransaction(db, async transaction => {
      const settingsRef = userSettingsDocument(validUid);
      const settings = await transaction.get(settingsRef);
      const storedValue = settings.data()?.lastIssuedCatalogNumber;
      const lastIssued = Number.isSafeInteger(storedValue) && storedValue >= 0 ? storedValue : 0;
      const nextValue = Math.max(lastIssued, observedHighest) + 1;

      transaction.set(settingsRef, { lastIssuedCatalogNumber: nextValue }, { merge: true });
      return formatCatalogNumber(nextValue);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, settingsPath);
  }
}

export async function compressDataUrlIfNeeded(dataUrl: string, maxDim = 800, quality = 0.75): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  if (dataUrl.length < 300 * 1024) return dataUrl;

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        console.warn('Canvas compression failed:', error);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function saveCoinToFirestore(uid: string, coin: Coin): Promise<void> {
  const validUid = requireUid(uid);
  const coinPath = `${userPath(validUid)}/${COINS_COLLECTION}/${coin.id}`;
  try {
    const [imageUrl, reverseImageUrl] = await Promise.all([
      coin.imageUrl ? compressDataUrlIfNeeded(coin.imageUrl, 800, 0.75) : Promise.resolve(''),
      coin.reverseImageUrl ? compressDataUrlIfNeeded(coin.reverseImageUrl, 800, 0.75) : Promise.resolve(''),
    ]);
    const coinData = {
      ...cleanCoinData(coin),
      imageUrl,
      reverseImageUrl,
      updatedAt: coin.updatedAt || new Date().toISOString(),
    };
    await runTransaction(db, async transaction => {
      const tombstone = await transaction.get(userTombstoneDocument(validUid, coin.id));
      if (tombstone.exists()) throw new Error(`Coin ${coin.id} is protected by a deletion tombstone.`);
      transaction.set(userCoinDocument(validUid, coin.id), coinData, { merge: true });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, coinPath);
  }
}

export async function deleteCoinFromFirestore(uid: string, coinId: string): Promise<void> {
  const validUid = requireUid(uid);
  const coinPath = `${userPath(validUid)}/${COINS_COLLECTION}/${coinId}`;
  try {
    const batch = writeBatch(db);
    batch.set(userTombstoneDocument(validUid, coinId), { coinId, deletedAt: serverTimestamp() });
    batch.delete(userCoinDocument(validUid, coinId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, coinPath);
  }
}

export async function clearAllCoinsFromFirestore(uid: string): Promise<void> {
  const validUid = requireUid(uid);
  try {
    const snapshot = await getDocs(userCoinsCollection(validUid));
    const cloudCoins = snapshot.docs.map(document => document.data() as Coin);
    await ensureCatalogNumberCounterForUser(validUid, cloudCoins);
    for (let index = 0; index < snapshot.docs.length; index += 225) {
      const batch = writeBatch(db);
      snapshot.docs.slice(index, index + 225).forEach(document => {
        batch.set(userTombstoneDocument(validUid, document.id), { coinId: document.id, deletedAt: serverTimestamp() });
        batch.delete(document.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${userPath(validUid)}/${COINS_COLLECTION}`);
  }
}

export async function saveUserSettingsToFirestore(uid: string, settings: UserAppSettings): Promise<void> {
  const validUid = requireUid(uid);
  const safeSettings: UserAppSettings = {};
  if (Array.isArray(settings.folders)) safeSettings.folders = settings.folders.filter(value => typeof value === 'string');
  if (Array.isArray(settings.platforms)) safeSettings.platforms = settings.platforms.filter(value => typeof value === 'string');
  try {
    await setDoc(userSettingsDocument(validUid), safeSettings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${userPath(validUid)}/${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT}`);
  }
}

export async function syncLocalDataToFirestore(
  uid: string,
  localCoins: Coin[],
  localFolders: string[],
  localPlatforms: string[]
): Promise<SyncResult> {
  const validUid = requireUid(uid);
  const [snapshot, cloudSettings] = await Promise.all([
    fetchUserCoinSyncSnapshot(validUid),
    fetchUserSettings(validUid),
  ]);
  const cloudById = new Map(snapshot.coins.map(coin => [coin.id, coin]));
  const tombstoneIds = new Set(snapshot.tombstones.map(tombstone => tombstone.coinId));
  const result: SyncResult = { created: 0, updated: 0, unchanged: 0, skippedByTombstone: 0, settingsUpdated: false };

  for (const coin of localCoins) {
    if (/^coin-[1-6]$/.test(coin.id)) continue;
    if (tombstoneIds.has(coin.id)) {
      result.skippedByTombstone++;
      continue;
    }
    const cloudCoin = cloudById.get(coin.id);
    if (!cloudCoin) {
      await saveCoinToFirestore(validUid, coin);
      result.created++;
    } else if (coinsDifferForSync(coin, cloudCoin)) {
      await saveCoinToFirestore(validUid, coin);
      result.updated++;
    } else {
      result.unchanged++;
    }
  }

  if (!arraysEqual(localFolders, cloudSettings.folders) || !arraysEqual(localPlatforms, cloudSettings.platforms)) {
    await saveUserSettingsToFirestore(validUid, { folders: localFolders, platforms: localPlatforms });
    result.settingsUpdated = true;
  }
  return result;
}

// Transitional one-shot wrappers keep App.tsx compilable until Phase 3C.
export function subscribeToUserCoins(uid: string, callback: (coins: Coin[]) => void): () => void {
  let active = true;
  void fetchUserCoinSyncSnapshot(uid).then(snapshot => {
    if (active) callback(snapshot.coins);
  }).catch(error => console.warn('Firestore one-time coin load warning/error:', error));
  return () => { active = false; };
}

export function subscribeToUserSettings(uid: string, callback: (settings: UserAppSettings) => void): () => void {
  let active = true;
  void fetchUserSettings(uid).then(settings => {
    if (active) callback(settings);
  }).catch(error => console.warn('Firestore one-time settings load warning/error:', error));
  return () => { active = false; };
}
