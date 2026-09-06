import { createRequire } from "node:module";

// Match next build's .env.production[.local] / .env.local loading order.
const requireFromNext = createRequire(import.meta.resolve("next/package.json"));
const { loadEnvConfig } = requireFromNext("@next/env");
loadEnvConfig(process.cwd(), false);

const TESTNET = Object.freeze({
  NEXT_PUBLIC_CHAIN_ID: "46630",
  NEXT_PUBLIC_CHAIN_RPC_URL: "https://rpc.testnet.chain.robinhood.com",
  NEXT_PUBLIC_CHAIN_EXPLORER_URL: "https://explorer.testnet.chain.robinhood.com",
  NEXT_PUBLIC_XBID_FACTORY_ADDRESS: "0x8f9208FD358c62FB4052e4C2FBbCA3152A17E4b6",
  NEXT_PUBLIC_XBID_REGISTRY_ADDRESS: "0x0B68fD82965Fd853907CA4E2f7E6E6d478Aaef8b",
  NEXT_PUBLIC_XBID_RISK_CONTROLLER_ADDRESS: "0xfeebdbB42de39B95f8dE5FcdBDd11e986443c278",
  NEXT_PUBLIC_XBID_FEE_VAULT_ADDRESS: "0x82D9159cB488175cAcdcD145A7285d80563e69d0",
  NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS: "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0",
});

const environment = process.env.XBID_ENVIRONMENT ?? "testnet";
const testnetFlag = process.env.NEXT_PUBLIC_CHAIN_TESTNET ?? "true";
if (!["true", "false"].includes(testnetFlag)) throw new Error("NEXT_PUBLIC_CHAIN_TESTNET must be true or false.");
const chainIsTestnet = testnetFlag === "true";

if (!new Set(["testnet", "mainnet"]).has(environment)) {
  throw new Error("XBID_ENVIRONMENT must be either testnet or mainnet.");
}
if ((environment === "testnet") !== chainIsTestnet) {
  throw new Error("XBID_ENVIRONMENT and NEXT_PUBLIC_CHAIN_TESTNET disagree.");
}

if (environment === "mainnet") {
  const required = [
    "NEXT_PUBLIC_CHAIN_ID",
    "NEXT_PUBLIC_CHAIN_NAME",
    "NEXT_PUBLIC_CHAIN_RPC_URL",
    "NEXT_PUBLIC_CHAIN_EXPLORER_NAME",
    "NEXT_PUBLIC_CHAIN_EXPLORER_URL",
    "NEXT_PUBLIC_XBID_FACTORY_ADDRESS",
    "NEXT_PUBLIC_XBID_REGISTRY_ADDRESS",
    "NEXT_PUBLIC_XBID_RISK_CONTROLLER_ADDRESS",
    "NEXT_PUBLIC_XBID_FEE_VAULT_ADDRESS",
    "NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) throw new Error(`mainnet frontend build must explicitly set: ${missing.join(", ")}`);

  for (const [key, testnetValue] of Object.entries(TESTNET)) {
    const value = process.env[key];
    const matchesTestnet = key.endsWith("_URL") && URL.canParse(value)
      ? new URL(value).hostname.replace(/\.$/, "") === new URL(testnetValue).hostname
      : value?.toLowerCase() === testnetValue.toLowerCase();
    if (matchesTestnet) {
      throw new Error(`mainnet frontend build cannot use the Robinhood Testnet value for ${key}`);
    }
  }

  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error("NEXT_PUBLIC_CHAIN_ID must be a positive safe integer.");
  }
  for (const key of ["NEXT_PUBLIC_CHAIN_RPC_URL", "NEXT_PUBLIC_CHAIN_EXPLORER_URL"]) {
    if (!URL.canParse(process.env[key])) throw new Error(`${key} must be a valid URL.`);
    if (new URL(process.env[key]).protocol !== "https:") throw new Error(`${key} requires HTTPS on mainnet.`);
  }
  const addressPattern = /^0x[0-9a-fA-F]{40}$/;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  for (const key of [
    "NEXT_PUBLIC_XBID_FACTORY_ADDRESS",
    "NEXT_PUBLIC_XBID_REGISTRY_ADDRESS",
    "NEXT_PUBLIC_XBID_RISK_CONTROLLER_ADDRESS",
    "NEXT_PUBLIC_XBID_FEE_VAULT_ADDRESS",
    "NEXT_PUBLIC_XBID_SETTLEMENT_TOKEN_ADDRESS",
  ]) {
    const value = process.env[key];
    if (!addressPattern.test(value) || value.toLowerCase() === zeroAddress) {
      throw new Error(`${key} must be a non-zero EVM address.`);
    }
  }
}

console.log(`public chain configuration passed for ${environment}`);
