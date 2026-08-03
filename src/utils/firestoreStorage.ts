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
import { db } from '../lib/firebase';
import { Coin } from '../types';

const COINS_COLLECTION = 'coins';
const SETTINGS_COLLECTION = 'userSettings';

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

    // Sort by createdAt or catalogNumber by default
    coins.sort((a, b) => {
      const catA = parseInt(a.catalogNumber || '0', 10);
      const catB = parseInt(b.catalogNumber || '0', 10);
      return catA - catB;
    });

    callback(coins);
  }, (error) => {
    console.error('Firestore coins subscription error:', error);
  });
}

export async function saveCoinToFirestore(userId: string, coin: Coin): Promise<void> {
  const coinRef = doc(db, COINS_COLLECTION, coin.id);
  const coinData = {
    ...coin,
    userId,
    updatedAt: new Date().toISOString()
  };
  await setDoc(coinRef, coinData, { merge: true });
}

export async function deleteCoinFromFirestore(userId: string, coinId: string): Promise<void> {
  const coinRef = doc(db, COINS_COLLECTION, coinId);
  await deleteDoc(coinRef);
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
  });
}

export async function saveUserSettingsToFirestore(
  userId: string, 
  settings: { folders?: string[]; platforms?: string[] }
): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, userId);
  await setDoc(docRef, {
    userId,
    ...settings,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function syncLocalDataToFirestore(
  userId: string,
  localCoins: Coin[],
  localFolders: string[],
  localPlatforms: string[]
): Promise<void> {
  try {
    // Check if user already has coins in Firestore
    const q = query(
      collection(db, COINS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    // If Firestore is empty, upload local data
    if (snapshot.empty && localCoins.length > 0) {
      for (const coin of localCoins) {
        await saveCoinToFirestore(userId, coin);
      }
    }

    // Sync folders and platforms
    await saveUserSettingsToFirestore(userId, {
      folders: localFolders,
      platforms: localPlatforms
    });
  } catch (error) {
    console.error('Error syncing local data to Firestore:', error);
  }
}
