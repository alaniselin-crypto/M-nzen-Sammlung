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
  const { user, loading } = useAuth();

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
  const [importToast, setImportToast] = useState<string | null>(null);
  const [isFetchingWebhooks, setIsFetchingWebhooks] = useState<boolean>(false);

  // Initial Load & User Auth Sync
  useEffect(() => {
    if (loading) return;

    if (user) {
      // 1. Auto-sync any local coins/folders to Firestore on login/load
      const localCoins = loadCoinsFromStorage();
      if (localCoins.length > 0) {
        syncLocalDataToFirestore(user.uid, localCoins, loadCustomFolders(localCoins), loadCustomPlatforms(localCoins));
      }

      // 2. Subscribe to Firestore coins
      const unsubscribeCoins = subscribeToUserCoins(user.uid, (cloudCoins) => {
        setCoins(cloudCoins);
        saveCoinsToStorage(cloudCoins);
      });

      // 3. Subscribe to Firestore settings (folders & platforms)
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
  }, [user, loading]);

  // Polling Make.com Webhook Pending Items
  const handleFetchPendingWebhooks = async (isManual = false) => {
    if (isManual) setIsFetchingWebhooks(true);
    try {
      const res = await fetch('/api/webhook/make/pending');
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0 && Array.isArray(data.items)) {
          const newWebhookCoins: Coin[] = data.items.map((item: any) => ({
            id: item.id || `make-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: item.name || 'Münze (Make)',
            country: item.country || 'Schweiz',
            year: item.year || new Date().getFullYear(),
            faceValue: item.faceValue || '1',
            currency: item.currency || 'CHF',
            itemType: item.itemType || 'coin',
            material: item.material || 'Silber',
            mintMark: item.mintMark || '',
            condition: item.condition || 'Sehr gut',
            rarity: item.rarity || 'Sehr häufig (Common)',
            purchasePrice: item.purchasePrice || 0,
            currentValue: item.currentValue || 0,
            notes: item.notes || '',
            imageUrl: item.imageUrl || '',
            reverseImageUrl: item.reverseImageUrl || '',
            storageLocation: item.folder || 'Hauptsammlung',
            salesListings: [],
            catalogNumber: '',
            diameterMm: 0,
            weightG: 0,
            fineness: '',
            edgeDescription: '',
            mintage: 0,
            historicalContext: '',
            certNumber: '',
            gradingCompany: 'Keine',
            provenance: '',
            isFavorite: false,
            createdAt: item.createdAt || new Date().toISOString()
          }));

          setCoins(prev => {
            const updated = [...prev];
            newWebhookCoins.forEach((newCoin) => {
              const cleanNewName = newCoin.name.trim().toLowerCase();
              const existingIdx = updated.findIndex(
                c => c.name.trim().toLowerCase() === cleanNewName
              );

              if (existingIdx !== -1) {
                // Merge images into existing coin instead of creating duplicate
                const existing = updated[existingIdx];
                const mergedCoin: Coin = {
                  ...existing,
                  imageUrl: existing.imageUrl || newCoin.imageUrl || newCoin.reverseImageUrl,
                  reverseImageUrl: (existing.reverseImageUrl && existing.reverseImageUrl !== existing.imageUrl)
                    ? existing.reverseImageUrl
                    : (newCoin.reverseImageUrl && newCoin.reverseImageUrl !== existing.imageUrl ? newCoin.reverseImageUrl : existing.reverseImageUrl),
                  notes: existing.notes ? (newCoin.notes && !existing.notes.includes(newCoin.notes) ? `${existing.notes} | ${newCoin.notes}` : existing.notes) : (newCoin.notes || '')
                };
                updated[existingIdx] = mergedCoin;
                if (user) saveCoinToFirestore(user.uid, mergedCoin);
              } else {
                const freshCoin = {
                  ...newCoin,
                  imageUrl: newCoin.imageUrl || newCoin.reverseImageUrl,
                  reverseImageUrl: newCoin.reverseImageUrl !== newCoin.imageUrl ? newCoin.reverseImageUrl : ''
                };
                updated.unshift(freshCoin);
                if (user) saveCoinToFirestore(user.uid, freshCoin);
              }
            });

            saveCoinsToStorage(updated);
            return updated;
          });

          setImportToast(`🎉 ${newWebhookCoins.length} Münze(n) via Google Drive Import hinzugefügt!`);
          setTimeout(() => setImportToast(null), 6000);
        } else if (isManual) {
          setImportToast(`ℹ️ Aktuell keine neuen Münzen im Puffer.`);
          setTimeout(() => setImportToast(null), 7000);
        }
      }
    } catch {
      if (isManual) {
        setImportToast(`⚠️ Fehler beim Abrufen des Imports.`);
        setTimeout(() => setImportToast(null), 4000);
      }
    } finally {
      if (isManual) setIsFetchingWebhooks(false);
    }
  };

  const handleTriggerTestWebhook = async () => {
    setIsFetchingWebhooks(true);
    try {
      const res = await fetch('/api/webhook/make/test', { method: 'POST' });
      if (res.ok) {
        await handleFetchPendingWebhooks(true);
      }
    } catch {
      setImportToast('⚠️ Fehler beim Erstellen der Testmünze.');
    } finally {
      setIsFetchingWebhooks(false);
    }
  };

  useEffect(() => {
    handleFetchPendingWebhooks(false);

    // Auto-poll every 3 seconds so imported coins from Google Drive / Make appear immediately
    const interval = setInterval(() => {
      handleFetchPendingWebhooks(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  // Sync Local Data to Cloud
  const handleSyncLocalDataToCloud = async () => {
    if (!user) return;
    const localCoins = loadCoinsFromStorage();
    const localFolders = loadCustomFolders(localCoins);
    const localPlatforms = loadCustomPlatforms(localCoins);

    await syncLocalDataToFirestore(user.uid, localCoins, localFolders, localPlatforms);
  };

  // Sync state to LocalStorage & State
  const updateCoinsState = (newCoins: Coin[]) => {
    setCoins(newCoins);
    saveCoinsToStorage(newCoins);
    const updatedFolders = loadCustomFolders(newCoins);
    setFolders(updatedFolders);
    const updatedPlatforms = loadCustomPlatforms(newCoins);
    setPlatforms(updatedPlatforms);
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

      const updatedList = coins.map(c => c.id === coinData.id ? updatedCoin : c);
      updateCoinsState(updatedList);

      if (user) {
        saveCoinToFirestore(user.uid, updatedCoin);
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

      const updatedList = [newCoin, ...coins];
      updateCoinsState(updatedList);

      if (user) {
        saveCoinToFirestore(user.uid, newCoin);
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

    const updatedList = coins.filter(c => c.id !== targetId);
    updateCoinsState(updatedList);

    if (user) {
      deleteCoinFromFirestore(user.uid, targetId);
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
    <div className="min-h-screen bg-[#1a1412] text-stone-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden max-w-full w-full">
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
        onManualFetchWebhooks={() => handleFetchPendingWebhooks(true)}
        isFetchingWebhooks={isFetchingWebhooks}
      />

      {importToast && (
        <div className="bg-emerald-800/90 border-b border-emerald-600 text-white px-4 py-2.5 text-center text-xs sm:text-sm font-medium shadow-lg flex flex-wrap items-center justify-center gap-3">
          <span>{importToast}</span>
          <button
            onClick={handleTriggerTestWebhook}
            className="px-2.5 py-1 text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-md shadow transition-all"
          >
            🧪 Test-Münze simulieren
          </button>
          <button
            onClick={() => setImportToast(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Ausblenden
          </button>
        </div>
      )}

      {/* Main Container View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 pb-24 overflow-x-hidden">
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
          <div className="max-w-2xl mx-auto space-y-4 bg-[#241c18] border border-[#3e2e26] rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-serif font-bold text-amber-400">
              Münzerfassung starten
            </h2>
            <p className="text-xs text-stone-400">
              Fügen Sie ein neues Münzexemplar mit Erhaltungsgrad, Kaufpreis und Marktwert zu Ihrer Sammlung hinzu.
            </p>
            <button
              onClick={() => {
                setEditCoin(null);
                setIsFormModalOpen(true);
              }}
              className="w-full py-3 text-xs font-bold text-stone-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
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

