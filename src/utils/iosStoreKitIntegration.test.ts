import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sceneDelegateUrl = new URL('../../ios/App/App/SceneDelegate.swift', import.meta.url);

test('installs the StoreKit-registering bridge controller for scene-based iOS launches', async () => {
  const source = await readFile(sceneDelegateUrl, 'utf8');

  assert.match(source, /rootViewController\s*=\s*MyViewController\(\)/);
  assert.doesNotMatch(source, /rootViewController\s*=\s*CAPBridgeViewController\(\)/);
});
