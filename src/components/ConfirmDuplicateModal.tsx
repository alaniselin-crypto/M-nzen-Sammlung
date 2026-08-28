import React from 'react';
import { Copy, X } from 'lucide-react';

interface ConfirmDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDuplicateModal: React.FC<ConfirmDuplicateModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-duplicate-title"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-amber-500/40 bg-[#181a22] text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-amber-950/20 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Copy className="h-5 w-5" />
            </div>
            <h2 id="confirm-duplicate-title" className="font-serif text-base font-bold text-amber-200">
              Münze duplizieren?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            aria-label="Abbrechen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-5 py-6 text-sm leading-relaxed text-slate-300">
          Es wird eine neue Münze mit einer neuen Inventarnummer erstellt.
        </p>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-[#121318] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition-all hover:from-amber-400 hover:to-amber-500"
          >
            <Copy className="h-4 w-4" />
            <span>Duplizieren</span>
          </button>
        </div>
      </div>
    </div>
  );
};
