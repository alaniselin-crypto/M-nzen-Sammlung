import assert from 'node:assert/strict';
import test from 'node:test';
import { Coin } from '../types';
import {
  ensureLocalCatalogNumberCounter,
  getHighestCatalogNumber,
  reserveNextLocalCatalogNumber,
} from './catalogNumberCounter';

const coin = (catalogNumber: string): Coin => ({
  id: `coin-${catalogNumber}`,
  catalogNumber,
  name: `Test ${catalogNumber}`,
  country: 'Schweiz',
  faceValue: '1',
  currency: 'CHF',
  year: 2026,
  condition: 'vz',
  purchasePrice: 0,
  currentValue: 0,
  purchaseDate: '2026-08-28',
  notes: '',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
});

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test('deleted highest catalog number remains consumed after restart', () => {
  const storage = new MemoryStorage();
  const key = 'counter:test-user';
  const existing = [coin('00041'), coin('00042'), coin('00043')];

  const firstNewNumber = reserveNextLocalCatalogNumber(storage, key, existing);
  assert.equal(firstNewNumber, '00044');

  const afterDeletingHighest = existing;
  const numberAfterRestart = reserveNextLocalCatalogNumber(storage, key, afterDeletingHighest);
  assert.equal(numberAfterRestart, '00045');
  assert.equal(getHighestCatalogNumber(afterDeletingHighest), 43);
});

test('counter initializes safely from the highest existing catalog number', () => {
  const storage = new MemoryStorage();
  const number = reserveNextLocalCatalogNumber(
    storage,
    'counter:test-user',
    [coin('00009'), coin('00043'), coin('invalid')],
  );

  assert.equal(number, '00044');
});

test('deleting the preexisting highest number cannot make it reusable', () => {
  const storage = new MemoryStorage();
  const key = 'counter:test-user';
  const beforeDelete = [coin('00041'), coin('00042'), coin('00043')];

  ensureLocalCatalogNumberCounter(storage, key, beforeDelete);
  const afterDelete = beforeDelete.filter(item => item.catalogNumber !== '00043');

  assert.equal(reserveNextLocalCatalogNumber(storage, key, afterDelete), '00044');
});
