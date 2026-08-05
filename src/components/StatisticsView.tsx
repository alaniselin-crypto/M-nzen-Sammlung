import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Award, Layers, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Coin } from '../types';
import { formatCurrency, getConditionLabel } from '../utils/storage';

interface StatisticsViewProps {
  coins: Coin[];
}

const COLOR_PALETTE = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const StatisticsView: React.FC<StatisticsViewProps> = ({ coins }) => {
  const totalCoins = coins.length;
  const totalValue = coins.reduce((acc, c) => acc + (c.currentValue || 0), 0);
  const totalCost = coins.reduce((acc, c) => acc + (c.purchasePrice || 0), 0);
  const profit = totalValue - totalCost;
  const roiPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // Material distribution data
  const materialCounts: Record<string, number> = {};
  coins.forEach(c => {
    const mat = c.material?.trim() || 'Sonstige / Unbekannt';
    materialCounts[mat] = (materialCounts[mat] || 0) + 1;
  });

  const materialData = Object.entries(materialCounts).map(([name, count]) => ({
    name,
    Anzahl: count
  }));

  // Purchase Price vs Current Value comparison by top 6 coins
  const topCoinsComparison = [...coins]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 6)
    .map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
      Kaufpreis: c.purchasePrice,
      AktuellerWert: c.currentValue
    }));

  // Century / Era breakdown
  const eraCounts: Record<string, number> = {};
  coins.forEach(c => {
    let era = 'Modern (2000+)';
    if (c.year < 500) era = 'Antike (vor 500 n.Chr.)';
    else if (c.year < 1500) era = 'Mittelalter (500-1500)';
    else if (c.year < 1800) era = 'Neuzeit (1500-1800)';
    else if (c.year < 1900) era = '19. Jahrhundert';
    else if (c.year < 2000) era = '20. Jahrhundert';

    eraCounts[era] = (eraCounts[era] || 0) + 1;
  });

  const eraData = Object.entries(eraCounts).map(([name, count]) => ({
    name,
    Anzahl: count
  }));

  return (
    <div className="space-y-8 animate-fadeIn pb-12 max-w-full overflow-x-hidden">
      {/* Title Header */}
      <div className="bg-[#241c18] border border-[#3e2e26] rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-400" />
          Tiefenanalyse der Münzsammlung
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          Visualisierte Auswertungen zu Materialverteilung, Epochen und finanziellen Vergleichen.
        </p>
      </div>

      {/* Top Stat Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs uppercase font-semibold text-slate-400">Gesamte Portfolio-Rendite</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {profit >= 0 ? '+' : ''}{roiPercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Absoluter Gewinn: <span className="font-mono text-slate-200">{formatCurrency(profit)}</span>
          </div>
        </div>

        <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs uppercase font-semibold text-slate-400">Durchschnittlicher Kaufwert</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {formatCurrency(totalCoins > 0 ? totalCost / totalCoins : 0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Pro Münzexemplar
          </div>
        </div>

        <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="text-xs uppercase font-semibold text-slate-400">Durchschnittlicher Marktwert</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(totalCoins > 0 ? totalValue / totalCoins : 0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Pro Münzexemplar
          </div>
        </div>
      </div>

      {/* Chart Row 1: Purchase vs Current Value Bar Comparison */}
      <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-bold text-slate-100 font-serif mb-1 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-400" />
          Kaufpreis vs. Aktueller Wert (Top 6 Münzen)
        </h3>
        <p className="text-xs text-slate-400 mb-4">Vergleich des Anschaffungspreises mit dem geschätzten Marktwert</p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCoinsComparison}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                formatter={(val: number) => [`${val} CHF`, '']}
                contentStyle={{ backgroundColor: '#121318', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
              />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
              <Bar dataKey="Kaufpreis" fill="#64748b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="AktuellerWert" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart Row 2: Era and Material Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Era Distribution */}
        <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-base font-bold text-slate-100 font-serif mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Verteilung nach Zeitalter / Epoche
          </h3>
          <p className="text-xs text-slate-400 mb-4">Anzahl der Münzen nach historischen Epochen</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eraData} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#121318', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Bar dataKey="Anzahl" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Material Distribution Donut */}
        <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-base font-bold text-slate-100 font-serif mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Material & Edelmetall-Anteile
          </h3>
          <p className="text-xs text-slate-400 mb-4">Aufteilung nach Gold, Silber, Bimetall etc.</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={materialData}
                  dataKey="Anzahl"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {materialData.map((_, index) => (
                    <Cell key={`mat-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#121318', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
