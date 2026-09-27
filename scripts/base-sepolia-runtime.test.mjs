import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(relativePath, env, dependencies = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const context = { exports: {}, process: { env }, require: (id) => {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  } };
  vm.runInNewContext(output.outputText, context);
  return context.exports;
}

function configuration(env) {
  const chain = load("../lib/blockchain/chain.ts", env, { viem: { defineChain: (value) => value } });
  return { chain, tokens: load("../lib/blockchain/contracts.ts", env, { "./chain": chain }) };
}

const base = {
  NEXT_PUBLIC_CHAIN_ID: "84532", NEXT_PUBLIC_CHAIN_TESTNET: "true",
  NEXT_PUBLIC_XBID_FACTORY_ADDRESS: `0x${"1".repeat(40)}`,
  NEXT_PUBLIC_XBID_REGISTRY_ADDRESS: `0x${"2".repeat(40)}`,
  NEXT_PUBLIC_XBID_RISK_CONTROLLER_ADDRESS: `0x${"3".repeat(40)}`,
  NEXT_PUBLIC_XBID_FEE_VAULT_ADDRESS: `0x${"4".repeat(40)}`,
  NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

test("Base Sepolia runtime selects its network and disables permissionless mint", () => {
  const { chain, tokens } = configuration(base);
  assert.equal(chain.activeChain.id, 84532);
  assert.equal(chain.activeChain.name, "Base Sepolia");
  assert.equal(chain.activeChain.rpcUrls.default.http[0], "https://sepolia.base.org");
  assert.equal(chain.activeChain.blockExplorers.default.url, "https://sepolia.basescan.org");
  assert.equal(chain.plannedMainnetId, 8453);
  assert.equal(chain.chainFamilyLabel, "Base");
  assert.equal(chain.chainIconPath, "/icons/base-chain.svg");
  assert.equal(tokens.supportsPermissionlessMint, false);
  assert.equal(chain.robinhoodTestnet, chain.activeChain);
});

test("only the existing Robinhood test mock has permissionless mint", () => {
  assert.equal(configuration({}).tokens.supportsPermissionlessMint, true);
  assert.equal(configuration({ NEXT_PUBLIC_CHAIN_TESTNET: "false" }).tokens.supportsPermissionlessMint, false);
  assert.equal(configuration({ NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS: base.NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS }).tokens.supportsPermissionlessMint, false);
  assert.throws(() => configuration({ NEXT_PUBLIC_CHAIN_ID: "84532" }), /explicitly configured/);
});
