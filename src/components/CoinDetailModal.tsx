import React, { useState } from 'react';
import { X, Edit2, Trash2, Star, TrendingUp, TrendingDown, MapPin, Calendar, Coins, ShieldAlert, Sparkles, Scale, Maximize2, Folder, Copy, Hash, ZoomIn, ZoomOut, RotateCw, ShoppingBag, Tag, CheckCircle2, ExternalLink, Banknote, Crown, Layers } from 'lucide-react';
import { Coin } from '../types';
import { CoinAvatar } from './CoinAvatar';
import { formatCurrency, getConditionLabel } from '../utils/storage';
import { getRarityOption } from '../data/rarities';

interface CoinDetailModalProps {
  coin: Coin | null;
  onClose: () => void;
  onEdit: (coin: Coin) => void;
  onDelete: (coinId: string) => void;
  onToggleFavorite: (coinId: string) => void;
  onDuplicate?: (coin: Coin) => void;
}

export const CoinDetailModal: React.FC<CoinDetailModalProps> = ({
  coin,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDuplicate
}) => {
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!coin) return null;

  const cond = getConditionLabel(coin.condition);
  const profit = coin.currentValue - coin.purchasePrice;
  const profitMargin = coin.purchasePrice > 0 ? (profit / coin.purchasePrice) * 100 : 0;
  const isPositive = profit >= 0;
  const isBanknote = coin.itemType === 'banknote' || /banknote|schein|note|papier/i.test(coin.name + ' ' + (coin.material || '') + ' ' + (coin.notes || ''));
  const rarityOpt = getRarityOption(coin.rarity);

  const openLightbox = (url: string, title: string) => {
    setFullscreenImage({ url, title });
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-fadeIn max-w-full overflow-x-hidden">
        <div className="relative w-full max-w-3xl min-w-0 max-h-[92vh] overflow-y-auto overflow-x-hidden bg-[#221a16] border border-amber-900/40 rounded-2xl shadow-2xl shadow-amber-950/50 text-stone-100 flex flex-col">
          {/* Header Modal Bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-[#221a16]/95 backdrop-blur-md border-b border-[#3e2e26]">
            <div className="flex items-center gap-2 flex-wrap">
              {coin.catalogNumber && (
                <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  Nr. #{coin.catalogNumber}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${cond.color}`}>
                {cond.full}
              </span>
              {coin.isFavorite && (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  Favorit
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(coin.id)}
                className="p-2 rounded-lg bg-[#1a1412] hover:bg-[#3d2e26] text-stone-300 hover:text-amber-400 transition-colors"
                title="Favorit umschalten"
              >
                <Star className={`w-4 h-4 ${coin.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-[#1a1412] hover:bg-[#3d2e26] text-stone-400 hover:text-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Enlarged Coin Images Container (Avers & Revers) */}
            <div className="bg-[#1a1412]/80 p-4 sm:p-5 rounded-2xl border border-[#3e2e26] flex flex-col items-center">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 w-full">
                {/* Vorderseite (Avers) */}
                <div className="flex flex-col items-center group">
                  <div className="relative">
                    <div 
                      onClick={() => coin.imageUrl && openLightbox(coin.imageUrl, `${coin.name} - Vorderseite (Avers)`)}
                      className="relative cursor-pointer transition-transform hover:scale-105"
                    >
                      <CoinAvatar
                        imageUrl={coin.imageUrl}
                        name={coin.name}
                        faceValue={coin.faceValue}
                        currency={coin.currency}
                        material={coin.material}
                        isBanknote={isBanknote}
                        size="xl"
                      />
                      {coin.imageUrl && (
                        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                          <span className="px-3 py-1.5 rounded-full bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1 shadow-lg">
                            <Maximize2 className="w-3.5 h-3.5" />
                            Vollbild Zoom
                          </span>
                        </div>
                      )}
                    </div>
                    {coin.mintMark && (
                      <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#1a1412] border-2 border-amber-500 flex items-center justify-center font-bold text-xs text-amber-400 shadow-xl">
                        {coin.mintMark}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider mt-2.5 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" />
                    Vorderseite (Avers)
                  </span>
                </div>

                {/* Rückseite (Revers) */}
                {coin.reverseImageUrl && (
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <div 
                        onClick={() => openLightbox(coin.reverseImageUrl!, `${coin.name} - Rückseite (Revers)`)}
                        className="relative cursor-pointer transition-transform hover:scale-105"
                      >
                        <CoinAvatar
                          imageUrl={coin.reverseImageUrl}
                          name={coin.name}
                          faceValue={coin.faceValue}
                          currency={coin.currency}
                          material={coin.material}
                          isBanknote={isBanknote}
                          size="xl"
                        />
                        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                          <span className="px-3 py-1.5 rounded-full bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1 shadow-lg">
                            <Maximize2 className="w-3.5 h-3.5" />
                            Vollbild Zoom
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider mt-2.5 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" />
                      Rückseite (Revers)
                    </span>
                  </div>
                )}
              </div>

              {(coin.imageUrl || coin.reverseImageUrl) && (
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                  Klicken Sie auf ein Bild, um es im hochauflösenden Vollbild-Modus mit Zoom zu betrachten.
                </p>
              )}
            </div>

            {/* Title & Key Data */}
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-amber-300 leading-snug">
                {coin.name}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold text-slate-100 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700/60">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  {coin.country}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-slate-100 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700/60">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Jahrgang {coin.year}
                </span>
                <span className="font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
                  {coin.faceValue} {coin.currency}
                </span>
              </div>

              {/* Financial Box */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase font-semibold text-slate-400">Kaufpreis</div>
                  <div className="text-lg sm:text-xl font-mono font-semibold text-slate-200">
                    {formatCurrency(coin.purchasePrice)}
                  </div>
                  {coin.purchaseDate && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Gekauft am {coin.purchaseDate}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs uppercase font-semibold text-amber-400">Aktueller Schätzwert</div>
                  <div className="text-lg sm:text-xl font-mono font-bold text-amber-300">
                    {formatCurrency(coin.currentValue)}
                  </div>
                  <div className={`text-xs font-mono font-semibold flex items-center gap-1 mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isPositive ? '+' : ''}{formatCurrency(profit)} ({profitMargin.toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* Sales & Platforms Block */}
              {(coin.isForSale || coin.isSold) && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShoppingBag className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                        Verkaufs- & Plattformstatus
                      </h3>
                    </div>
                    {coin.isSold ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Erfolgreich Verkauft
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        Aktiv Angeboten
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    {coin.listingPlatform && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/20 flex justify-between items-center">
                        <span className="text-purple-300 font-semibold flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-purple-400" />
                          Plattform:
                        </span>
                        <span className="font-bold text-purple-200">{coin.listingPlatform}</span>
                      </div>
                    )}

                    {coin.listingPrice > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/20 flex justify-between items-center">
                        <span className="text-purple-300 font-semibold">Einstellpreis:</span>
                        <span className="font-mono font-bold text-purple-200">{formatCurrency(coin.listingPrice)}</span>
                      </div>
                    )}

                    {coin.isSold && (
                      <>
                        {coin.soldPrice > 0 && (
                          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex justify-between items-center col-span-1 sm:col-span-2">
                            <span className="text-emerald-300 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              Verkaufserlös:
                            </span>
                            <span className="font-mono font-bold text-emerald-200 text-base">{formatCurrency(coin.soldPrice)}</span>
                          </div>
                        )}
                        {coin.soldDate && (
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex justify-between items-center">
                            <span className="text-slate-400">Verkaufsdatum:</span>
                            <span className="font-mono text-slate-200">{coin.soldDate}</span>
                          </div>
                        )}
                      </>
                    )}

                    {coin.listingUrl && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/20 sm:col-span-2 flex justify-between items-center">
                        <span className="text-slate-400">Inserat Link:</span>
                        <a
                          href={coin.listingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 underline font-medium text-xs flex items-center gap-1 max-w-[280px] truncate"
                        >
                          <span>{coin.listingUrl}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Technical Specifications Table */}
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Spezifikationen & Münzdaten
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1">
                    {isBanknote ? <Banknote className="w-3.5 h-3.5 text-emerald-400" /> : <Coins className="w-3.5 h-3.5 text-amber-400" />}
                    Objekt-Kategorie:
                  </span>
                  <span className="font-bold text-slate-100 flex items-center gap-1">
                    {isBanknote ? '💵 Banknote' : '🪙 Münze'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Stückanzahl (Bestand):
                  </span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {coin.quantity || 1} Stück
                  </span>
                </div>

                {coin.rarity && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between items-center sm:col-span-2">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-purple-400" />
                      Seltenheitsgrad (Rarity):
                    </span>
                    {rarityOpt ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${rarityOpt.badgeBgClass} ${rarityOpt.badgeTextClass} ${rarityOpt.badgeBorderClass}`}>
                        {rarityOpt.fullLabel}
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-200">{coin.rarity}</span>
                    )}
                  </div>
                )}

                {coin.catalogNumber && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" />
                      Münznummer ID:
                    </span>
                    <span className="font-mono font-bold text-amber-200 text-base">#{coin.catalogNumber}</span>
                  </div>
                )}
                {coin.storageLocation && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex justify-between items-center">
                    <span className="text-blue-300 font-semibold flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5 text-blue-400" />
                      Lagerort / Ordner:
                    </span>
                    <span className="font-semibold text-blue-200">{coin.storageLocation}</span>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between">
                  <span className="text-slate-400">Erhaltungsgrad:</span>
                  <span className="font-semibold text-slate-100">{cond.full} ({cond.label})</span>
                </div>
                {coin.mintMark && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Prägestätte:</span>
                    <span className="font-semibold text-amber-300">{coin.mintMark}</span>
                  </div>
                )}
                {coin.material && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Material / Legierung:</span>
                    <span className="font-semibold text-amber-300">{coin.material}</span>
                  </div>
                )}
                {coin.weight && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Gewicht:</span>
                    <span className="font-semibold text-slate-100">{coin.weight}</span>
                  </div>
                )}
                {coin.diameter && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Durchmesser:</span>
                    <span className="font-semibold text-slate-100">{coin.diameter}</span>
                  </div>
                )}
                {coin.mintage && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Prägeauflage:</span>
                    <span className="font-semibold text-slate-100">{coin.mintage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes / Bemerkungen Section */}
            {coin.notes && (
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                  Bemerkungen
                </h3>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {coin.notes}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 z-10 flex items-center justify-between p-4 bg-[#181a22] border-t border-slate-800">
            <button
              onClick={() => {
                onDelete(coin.id);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Münze Löschen</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {onDuplicate && (
                <button
                  onClick={() => {
                    onClose();
                    onDuplicate(coin);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition-all"
                  title="Münze kopieren / duplizieren"
                >
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Duplizieren</span>
                </button>
              )}

              <button
                onClick={() => {
                  onDelete(coin.id);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl transition-all"
                title="Münze löschen"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Löschen</span>
              </button>

              <button
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                Schließen
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEdit(coin);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md transition-all"
              >
                <Edit2 className="w-4 h-4 text-slate-950" />
                <span>Bearbeiten</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* High-Res Fullscreen Lightbox Zoom Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl animate-fadeIn p-4 overflow-hidden">
          {/* Lightbox Toolbar */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-6 py-3 rounded-2xl mb-4 text-slate-100 z-10">
            <h3 className="text-sm font-semibold text-amber-300 font-serif truncate mr-4">
              {fullscreenImage.title}
            </h3>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.3))}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                title="Verkleinern"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-amber-400 w-12 text-center font-bold">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.3))}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                title="Vergrößern"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors ml-2"
                title="90° Drehen"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setRotation(0);
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Zurücksetzen
              </button>
              <button
                onClick={() => setFullscreenImage(null)}
                className="p-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold transition-colors ml-4"
                title="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-4 cursor-grab">
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.title}
              referrerPolicy="no-referrer"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-full shadow-2xl border-4 border-amber-500/40 select-none"
            />
          </div>
        </div>
      )}
    </>
  );
};

