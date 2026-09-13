import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProSubscriptionModal } from './ProSubscriptionModal.tsx';

const products = [
  {
    productId: 'com.alaniselin.numisma.pro.monthly' as const,
    displayName: 'INUMIS Pro Monatlich',
    displayPrice: '4,99 €',
  },
  {
    productId: 'com.alaniselin.numisma.pro.yearly' as const,
    displayName: 'INUMIS Pro Jährlich',
    displayPrice: '49,99 €',
  },
];

test('renders App Store products and restore action in the Pro subscription modal', () => {
  const markup = renderToStaticMarkup(
    <ProSubscriptionModal
      isOpen
      products={products}
      loading={false}
      busy={false}
      error={null}
      onClose={() => {}}
      onPurchase={() => {}}
      onRestore={() => {}}
    />,
  );

  assert.match(markup, /INUMIS Pro Monatlich/);
  assert.match(markup, /4,99 €/);
  assert.match(markup, /INUMIS Pro Jährlich/);
  assert.match(markup, /49,99 €/);
  assert.match(markup, /Käufe wiederherstellen/);
});

test('renders nothing while the Pro subscription modal is closed', () => {
  const markup = renderToStaticMarkup(
    <ProSubscriptionModal
      isOpen={false}
      products={products}
      loading={false}
      busy={false}
      error={null}
      onClose={() => {}}
      onPurchase={() => {}}
      onRestore={() => {}}
    />,
  );

  assert.equal(markup, '');
});
