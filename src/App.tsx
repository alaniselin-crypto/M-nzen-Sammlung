import React, { useState, useEffect } from 'react';
import { Coin, TabType } from './types';
import { 
  loadCoinsFromStorage, 
  saveCoinsToStorage, 
  resetCoinsToSampleData, 
  generateNextCatalogNumber,
  loadCustomFolders,
  saveCustomFolders,
  renameFolderInCoinsAndStorage,
  deleteFolderInStorage,
  loadCustomPlatforms,
  saveCustomPlatforms,
  renamePlatformInCoinsAndStorage,
  deletePlatformInStorage
} from './utils/storage';
import { 
  subscribeToUserCoins, 
  saveCoinToFirestore, 
  deleteCoinFromFirestore, 
  subscribeToUserSettings, 
  saveUserSettingsToFirestore, 
  syncLocalDataToFirestore 
} from './utils/firestoreStorage';
import { useAuth } from './context/AuthContext';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { CoinList } from './components/CoinList';
import { StatisticsView } from './components/StatisticsView';
import { BackupExportView } from './components/BackupExportView';
import { CoinDetailModal } from './components/CoinDetailModal';
import { CoinFormModal } from './components/CoinFormModal';
import { LocalStartGuideModal } from './components/LocalStartGuideModal';
import { FolderManagerModal } from './components/FolderManagerModal';
import { PlatformManagerModal } from './components/PlatformManagerModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const { user } = useAuth();

  const [coins, setCoins] = useState<Coin[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modal States
  const [detailCoin, setDetailCoin] = useState<Coin | null>(null);
  const [editCoin, setEditCoin] = useState<Coin | null>(null);
  const [coinToDelete, setCoinToDelete] = useState<Coin | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState<boolean>(false);
  const [isPlatformManagerOpen, setIsPlatformManagerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Initial Load & User Auth Sync
  useEffect(() => {
    if (user) {
      // 1. Subscribe to Firestore coins
      const unsubscribeCoins = subscribeToUserCoins(user.uid, (cloudCoins) => {
        setCoins(cloudCoins);
      });

      // 2. Subscribe to Firestore settings (folders & platforms)
      const unsubscribeSettings = subscribeToUserSettings(user.uid, (settings) => {
        if (settings.folders && settings.folders.length > 0) {
          setFolders(settings.folders);
        } else {
          setFolders(loadCustomFolders());
        }

        if (settings.platforms && settings.platforms.length > 0) {
          setPlatforms(settings.platforms);
        } else {
          setPlatforms(loadCustomPlatforms());
        }
      });

      return () => {
        unsubscribeCoins();
        unsubscribeSettings();
      };
    } else {
      // Guest / Offline LocalStorage Load
      const loaded = loadCoinsFromStorage();
      setCoins(loaded);
      const loadedFolders = loadCustomFolders(loaded);
      setFolders(loadedFolders);
      const loadedPlatforms = loadCustomPlatforms(loaded);
      setPlatforms(loadedPlatforms);
    }
  }, [user]);

  // Sync Local Data to Cloud
  const handleSyncLocalDataToCloud = async () => {
    if (!user) return;
    const localCoins = loadCoinsFromStorage();
    const localFolders = loadCustomFolders(localCoins);
    const localPlatforms = loadCustomPlatforms(localCoins);

    await syncLocalDataToFirestore(user.uid, localCoins, localFolders, localPlatforms);
  };

  // Sync state to LocalStorage (Guest Mode)
  const updateCoinsState = (newCoins: Coin[]) => {
    setCoins(newCoins);
    if (!user) {
      saveCoinsToStorage(newCoins);
      const updatedFolders = loadCustomFolders(newCoins);
      setFolders(updatedFolders);
      const updatedPlatforms = loadCustomPlatforms(newCoins);
      setPlatforms(updatedPlatforms);
    }
  };

  // Folder Management Handlers
  const handleAddFolder = (folderName: string) => {
    const trimmed = folderName.trim();
    if (!trimmed) return;
    if (!folders.includes(trimmed)) {
      const updated = [...folders, trimmed];
      setFolders(updated);
      if (user) {
        saveUserSettingsToFirestore(user.uid, { folders: updated, platforms });
      } else {
        saveCustomFolders(updated);
      }
    }
  };

  const handleRenameFolder = (oldName: string, newName: string) => {
    const { updatedCoins, updatedFolders } = renameFolderInCoinsAndStorage(oldName, newName, coins, folders);
    setCoins(updatedCoins);
    setFolders(updatedFolders);

    if (user) {
      saveUserSettingsToFirestore(user.uid, { folders: updatedFolders, platforms });
      updatedCoins.forEach(c => {
        if (c.storageLocation === newName.trim()) {
          saveCoinToFirestore(user.uid, c);
        }
      });
    }

    if (detailCoin && detailCoin.storageLocation === oldName) {
      setDetailCoin({ ...detailCoin, storageLocation: newName.trim() });
    }
    if (editCoin && editCoin.storageLocation === oldName) {
      setEditCoin({ ...editCoin, storageLocation: newName.trim() });
    }
  };

  const handleDeleteFolder = (folderName: string) => {
    const { updatedCoins, updatedFolders } = deleteFolderInStorage(folderName, coins, folders);
    setCoins(updatedCoins);
    setFolders(updatedFolders);

    if (user) {
      saveUserSettingsToFirestore(user.uid, { folders: updatedFolders, platforms });
      updatedCoins.forEach(c => {
        if (c.storageLocation === '') {
          saveCoinToFirestore(user.uid, c);
        }
      });
    }

    if (detailCoin && detailCoin.storageLocation === folderName) {
      setDetailCoin({ ...detailCoin, storageLocation: '' });
    }
    if (editCoin && editCoin.storageLocation === folderName) {
      setEditCoin({ ...editCoin, storageLocation: '' });
    }
  };

  // Platform Management Handlers
  const handleAddPlatform = (platformName: string) => {
    const trimmed = platformName.trim();
    if (!trimmed) return;
    if (!platforms.includes(trimmed)) {
      const updated = [...platforms, trimmed];
      setPlatforms(updated);
      if (user) {
        saveUserSettingsToFirestore(user.uid, { folders, platforms: updated });
      } else {
        saveCustomPlatforms(updated);
      }
    }
  };

  const handleRenamePlatform = (oldName: string, newName: string) => {
    const { updatedCoins, updatedPlatforms } = renamePlatformInCoinsAndStorage(oldName, newName, coins, platforms);
    setCoins(updatedCoins);
    setPlatforms(updatedPlatforms);

    if (user) {
      saveUserSettingsToFirestore(user.uid, { folders, platforms: updatedPlatforms });
      updatedCoins.forEach(c => {
        if (c.listingPlatform === newName.trim()) {
          saveCoinToFirestore(user.uid, c);
        }
      });
    }

    if (detailCoin && detailCoin.listingPlatform === oldName) {
      setDetailCoin({ ...detailCoin, listingPlatform: newName.trim() });
    }
    if (editCoin && editCoin.listingPlatform === oldName) {
      setEditCoin({ ...editCoin, listingPlatform: newName.trim() });
    }
  };

  const handleDeletePlatform = (platformName: string) => {
    const { updatedCoins, updatedPlatforms } = deletePlatformInStorage(platformName, coins, platforms);
    setCoins(updatedCoins);
    setPlatforms(updatedPlatforms);

    if (user) {
      saveUserSettingsToFirestore(user.uid, { folders, platforms: updatedPlatforms });
      updatedCoins.forEach(c => {
        if (c.listingPlatform === '') {
          saveCoinToFirestore(user.uid, c);
        }
      });
    }

    if (detailCoin && detailCoin.listingPlatform === platformName) {
      setDetailCoin({ ...detailCoin, listingPlatform: '' });
    }
    if (editCoin && editCoin.listingPlatform === platformName) {
      setEditCoin({ ...editCoin, listingPlatform: '' });
    }
  };

  // Add / Edit Coin Handler
  const handleSaveCoin = (coinData: Omit<Coin, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();

    if (coinData.id) {
      // Edit existing
      const targetCoin = coins.find(c => c.id === coinData.id);
      const updatedCoin: Coin = {
        ...(targetCoin || {}),
        ...coinData,
        id: coinData.id,
        catalogNumber: coinData.catalogNumber?.trim() || targetCoin?.catalogNumber || generateNextCatalogNumber(coins, 5),
        updatedAt: now
      } as Coin;

      if (user) {
        saveCoinToFirestore(user.uid, updatedCoin);
      } else {
        const updatedList = coins.map(c => c.id === coinData.id ? updatedCoin : c);
        updateCoinsState(updatedList);
      }
    } else {
      // Add new
      const newCoin: Coin = {
        ...coinData,
        id: `coin-${Date.now()}`,
        catalogNumber: coinData.catalogNumber?.trim() || generateNextCatalogNumber(coins, 5),
        createdAt: now,
        updatedAt: now
      };

      if (user) {
        saveCoinToFirestore(user.uid, newCoin);
      } else {
        updateCoinsState([newCoin, ...coins]);
      }
    }

    setEditCoin(null);
  };

  // Duplicate Coin Handler
  const handleDuplicateCoin = (sourceCoin: Coin) => {
    const now = new Date().toISOString();
    const nextNum = generateNextCatalogNumber(coins);
    const duplicatedCoin: Coin = {
      ...sourceCoin,
      id: `coin-${Date.now()}`,
      catalogNumber: nextNum,
      name: sourceCoin.name.includes('(Kopie)') ? sourceCoin.name : `${sourceCoin.name} (Kopie)`,
      createdAt: now,
      updatedAt: now
    };

    if (user) {
      saveCoinToFirestore(user.uid, duplicatedCoin);
    } else {
      updateCoinsState([duplicatedCoin, ...coins]);
    }
  };

  // Delete Handler
  const handleDeleteCoin = (coinId: string) => {
    const found = coins.find(c => c.id === coinId);
    if (found) {
      setCoinToDelete(found);
    }
  };

  const handleConfirmDeleteCoin = () => {
    if (!coinToDelete) return;
    const targetId = coinToDelete.id;

    if (user) {
      deleteCoinFromFirestore(user.uid, targetId);
    } else {
      const updatedList = coins.filter(c => c.id !== targetId);
      updateCoinsState(updatedList);
    }

    if (detailCoin?.id === targetId) {
      setDetailCoin(null);
    }
    setCoinToDelete(null);
  };

  // Toggle Favorite
  const handleToggleFavorite = (coinId: string) => {
    const found = coins.find(c => c.id === coinId);
    if (!found) return;

    const updatedCoin = { ...found, isFavorite: !found.isFavorite, updatedAt: new Date().toISOString() };

    if (user) {
      saveCoinToFirestore(user.uid, updatedCoin);
    } else {
      const updatedList = coins.map(c => c.id === coinId ? updatedCoin : c);
      updateCoinsState(updatedList);
    }

    if (detailCoin?.id === coinId) {
      setDetailCoin(updatedCoin);
    }
  };

  // CSV Import Handler
  const handleImportCoins = (newCoins: Coin[], replaceExisting: boolean) => {
    if (user) {
      if (replaceExisting) {
        // Delete current coins
        coins.forEach(c => deleteCoinFromFirestore(user.uid, c.id));
      }
      newCoins.forEach(nc => saveCoinToFirestore(user.uid, nc));
    } else {
      if (replaceExisting) {
        updateCoinsState(newCoins);
      } else {
        const existingIds = new Set(coins.map(c => c.id));
        const merged = [...coins];
        newCoins.forEach(nc => {
          if (!existingIds.has(nc.id)) {
            merged.push(nc);
          } else {
            merged.push({ ...nc, id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` });
          }
        });
        updateCoinsState(merged);
      }
    }
  };

  // Reset Data Handler
  const handleResetToSampleData = () => {
    const resetList = resetCoinsToSampleData();
    if (user) {
      resetList.forEach(c => saveCoinToFirestore(user.uid, c));
    } else {
      setCoins(resetList);
    }
  };

  // Total Collection Valuation KPI
  const totalValuation = coins.reduce((acc, c) => acc + (c.currentValue || 0), 0);

  return (
    <div className="min-h-screen bg-[#121318] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header */}
      <Header
        totalValue={totalValuation}
        totalCoins={coins.length}
        onOpenAddModal={() => {
          setEditCoin(null);
          setIsFormModalOpen(true);
        }}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onOpenFolderManager={() => setIsFolderManagerOpen(true)}
        onOpenPlatformManager={() => setIsPlatformManagerOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Container View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        {activeTab === 'dashboard' && (
          <Dashboard
            coins={coins}
            onOpenAddModal={() => {
              setEditCoin(null);
              setIsFormModalOpen(true);
            }}
            onNavigateToCollection={() => setActiveTab('collection')}
            onViewDetails={(coin) => setDetailCoin(coin)}
          />
        )}

        {activeTab === 'collection' && (
          <CoinList
            coins={coins}
            onOpenAddModal={() => {
              setEditCoin(null);
              setIsFormModalOpen(true);
            }}
            onViewDetails={(coin) => setDetailCoin(coin)}
            onEdit={(coin) => {
              setEditCoin(coin);
              setIsFormModalOpen(true);
            }}
            onDelete={handleDeleteCoin}
            onToggleFavorite={handleToggleFavorite}
            onDuplicate={handleDuplicateCoin}
            onOpenFolderManager={() => setIsFolderManagerOpen(true)}
            onOpenPlatformManager={() => setIsPlatformManagerOpen(true)}
          />
        )}

        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto space-y-4 bg-[#181a22] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-serif font-bold text-amber-400">
              Münzerfassung starten
            </h2>
            <p className="text-xs text-slate-400">
              Fügen Sie ein neues Münzexemplar mit Erhaltungsgrad, Kaufpreis und Marktwert zu Ihrer Sammlung hinzu.
            </p>
            <button
              onClick={() => {
                setEditCoin(null);
                setIsFormModalOpen(true);
              }}
              className="w-full py-3 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              + Formular zur Münzerfassung öffnen
            </button>
          </div>
        )}

        {activeTab === 'statistics' && (
          <StatisticsView coins={coins} />
        )}

        {activeTab === 'backup' && (
          <BackupExportView
            coins={coins}
            onImportCoins={handleImportCoins}
            onResetToSampleData={handleResetToSampleData}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'add') {
            setEditCoin(null);
            setIsFormModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        coinCount={coins.length}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSyncLocalData={handleSyncLocalDataToCloud}
        hasLocalCoinsCount={loadCoinsFromStorage().length}
      />

      <CoinDetailModal
        coin={detailCoin}
        onClose={() => setDetailCoin(null)}
        onEdit={(coin) => {
          setEditCoin(coin);
          setIsFormModalOpen(true);
        }}
        onDelete={handleDeleteCoin}
        onToggleFavorite={handleToggleFavorite}
        onDuplicate={handleDuplicateCoin}
      />

      <CoinFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditCoin(null);
        }}
        onSave={handleSaveCoin}
        initialCoin={editCoin}
        nextCatalogNumber={generateNextCatalogNumber(coins, 5)}
        availableFolders={folders}
        onOpenFolderManager={() => setIsFolderManagerOpen(true)}
        availablePlatforms={platforms}
        onOpenPlatformManager={() => setIsPlatformManagerOpen(true)}
      />

      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
        folders={folders}
        coins={coins}
        onAddFolder={handleAddFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      <PlatformManagerModal
        isOpen={isPlatformManagerOpen}
        onClose={() => setIsPlatformManagerOpen(false)}
        platforms={platforms}
        coins={coins}
        onAddPlatform={handleAddPlatform}
        onRenamePlatform={handleRenamePlatform}
        onDeletePlatform={handleDeletePlatform}
      />

      <LocalStartGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <ConfirmDeleteModal
        isOpen={coinToDelete !== null}
        coin={coinToDelete}
        onClose={() => setCoinToDelete(null)}
        onConfirm={handleConfirmDeleteCoin}
      />
    </div>
  );
}

