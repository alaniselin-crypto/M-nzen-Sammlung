import React from 'react';
import type { AppleStoreKitProductPresentation } from '../utils/appleStoreKit';
import type { AppleProProductId } from '../utils/appleProPurchaseCoordinator';

interface ProSubscriptionModalProps {
  isOpen: boolean;
  products: AppleStoreKitProductPresentation[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPurchase: (productId: AppleProProductId) => void;
  onRestore: () => void;
}

export const ProSubscriptionModal: React.FC<ProSubscriptionModalProps> = ({
  isOpen,
  products,
  loading,
  busy,
  error,
  onClose,
  onPurchase,
  onRestore,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="pro-subscription-title" className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#241c18] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="pro-subscription-title" className="text-xl font-bold text-amber-400">INUMIS Pro</h2>
            <p className="mt-1 text-sm text-stone-300">Cloud-Synchronisation auf iPhone und Mac.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Schließen" className="text-stone-400 hover:text-white disabled:opacity-50">✕</button>
        </div>

        <div className="mt-5 space-y-3">
          {loading && <p className="text-sm text-stone-400">App-Store-Angebote werden geladen …</p>}
          {!loading && products.map(product => (
            <button
              key={product.productId}
              type="button"
              disabled={busy}
              onClick={() => onPurchase(product.productId)}
              className="flex w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left hover:bg-amber-500/20 disabled:opacity-50"
            >
              <span className="font-medium text-stone-100">{product.displayName}</span>
              <span className="font-bold text-amber-400">{product.displayPrice}</span>
            </button>
          ))}
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </div>

        <button type="button" disabled={busy || loading} onClick={onRestore} className="mt-5 w-full rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-200 hover:bg-stone-700/40 disabled:opacity-50">
          Käufe wiederherstellen
        </button>
      </div>
    </div>
  );
};
