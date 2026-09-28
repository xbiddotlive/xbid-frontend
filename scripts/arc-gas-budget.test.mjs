import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as viem from "viem";

const source = readFileSync(new URL("../lib/blockchain/arc-gas-budget.ts", import.meta.url), "utf8");
const context = { exports: {}, require: (id) => {
  assert.equal(id, "viem");
  return viem;
} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { isArcChain, arcSpendableUnits, getArcGasBudget, assertArcGasBudget } = context.exports;
const account = "0x0000000000000000000000000000000000000001";

test("Arc guard does not affect legacy networks", () => {
  for (const chain of [5042, 5042002]) assert.equal(isArcChain(chain), true);
  for (const chain of [46630, 8453, 84532, 1]) assert.equal(isArcChain(chain), false);
});
test("native balance is floored, reserve rounded up, same USDC never double counted", () => {
  const budget = arcSpendableUnits(10n ** 18n + 999n, 10n ** 9n, 100000n);
  assert.equal(budget.balanceUnits, 1000000n);
  assert.equal(budget.reserveUnits, 125n);
  assert.equal(budget.spendableUnits, 999875n);
  assert.equal(arcSpendableUnits(1n, 1n, 1n).reserveUnits, 1n);
  assert.equal(arcSpendableUnits(1n, 1n, 1n).spendableUnits, 0n);
});
test("invalid gas inputs fail closed", () => {
  for (const inputs of [[-1n, 1n, 1n], [1n, 0n, 1n], [1n, 1n, 0n]]) {
    assert.throws(() => arcSpendableUnits(...inputs), /Invalid/);
  }
});
test("fresh balance and maximum fee bound signing, including exact boundary", async () => {
  let balance = 10n ** 18n;
  const client = { getBalance: async () => balance, estimateFeesPerGas: async () => ({ maxFeePerGas: 10n ** 9n }) };
  const budget = await getArcGasBudget(client, account, 100000n);
  await assertArcGasBudget(client, account, budget.spendableUnits, 100000n);
  await assert.rejects(assertArcGasBudget(client, account, budget.spendableUnits + 1n, 100000n), /USDC for Arc gas/);
  balance = 0n;
  await assert.rejects(assertArcGasBudget(client, account, 0n, 100000n), /USDC for Arc gas/);
  await assert.rejects(getArcGasBudget({ ...client, estimateFeesPerGas: async () => ({}) }, account, 1n), /unavailable/);
});
