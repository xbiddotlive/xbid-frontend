import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as viem from 'viem';

const source = readFileSync(new URL('../lib/product/market-metrics.ts', import.meta.url), 'utf8');
const context = { exports: {}, require: id => { assert.equal(id, 'viem'); return viem; } };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { marketPrices, marketControl } = context.exports;
test('V4 has the same prices and control as V3, including large inventories', () => {
  for (const [a, b] of [[0, 0], [100_000, 0], [0, 100_000], [1_000_000, 950_000], [30_000_000, 0]]) {
    const args = [String(BigInt(a) * 10n ** 18n), String(BigInt(b) * 10n ** 18n)];
    for (const calculate of [marketPrices, marketControl]) {
      assert.deepEqual(calculate(...args, 4), calculate(...args, 3));
      assert.ok(calculate(...args, 4).every(Number.isFinite));
      assert.throws(() => calculate(...args, 5), /unsupported market version/);
    }
  }
});
