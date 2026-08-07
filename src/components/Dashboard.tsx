import React from 'react';
import { Coins, TrendingUp, TrendingDown, DollarSign, Award, ArrowRight, ShieldCheck, PieChart as PieIcon, BarChart as BarIcon, Plus } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Coin, TabType } from '../types';
import { CoinAvatar } from './CoinAvatar';
import { formatCurrency, getConditionLabel } from '../utils/storage';

interface DashboardProps {
  coins: Coin[];
  onOpenAddModal: () => void;
  onNavigateToCollection: () => void;
  onViewDetails: (coin: Coin) => void;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({
  coins,
  onOpenAddModal,
  onNavigateToCollection,
  onViewDetails
}) => {
  // Aggregate KPIs
  const totalPositions = coins.length;
  const totalPieces = coins.reduce((acc, c) => acc + (c.quantity || 1), 0);
  const totalCoinsCount = coins.filter(c => (c.itemType || 'coin') === 'coin').reduce((acc, c) => acc + (c.quantity || 1), 0);
  const totalBanknotesCount = coins.filter(c => c.itemType === 'banknote').reduce((acc, c) => acc + (c.quantity || 1), 0);

  const totalValue = coins.reduce((acc, c) => acc + ((c.currentValue || 0) * (c.quantity || 1)), 0);
  const totalCost = coins.reduce((acc, c) => acc + ((c.purchasePrice || 0) * (c.quantity || 1)), 0);
  const profit = totalValue - totalCost;
  const roiPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const isPositive = profit >= 0;

  // Highest value coin
  const sortedByValue = [...coins].sort((a, b) => (b.currentValue * (b.quantity || 1)) - (a.currentValue * (a.quantity || 1)));
  const topCoin = sortedByValue[0];

  // Country breakdown data for Donut Chart
  const countryCounts: Record<string, { count: number; value: number }> = {};
  coins.forEach(c => {
    const country = c.country || 'Unbekannt';
    const qty = c.quantity || 1;
    if (!countryCounts[country]) {
      countryCounts[country] = { count: 0, value: 0 };
    }
    countryCounts[country].count += qty;
    countryCounts[country].value += (c.currentValue || 0) * qty;
  });

  const countryChartData = Object.entries(countryCounts)
    .map(([name, data]) => ({ name, value: Math.round(data.value), count: data.count }))
    .sort((a, b) => b.value - a.value);

  // Condition breakdown data for Bar Chart
  const conditionCounts: Record<string, number> = {};
  coins.forEach(c => {
    const cond = getConditionLabel(c.condition).label;
    const qty = c.quantity || 1;
    conditionCounts[cond] = (conditionCounts[cond] || 0) + qty;
  });

  const conditionChartData = Object.entries(conditionCounts).map(([name, count]) => ({
    name,
    Anzahl: count
  }));

  // Top 4 Valuable Coins for quick spotlight
  const top4Coins = sortedByValue.slice(0, 4);

  return (
    <div className="space-y-8 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2a1f1a] via-[#241c18] to-[#1a1412] p-5 sm:p-6 border border-amber-900/40 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Geprüfter Sammlungsstatus
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-stone-100 tracking-tight">
              Münzkabinett Übersicht
            </h2>
            <p className="text-sm text-stone-400 mt-1 max-w-xl">
              Verwalten Sie Ihre Münzwerte, verfolgen Sie Wertzuwächse und analysieren Sie Ihre Sammlung nach Herkunft und Seltenheit.
            </p>
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-stone-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Münze hinzufügen</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value */}
        <div className="bg-[#241c18] border border-[#3e2e26] hover:border-amber-500/40 rounded-2xl p-5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Gesamtwert</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tracking-tight">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-xs text-stone-400 mt-2 flex items-center justify-between border-t border-[#3e2e26] pt-2">
            <span>Kaufwert:</span>
            <span className="font-mono text-stone-300">{formatCurrency(totalCost)}</span>
          </div>
        </div>

        {/* Profit / ROI */}
        <div className="bg-[#241c18] border border-[#3e2e26] hover:border-amber-500/40 rounded-2xl p-5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Wertentwicklung</span>
            <div className={`p-2 rounded-xl ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{formatCurrency(profit)}
          </div>
          <div className="text-xs text-stone-400 mt-2 flex items-center justify-between border-t border-[#3e2e26] pt-2">
            <span>Rendite (ROI):</span>
            <span className={`font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? '+' : ''}{roiPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Total Items / Pieces */}
        <div className="bg-[#241c18] border border-[#3e2e26] hover:border-amber-500/40 rounded-2xl p-5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Gesamtbestand</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-100 tracking-tight">
            {totalPieces} <span className="text-sm font-sans font-normal text-stone-400">Stück</span>
          </div>
          <div className="text-xs text-stone-400 mt-2 flex items-center justify-between border-t border-[#3e2e26] pt-2">
            <span>Aufteilung:</span>
            <span className="font-semibold text-stone-300">
              🪙 {totalCoinsCount} • 💵 {totalBanknotesCount} ({totalPositions} Pos.)
            </span>
          </div>
        </div>

        {/* Most Valuable Coin */}
        <div className="bg-[#241c18] border border-[#3e2e26] hover:border-amber-500/40 rounded-2xl p-5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Wertvollste Münze</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          {topCoin ? (
            <div>
              <div className="text-sm font-bold text-amber-300 truncate">
                {topCoin.name}
              </div>
              <div className="text-xl font-bold font-mono text-stone-100 mt-1">
                {formatCurrency(topCoin.currentValue)}
              </div>
              <div className="text-xs text-stone-400 mt-2 flex items-center justify-between border-t border-[#3e2e26] pt-2">
                <span>{topCoin.country}</span>
                <span className="font-mono text-stone-300">{topCoin.year}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-stone-500 py-2">Keine Münzen vorhanden</div>
          )}
        </div>
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Breakdown Donut Chart */}
        <div className="bg-[#241c18] border border-[#3e2e26] rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-stone-100 font-serif flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-amber-400" />
                Verteilung nach Herkunftsland
              </h3>
              <p className="text-xs text-stone-400">Kumulierter Marktwert in CHF</p>
            </div>
          </div>

          <div className="h-64 w-full flex-1">
            {countryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={220}>
                <PieChart>
                  <Pie
                    data={countryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {countryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`${val} CHF`, 'Gesamtwert']}
                    contentStyle={{ backgroundColor: '#1a1412', borderColor: '#3e2e26', borderRadius: '12px', color: '#f5f5f4' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', color: '#a8a29e' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-xs">
                Keine Daten zur Erfassung vorhanden
              </div>
            )}
          </div>
        </div>

        {/* Condition Breakdown Bar Chart */}
        <div className="bg-[#241c18] border border-[#3e2e26] rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-stone-100 font-serif flex items-center gap-2">
                <BarIcon className="w-4 h-4 text-amber-400" />
                Anzahl nach Erhaltungsgrad
              </h3>
              <p className="text-xs text-stone-400">PP, Stempelglanz, Vorzüglich etc.</p>
            </div>
          </div>

          <div className="h-64 w-full flex-1">
            {conditionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={220}>
                <BarChart data={conditionChartData}>
                  <XAxis dataKey="name" stroke="#a8a29e" fontSize={11} />
                  <YAxis stroke="#a8a29e" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1412', borderColor: '#3e2e26', borderRadius: '12px', color: '#f5f5f4' }}
                  />
                  <Bar dataKey="Anzahl" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-xs">
                Keine Daten vorhanden
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Valuable Spotlight List */}
      <div className="bg-[#241c18] border border-[#3e2e26] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold font-serif text-stone-100">
              Spitzenwerte der Sammlung
            </h3>
            <p className="text-xs text-stone-400">Die wertvollsten Münzen in Ihrer Kollektion</p>
          </div>

          <button
            onClick={onNavigateToCollection}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>Alle Münzen anzeigen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {top4Coins.map((coin) => {
            const cond = getConditionLabel(coin.condition);
            const isBanknote = coin.itemType === 'banknote' || /banknote|schein|note|papier/i.test(coin.name + ' ' + (coin.material || '') + ' ' + (coin.notes || ''));
            return (
              <div
                key={coin.id}
                onClick={() => onViewDetails(coin)}
                className="group cursor-pointer bg-[#1a1412]/80 hover:bg-[#2e231d] border border-[#3e2e26] hover:border-amber-500/40 rounded-xl p-4 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-2">
                  <CoinAvatar
                    imageUrl={coin.imageUrl || coin.reverseImageUrl}
                    name={coin.name}
                    faceValue={coin.faceValue}
                    currency={coin.currency}
                    material={coin.material}
                    isBanknote={isBanknote}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-stone-200 group-hover:text-amber-300 truncate">
                      {coin.name}
                    </h4>
                    <span className="text-[10px] text-stone-400">
                      {coin.country} ({coin.year})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#3e2e26] text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${cond.color}`}>
                    {cond.label}
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {formatCurrency(coin.currentValue)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
