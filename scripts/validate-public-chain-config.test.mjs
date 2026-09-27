import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./validate-public-chain-config.mjs", import.meta.url));
const mainnet = {
  XBID_ENVIRONMENT: "mainnet", NEXT_PUBLIC_CHAIN_TESTNET: "false", NEXT_PUBLIC_CHAIN_ID: "4663",
  NEXT_PUBLIC_CHAIN_NAME: "Robinhood", NEXT_PUBLIC_CHAIN_RPC_URL: "https://rpc.mainnet.example",
  NEXT_PUBLIC_CHAIN_EXPLORER_NAME: "Explorer", NEXT_PUBLIC_CHAIN_EXPLORER_URL: "https://explorer.mainnet.example",
  NEXT_PUBLIC_XBID_FACTORY_ADDRESS: "0x1111111111111111111111111111111111111111",
  NEXT_PUBLIC_XBID_REGISTRY_ADDRESS: "0x2222222222222222222222222222222222222222",
  NEXT_PUBLIC_XBID_RISK_CONTROLLER_ADDRESS: "0x3333333333333333333333333333333333333333",
  NEXT_PUBLIC_XBID_FEE_VAULT_ADDRESS: "0x4444444444444444444444444444444444444444",
  NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS: "0x5555555555555555555555555555555555555555",
};

test("Base Sepolia build rejects cross-chain defaults and mock settlement tokens", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "xbid-base-build-guard-"));
  const baseSepolia = {
    ...mainnet, XBID_ENVIRONMENT: "testnet", NEXT_PUBLIC_CHAIN_TESTNET: "true", NEXT_PUBLIC_CHAIN_ID: "84532",
    NEXT_PUBLIC_CHAIN_NAME: "Base Sepolia", NEXT_PUBLIC_CHAIN_RPC_URL: "https://sepolia.base.org",
    NEXT_PUBLIC_CHAIN_EXPLORER_NAME: "Basescan", NEXT_PUBLIC_CHAIN_EXPLORER_URL: "https://sepolia.basescan.org",
    NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  };
  const run = (env) => spawnSync(process.execPath, [script], { cwd, env: { PATH: process.env.PATH, NODE_ENV: "production", ...env }, encoding: "utf8" });
  try {
    assert.equal(run(baseSepolia).status, 0);
    for (const key of Object.keys(baseSepolia).filter((key) => key.includes("_ADDRESS") || key === "NEXT_PUBLIC_CHAIN_RPC_URL")) {
      assert.notEqual(run({ ...baseSepolia, [key]: "" }).status, 0);
    }
    for (const override of [
      { NEXT_PUBLIC_CHAIN_ID: "8453" },
      { NEXT_PUBLIC_CHAIN_RPC_URL: "https://rpc.testnet.chain.robinhood.com./" },
      { NEXT_PUBLIC_XBID_FACTORY_ADDRESS: "0x8f9208FD358c62FB4052e4C2FBbCA3152A17E4b6" },
      { NEXT_PUBLIC_XBID_FACTORY_ADDRESS: `0x${"0".repeat(40)}` },
      { NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS: mainnet.NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS },
    ]) assert.notEqual(run({ ...baseSepolia, ...override }).status, 0);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test("build guard validates the same local production env files as Next", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "xbid-build-guard-"));
  const run = (env = {}) => spawnSync(process.execPath, [script], {
    cwd, env: { PATH: process.env.PATH, NODE_ENV: "production", ...env }, encoding: "utf8",
  });
  try {
    assert.equal(run(mainnet).status, 0);
    for (const value of ["https://rpc.testnet.chain.robinhood.com/", "https://rpc.testnet.chain.robinhood.com./path", "http://mainnet.example"]) {
      assert.notEqual(run({ ...mainnet, NEXT_PUBLIC_CHAIN_RPC_URL: value }).status, 0);
    }
    assert.notEqual(run({ ...mainnet, NEXT_PUBLIC_CHAIN_TESTNET: "False" }).status, 0);
    const invalidFileConfig = { ...mainnet, NEXT_PUBLIC_CHAIN_RPC_URL: "https://rpc.testnet.chain.robinhood.com/path" };
    await writeFile(join(cwd, ".env.production.local"), Object.entries(invalidFileConfig).map(([key, value]) => `${key}=${value}`).join("\n"));
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot use the Robinhood Testnet value/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
