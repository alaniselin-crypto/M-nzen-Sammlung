import React, { useState } from 'react';
import { Download, Upload, RefreshCw, FileSpreadsheet, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Coin } from '../types';
import { exportCoinsToCSV, downloadCSVFile, parseCSVToCoins } from '../utils/csv';

interface BackupExportViewProps {
  coins: Coin[];
  onImportCoins: (newCoins: Coin[], replaceExisting: boolean) => void;
  onResetToSampleData: () => void;
}

export const BackupExportView: React.FC<BackupExportViewProps> = ({
  coins,
  onImportCoins,
  onResetToSampleData
}) => {
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');
  const [replaceMode, setReplaceMode] = useState<boolean>(false);

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
      <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-amber-400" />
          Datensicherung & CSV Export / Import
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Sichern Sie Ihre Münzdaten lokal als CSV-Datei für Excel, LibreOffice oder stellen Sie Backups wieder her.
        </p>
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

      {/* Demo Reset Section */}
      <div className="bg-[#181a22] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold font-serif text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            Musterdaten Wiederherstellen
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Setzt die App auf die vorbereiteten Beispiel-Münzen (Krügerrand, Römischer Denar, Kaiserreich etc.) zurück.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Möchten Sie Ihre aktuelle Sammlung wirklich auf die Beispiel-Münzen zurücksetzen?')) {
              onResetToSampleData();
              setImportSuccessMsg('Sammlung wurde auf Beispiel-Münzen zurückgesetzt.');
            }
          }}
          className="px-4 py-2.5 text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded-xl transition-all shrink-0"
        >
          Auf Beispiel-Daten Zurücksetzen
        </button>
      </div>
    </div>
  );
};
