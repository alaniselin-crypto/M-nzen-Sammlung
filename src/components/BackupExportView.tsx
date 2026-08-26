import React, { useState } from 'react';
import { Download, Upload, RefreshCw, FileSpreadsheet, CheckCircle2, AlertTriangle, ShieldCheck, FileText, ImagePlus } from 'lucide-react';
import { Coin } from '../types';
import { exportCoinsToCSV, downloadCSVFile, parseCSVToCoins, downloadCSVTemplate, parseImageSideAndBaseName } from '../utils/csv';

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
  const [isImageImporting, setIsImageImporting] = useState<boolean>(false);

  // Compress image file to base64 data URI (max 800px, JPEG 85%)
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let w = img.width, h = img.height;
          if (w > MAX_SIZE || h > MAX_SIZE) {
            if (w > h) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
            else { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${file.name}`));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error(`Datei konnte nicht gelesen werden: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  // Batch image import handler
  const handleBatchImageImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImageImporting(true);
    setImportErrors([]);
    setImportSuccessMsg('');

    try {
      const imageFiles = Array.from(files as FileList).filter((f: File) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        setImportErrors(['Keine Bilddateien gefunden. Bitte wählen Sie JPG, PNG oder WebP Dateien.']);
        setIsImageImporting(false);
        return;
      }

      // Group files by base name (pair front/back)
      const groups = new Map<string, { front?: { file: File; base64: string }; back?: { file: File; base64: string } }>();

      for (const file of imageFiles) {
        try {
          const base64 = await compressImageFile(file);
          const parsed = parseImageSideAndBaseName(file.name);
          const key = parsed.baseKey || file.name.replace(/\.[^.]+$/, '').toLowerCase();

          if (!groups.has(key)) {
            groups.set(key, {});
          }
          const group = groups.get(key)!;

          if (parsed.isReverse) {
            group.back = { file, base64 };
          } else if (group.front) {
            group.back = { file, base64 };
          } else {
            group.front = { file, base64 };
          }
        } catch (err: any) {
          setImportErrors(prev => [...prev, err.message]);
        }
      }

      // Create coins from groups, skipping already imported ones
      const existingKeys = new Set(coins.map(c => (c.rawBaseName || '').toLowerCase()).filter(Boolean));
      const newCoins: Coin[] = [];
      let skippedCount = 0;

      groups.forEach((group, key) => {
        if (existingKeys.has(key.toLowerCase())) {
          skippedCount++;
          return;
        }

        const coin: Coin = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: 'TITEL',
          country: '',
          year: 0,
          faceValue: '',
          currency: '',
          condition: '' as any,
          purchasePrice: 0,
          currentValue: 0,
          purchaseDate: '',
          notes: '',
          imageUrl: group.front?.base64 || '',
          reverseImageUrl: group.back?.base64 || '',
          storageLocation: '',
          catalogNumber: '',
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          itemType: 'coin',
          material: '',
          mintMark: '',
          weight: '',
          diameter: '',
          mintage: '',
          rarity: '',
          rawBaseName: key,
        };
        newCoins.push(coin);
      });

      if (newCoins.length > 0) {
        onImportCoins(newCoins, false); // Always merge, don't replace
        setImportSuccessMsg(
          `✅ ${newCoins.length} neue Münze(n) importiert${skippedCount > 0 ? ` (${skippedCount} bereits vorhandene übersprungen)` : ''}. Öffnen Sie jede neue Münze und klicken Sie "KI-Erkennung".`
        );
      } else if (skippedCount > 0) {
        setImportSuccessMsg(
          `ℹ️ Alle ${skippedCount} ausgewählten Bilder sind bereits in Ihrer Sammlung vorhanden.`
        );
      }
    } catch (err: any) {
      setImportErrors(prev => [...prev, `Fehler beim Import: ${err.message}`]);
    } finally {
      setIsImageImporting(false);
      e.target.value = '';
    }
  };

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

      {/* Batch Image Import Card */}
      <div className="bg-[#181a22] border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ImagePlus className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold font-serif text-emerald-200 flex items-center gap-2">
              📸 Direkter Bilder-Stapelimport
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Wählen Sie Münzbilder direkt von Ihrem Computer oder Smartphone aus. Jedes Bild wird als neue Münze importiert.
              Danach öffnen Sie jede Münze und klicken <strong className="text-emerald-300">"KI-Erkennung"</strong> – die KI füllt alle Felder automatisch aus.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
          <div>✅ Unterstützt: JPG, PNG, WebP, GIF</div>
          <div>✅ Vorder- & Rückseite: Dateien mit <code className="text-emerald-300">_v</code>, <code className="text-emerald-300">_r</code>, <code className="text-emerald-300">_front</code>, <code className="text-emerald-300">_back</code> werden automatisch gepaart</div>
          <div>✅ Bilder werden komprimiert und direkt in der App gespeichert</div>
        </div>

        <label className={`cursor-pointer flex items-center justify-center gap-2 w-full py-3.5 px-4 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 ${
          isImageImporting
            ? 'text-slate-400 bg-slate-800 border border-slate-700 cursor-wait'
            : 'text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 shadow-emerald-500/20'
        }`}>
          {isImageImporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Bilder werden importiert...</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-5 h-5 stroke-[2.5]" />
              <span>Münzbilder Auswählen & Importieren</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleBatchImageImport}
            disabled={isImageImporting}
            className="hidden"
          />
        </label>
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
