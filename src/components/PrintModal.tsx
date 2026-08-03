import React from 'react';
import { X, Printer, ExternalLink, Coins, Banknote, FileText } from 'lucide-react';
import { Coin } from '../types';
import { formatCurrency } from '../utils/storage';
import { getRarityOption } from '../data/rarities';

interface PrintModalProps {
  isOpen: boolean;
  coins: Coin[];
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({ isOpen, coins, onClose }) => {
  if (!isOpen) return null;

  const totalPositions = coins.length;
  const totalPieces = coins.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const totalCost = coins.reduce((sum, c) => sum + ((c.purchasePrice || 0) * (c.quantity || 1)), 0);
  const totalValue = coins.reduce((sum, c) => sum + ((c.currentValue || 0) * (c.quantity || 1)), 0);

  const handleOpenNewWindowAndPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = coins.map((coin, index) => {
      const rarityOpt = getRarityOption(coin.rarity);
      const rarityLabel = rarityOpt ? rarityOpt.fullLabel : (coin.rarity || '-');
      const isBanknote = coin.itemType === 'banknote';
      const qty = coin.quantity || 1;
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';

      return `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; color: #1e293b;">#${coin.catalogNumber || '---'}</td>
          <td style="padding: 6px 8px; color: #334155;">${isBanknote ? '💵 Banknote' : '🪙 Münze'}</td>
          <td style="padding: 6px 8px; font-weight: bold; text-align: center; color: #0f172a;">${qty}</td>
          <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${coin.name}</td>
          <td style="padding: 6px 8px; color: #334155;">${coin.country || '-'} (${coin.year || '-'})</td>
          <td style="padding: 6px 8px; color: #334155;">${coin.faceValue || '-'} ${coin.currency || ''}</td>
          <td style="padding: 6px 8px; color: #334155;">${coin.condition || '-'}</td>
          <td style="padding: 6px 8px; color: #334155; font-size: 11px;">${rarityLabel}</td>
          <td style="padding: 6px 8px; color: #475569;">${coin.storageLocation || '-'}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #334155;">${formatCurrency(coin.purchasePrice || 0)}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">${formatCurrency(coin.currentValue || 0)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <title>Numismatischer Bestandskatalog - ${new Date().toLocaleDateString('de-CH')}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 15px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 4px 0;
          }
          .subtitle {
            font-size: 11px;
            color: #64748b;
            margin: 0;
          }
          .stats {
            text-align: right;
            font-size: 11px;
          }
          .stats-val {
            font-weight: bold;
            font-family: monospace;
            font-size: 13px;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            background-color: #f1f5f9;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #0f172a;
            padding: 8px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #334155;
          }
          tfoot tr {
            background-color: #e2e8f0;
            border-top: 2px solid #0f172a;
            font-weight: bold;
          }
          tfoot td {
            padding: 8px;
          }
          @media print {
            .no-print-btn { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 15px;" class="no-print-btn">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
            🖨️ Druckdialog jetzt öffnen / als PDF speichern
          </button>
        </div>

        <div class="header">
          <div>
            <h1 class="title">Numismatische Sammlung & Bestandskatalog</h1>
            <p class="subtitle">
              Gedruckt am: ${new Date().toLocaleDateString('de-CH')} um ${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
              • Enthaltene Positionen: ${totalPositions} (${totalPieces} Stk.)
            </p>
          </div>
          <div class="stats">
            <div>Gesamtwert: <span class="stats-val">${formatCurrency(totalValue)}</span></div>
            <div style="color: #64748b;">Anschaffung: ${formatCurrency(totalCost)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID #</th>
              <th>Typ</th>
              <th style="text-align: center;">Stk.</th>
              <th>Bezeichnung</th>
              <th>Land (Jahr)</th>
              <th>Nominal</th>
              <th>Erhaltung</th>
              <th>Rarity</th>
              <th>Lagerort</th>
              <th style="text-align: right;">Kaufpreis</th>
              <th style="text-align: right;">Schätzwert</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">TOTAL</td>
              <td style="text-align: center;">${totalPieces}</td>
              <td colspan="6" style="text-align: right; color: #475569;">${totalPositions} Positionen insgesamt</td>
              <td style="text-align: right; font-family: monospace;">${formatCurrency(totalCost)}</td>
              <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a;">${formatCurrency(totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-[#181a22] border border-amber-500/30 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]"
        id="print-preview-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#121318] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-slate-100 flex items-center gap-2">
                <span>Druckansicht & Katalog-Export</span>
                <span className="text-xs font-mono font-normal bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {totalPositions} Positionen / {totalPieces} Stk.
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Übersichtliche Vorschau Ihrer gefilterten Münzen und Banknoten.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenNewWindowAndPrint}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In neuem Druck-Fenster öffnen / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Document Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/50">
          <div className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 shadow-xl border border-slate-300 max-w-full font-sans">
            {/* Catalog Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-slate-900 pb-4 mb-4 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Numismatische Sammlung & Bestandskatalog
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Erstellt am: {new Date().toLocaleDateString('de-CH')} • {totalPositions} Positionen ({totalPieces} Stück)
                </p>
              </div>
              <div className="sm:text-right text-xs">
                <div className="font-bold text-sm text-slate-900 font-mono">
                  Gesamtwert: {formatCurrency(totalValue)}
                </div>
                <div className="text-slate-600 font-mono">
                  Anschaffungskosten: {formatCurrency(totalCost)}
                </div>
              </div>
            </div>

            {/* Catalog Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 text-[10px] uppercase font-bold text-slate-700">
                    <th className="p-2 border border-slate-300">ID #</th>
                    <th className="p-2 border border-slate-300">Typ</th>
                    <th className="p-2 border border-slate-300 text-center">Stk.</th>
                    <th className="p-2 border border-slate-300">Bezeichnung</th>
                    <th className="p-2 border border-slate-300">Land (Jahr)</th>
                    <th className="p-2 border border-slate-300">Nominal</th>
                    <th className="p-2 border border-slate-300">Erhaltung</th>
                    <th className="p-2 border border-slate-300">Rarity</th>
                    <th className="p-2 border border-slate-300">Lagerort</th>
                    <th className="p-2 border border-slate-300 text-right">Kaufpreis</th>
                    <th className="p-2 border border-slate-300 text-right">Schätzwert</th>
                  </tr>
                </thead>
                <tbody>
                  {coins.map((coin, idx) => {
                    const rarityOpt = getRarityOption(coin.rarity);
                    const isBanknote = coin.itemType === 'banknote';
                    return (
                      <tr key={coin.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-slate-900">
                          #{coin.catalogNumber || '---'}
                        </td>
                        <td className="p-2 border border-slate-300">
                          {isBanknote ? '💵 Banknote' : '🪙 Münze'}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold text-slate-900">
                          {coin.quantity || 1}
                        </td>
                        <td className="p-2 border border-slate-300 font-bold text-slate-900">
                          {coin.name}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-800">
                          {coin.country} {coin.year ? `(${coin.year})` : ''}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-800">
                          {coin.faceValue} {coin.currency}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-800">
                          {coin.condition || '-'}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-800 font-medium">
                          {rarityOpt ? rarityOpt.fullLabel : (coin.rarity || '-')}
                        </td>
                        <td className="p-2 border border-slate-300 text-slate-700">
                          {coin.storageLocation || '-'}
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono text-slate-700">
                          {formatCurrency(coin.purchasePrice || 0)}
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(coin.currentValue || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200 border-t-2 border-slate-900 font-bold text-slate-900">
                    <td colSpan={2} className="p-2 border border-slate-300">TOTAL</td>
                    <td className="p-2 border border-slate-300 text-center">{totalPieces}</td>
                    <td colSpan={6} className="p-2 border border-slate-300 text-right font-normal text-slate-700">
                      {totalPositions} Positionen insgesamt
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono">
                      {formatCurrency(totalCost)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono text-sm text-slate-900">
                      {formatCurrency(totalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#121318] flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            Tipp: Klicken Sie oben auf <strong className="text-amber-300 font-semibold">"In neuem Druck-Fenster öffnen"</strong> für beste Druckergebnisse und Speichern als PDF.
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Schliessen
            </button>
            <button
              onClick={handleOpenNewWindowAndPrint}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Drucken / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
