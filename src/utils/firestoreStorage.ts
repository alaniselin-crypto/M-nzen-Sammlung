import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Coin } from '../types';

const COINS_COLLECTION = 'coins';
const SETTINGS_COLLECTION = 'userSettings';

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
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function subscribeToUserCoins(userId: string, callback: (coins: Coin[]) => void) {
  const q = query(
    collection(db, COINS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const coins: Coin[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      coins.push({
        ...data,
        id: docSnap.id
      } as Coin);
    });

    // Sort by catalogNumber
    coins.sort((a, b) => {
      const catA = parseInt(a.catalogNumber || '0', 10);
      const catB = parseInt(b.catalogNumber || '0', 10);
      return catA - catB;
    });

    callback(coins);
  }, (error) => {
    console.error('Firestore coins subscription error:', error);
    handleFirestoreError(error, OperationType.GET, COINS_COLLECTION);
  });
}

export async function compressDataUrlIfNeeded(dataUrl: string, maxDim = 800, quality = 0.75): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  // If string length is under 300KB, it's already sufficiently small
  if (dataUrl.length < 300 * 1024) return dataUrl;

  return new Promise((resolve) => {
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
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('Canvas compression failed:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function saveCoinToFirestore(userId: string, coin: Coin): Promise<void> {
  try {
    const compressedImageUrl = coin.imageUrl ? await compressDataUrlIfNeeded(coin.imageUrl, 800, 0.75) : '';
    const compressedReverseImageUrl = coin.reverseImageUrl ? await compressDataUrlIfNeeded(coin.reverseImageUrl, 800, 0.75) : '';

    const coinRef = doc(db, COINS_COLLECTION, coin.id);
    const coinData = {
      ...coin,
      imageUrl: compressedImageUrl,
      reverseImageUrl: compressedReverseImageUrl,
      userId,
      updatedAt: new Date().toISOString()
    };
    await setDoc(coinRef, coinData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COINS_COLLECTION}/${coin.id}`);
  }
}

export async function deleteCoinFromFirestore(userId: string, coinId: string): Promise<void> {
  try {
    const coinRef = doc(db, COINS_COLLECTION, coinId);
    await deleteDoc(coinRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COINS_COLLECTION}/${coinId}`);
  }
}

export function subscribeToUserSettings(
  userId: string, 
  callback: (settings: { folders?: string[]; platforms?: string[] }) => void
) {
  const docRef = doc(db, SETTINGS_COLLECTION, userId);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as { folders?: string[]; platforms?: string[] });
    } else {
      callback({});
    }
  }, (error) => {
    console.error('Firestore userSettings subscription error:', error);
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${userId}`);
  });
}

export async function saveUserSettingsToFirestore(
  userId: string, 
  settings: { folders?: string[]; platforms?: string[] }
): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    await setDoc(docRef, {
      userId,
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${userId}`);
  }
}

export async function syncLocalDataToFirestore(
  userId: string,
  localCoins: Coin[],
  localFolders: string[],
  localPlatforms: string[]
): Promise<void> {
  try {
    // Check existing coins in Firestore
    const q = query(
      collection(db, COINS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const existingIds = new Set(snapshot.docs.map(docSnap => docSnap.id));

    // Upload any real local coins missing from Firestore (ignore default sample coins coin-1..6)
    if (localCoins.length > 0) {
      for (const coin of localCoins) {
        const isDefaultSample = coin.id.startsWith('coin-') && /^coin-[1-6]$/.test(coin.id);
        // Only upload if it's not an un-edited default sample coin, or if the user added it as a real custom coin
        if (!existingIds.has(coin.id) && !isDefaultSample) {
          await saveCoinToFirestore(userId, coin);
        }
      }
    }

    // Sync folders and platforms
    if (localFolders.length > 0 || localPlatforms.length > 0) {
      await saveUserSettingsToFirestore(userId, {
        folders: localFolders,
        platforms: localPlatforms
      });
    }
  } catch (error) {
    console.error('Error syncing local data to Firestore:', error);
  }
}
