import React, { useState, useRef, useEffect } from 'react';
import { Coins, HelpCircle, Folder, ShoppingBag, Cloud, UserCheck, DownloadCloud, Settings, ChevronDown, LogIn } from 'lucide-react';
import { formatCurrency } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  totalValue: number;
  totalCoins: number;
  onOpenAddModal?: () => void;
  onOpenGuideModal?: () => void;
  onOpenFolderManager?: () => void;
  onOpenPlatformManager?: () => void;
  onOpenAuthModal?: () => void;
  onOpenLogoModal?: () => void;
  onOpenHeroModal?: () => void;
  onManualFetchWebhooks?: () => void;
  isFetchingWebhooks?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalValue,
  totalCoins,
  onOpenGuideModal,
  onOpenFolderManager,
  onOpenPlatformManager,
  onOpenAuthModal,
  onOpenLogoModal,
  onOpenHeroModal,
  onManualFetchWebhooks,
  isFetchingWebhooks
}) => {
  const { user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#16100e] border-b border-amber-900/40 px-3 py-2.5 sm:px-6 max-w-full shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div 
          onClick={onOpenLogoModal}
          className="flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer group"
          title="inumis.app Logo anzeigen & herunterladen"
        >
          <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-950/40 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#241c18] rounded-[10px] flex items-center justify-center">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-[#1a1412] ${user ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-bold text-stone-100 tracking-tight font-serif group-hover:text-amber-400 transition-colors">
                inumis.app
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Münztracker
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              Ihre digitale Münzsammlung & Wertanalyse
            </p>
          </div>
        </div>

        {/* Stats Display in Center */}
        <div className="hidden md:flex items-center gap-4 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Sammlungswert:</span>
            <span className="font-bold text-amber-400 font-mono text-xs sm:text-sm">
              {formatCurrency(totalValue)}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Münzen:</span>
            <span className="font-semibold text-slate-200 font-mono text-xs sm:text-sm">
              {totalCoins} Stk.
            </span>
          </div>
        </div>

        {/* Right Controls: Login & Zahnrad Settings Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm shrink-0 border ${
                user
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-400 font-bold shadow-amber-950/40'
              }`}
              title={user ? `Cloud-Konto: ${user.email || 'Verbunden'}` : 'Anmelden oder Kostenlos Registrieren'}
            >
              {user ? (
                <>
                  <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="hidden sm:inline font-medium text-emerald-300">
                    {user.email ? user.email.split('@')[0] : 'Konto'}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 shrink-0 text-stone-950" />
                  <span>Anmelden / Registrieren</span>
                </>
              )}
            </button>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded-lg transition-all shadow-sm shrink-0"
              title="Einstellungen & Werkzeuge öffnen"
            >
              <Settings className={`w-4 h-4 text-amber-400 shrink-0 transition-transform duration-300 ${isSettingsOpen ? 'rotate-90' : ''}`} />
              <span className="font-medium text-amber-300">Einstellungen</span>
              <ChevronDown className={`w-3.5 h-3.5 text-amber-400/80 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#241c18] border border-[#4a382e] rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn py-1.5">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-[#3d2f26] flex items-center justify-between">
                  <span>Werkzeuge & Optionen</span>
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                </div>

                {onOpenFolderManager && (
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onOpenFolderManager();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-200 hover:bg-[#322722] hover:text-amber-400 transition-colors text-left"
                  >
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-medium">Ordner verwalten</div>
                      <div className="text-[10px] text-stone-400">Lagerorte hinzufügen & umbenennen</div>
                    </div>
                  </button>
                )}

                {onOpenPlatformManager && (
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onOpenPlatformManager();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-200 hover:bg-[#322722] hover:text-purple-300 transition-colors text-left"
                  >
                    <ShoppingBag className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-medium">Verkaufsplattformen</div>
                      <div className="text-[10px] text-stone-400">Ricardo, eBay, Tutti usw.</div>
                    </div>
                  </button>
                )}

                {onManualFetchWebhooks && (
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onManualFetchWebhooks();
                    }}
                    disabled={isFetchingWebhooks}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-emerald-300 hover:bg-[#322722] transition-colors text-left disabled:opacity-50"
                  >
                    <DownloadCloud className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-medium">Drive Import starten</div>
                      <div className="text-[10px] text-emerald-400/80">Neue Münzen aus Google Drive prüfen</div>
                    </div>
                  </button>
                )}

                {onOpenAuthModal && (
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onOpenAuthModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-200 hover:bg-[#322722] hover:text-amber-300 transition-colors text-left border-t border-[#3d2f26] mt-1"
                  >
                    {user ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-medium">Cloud Konto ({user.email ? user.email.split('@')[0] : 'Verbunden'})</div>
                          <div className="text-[10px] text-emerald-400">Cloud-Synchronisation aktiv</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-medium">Cloud Konto aktivieren</div>
                          <div className="text-[10px] text-stone-400">Münzen online sichern</div>
                        </div>
                      </>
                    )}
                  </button>
                )}

                {onOpenGuideModal && (
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onOpenGuideModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-300 hover:bg-[#322722] hover:text-amber-400 transition-colors text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-medium">Anleitung & Hilfe</div>
                      <div className="text-[10px] text-stone-400">Nützliche Tipps zur Bedienung</div>
                    </div>
                  </button>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
