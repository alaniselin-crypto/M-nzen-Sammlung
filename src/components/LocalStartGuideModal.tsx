import React from 'react';
import { X, Terminal, Code2, Smartphone, Monitor, ShieldCheck, Copy, Check } from 'lucide-react';

interface LocalStartGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalStartGuideModal: React.FC<LocalStartGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const quickStartCmds = `npm install
npm run dev`;

  const handleCopy = () => {
    navigator.clipboard.writeText(quickStartCmds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#181a22] border border-amber-500/30 rounded-2xl shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#181a22]/95 backdrop-blur-md border-b border-slate-800">
          <h2 className="text-lg font-bold font-serif text-amber-400 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            Anleitung: Lokaler Start & Tech-Stack
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Quick Terminal Start */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
              <Monitor className="w-4 h-4 text-amber-400" />
              1. Lokaler Start im Web (Node.js & Vite / React)
            </h3>
            <p className="text-slate-400 text-xs">
              Die Anwendung ist modular in TypeScript, React 19 und Tailwind CSS v4 strukturiert. Führen Sie im Projektverzeichnis folgende Befehle aus:
            </p>

            <div className="relative p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-amber-300 text-xs">
              <pre>{quickStartCmds}</pre>
              <button
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopiert' : 'Kopieren'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Öffnen Sie danach <code className="text-amber-400 font-mono">http://localhost:3000</code> im Browser.
            </p>
          </div>

          {/* Expo React Native Option */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-amber-400" />
              2. Ausführung mit React Native (Expo) ODER Flutter
            </h3>
            <p className="text-slate-400 text-xs">
              Falls Sie die App auf Mobilgeräten via Expo Snack oder Flutter / DartPad ausführen möchten:
            </p>

            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs">
              <li>
                <strong className="text-amber-300">React Native / Expo:</strong> Nutzen Sie <code className="text-amber-400 font-mono">npx create-expo-app</code> und binden Sie die Komponenten (<code className="font-mono">CoinCard</code>, <code className="font-mono">storage.ts</code>) mit <code className="font-mono">AsyncStorage</code> ein.
              </li>
              <li>
                <strong className="text-amber-300">Flutter (Dart):</strong> Erstellen Sie eine Flutter-App mit <code className="text-amber-400 font-mono">sqflite</code> oder <code className="text-amber-400 font-mono">shared_preferences</code> für die lokale SQLite-Datenhaltung.
              </li>
            </ul>
          </div>

          {/* Project Structure Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
              <Code2 className="w-4 h-4 text-amber-400" />
              3. Projektstruktur der erstellten App
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
              <div>/src/types.ts → Typdefinitionen (Coin, CoinCondition, Filter)</div>
              <div>/src/utils/storage.ts → LocalStorage Data Engine & Formatierer</div>
              <div>/src/utils/csv.ts → CSV Export & Import Parser</div>
              <div>/src/components/Header.tsx → Kopfzeile & Gesamtwert</div>
              <div>/src/components/BottomNav.tsx → Bottom-Navigation-Bar</div>
              <div>/src/components/CoinCard.tsx → Münzkarte (Grid & Tabelle)</div>
              <div>/src/components/CoinDetailModal.tsx → Detailansicht</div>
              <div>/src/components/CoinFormModal.tsx → CRUD Hinzufügen / Editieren</div>
              <div>/src/components/Dashboard.tsx → KPIs & Recharts Analysen</div>
              <div>/src/components/CoinList.tsx → Suche, Filter & Sortierung</div>
              <div>/src/components/StatisticsView.tsx → Material- & Epochen-Charts</div>
              <div>/src/components/BackupExportView.tsx → CSV Sichern & Importieren</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex justify-end p-4 bg-[#181a22] border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all"
          >
            Verstanden & Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
