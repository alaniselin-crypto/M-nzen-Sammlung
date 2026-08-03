import React from 'react';
import { Coins, Plus, HelpCircle, Folder, ShoppingBag, Cloud, UserCheck } from 'lucide-react';
import { formatCurrency } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  totalValue: number;
  totalCoins: number;
  onOpenAddModal: () => void;
  onOpenGuideModal: () => void;
  onOpenFolderManager: () => void;
  onOpenPlatformManager?: () => void;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalValue,
  totalCoins,
  onOpenAddModal,
  onOpenGuideModal,
  onOpenFolderManager,
  onOpenPlatformManager,
  onOpenAuthModal
}) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#121318]/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-900/30">
            <div className="w-full h-full bg-[#181a20] rounded-[10px] flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121318] ${user ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight font-serif">
                Numisma
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Münztracker v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Ihre digitale Münzsammlung & Wertanalyse
            </p>
          </div>
        </div>

        {/* Center / Stats Preview */}
        <div className="hidden md:flex items-center gap-6 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sammlungswert:</span>
            <span className="font-bold text-amber-400 font-mono text-sm">
              {formatCurrency(totalValue)}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Münzen:</span>
            <span className="font-semibold text-slate-200 font-mono">
              {totalCoins} Stk.
            </span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                user
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title={user ? `Angemeldet als ${user.email || 'Cloud User'}` : 'Netzwerk / Cloud Konto aktivieren'}
            >
              {user ? (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline font-mono">{user.email ? user.email.split('@')[0] : 'Cloud'}</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline">Cloud Konto</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onOpenFolderManager}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-amber-400 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/30 rounded-lg transition-all"
            title="Lagerorte & Ordner verwalten (Hinzufügen & Umbenennen)"
          >
            <Folder className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Ordner</span>
          </button>

          {onOpenPlatformManager && (
            <button
              onClick={onOpenPlatformManager}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 hover:border-purple-500/40 rounded-lg transition-all"
              title="Verkaufsplattformen verwalten (Ricardo, eBay, Tutti...)"
            >
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              <span className="hidden lg:inline">Plattformen</span>
            </button>
          )}

          <button
            onClick={onOpenGuideModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-amber-400 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/30 rounded-lg transition-all"
            title="Lokale Startanleitung & Infos"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Anleitung</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-md shadow-amber-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span className="hidden xs:inline">Münze hinzufügen</span>
          </button>
        </div>
      </div>
    </header>
  );
};

