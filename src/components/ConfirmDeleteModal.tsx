import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Coin } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  coin: Coin | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  coin,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !coin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#181a22] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100"
        id="confirm-delete-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-rose-950/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-rose-200">
                Münze wirklich löschen?
              </h2>
              <p className="text-xs text-slate-400">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            {coin.imageUrl ? (
              <img
                src={coin.imageUrl}
                alt={coin.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/40 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 shrink-0 font-bold text-xs">
                {coin.catalogNumber ? `#${coin.catalogNumber}` : 'Münze'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs text-amber-400 font-mono font-semibold">
                #{coin.catalogNumber || '---'}
              </div>
              <div className="text-sm font-bold text-slate-100 truncate">
                {coin.name}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {coin.country} {coin.year ? `• ${coin.year}` : ''} {coin.faceValue ? `• ${coin.faceValue} ${coin.currency}` : ''}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Soll die Münze <strong className="text-rose-300">"{coin.name}"</strong> dauerhaft aus Ihrer Sammlung gelöscht werden?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#121318] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center space-x-1.5 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Münze jetzt löschen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
