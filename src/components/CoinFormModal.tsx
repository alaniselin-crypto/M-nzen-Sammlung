import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Sparkles, AlertCircle, Folder, Settings, Hash, Globe, Eye, Lock, Tag, ShoppingBag, ExternalLink, Banknote, Coins, Layers, Crown, Loader2, CheckCircle2 } from 'lucide-react';
import { Coin, CoinCondition } from '../types';
import { CoinAvatar } from './CoinAvatar';
import { formatSKU } from '../utils/storage';
import { WORLD_COUNTRIES, POPULAR_COIN_COUNTRIES } from '../data/countries';
import { POPULAR_CURRENCIES } from '../data/currencies';
import { RARITY_OPTIONS } from '../data/rarities';

interface CoinFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (coinData: Omit<Coin, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  initialCoin?: Coin | null;
  nextCatalogNumber?: string;
  availableFolders?: string[];
  onOpenFolderManager?: () => void;
  availablePlatforms?: string[];
  onOpenPlatformManager?: () => void;
}

const CONDITION_OPTIONS: { value: CoinCondition; label: string }[] = [
  { value: 'ss', label: 'SS - Sehr schön' },
  { value: 'vz', label: 'VZ - Vorzüglich' },
  { value: 'stgl', label: 'UNZ - Unzirkuliert / Stempelglanz' }
];

export const CoinFormModal: React.FC<CoinFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCoin,
  nextCatalogNumber,
  availableFolders = [],
  onOpenFolderManager,
  availablePlatforms = [],
  onOpenPlatformManager
}) => {
  const [formData, setFormData] = useState({
    catalogNumber: initialCoin?.catalogNumber || nextCatalogNumber || '00001',
    itemType: (initialCoin?.itemType || 'coin') as 'coin' | 'banknote',
    quantity: initialCoin?.quantity || 1,
    rarity: initialCoin?.rarity || 'A - Häufig',
    name: '',
    country: '',
    faceValue: '1',
    currency: 'CHF',
    year: new Date().getFullYear(),
    condition: 'vz' as CoinCondition,
    purchasePrice: 0,
    currentValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    storageLocation: '',
    notes: '',
    mintMark: '',
    material: '',
    weight: '',
    diameter: '',
    mintage: '',
    imageUrl: '',
    reverseImageUrl: '',
    isFavorite: false,

    // Sales platform fields
    isForSale: false,
    listingPlatform: '',
    listingPrice: 0,
    listingUrl: '',
    isSold: false,
    soldPrice: 0,
    soldDate: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialCoin) {
      setFormData({
        catalogNumber: formatSKU(initialCoin.catalogNumber) || '00001',
        itemType: initialCoin.itemType || 'coin',
        quantity: initialCoin.quantity || 1,
        rarity: initialCoin.rarity || 'A - Häufig',
        name: initialCoin.name || '',
        country: initialCoin.country || '',
        faceValue: initialCoin.faceValue || '1',
        currency: initialCoin.currency || 'CHF',
        year: initialCoin.year || new Date().getFullYear(),
        condition: initialCoin.condition || 'vz',
        purchasePrice: initialCoin.purchasePrice || 0,
        currentValue: initialCoin.currentValue || 0,
        purchaseDate: initialCoin.purchaseDate || new Date().toISOString().split('T')[0],
        storageLocation: initialCoin.storageLocation || '',
        notes: initialCoin.notes || '',
        mintMark: initialCoin.mintMark || '',
        material: initialCoin.material || '',
        weight: initialCoin.weight || '',
        diameter: initialCoin.diameter || '',
        mintage: initialCoin.mintage || '',
        imageUrl: initialCoin.imageUrl || '',
        reverseImageUrl: initialCoin.reverseImageUrl || '',
        isFavorite: initialCoin.isFavorite || false,

        isForSale: initialCoin.isForSale || false,
        listingPlatform: initialCoin.listingPlatform || '',
        listingPrice: initialCoin.listingPrice || 0,
        listingUrl: initialCoin.listingUrl || '',
        isSold: initialCoin.isSold || false,
        soldPrice: initialCoin.soldPrice || 0,
        soldDate: initialCoin.soldDate || ''
      });
    } else {
      setFormData({
        catalogNumber: formatSKU(nextCatalogNumber) || '00001',
        itemType: 'coin',
        quantity: 1,
        rarity: 'A - Häufig',
        name: '',
        country: '',
        faceValue: '1',
        currency: 'CHF',
        year: new Date().getFullYear(),
        condition: 'vz',
        purchasePrice: 0,
        currentValue: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        storageLocation: '',
        notes: '',
        mintMark: '',
        material: '',
        weight: '',
        diameter: '',
        mintage: '',
        imageUrl: '',
        reverseImageUrl: '',
        isFavorite: false,

        isForSale: false,
        listingPlatform: '',
        listingPrice: 0,
        listingUrl: '',
        isSold: false,
        soldPrice: 0,
        soldDate: ''
      });
    }
    setErrors({});
  }, [initialCoin, nextCatalogNumber, isOpen]);

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiNotesGenerating, setIsAiNotesGenerating] = useState(false);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<'imageUrl' | 'reverseImageUrl' | null>(null);

  const handleAiGenerate = async () => {
    if (!formData.imageUrl && !formData.reverseImageUrl) {
      alert('Bitte laden Sie zuerst mindestens ein Bild (Vorderseite oder Rückseite) hoch, damit die KI das Sammlungsstück rein optisch identifizieren kann.');
      return;
    }

    setIsAiGenerating(true);
    setAiSuccess(null);
    try {
      const res = await fetch('/api/generate-coin-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: formData.imageUrl,
          reverseImageUrl: formData.reverseImageUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler bei der KI-Generierung');
      }

      if (data.title) {
        setFormData(prev => ({
          ...prev,
          name: data.title,
          country: data.country || prev.country,
          year: (data.year && !isNaN(Number(data.year))) ? Number(data.year) : prev.year,
          faceValue: data.faceValue || prev.faceValue,
          currency: data.currency || prev.currency,
          material: data.material || prev.material,
          notes: (!prev.notes || prev.notes === 'Keine') && data.description ? data.description : prev.notes
        }));
        setAiSuccess(`✨ Rein optische KI-Erkennung erfolgreich: ${data.faceValue || ''} ${data.currency || ''} (${data.year || ''})`);
        setTimeout(() => setAiSuccess(null), 6000);
      }
    } catch (err: any) {
      alert(err.message || 'Fehler bei der KI-Generierung');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAiNotesGenerate = async () => {
    setIsAiNotesGenerating(true);
    setAiSuccess(null);
    try {
      const res = await fetch('/api/generate-coin-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          country: formData.country,
          year: formData.year,
          faceValue: formData.faceValue,
          currency: formData.currency,
          itemType: formData.itemType,
          material: formData.material,
          mintMark: formData.mintMark,
          condition: formData.condition,
          notes: formData.notes,
          imageUrl: formData.imageUrl,
          reverseImageUrl: formData.reverseImageUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler bei der KI-Generierung');
      }

      if (data.description || data.title) {
        const text = data.description || `Münze: ${data.title}`;
        setFormData(prev => ({
          ...prev,
          notes: text
        }));
        setAiSuccess('✨ Bemerkungen wurden erfolgreich von KI verfasst!');
        setTimeout(() => setAiSuccess(null), 6000);
      }
    } catch (err: any) {
      alert(err.message || 'Fehler bei der KI-Generierung');
    } finally {
      setIsAiNotesGenerating(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Münzname / Bezeichnung ist ein Pflichtfeld.';
    if (!formData.country.trim()) newErrors.country = 'Herkunftsland ist ein Pflichtfeld.';
    if (!formData.faceValue.trim()) newErrors.faceValue = 'Nennwert ist ein Pflichtfeld.';
    if (!formData.currency.trim()) newErrors.currency = 'Währung ist ein Pflichtfeld.';
    if (isNaN(formData.year) || formData.year < -1000 || formData.year > 2100) {
      newErrors.year = 'Ungültiges Prägejahr.';
    }
    if (isNaN(formData.currentValue) || formData.currentValue < 0) {
      newErrors.currentValue = 'Aktueller Wert muss mindestens 0 sein.';
    }
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      modalContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...(initialCoin?.id ? { id: initialCoin.id } : {}),
      catalogNumber: formData.catalogNumber.trim(),
      itemType: formData.itemType,
      quantity: Math.max(1, Number(formData.quantity) || 1),
      rarity: formData.rarity,
      name: formData.name.trim(),
      country: formData.country.trim(),
      faceValue: formData.faceValue.trim(),
      currency: formData.currency.trim(),
      year: Number(formData.year),
      condition: formData.condition,
      purchasePrice: Number(formData.purchasePrice),
      currentValue: Number(formData.currentValue),
      purchaseDate: formData.purchaseDate,
      storageLocation: formData.storageLocation.trim(),
      notes: formData.notes.trim(),
      mintMark: formData.mintMark.trim(),
      material: formData.material.trim(),
      weight: formData.weight.trim(),
      diameter: formData.diameter.trim(),
      mintage: formData.mintage.trim(),
      imageUrl: formData.imageUrl.trim(),
      reverseImageUrl: formData.reverseImageUrl.trim(),
      isFavorite: formData.isFavorite,

      isForSale: formData.isForSale,
      listingPlatform: formData.listingPlatform.trim(),
      listingPrice: Number(formData.listingPrice) || 0,
      listingUrl: formData.listingUrl.trim(),
      isSold: formData.isSold,
      soldPrice: Number(formData.soldPrice) || 0,
      soldDate: formData.soldDate
    });

    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, targetField: 'imageUrl' | 'reverseImageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('Das Bild ist zu groß (maximal 20MB).');
      return;
    }

    setUploadingField(targetField);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to lightweight JPEG data url (~50-80KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormData(prev => ({ ...prev, [targetField]: compressedDataUrl }));
        }
        setUploadingField(null);
      };
      img.onerror = () => {
        alert('Bild konnte nicht verarbeitet werden.');
        setUploadingField(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-fadeIn max-w-full overflow-x-hidden">
      <div ref={modalContainerRef} className="relative w-full max-w-3xl min-w-0 max-h-[92vh] overflow-y-auto overflow-x-hidden bg-[#221a16] border border-amber-900/40 rounded-2xl shadow-2xl shadow-amber-950/50 text-stone-100 flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6 py-3.5 bg-[#221a16]/95 backdrop-blur-md border-b border-[#3e2e26]">
          <h2 className="text-sm sm:text-lg font-bold font-serif text-amber-400 flex items-center gap-2 min-w-0 pr-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <span className="truncate">{initialCoin ? 'Exemplar bearbeiten' : 'Neues Exemplar zur Sammlung hinzufügen'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg bg-[#1a1412] hover:bg-[#3e2e26] text-stone-400 hover:text-stone-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-5 sm:space-y-6 max-w-full overflow-x-hidden">
          {/* Section 1: Grunddaten */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3 border-b border-slate-800 pb-1">
              1. Grunddaten der Münze
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Katalognummer / Inventarnummer (Gesperrt / Read-Only) */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 min-w-0">
                    <Hash className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="break-words">Automatische Katalognummer / Inventarnummer</span>
                  </label>
                  <span className="text-[10px] sm:text-[11px] text-amber-400/90 font-semibold flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40 shrink-0 self-start sm:self-auto">
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                    Geschützt
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <div className="relative w-full sm:w-44">
                    <input
                      type="text"
                      readOnly
                      value={formData.catalogNumber}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-amber-500/60 text-amber-300 font-mono font-bold text-base shadow-inner cursor-not-allowed focus:outline-none"
                    />
                    <Lock className="w-3.5 h-3.5 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 opacity-70" />
                  </div>
                  <p className="text-xs text-slate-300 flex-1">
                    Eindeutige fortlaufende 5-stellige Warentag-Nummer. Automatisch vergeben und geschützt, um versehentliche Änderungen zu verhindern.
                  </p>
                </div>
              </div>

          {/* Vorderseite (Avers) */}
          <div className="sm:col-span-2 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
            <label className="block text-xs font-semibold text-amber-300 mb-2">
              1. Vorderseite (Avers) - Bild-URL oder Datei
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={formData.imageUrl}
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://beispiel.de/muenze_vorderseite.jpg oder Bild hochladen"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition-colors shrink-0">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{uploadingField === 'imageUrl' ? 'Komprimiere...' : 'Avers hochladen'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleImageUpload(e, 'imageUrl')}
                  className="hidden"
                />
              </label>
            </div>
            {formData.imageUrl && (
              <div className="mt-3 flex flex-col items-center justify-center gap-4 p-3 bg-[#17110e] rounded-xl border border-amber-500/30">
                <CoinAvatar
                  imageUrl={formData.imageUrl}
                  name={formData.name || 'Vorderseite Vorschau'}
                  faceValue={formData.faceValue}
                  currency={formData.currency}
                  material={formData.material}
                  isBanknote={formData.itemType === 'banknote' || /banknote|schein|note|papier/i.test(formData.name + ' ' + (formData.material || '') + ' ' + (formData.notes || ''))}
                  size="lg"
                  className="!w-36 !h-36 sm:!w-44 sm:!h-44 !aspect-square !rounded-full !object-contain !object-center shrink-0"
                />
                <div className="w-full min-w-0 text-center">
                  <p className="text-xs font-bold text-amber-300">Vorderseite (Avers)</p>
                  <p className="text-[11px] text-stone-400 mt-0.5 truncate">Bild bereit & gespeichert</p>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="mt-2 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-800/40 rounded-lg transition-colors"
                  >
                    Bild entfernen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rückseite (Revers) */}
          <div className="sm:col-span-2 p-4 bg-[#1a1412]/80 rounded-2xl border border-[#3e2e26]">
            <label className="block text-xs font-semibold text-amber-300 mb-2">
              2. Rückseite (Revers) - Bild-URL oder Datei
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={formData.reverseImageUrl}
                onChange={e => setFormData({ ...formData, reverseImageUrl: e.target.value })}
                placeholder="https://beispiel.de/muenze_rueckseite.jpg oder Bild hochladen"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#140f0d] border border-[#3e2e26] text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2b211a] hover:bg-[#3d2e26] border border-[#3e2e26] rounded-xl text-xs font-medium text-stone-200 transition-colors shrink-0">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{uploadingField === 'reverseImageUrl' ? 'Komprimiere...' : 'Revers hochladen'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleImageUpload(e, 'reverseImageUrl')}
                  className="hidden"
                />
              </label>
            </div>
            {formData.reverseImageUrl && (
              <div className="mt-3 flex flex-col items-center justify-center gap-4 p-3 bg-[#17110e] rounded-xl border border-amber-500/30">
                <CoinAvatar
                  imageUrl={formData.reverseImageUrl}
                  name={formData.name || 'Rückseite Vorschau'}
                  faceValue={formData.faceValue}
                  currency={formData.currency}
                  material={formData.material}
                  isBanknote={formData.itemType === 'banknote' || /banknote|schein|note|papier/i.test(formData.name + ' ' + (formData.material || '') + ' ' + (formData.notes || ''))}
                  size="lg"
                  className="!w-36 !h-36 sm:!w-44 sm:!h-44 !aspect-square !rounded-full !object-contain !object-center shrink-0"
                />
                <div className="w-full min-w-0 text-center">
                  <p className="text-xs font-bold text-amber-300">Rückseite (Revers)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">Bild bereit & gespeichert</p>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, reverseImageUrl: '' })}
                    className="mt-2 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-800/40 rounded-lg transition-colors"
                  >
                    Bild entfernen
                  </button>
                </div>
              </div>
            )}
          </div>

              {/* Objekt-Typ & Stückanzahl (Quantity) */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 sm:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>Kategorie / Objekt-Typ *</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, itemType: 'coin' })}
                        className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                          formData.itemType === 'coin'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md shadow-amber-950/30'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span>Münze</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, itemType: 'banknote' })}
                        className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                          formData.itemType === 'banknote'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-md shadow-emerald-950/30'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <Banknote className="w-4 h-4 text-emerald-400" />
                        <span>Banknote</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Anzahl baugleicher Stücke (Menge) *</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, quantity: Math.max(1, (formData.quantity || 1) - 1) })}
                        className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-amber-400 font-bold text-base flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono font-bold text-base text-amber-300 focus:outline-none focus:border-amber-500/60"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, quantity: (formData.quantity || 1) + 1 })}
                        className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-amber-400 font-bold text-base flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rarity Selector (Dropdown) */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-purple-400" />
                      <span>Seltenheitsgrad (Rarity)</span>
                    </label>
                  </div>

                  <select
                    value={formData.rarity}
                    onChange={e => setFormData({ ...formData, rarity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-purple-300 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                  >
                    <option value="" disabled>-- Seltenheit auswählen --</option>
                    {RARITY_OPTIONS.map(opt => (
                      <option key={opt.code} value={opt.fullLabel}>
                        {opt.fullLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <span>Münzname / Bezeichnung *</span>
                    <span className="text-[10px] text-rose-400 font-normal">(Pflichtfeld)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={isAiGenerating}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-purple-500/30 transition-all disabled:opacity-50 self-start sm:self-auto"
                  >
                    {isAiGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                        <span>KI analysiert & verfasst...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>✨ Mit KI generieren</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. 5 Franken Vreneli Gold oder 2 Euro Elbphilharmonie"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    errors.name ? 'border-rose-500 bg-rose-950/20' : 'border-slate-800'
                  }`}
                />
                {errors.name && <p className="text-xs font-bold text-rose-400 mt-1">{errors.name}</p>}
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Herkunftsland *</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Tippen oder Auswählen</span>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      list="world-countries-list"
                      value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Land eingeben oder aus Liste wählen..."
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                        errors.country ? 'border-rose-500' : 'border-slate-800'
                      }`}
                    />
                    <datalist id="world-countries-list">
                      {WORLD_COUNTRIES.map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  {/* Popular country quick chips */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Schnellauswahl:</span>
                    {POPULAR_COIN_COUNTRIES.slice(0, 7).map(pop => (
                      <button
                        key={pop}
                        type="button"
                        onClick={() => setFormData({ ...formData, country: pop })}
                        className={`px-2 py-0.5 text-[10px] rounded border transition-all ${
                          formData.country === pop
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                        }`}
                      >
                        {pop}
                      </button>
                    ))}
                  </div>
                </div>
                {errors.country && <p className="text-xs text-rose-400 mt-1">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Prägejahr * <span className="text-[10px] text-rose-400 font-normal">(Pflichtfeld)</span>
                </label>
                <input
                  type="number"
                  value={formData.year === 0 ? '' : formData.year}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, year: val === '' ? 0 : parseInt(val, 10) || 0 });
                  }}
                  placeholder="z.B. 2026 oder 1935"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    errors.year ? 'border-rose-500 bg-rose-950/20' : 'border-slate-800'
                  }`}
                />
                {errors.year && <p className="text-xs font-bold text-rose-400 mt-1">{errors.year}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nennwert *
                </label>
                <input
                  type="text"
                  value={formData.faceValue}
                  onChange={e => setFormData({ ...formData, faceValue: e.target.value })}
                  placeholder="z.B. 5, 2, 1, 10, 1/4"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    errors.faceValue ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.faceValue && <p className="text-xs text-rose-400 mt-1">{errors.faceValue}</p>}
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Währung (Standard: CHF) *
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {['CHF', 'EUR', 'USD', 'ARS', 'GBP', 'CAD'].map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setFormData({ ...formData, currency: curr })}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                          formData.currency === curr
                            ? 'bg-amber-400 text-slate-950 font-extrabold shadow'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                        title={`Auf ${curr} umstellen`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    list="world-currencies-list"
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="Währung eingeben oder auswählen (z.B. CHF, ARS, EUR)..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm font-semibold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      errors.currency ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  <datalist id="world-currencies-list">
                    {POPULAR_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </datalist>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Wählen Sie aus der Liste (inkl. ARS, USD, EUR, etc.) oder tippen Sie eine eigene Währung ein.
                </p>
                {errors.currency && <p className="text-xs text-rose-400 mt-1">{errors.currency}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Erhaltungsgrad *
                </label>
                <select
                  value={formData.condition}
                  onChange={e => setFormData({ ...formData, condition: e.target.value as CoinCondition })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {CONDITION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Validation Error Alert Banner */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/60 text-rose-200 text-xs font-semibold flex items-start gap-3 shadow-lg animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300 text-sm">Speichern nicht möglich – bitte Pflichtfelder ausfüllen!</p>
                <p className="mt-0.5 text-rose-200">Die folgenden rot markierten Pflichtfelder (*) fehlen oder sind ungültig:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-200 font-normal">
                  {errors.name && <li><strong className="text-rose-300 font-bold">Münzname / Bezeichnung</strong></li>}
                  {errors.country && <li><strong className="text-rose-300 font-bold">Herkunftsland</strong></li>}
                  {errors.year && <li><strong className="text-rose-300 font-bold">Prägejahr</strong></li>}
                  {errors.faceValue && <li><strong className="text-rose-300 font-bold">Nennwert</strong></li>}
                  {errors.currency && <li><strong className="text-rose-300 font-bold">Währung</strong></li>}
                  {errors.purchasePrice && <li><strong className="text-rose-300 font-bold">Kaufpreis</strong></li>}
                  {errors.currentValue && <li><strong className="text-rose-300 font-bold">Aktueller Wert</strong></li>}
                </ul>
              </div>
            </div>
          )}

          {/* KI Banner Notification */}
          {aiSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{aiSuccess}</span>
            </div>
          )}

          {/* Section 2: Preise & Werterfassung */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3 border-b border-slate-800 pb-1">
              2. Preise & Finanzielle Bewertung
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Kaufpreis (CHF) <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice === 0 ? '' : formData.purchasePrice}
                  placeholder="0.00"
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setFormData({ ...formData, purchasePrice: 0 });
                    } else {
                      const parsed = parseFloat(raw.replace(',', '.'));
                      setFormData({ ...formData, purchasePrice: isNaN(parsed) ? 0 : parsed });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Aktueller Wert (CHF) * <span className="text-[10px] text-rose-400 font-normal">(Pflichtfeld)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentValue === 0 ? '' : formData.currentValue}
                  placeholder="0.00"
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setFormData({ ...formData, currentValue: 0 });
                    } else {
                      const parsed = parseFloat(raw.replace(',', '.'));
                      setFormData({ ...formData, currentValue: isNaN(parsed) ? 0 : parsed });
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm font-mono text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    errors.currentValue ? 'border-rose-500 bg-rose-950/20' : 'border-slate-800'
                  }`}
                />
                {errors.currentValue && <p className="text-xs font-bold text-rose-400 mt-1">{errors.currentValue}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Kaufdatum
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* Sales & Platforms Section */}
            <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-purple-400 shrink-0" />
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    Verkauf & Verkaufsplattform
                  </h4>
                </div>
                {onOpenPlatformManager && (
                  <button
                    type="button"
                    onClick={onOpenPlatformManager}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center space-x-1 transition-colors self-start sm:self-auto"
                  >
                    <Settings className="w-3 h-3 shrink-0" />
                    <span>Plattformen verwalten</span>
                  </button>
                )}
              </div>

              {/* Toggle switch for isForSale */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-3 min-w-0">
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.isForSale}
                      onChange={e => setFormData({ ...formData, isForSale: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                  <span className="text-xs font-semibold text-purple-200 leading-tight break-words">
                    Münze steht zum Verkauf / auf Verkaufsplattform
                  </span>
                </div>
                {formData.isForSale && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0 self-start sm:self-auto">
                    Aktiv Angeboten
                  </span>
                )}
              </div>

              {formData.isForSale && (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  {/* Platform Selection */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-purple-200">
                        Verkaufsplattform (Eigener Kanal) *
                      </label>
                      <span className="text-[10px] text-slate-400">z.B. Ricardo, eBay, Tutti</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <select
                          value={availablePlatforms.includes(formData.listingPlatform) ? formData.listingPlatform : ''}
                          onChange={e => {
                            if (e.target.value === '__manage__') {
                              if (onOpenPlatformManager) onOpenPlatformManager();
                            } else if (e.target.value) {
                              setFormData({ ...formData, listingPlatform: e.target.value });
                            }
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                        >
                          <option value="" disabled>-- Dropdown: Plattform auswählen --</option>
                          {availablePlatforms.map(p => (
                            <option key={p} value={p}>
                              🏷️ {p}
                            </option>
                          ))}
                          <option value="__manage__" className="text-amber-400 font-semibold">
                            ➕ [Neue Plattform verwalten...]
                          </option>
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={formData.listingPlatform}
                          onChange={e => setFormData({ ...formData, listingPlatform: e.target.value })}
                          placeholder="oder Plattform frei eintippen..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-purple-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                      </div>
                    </div>

                    {/* Quick chips */}
                    {availablePlatforms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Schnellauswahl:</span>
                        {availablePlatforms.slice(0, 7).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({ ...formData, listingPlatform: p })}
                            className={`px-2 py-0.5 text-[10px] rounded border transition-all ${
                              formData.listingPlatform === p
                                ? 'bg-purple-500/30 text-purple-200 border-purple-500/60 font-bold'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Angebotspreis */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Angebotspreis / Inseratpreis ({formData.currency || 'CHF'})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.listingPrice === 0 ? '' : formData.listingPrice}
                        placeholder="0.00"
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setFormData({ ...formData, listingPrice: 0 });
                          } else {
                            const parsed = parseFloat(raw.replace(',', '.'));
                            setFormData({ ...formData, listingPrice: isNaN(parsed) ? 0 : parsed });
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-purple-200 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>

                    {/* Angebots-URL */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Link zum Inserat / Online-Auktion (URL)
                      </label>
                      <input
                        type="url"
                        value={formData.listingUrl}
                        onChange={e => setFormData({ ...formData, listingUrl: e.target.value })}
                        placeholder="https://www.ricardo.ch/de/a/..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                  </div>

                  {/* Status: Verkauft */}
                  <div className="pt-2 border-t border-purple-500/20">
                    <div className="flex items-center space-x-3 bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isSold}
                          onChange={e => setFormData({ ...formData, isSold: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                      <span className="text-xs font-bold text-emerald-300">
                        Münze wurde bereits verkauft ✅
                      </span>
                    </div>

                    {formData.isSold && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 mt-2 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                        <div>
                          <label className="block text-xs font-medium text-emerald-300 mb-1">
                            Verkaufserlös / Verkaufspreis ({formData.currency || 'CHF'})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.soldPrice === 0 ? '' : formData.soldPrice}
                            placeholder="0.00"
                            onFocus={e => e.target.select()}
                            onChange={e => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setFormData({ ...formData, soldPrice: 0 });
                              } else {
                                const parsed = parseFloat(raw.replace(',', '.'));
                                setFormData({ ...formData, soldPrice: isNaN(parsed) ? 0 : parsed });
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-800 text-sm font-mono text-emerald-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-emerald-300 mb-1">
                            Verkaufsdatum
                          </label>
                          <input
                            type="date"
                            value={formData.soldDate}
                            onChange={e => setFormData({ ...formData, soldDate: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-800 text-sm font-mono text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Zusätzliche Merkmale */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3 border-b border-slate-800 pb-1">
              3. Numismatische Details & Lagerort (Optional)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-blue-300">
                    📁 Lagerort / Ordner (Physische Aufbewahrung)
                  </label>
                  {onOpenFolderManager && (
                    <button
                      type="button"
                      onClick={onOpenFolderManager}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center space-x-1 transition-colors"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Ordner verwalten & umbenennen</span>
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div>
                    <select
                      value={availableFolders.includes(formData.storageLocation) ? formData.storageLocation : ''}
                      onChange={e => {
                        if (e.target.value === '__manage__') {
                          if (onOpenFolderManager) onOpenFolderManager();
                        } else if (e.target.value) {
                          setFormData({ ...formData, storageLocation: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                    >
                      <option value="" disabled>-- Dropdown: Ordner auswählen --</option>
                      {availableFolders.map(f => (
                        <option key={f} value={f}>
                          📁 {f}
                        </option>
                      ))}
                      <option value="__manage__" className="text-amber-400 font-semibold">
                        ➕ [Neuen Ordner hinzufügen / verwalten...]
                      </option>
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={formData.storageLocation}
                      onChange={e => setFormData({ ...formData, storageLocation: e.target.value })}
                      placeholder="oder genauen Standort eingeben (z.B. Ordner 1, Fach 3)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-blue-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Wählen Sie einen Ihrer Ordner aus dem Dropdown oder klicken Sie auf <em>"Ordner verwalten"</em>, um Ordner hinzuzufügen und umzubennen.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Material / Legierung
                </label>
                <select
                  value={formData.material}
                  onChange={e => setFormData({ ...formData, material: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">-- Material auswählen --</option>
                  <option value="Cu-Ni">Cu-Ni (Kupfer-Nickel)</option>
                  <option value="Ag">Ag (Silber)</option>
                  {formData.material && formData.material !== 'Cu-Ni' && formData.material !== 'Ag' && (
                    <option value={formData.material}>{formData.material}</option>
                  )}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                    <span>Bemerkungen</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAiNotesGenerate}
                    disabled={isAiNotesGenerating}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-purple-500/30 transition-all disabled:opacity-50 self-start sm:self-auto"
                  >
                    {isAiNotesGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                        <span>KI verfasst Bemerkungen...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>✨ Bemerkungen mit KI verfassen</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ausführliche Bemerkungen, KI-generierte Beschreibung, Historie, Erhaltungsmerkmale, Auktionsnotizen..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFavorite"
                  checked={formData.isFavorite}
                  onChange={e => setFormData({ ...formData, isFavorite: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500/50"
                />
                <label htmlFor="isFavorite" className="text-xs font-semibold text-amber-300 cursor-pointer">
                  Als Favorit in der Sammlung markieren ★
                </label>
              </div>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4 text-slate-950" />
              <span>Speichern</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
