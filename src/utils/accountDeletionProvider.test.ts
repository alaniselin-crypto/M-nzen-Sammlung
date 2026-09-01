import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAccountDeletionProvider } from './accountDeletionProvider';

test('resolves the supported provider from Firebase provider data', () => {
  assert.equal(resolveAccountDeletionProvider(['password']), 'password');
  assert.equal(resolveAccountDeletionProvider(['google.com']), 'google.com');
  assert.equal(resolveAccountDeletionProvider(['apple.com']), 'apple.com');
});

test('keeps the established provider priority for linked accounts', () => {
  assert.equal(resolveAccountDeletionProvider(['google.com', 'password']), 'password');
  assert.equal(resolveAccountDeletionProvider(['apple.com', 'google.com']), 'google.com');
});

test('does not guess an unsupported or missing provider', () => {
  assert.equal(resolveAccountDeletionProvider([]), null);
  assert.equal(resolveAccountDeletionProvider(['phone']), null);
});

test('uses the UI provider only when Firebase current-user data is temporarily empty', () => {
  assert.equal(resolveAccountDeletionProvider([], ['apple.com']), 'apple.com');
  assert.equal(resolveAccountDeletionProvider(['google.com'], ['apple.com']), 'google.com');
});
