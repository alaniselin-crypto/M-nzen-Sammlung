import React, { useState } from 'react';
import { Download, Upload, RefreshCw, FileSpreadsheet, CheckCircle2, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { Coin } from '../types';
import { exportCoinsToCSV, downloadCSVFile, parseCSVToCoins, downloadCSVTemplate } from '../utils/csv';

interface BackupExportViewProps {
  coins: Coin[];
  onImportCoins: (newCoins: Coin[], replaceExisting: boolean) => void;
  onResetToSampleData: () => void;
  onClearAllCoins?: () => void;
}

export const BackupExportView: React.FC<BackupExportViewProps> = ({
  coins,
  onImportCoins,
  onResetToSampleData,
  onClearAllCoins
}) => {
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');
  const [replaceMode, setReplaceMode] = useState<boolean>(false);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const handleExport = () => {
    const csvData = exportCoinsToCSV(coins);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCSVFile(csvData, `muenzsammlung_backup_${dateStr}.csv`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const { coins: parsedCoins, errors } = parseCSVToCoins(content);

      if (errors.length > 0) {
        setImportErrors(errors);
      }

      if (parsedCoins.length > 0) {
        onImportCoins(parsedCoins, replaceMode);
        setImportSuccessMsg(
          `Erfolgreich ${parsedCoins.length} Münze(n) ${replaceMode ? 'importiert (Sammlung ersetzt)' : 'zu Ihrer Sammlung hinzugefügt'}.`
        );
      } else {
        setImportErrors(prev => [...prev, 'Keine gültigen Münz-Datensätze in der CSV-Datei gefunden.']);
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Title Header */}
      <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-amber-400" />
            Datensicherung & CSV Export / Import
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sichern Sie Ihre Münzdaten lokal als CSV-Datei für Excel, LibreOffice oder stellen Sie Backups wieder her.
          </p>
        </div>

        <button
          onClick={downloadCSVTemplate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all shadow-sm shrink-0"
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span>Muster-CSV Vorlage Herunterladen</span>
        </button>
      </div>

      {/* Main Grid: Export & Import Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-[#181a22] border border-slate-800 hover:border-amber-500/30 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Download className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold font-serif text-slate-100">
                Sammlung als CSV exportieren
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Lädt alle Ihre <span className="text-amber-300 font-bold">{coins.length} Münzen</span> mitsamt Preisen, Notizen, Erhaltungsgraden und Spezifikationen als strukturierte CSV-Tabelle herunter.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1 font-mono">
              <div>Format: UTF-8 CSV (Semikolon-getrennt)</div>
              <div>Kompatibel mit Excel, Google Sheets, LibreOffice</div>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="mt-6 flex items-center justify-center gap-2 w-full py-3 px-4 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>CSV-Backup Jetzt Herunterladen</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-[#181a22] border border-slate-800 hover:border-amber-500/30 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold font-serif text-slate-100">
                CSV-Backup Importieren
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Wählen Sie eine zuvor exportierte CSV-Datei aus, um Münzdaten wiederherzustellen.
              </p>
              <button
                type="button"
                onClick={downloadCSVTemplate}
                className="mt-2 text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                Muster-CSV Vorlage mit Beispiel-Münzen herunterladen
              </button>
            </div>

            {/* Replace / Merge toggle */}
            <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                id="replaceMode"
                checked={replaceMode}
                onChange={e => setReplaceMode(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500/50"
              />
              <label htmlFor="replaceMode" className="text-xs text-slate-300 cursor-pointer">
                Bestehende Sammlung vor dem Import überschreiben
              </label>
            </div>
          </div>

          <label className="mt-6 cursor-pointer flex items-center justify-center gap-2 w-full py-3 px-4 text-xs font-bold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/40 rounded-xl shadow-md transition-all text-center">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>CSV-Datei Auswählen & Importieren</span>
            <input
              type="file"
              accept=".csv, text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Notifications / Feedback Messages */}
      {importSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* Make.com / Integromat Integration Section */}
      <div className="bg-[#181a22] border border-purple-500/30 hover:border-purple-500/50 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-lg">
              M
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif text-purple-200 flex items-center gap-2">
                Make.com (Integromat) Schnittstelle
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatisierter Massen-Import & Synchronisation mit Google Sheets, Excel 365, Ricardo oder Notions via Webhooks.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-semibold">
            Schnittstelle Bereit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
              1. Massen-Import via Make CSV/JSON
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Erstellen Sie in Make.com ein Szenario (z.B. Google Sheets → Custom Webhook), das Datensätze im Standard-CSV- oder JSON-Format an Ihre Sammlung übergibt.
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-purple-200 overflow-x-auto">
              {"{ catalogNumber, name, country, year, condition, faceValue, material: 'Cu-Ni'|'Ag', notes }"}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
              2. Make Webhook Export Trigger
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tragen Sie Ihre Make Custom Webhook URL ein, um alle {coins.length} Münz-Datensätze per Mausklick an Ihr Make.com Szenario zu senden.
            </p>
            <div className="flex gap-2 pt-1">
              <input
                type="url"
                placeholder="https://hook.eu1.make.com/your-custom-webhook"
                id="makeWebhookUrl"
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('makeWebhookUrl') as HTMLInputElement;
                  const url = input?.value?.trim();
                  if (!url) {
                    alert('Bitte geben Sie zuerst eine gültige Make.com Webhook URL ein.');
                    return;
                  }
                  fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'COIN_COLLECTION_EXPORT', totalCoins: coins.length, coins })
                  })
                    .then(res => {
                      if (res.ok) {
                        setImportSuccessMsg(`Daten erfolgreich an Make.com Webhook übermittelt (${coins.length} Datensätze)!`);
                      } else {
                        alert(`Webhook-Antwort: Status ${res.status}`);
                      }
                    })
                    .catch(err => {
                      alert(`Fehler beim Senden an Make Webhook: ${err.message}`);
                    });
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shrink-0"
              >
                An Make Senden
              </button>
            </div>
          </div>
        </div>
      </div>

      {importErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>Hinweise beim Import:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-300/90">
            {importErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Demo Reset & Clear Section */}
      <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold font-serif text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            Sammlung Verwalten & Zurücksetzen
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Löschen Sie die aktuelle Sammlung ({coins.length} Münzen) vollständig oder setzen Sie sie auf Musterdaten zurück.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onClearAllCoins && (
            showConfirmClear ? (
              <div className="flex items-center gap-2 bg-rose-950/90 border border-rose-600/80 rounded-xl p-1.5 animate-fadeIn">
                <span className="text-[11px] text-rose-200 font-medium px-1">Wirklich alle {coins.length} löschen?</span>
                <button
                  onClick={() => {
                    onClearAllCoins();
                    setShowConfirmClear(false);
                    setImportSuccessMsg('Alle Münzen wurden erfolgreich gelöscht.');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow transition-all active:scale-95"
                >
                  Ja, Löschen
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2.5 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-all"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowConfirmClear(true);
                  setShowConfirmReset(false);
                }}
                disabled={coins.length === 0}
                className="px-4 py-2.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 rounded-xl transition-all disabled:opacity-40 shrink-0 shadow-sm"
              >
                🗑️ Alle {coins.length} Münzen Löschen
              </button>
            )
          )}

          {showConfirmReset ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/50 rounded-xl p-1.5 animate-fadeIn">
              <span className="text-[11px] text-amber-200 font-medium px-1">Auf Musterdaten zurücksetzen?</span>
              <button
                onClick={() => {
                  onResetToSampleData();
                  setShowConfirmReset(false);
                  setImportSuccessMsg('Sammlung wurde auf Beispiel-Münzen zurückgesetzt.');
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow transition-all active:scale-95"
              >
                Ja, Zurücksetzen
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-2.5 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-all"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowConfirmReset(true);
                setShowConfirmClear(false);
              }}
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shrink-0"
            >
              Auf Beispiel-Münzen Zurücksetzen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
