import React, { useState } from 'react';
import { Star, Eye, Edit2, Trash2, TrendingUp, TrendingDown, MapPin, Calendar, Scale, Sparkles, RefreshCw, Copy, Folder, Hash, ShoppingBag, Tag, CheckCircle2, Banknote, Coins, Layers, Crown } from 'lucide-react';
import { Coin } from '../types';
import { CoinAvatar } from './CoinAvatar';
import { formatCurrency, getConditionLabel, formatSKU, getCoinTitle } from '../utils/storage';
import { getRarityOption } from '../data/rarities';

interface CoinCardProps {
  coin: Coin;
  onViewDetails: (coin: Coin) => void;
  onEdit: (coin: Coin) => void;
  onDelete: (coinId: string) => void;
  onToggleFavorite: (coinId: string) => void;
  onDuplicate?: (coin: Coin) => void;
  viewMode?: 'grid' | 'table';
}

export const CoinCard: React.FC<CoinCardProps> = ({
  coin,
  onViewDetails,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDuplicate,
  viewMode = 'grid'
}) => {
  const [showReverse, setShowReverse] = useState(false);
  const cond = getConditionLabel(coin.condition);
  const profit = coin.currentValue - coin.purchasePrice;
  const profitMargin = coin.purchasePrice > 0 ? (profit / coin.purchasePrice) * 100 : 0;
  const isPositive = profit >= 0;

  const currentDisplayImage = showReverse && coin.reverseImageUrl ? coin.reverseImageUrl : (coin.imageUrl || coin.reverseImageUrl);
  const hasBothImages = Boolean(coin.imageUrl && coin.reverseImageUrl && coin.imageUrl !== coin.reverseImageUrl);
  const rarityOpt = getRarityOption(coin.rarity);
  const isBanknote = coin.itemType === 'banknote' || (!coin.itemType && /\b(banknote|banknoten|geldschein|geldscheine|papiergeld)\b/i.test(coin.name + ' ' + (coin.material || '') + ' ' + (coin.notes || '')));
  const quantity = coin.quantity || 1;

  // Placeholder fallback styling based on material
  const getMaterialGradient = (material?: string) => {
    const mat = (material || '').toLowerCase();
    if (mat.includes('gold')) {
      return 'from-amber-400/20 via-amber-600/30 to-amber-900/40 text-amber-300 border-amber-500/30';
    }
    if (mat.includes('silber')) {
      return 'from-slate-300/20 via-slate-400/30 to-slate-600/40 text-slate-200 border-slate-400/30';
    }
    if (mat.includes('bimetall')) {
      return 'from-amber-500/20 via-slate-400/20 to-amber-700/30 text-amber-200 border-amber-400/30';
    }
    return 'from-slate-700/30 via-slate-800/40 to-slate-900/50 text-amber-400/80 border-slate-700/40';
  };

  if (viewMode === 'table') {
    return (
      <tr className="hover:bg-[#2b211a] transition-colors border-b border-[#3a2c24] text-xs sm:text-sm">
        <td className="py-3 px-3">
          <button
            onClick={() => onToggleFavorite(coin.id)}
            className="p-1 hover:text-amber-400 text-stone-500 transition-colors"
            title={coin.isFavorite ? 'Favorit entfernen' : 'Zu Favoriten hinzufügen'}
          >
            <Star className={`w-4 h-4 ${coin.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>
        </td>
        <td className="py-3 px-3 font-medium text-stone-100">
          <div className="flex items-center gap-2">
            <div className="relative group/thumb shrink-0">
              <CoinAvatar
                imageUrl={currentDisplayImage}
                name={coin.name}
                faceValue={coin.faceValue}
                currency={coin.currency}
                material={coin.material}
                isBanknote={isBanknote}
                size="sm"
                className={isBanknote ? '!object-contain !object-center' : '!aspect-square !rounded-full !object-contain !object-center'}
                onClick={() => hasBothImages && setShowReverse(!showReverse)}
              />
              {hasBothImages && (
                <button
                  onClick={() => setShowReverse(!showReverse)}
                  className="absolute -top-1 -right-1 bg-[#1a1412] border border-amber-500/80 rounded-full p-0.5 text-amber-400 hover:scale-110 transition-transform"
                  title={showReverse ? 'Zur Vorderseite (Avers)' : 'Zur Rückseite (Revers)'}
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            <div>
              <div className="font-semibold text-stone-100 line-clamp-1 flex items-center gap-1.5">
                {coin.catalogNumber && (
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    #{formatSKU(coin.catalogNumber)}
                  </span>
                )}
                <span>{getCoinTitle(coin)}</span>
                {quantity > 1 && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                    {quantity}x
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${
                  isBanknote ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {isBanknote ? <Banknote className="w-2.5 h-2.5" /> : <Coins className="w-2.5 h-2.5" />}
                  {isBanknote ? 'Banknote' : 'Münze'}
                </span>
                {rarityOpt && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full border font-bold ${rarityOpt.badgeBgClass} ${rarityOpt.badgeTextClass} ${rarityOpt.badgeBorderClass}`}>
                    {rarityOpt.fullLabel}
                  </span>
                )}
                <span>{coin.country}</span>
                <span>•</span>
                <span>{coin.year}</span>
                {coin.storageLocation && (
                  <>
                    <span>•</span>
                    <span className="text-[10px] text-blue-300 bg-blue-500/15 px-1.5 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                      <Folder className="w-2.5 h-2.5" />
                      {coin.storageLocation}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="py-3 px-3">
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${cond.color}`}>
            {cond.label}
          </span>
        </td>
        <td className="py-3 px-3 font-mono text-stone-300">
          {formatCurrency(coin.purchasePrice)}
        </td>
        <td className="py-3 px-3 font-mono font-bold text-amber-400">
          {formatCurrency(coin.currentValue)}
        </td>
        <td className="py-3 px-3 font-mono">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{profitMargin.toFixed(1)}%
          </span>
        </td>
        <td className="py-3 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onViewDetails(coin)}
              className="p-1.5 rounded hover:bg-[#3d2e26] text-stone-400 hover:text-amber-300 transition-colors"
              title="Details anzeigen"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(coin)}
              className="p-1.5 rounded hover:bg-[#3d2e26] text-stone-400 hover:text-amber-300 transition-colors"
              title="Bearbeiten"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(coin)}
                className="p-1.5 rounded hover:bg-[#3d2e26] text-stone-400 hover:text-amber-300 transition-colors"
                title="Münze duplizieren / kopieren"
              >
                <Copy className="w-4 h-4 text-amber-400" />
              </button>
            )}
            <button
              onClick={() => onDelete(coin.id)}
              className="p-1.5 rounded hover:bg-[#3d2e26] text-stone-400 hover:text-rose-400 transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="group relative bg-gradient-to-b from-[#271e19] to-[#1e1713] hover:from-[#2e231d] hover:to-[#221a15] border border-[#3e2e25] hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-amber-950/40 flex flex-col justify-between">
        {/* Top Banner & Action */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold" title="Münznummer / SKU">
              #{formatSKU(coin.catalogNumber || coin.id || '1')}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${cond.color}`}>
              {cond.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(coin)}
                className="p-1.5 rounded-lg bg-[#1a1412]/60 hover:bg-[#3a2c24] text-stone-400 hover:text-amber-300 transition-all"
                title="Münze duplizieren / kopieren"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onToggleFavorite(coin.id)}
              className="p-1.5 rounded-lg bg-[#1a1412]/60 hover:bg-[#3a2c24] text-stone-400 hover:text-amber-400 transition-all"
              title={coin.isFavorite ? 'Favorit entfernen' : 'Zu Favoriten hinzufügen'}
            >
              <Star className={`w-4 h-4 ${coin.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Center Coin Visual Header */}
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="relative shrink-0 group/imgContainer">
            <div className="relative">
              <CoinAvatar
                imageUrl={currentDisplayImage}
                name={getCoinTitle(coin)}
                faceValue={coin.faceValue}
                currency={coin.currency}
                material={coin.material}
                isBanknote={isBanknote}
                size="md"
                className={isBanknote ? '!object-contain !object-center' : '!aspect-square !rounded-full !object-contain !object-center'}
                onClick={() => hasBothImages && setShowReverse(!showReverse)}
              />
              {hasBothImages && (
                <button
                  onClick={() => setShowReverse(!showReverse)}
                  className="absolute -top-1 -right-1 z-10 p-1 rounded-full bg-[#1a1412]/95 border border-amber-400 text-amber-300 hover:text-amber-200 hover:scale-110 shadow-md transition-all"
                  title={showReverse ? 'Zur Vorderseite (Avers)' : 'Zur Rückseite (Revers)'}
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
              {currentDisplayImage && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#140f0d]/90 border border-[#3e2e25] text-[9px] px-1.5 py-0.2 rounded-full text-stone-200 font-mono pointer-events-none shadow-md">
                  {showReverse && coin.reverseImageUrl ? 'Revers' : 'Avers'}
                </span>
              )}
            </div>
            {coin.mintMark && (
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1a1412] border border-amber-500/80 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-400 z-10 shadow-md">
                {coin.mintMark}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
              {getCoinTitle(coin)}
            </h3>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                <MapPin className="w-3 h-3 text-amber-500/80" />
                {coin.country}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Calendar className="w-3 h-3 text-amber-500/80" />
                {coin.year}
              </span>
            </div>
          </div>
        </div>

        {/* Specs Pill Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3 text-[11px] text-slate-400">
          {/* Item Type Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold border ${
            isBanknote ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}>
            {isBanknote ? <Banknote className="w-3 h-3 text-emerald-400" /> : <Coins className="w-3 h-3 text-amber-400" />}
            <span>{isBanknote ? 'Banknote' : 'Münze'}</span>
          </span>

          {/* Quantity Badge if > 1 */}
          {quantity > 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>{quantity}x Stk.</span>
            </span>
          )}

          {/* Rarity Badge */}
          {rarityOpt && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${rarityOpt.badgeBgClass} ${rarityOpt.badgeTextClass} ${rarityOpt.badgeBorderClass}`}>
              <Crown className="w-3 h-3 shrink-0" />
              <span>{rarityOpt.fullLabel}</span>
            </span>
          )}

          {coin.storageLocation && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium truncate max-w-[180px]">
              <Folder className="w-3 h-3 text-blue-400 shrink-0" />
              <span>{coin.storageLocation}</span>
            </span>
          )}

          {/* Sales & Platform Badge */}
          {coin.isSold ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Verkauft ({formatCurrency(coin.soldPrice || coin.currentValue)})</span>
            </span>
          ) : coin.isForSale ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold" title={coin.listingUrl ? 'Zum Angebot verlinkt' : ''}>
              <Tag className="w-3 h-3 text-purple-400 shrink-0" />
              <span>{coin.listingPlatform || 'Eingestellt'}{coin.listingPrice ? `: ${formatCurrency(coin.listingPrice)}` : ''}</span>
            </span>
          ) : null}

          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50">
            {coin.faceValue} {coin.currency}
          </span>
          {coin.material && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300/90 border border-amber-500/20 truncate max-w-[150px]">
              {coin.material}
            </span>
          )}
        </div>
      </div>

      {/* Pricing & ROI Footer */}
      <div className="pt-3 border-t border-slate-800/80 mt-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Kaufpreis</div>
            <div className="font-mono text-xs text-slate-300">
              {formatCurrency(coin.purchasePrice)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-amber-400/90">Aktueller Wert</div>
            <div className="font-mono text-sm font-bold text-amber-300">
              {formatCurrency(coin.currentValue)}
            </div>
          </div>
        </div>

        {/* Profitability Bar */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono mb-3">
          <span className="text-[11px] text-slate-400 font-sans">Gewinn / Verlust:</span>
          <span className={`font-bold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositive ? '+' : ''}{formatCurrency(profit)} ({profitMargin.toFixed(1)}%)
          </span>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          <button
            onClick={() => onViewDetails(coin)}
            className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-amber-300 border border-slate-700/60 transition-colors"
            title="Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Details</span>
          </button>
          <button
            onClick={() => onEdit(coin)}
            className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-amber-300 border border-slate-700/60 transition-colors"
            title="Bearbeiten"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(coin)}
              className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-950/60 text-xs font-medium text-slate-300 hover:text-amber-300 border border-slate-700/60 hover:border-amber-700/50 transition-colors"
              title="Kopieren / Duplizieren"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Kopie</span>
            </button>
          )}
          <button
            onClick={() => onDelete(coin.id)}
            className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-xs font-medium text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-800/50 transition-colors"
            title="Löschen"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Löschen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
