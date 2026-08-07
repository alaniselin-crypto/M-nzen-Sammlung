import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, LayoutGrid, List, RotateCcw, Plus, Star, X, Coins, Settings, Printer, Banknote, Crown, Layers } from 'lucide-react';
import { Coin, CoinCondition, CoinFilterState } from '../types';
import { CoinCard } from './CoinCard';
import { PrintModal } from './PrintModal';
import { RARITY_OPTIONS, getRarityOption } from '../data/rarities';
import { formatCurrency } from '../utils/storage';

interface CoinListProps {
  coins: Coin[];
  onOpenAddModal: () => void;
  onViewDetails: (coin: Coin) => void;
  onEdit: (coin: Coin) => void;
  onDelete: (coinId: string) => void;
  onToggleFavorite: (coinId: string) => void;
  onDuplicate?: (coin: Coin) => void;
  onOpenFolderManager?: () => void;
  onOpenPlatformManager?: () => void;
}

export const CoinList: React.FC<CoinListProps> = ({
  coins,
  onOpenAddModal,
  onViewDetails,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDuplicate,
  onOpenFolderManager,
  onOpenPlatformManager
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(24);

  const [filter, setFilter] = useState<CoinFilterState>({
    searchQuery: '',
    country: '',
    condition: '',
    material: '',
    storageLocation: '',
    listingPlatform: '',
    itemType: '',
    rarity: '',
    onlyForSale: false,
    onlySold: false,
    yearFrom: '',
    yearTo: '',
    sortBy: 'catalogNumber-asc',
    onlyFavorites: false
  });

  // Reset pagination on filter changes
  React.useEffect(() => {
    setVisibleCount(24);
  }, [filter]);

  // Extract unique countries, materials, storage locations & platforms for dropdowns
  const uniqueCountries = useMemo(() => {
    return Array.from(new Set(coins.map(c => c.country).filter(Boolean))).sort();
  }, [coins]);

  const uniqueMaterials = useMemo(() => {
    return Array.from(new Set(coins.map(c => c.material).filter(Boolean))).sort();
  }, [coins]);

  const uniqueStorageLocations = useMemo(() => {
    return Array.from(new Set(coins.map(c => c.storageLocation).filter(Boolean))).sort();
  }, [coins]);

  const uniquePlatforms = useMemo(() => {
    return Array.from(new Set(coins.map(c => c.listingPlatform).filter(Boolean))).sort();
  }, [coins]);

  // Filter & Sort Logic
  const filteredCoins = useMemo(() => {
    return coins.filter(coin => {
      // Search Query
      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase().trim();
        const matchesName = coin.name.toLowerCase().includes(q);
        const matchesCountry = coin.country.toLowerCase().includes(q);
        const matchesCurrency = coin.currency.toLowerCase().includes(q);
        const matchesNotes = (coin.notes || '').toLowerCase().includes(q);
        const matchesMintMark = (coin.mintMark || '').toLowerCase().includes(q);
        const matchesCatalogNumber = (coin.catalogNumber || '').toLowerCase().includes(q);
        const matchesStorageLocation = (coin.storageLocation || '').toLowerCase().includes(q);
        const matchesListingPlatform = (coin.listingPlatform || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCountry && !matchesCurrency && !matchesNotes && !matchesMintMark && !matchesCatalogNumber && !matchesStorageLocation && !matchesListingPlatform) {
          return false;
        }
      }

      // Country filter
      if (filter.country && coin.country !== filter.country) return false;

      // Condition filter
      if (filter.condition && coin.condition !== filter.condition) return false;

      // Material filter
      if (filter.material && coin.material !== filter.material) return false;

      // Storage location filter
      if (filter.storageLocation && coin.storageLocation !== filter.storageLocation) return false;

      // Listing Platform filter
      if (filter.listingPlatform && coin.listingPlatform !== filter.listingPlatform) return false;

      // Item Type filter (coin vs banknote)
      if (filter.itemType && (coin.itemType || 'coin') !== filter.itemType) return false;

      // Rarity filter
      if (filter.rarity) {
        const coinRarity = coin.rarity || '';
        if (!coinRarity.toLowerCase().includes(filter.rarity.toLowerCase())) return false;
      }

      // Only For Sale filter
      if (filter.onlyForSale && !coin.isForSale) return false;

      // Only Sold filter
      if (filter.onlySold && !coin.isSold) return false;

      // Favorites only
      if (filter.onlyFavorites && !coin.isFavorite) return false;

      // Year From
      if (filter.yearFrom) {
        const fromYear = parseInt(filter.yearFrom, 10);
        if (!isNaN(fromYear) && coin.year < fromYear) return false;
      }

      // Year To
      if (filter.yearTo) {
        const toYear = parseInt(filter.yearTo, 10);
        if (!isNaN(toYear) && coin.year > toYear) return false;
      }

      return true;
    }).sort((a, b) => {
      switch (filter.sortBy) {
        case 'catalogNumber-asc':
          return (a.catalogNumber || '').localeCompare(b.catalogNumber || '', undefined, { numeric: true });
        case 'catalogNumber-desc':
          return (b.catalogNumber || '').localeCompare(a.catalogNumber || '', undefined, { numeric: true });
        case 'storageLocation-asc':
          return (a.storageLocation || '').localeCompare(b.storageLocation || '');
        case 'currentValue-desc':
          return b.currentValue - a.currentValue;
        case 'currentValue-asc':
          return a.currentValue - b.currentValue;
        case 'year-desc':
          return b.year - a.year;
        case 'year-asc':
          return a.year - b.year;
        case 'name-asc':
          return a.name.localeCompare(b.name, 'de');
        case 'purchaseDate-desc':
          return (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
        default:
          return b.currentValue - a.currentValue;
      }
    });
  }, [coins, filter]);

  const resetFilters = () => {
    setFilter({
      searchQuery: '',
      country: '',
      condition: '',
      material: '',
      storageLocation: '',
      listingPlatform: '',
      itemType: '',
      rarity: '',
      onlyForSale: false,
      onlySold: false,
      yearFrom: '',
      yearTo: '',
      sortBy: 'catalogNumber-asc',
      onlyFavorites: false
    });
  };

  const activeFilterCount = [
    filter.country,
    filter.condition,
    filter.material,
    filter.storageLocation,
    filter.listingPlatform,
    filter.itemType,
    filter.rarity,
    filter.onlyForSale ? 'forSale' : '',
    filter.onlySold ? 'sold' : '',
    filter.yearFrom,
    filter.yearTo,
    filter.onlyFavorites ? 'fav' : ''
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Search & Main Controls Bar */}
      <div className="bg-[#241c18] border border-[#3e2e26] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Real-time Search Input */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={e => setFilter({ ...filter, searchQuery: e.target.value })}
              placeholder="Echtzeit-Suche nach Name, Land, Währung, Prägestätte..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#140f0d] border border-[#3e2e26] text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {filter.searchQuery && (
              <button
                onClick={() => setFilter({ ...filter, searchQuery: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Toolbar Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                activeFilterCount > 0 || showFilterDrawer
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#140f0d] text-stone-300 border-[#3e2e26] hover:border-amber-500/40'
              }`}
            >
              <Filter className="w-4 h-4 text-amber-400" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-bold text-[10px] flex items-center justify-center font-mono">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative flex items-center gap-1.5 bg-[#140f0d] border border-[#3e2e26] rounded-xl px-3 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <select
                value={filter.sortBy}
                onChange={e => setFilter({ ...filter, sortBy: e.target.value as CoinFilterState['sortBy'] })}
                className="bg-transparent text-xs font-medium text-stone-200 focus:outline-none py-1 cursor-pointer"
              >
                <option value="catalogNumber-asc" className="bg-[#241c18] text-stone-200">Münznummer (00001 → 99999)</option>
                <option value="catalogNumber-desc" className="bg-[#241c18] text-stone-200">Münznummer (Höchste zuerst)</option>
                <option value="storageLocation-asc" className="bg-[#241c18] text-stone-200">Lagerort / Ordner (A-Z)</option>
                <option value="currentValue-desc" className="bg-[#241c18] text-stone-200">Wert (Höchster)</option>
                <option value="currentValue-asc" className="bg-[#241c18] text-stone-200">Wert (Niedrigster)</option>
                <option value="year-desc" className="bg-[#241c18] text-stone-200">Prägejahr (Neueste)</option>
                <option value="year-asc" className="bg-[#241c18] text-stone-200">Prägejahr (Älteste)</option>
                <option value="name-asc" className="bg-[#241c18] text-stone-200">Name (A-Z)</option>
                <option value="purchaseDate-desc" className="bg-[#241c18] text-stone-200">Kaufdatum (Neueste)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-[#140f0d] border border-[#3e2e26] rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Karten-Ansicht"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-amber-500/20 text-amber-400' : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Tabellen-Ansicht"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#140f0d] border border-[#3e2e26] hover:border-amber-500/60 text-amber-300 hover:text-amber-200 text-xs font-semibold shadow-md transition-all no-print cursor-pointer"
              title="Katalog-Druckansicht & PDF Export öffnen"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Liste drucken / PDF</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          {/* Item Type Toggles */}
          <button
            onClick={() => setFilter(prev => ({ ...prev, itemType: prev.itemType === 'coin' ? '' : 'coin' }))}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filter.itemType === 'coin'
                ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-900 text-amber-300 border-slate-800 hover:border-amber-500/30'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>🪙 Nur Münzen</span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, itemType: prev.itemType === 'banknote' ? '' : 'banknote' }))}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filter.itemType === 'banknote'
                ? 'bg-emerald-400 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-900 text-emerald-300 border-slate-800 hover:border-emerald-500/30'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
            <span>💵 Nur Banknoten</span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, onlyFavorites: !prev.onlyFavorites }))}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filter.onlyFavorites
                ? 'bg-amber-400 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/30'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filter.onlyFavorites ? 'fill-slate-950' : 'text-amber-400'}`} />
            <span>Nur Favoriten ★</span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, onlyForSale: !prev.onlyForSale }))}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filter.onlyForSale
                ? 'bg-purple-500 text-slate-950 border-purple-400'
                : 'bg-slate-900 text-purple-300 border-slate-800 hover:border-purple-500/40'
            }`}
          >
            <span>🛒 Steht zum Verkauf</span>
          </button>

          <button
            onClick={() => setFilter(prev => ({ ...prev, onlySold: !prev.onlySold }))}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filter.onlySold
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-900 text-emerald-300 border-slate-800 hover:border-emerald-500/40'
            }`}
          >
            <span>✅ Verkauft</span>
          </button>

          {['Schweiz', 'Deutschland', 'Cuba', 'Südafrika', 'USA', 'Österreich'].map(country => (
            <button
              key={country}
              onClick={() => setFilter(prev => ({
                ...prev,
                country: prev.country === country ? '' : country
              }))}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filter.country === country
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {country}
            </button>
          ))}

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-rose-400 hover:underline ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Filter zurücksetzen</span>
            </button>
          )}
        </div>

        {/* Expandable Filter Drawer */}
        {showFilterDrawer && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-400">
                  Lagerort / Ordner
                </label>
                {onOpenFolderManager && (
                  <button
                    onClick={onOpenFolderManager}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                    title="Ordner verwalten & umbenennen"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Verwalten</span>
                  </button>
                )}
              </div>
              <select
                value={filter.storageLocation}
                onChange={e => setFilter({ ...filter, storageLocation: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#181a22] border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">Alle Lagerorte</option>
                {uniqueStorageLocations.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-purple-300">
                  Verkaufsplattform
                </label>
                {onOpenPlatformManager && (
                  <button
                    onClick={onOpenPlatformManager}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                    title="Plattformen verwalten"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Verwalten</span>
                  </button>
                )}
              </div>
              <select
                value={filter.listingPlatform}
                onChange={e => setFilter({ ...filter, listingPlatform: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#181a22] border border-slate-800 text-xs text-purple-200 focus:outline-none"
              >
                <option value="">Alle Plattformen</option>
                {uniquePlatforms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Herkunftsland
              </label>
              <select
                value={filter.country}
                onChange={e => setFilter({ ...filter, country: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#181a22] border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">Alle Länder</option>
                {uniqueCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Erhaltungsgrad
              </label>
              <select
                value={filter.condition}
                onChange={e => setFilter({ ...filter, condition: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#181a22] border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">Alle Erhaltungsgrade</option>
                <option value="PP">PP - Polierte Platte</option>
                <option value="stgl">stgl - Stempelglanz</option>
                <option value="vz">vz - Vorzüglich</option>
                <option value="ss">ss - Sehr schön</option>
                <option value="s">s - Schön</option>
                <option value="ge">ge - Gering erhalten</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Material / Metall
              </label>
              <select
                value={filter.material}
                onChange={e => setFilter({ ...filter, material: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#181a22] border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="">Alle Materialien</option>
                {uniqueMaterials.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Prägejahr (von - bis)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="von"
                  value={filter.yearFrom}
                  onChange={e => setFilter({ ...filter, yearFrom: e.target.value })}
                  className="w-1/2 px-2.5 py-2 rounded-lg bg-[#181a22] border border-slate-800 text-xs text-slate-200 font-mono"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="number"
                  placeholder="bis"
                  value={filter.yearTo}
                  onChange={e => setFilter({ ...filter, yearTo: e.target.value })}
                  className="w-1/2 px-2.5 py-2 rounded-lg bg-[#181a22] border border-slate-800 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Info & Count Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          Gefunden: <span className="font-bold text-amber-400 font-mono">{filteredCoins.length}</span> von {coins.length} Münzen
        </div>

        {filter.searchQuery && (
          <div>
            Suchbegriff: <span className="text-amber-300 font-medium">"{filter.searchQuery}"</span>
          </div>
        )}
      </div>

      {/* Main List Rendering */}
      {filteredCoins.length === 0 ? (
        <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Coins className="w-12 h-12 text-amber-500/40 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200 font-serif">
            Keine Münzen gefunden
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Keine Münzen entsprechen Ihren aktuellen Filtereinstellungen oder Suchkriterien.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              Filter zurücksetzen
            </button>
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition-all"
            >
              + Neue Münze anlegen
            </button>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCoins.slice(0, visibleCount).map(coin => (
                <CoinCard
                  key={coin.id}
                  coin={coin}
                  viewMode="grid"
                  onViewDetails={onViewDetails}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                  onDuplicate={onDuplicate}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#241c18] border border-[#3e2e26] rounded-2xl overflow-hidden shadow-lg max-w-full">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1a1412] border-b border-[#3e2e26] text-[11px] uppercase font-semibold text-stone-400">
                      <th className="py-3 px-3 w-8">★</th>
                      <th className="py-3 px-3">Münzbezeichnung / Land</th>
                      <th className="py-3 px-3">Erhaltung</th>
                      <th className="py-3 px-3">Kaufpreis</th>
                      <th className="py-3 px-3">Aktueller Wert</th>
                      <th className="py-3 px-3">Gewinn %</th>
                      <th className="py-3 px-3 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoins.slice(0, visibleCount).map(coin => (
                      <CoinCard
                        key={coin.id}
                        coin={coin}
                        viewMode="table"
                        onViewDetails={onViewDetails}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onToggleFavorite={onToggleFavorite}
                        onDuplicate={onDuplicate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination / Load More Button for Mobile Performance */}
          {filteredCoins.length > visibleCount && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 pb-2">
              <button
                onClick={() => setVisibleCount(prev => prev + 24)}
                className="w-full sm:w-auto px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Weitere 24 Münzen laden</span>
                <span className="font-mono text-[11px] bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-300">
                  ({Math.min(visibleCount, filteredCoins.length)} von {filteredCoins.length})
                </span>
              </button>
              <button
                onClick={() => setVisibleCount(filteredCoins.length)}
                className="w-full sm:w-auto px-4 py-3 bg-[#1e1713] hover:bg-[#2e231c] text-stone-300 border border-[#3e2e26] rounded-xl text-xs font-semibold transition-all text-center"
              >
                Alle {filteredCoins.length} auf einmal anzeigen
              </button>
            </div>
          )}
        </>
      )}

      {/* Printable Catalog Table (Only visible when printing) */}
      <div className="hidden print:block print-only p-4 bg-white text-black font-sans">
        <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Numismatische Sammlung & Bestandskatalog</h1>
            <p className="text-xs text-gray-600 mt-1">
              Erstellt am: {new Date().toLocaleDateString('de-CH')} • Gefilterte Positionen: {filteredCoins.length}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Gesamtwert: {formatCurrency(filteredCoins.reduce((sum, c) => sum + (c.currentValue * (c.quantity || 1)), 0))}</p>
            <p className="text-gray-600">Gesamtbestand: {filteredCoins.reduce((sum, c) => sum + (c.quantity || 1), 0)} Stück</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 font-bold uppercase text-[10px]">
              <th className="p-2 border border-gray-300">ID</th>
              <th className="p-2 border border-gray-300">Typ</th>
              <th className="p-2 border border-gray-300">Stk.</th>
              <th className="p-2 border border-gray-300">Bezeichnung</th>
              <th className="p-2 border border-gray-300">Land / Jahr</th>
              <th className="p-2 border border-gray-300">Nominal</th>
              <th className="p-2 border border-gray-300">Erhaltung</th>
              <th className="p-2 border border-gray-300">Rarity</th>
              <th className="p-2 border border-gray-300">Lagerort</th>
              <th className="p-2 border border-gray-300 text-right">Kaufpreis</th>
              <th className="p-2 border border-gray-300 text-right">Schätzwert</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoins.map((coin, idx) => {
              const rarityOpt = getRarityOption(coin.rarity);
              return (
                <tr key={coin.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2 border border-gray-300 font-mono font-bold">#{coin.catalogNumber}</td>
                  <td className="p-2 border border-gray-300">{coin.itemType === 'banknote' ? 'Banknote' : 'Münze'}</td>
                  <td className="p-2 border border-gray-300 font-bold">{coin.quantity || 1}</td>
                  <td className="p-2 border border-gray-300 font-bold">{coin.name}</td>
                  <td className="p-2 border border-gray-300">{coin.country} ({coin.year})</td>
                  <td className="p-2 border border-gray-300">{coin.faceValue} {coin.currency}</td>
                  <td className="p-2 border border-gray-300">{coin.condition}</td>
                  <td className="p-2 border border-gray-300 font-semibold">{rarityOpt ? rarityOpt.fullLabel : (coin.rarity || '-')}</td>
                  <td className="p-2 border border-gray-300">{coin.storageLocation || '-'}</td>
                  <td className="p-2 border border-gray-300 text-right font-mono">{formatCurrency(coin.purchasePrice)}</td>
                  <td className="p-2 border border-gray-300 text-right font-mono font-bold">{formatCurrency(coin.currentValue)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 border-t-2 border-black font-bold">
              <td colSpan={2} className="p-2 border border-gray-300">TOTAL</td>
              <td className="p-2 border border-gray-300">{filteredCoins.reduce((sum, c) => sum + (c.quantity || 1), 0)}</td>
              <td colSpan={6} className="p-2 border border-gray-300 text-right">{filteredCoins.length} Positionen</td>
              <td className="p-2 border border-gray-300 text-right font-mono">{formatCurrency(filteredCoins.reduce((sum, c) => sum + (c.purchasePrice * (c.quantity || 1)), 0))}</td>
              <td className="p-2 border border-gray-300 text-right font-mono">{formatCurrency(filteredCoins.reduce((sum, c) => sum + (c.currentValue * (c.quantity || 1)), 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Print / PDF Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        coins={filteredCoins}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
