import React, { useState } from 'react';
import { Folder, Plus, Edit2, Trash2, Check, X, FolderPlus, Info } from 'lucide-react';
import { Coin } from '../types';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: string[];
  coins: Coin[];
  onAddFolder: (folderName: string) => void;
  onRenameFolder: (oldName: string, newName: string) => void;
  onDeleteFolder: (folderName: string) => void;
}

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  coins,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate coin count for each folder
  const getCoinCount = (folderName: string) => {
    return coins.filter(c => c.storageLocation === folderName).length;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onAddFolder(trimmed);
    setNewFolderName('');
  };

  const startEditing = (folderName: string) => {
    setEditingFolder(folderName);
    setEditValue(folderName);
  };

  const cancelEditing = () => {
    setEditingFolder(null);
    setEditValue('');
  };

  const saveRename = (oldName: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== oldName) {
      onRenameFolder(oldName, trimmed);
    }
    setEditingFolder(null);
    setEditValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#181a22] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        id="folder-manager-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#121318]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-100">
                Lagerorte & Ordner verwalten
              </h2>
              <p className="text-xs text-slate-400">
                Erstellen, umbenennen oder löschen Sie Ihre Aufbewahrungsorte
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

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Form to add a new folder */}
          <form onSubmit={handleAddSubmit} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              ➕ Neuen Ordner oder Lagerort erstellen
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="z.B. Ordner 4 - Goldmünzen, Tresor Fach B"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-semibold text-xs hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Hinzufügen</span>
              </button>
            </div>
          </form>

          {/* List of Folders */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Bestehende Ordner ({folders.length})</span>
              <span className="text-[11px] text-amber-400 font-normal lowercase">Münzen werden auto-aktualisiert</span>
            </h3>

            {folders.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-slate-800/80">
                Keine eigenen Ordner angelegt. Erstellen Sie oben Ihren ersten Lagerort!
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {folders.map(folderName => {
                  const count = getCoinCount(folderName);
                  const isEditing = editingFolder === folderName;
                  const isDeleting = confirmDeleteFolder === folderName;

                  return (
                    <div
                      key={folderName}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors group"
                    >
                      {isDeleting ? (
                        <div className="flex items-center justify-between w-full bg-rose-950/40 p-1.5 rounded-lg border border-rose-500/40 text-xs">
                          <span className="text-rose-200 font-medium">
                            "{folderName}" wirklich löschen? {count > 0 ? `(${count} Münzen betroffen)` : ''}
                          </span>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => {
                                onDeleteFolder(folderName);
                                setConfirmDeleteFolder(null);
                              }}
                              className="px-2.5 py-1 rounded-md bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors"
                            >
                              Löschen
                            </button>
                            <button
                              onClick={() => setConfirmDeleteFolder(null)}
                              className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs transition-colors"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : isEditing ? (
                        <div className="flex items-center space-x-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveRename(folderName);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-amber-500/50 text-sm text-slate-100 focus:outline-none"
                          />
                          <button
                            onClick={() => saveRename(folderName)}
                            title="Speichern"
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            title="Abbrechen"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <FolderPlus className="w-4 h-4 text-amber-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-slate-200 block truncate">
                                {folderName}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {count} {count === 1 ? 'Münze zugeordnet' : 'Münzen zugeordnet'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => startEditing(folderName)}
                              title="Ordner umbenennen (aktualisiert alle Münzen)"
                              className="p-2 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteFolder(folderName)}
                              title="Ordner löschen"
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Tipp zur Automatisierung:</strong> Wenn Sie einen Ordner hier umbenennen (z.B. von <em>"Ordner 1"</em> in <em>"Ordner 1 - Schweiz Vreneli"</em>), werden <strong>automatisch alle zugehörigen Münzen</strong> in der Datenbank auf den neuen Namen aktualisiert!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#121318] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
};
