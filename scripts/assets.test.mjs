import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/api/assets.ts', import.meta.url), 'utf8');
const context = { exports: {}, URL };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { displayAssetUrl } = context.exports;
const hash = `0x${'ab'.repeat(32)}`;
test('historical and direct uploaded logo URLs use the current backend', () => {
  for (const path of [`/v1/assets/${hash}`, `/api/backend/v1/assets/${hash}`]) {
    assert.equal(displayAssetUrl(`https://testnet.xbid.live${path}`), `/api/backend/v1/assets/${hash}`);
    assert.equal(displayAssetUrl(path), `/api/backend/v1/assets/${hash}`);
  }
});
test('unrelated images and invalid asset hashes are unchanged', () => {
  for (const url of [undefined, '', 'https://example.com/logo.png', '/api/backend/v1/assets/0x123']) {
    assert.equal(displayAssetUrl(url), url);
  }
});
