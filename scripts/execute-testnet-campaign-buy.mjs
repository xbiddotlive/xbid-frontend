import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  http,
  parseUnits,
  parseAbi,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const CHAIN_ID = 46630;
const API_ORIGIN = "https://testnet.xbid.live/api/backend";
const SETTLEMENT_TOKEN = "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0";

const tokenAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "balance", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "amount", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "ok", type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "account", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
];

const marketAbi = [
  {
    type: "function",
    name: "previewBuy",
    stateMutability: "view",
    inputs: [{ name: "side", type: "uint8" }, { name: "grossInputUnits", type: "uint256" }],
    outputs: [{
      name: "result",
      type: "tuple",
      components: [
        { name: "feeUnits", type: "uint256" },
        { name: "curveInputUnits", type: "uint256" },
        { name: "tokenOutputWei", type: "uint256" },
        { name: "qAAfterWei", type: "uint256" },
        { name: "qBAfterWei", type: "uint256" },
        { name: "reserveAfterUnits", type: "uint256" },
      ],
    }],
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "grossInputUnits", type: "uint256" },
      { name: "minimumTokenOutputWei", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "referrer", type: "address" },
    ],
    outputs: [{ name: "tokenOutputWei", type: "uint256" }],
  },
];

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]] : [];
  }));
}

async function apiContest(contestId) {
  const response = await fetch(`${API_ORIGIN}/v1/chains/${CHAIN_ID}/contests/${contestId}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Contest API failed (${response.status}).`);
  return response.json();
}

function marketSnapshot(contest) {
  return {
    qAWei: contest.market?.qAWei ?? "0",
    qBWei: contest.market?.qBWei ?? "0",
    reserveUnits: contest.market?.reserveUnits ?? "0",
    volume24hUnits: contest.market?.volume24hUnits ?? "0",
    tradeCount24h: contest.market?.tradeCount24h ?? "0",
    updatedBlock: contest.market?.updatedBlock ?? "0",
  };
}

function control(qAWei, qBWei) {
  const x = Number(formatUnits(qAWei, 18)) / 150_000;
  const y = Number(formatUnits(qBWei, 18)) / 150_000;
  const maximum = Math.max(x, y);
  const a = Math.exp(x - maximum);
  const b = Math.exp(y - maximum);
  const sideA = a / (a + b) * 100;
  return { sideA, sideB: 100 - sideA };
}

async function main() {
  const contestId = argumentValue("--contest");
  const sideName = argumentValue("--side")?.toLowerCase();
  const amount = argumentValue("--amount");
  const expectedVersion = Number(argumentValue("--expected-version") ?? 2);
  if (![2, 3].includes(expectedVersion)) throw new Error("Unsupported expected market version.");
  const receiptPath = argumentValue("--receipt");
  if (!process.argv.includes("--dry-run")) {
    if (!receiptPath) throw new Error("An exclusive --receipt path is required for execution.");
    for (const file of [receiptPath, `${receiptPath}.submitted`]) {
      const exists = await readFile(file).then(() => true).catch(error => { if (error.code === "ENOENT") return false; throw error; });
      if (exists) throw new Error("Existing trade receipt or submitted transaction; reconcile before retrying.");
    }
  }
  if (!contestId || !/^0x[0-9a-fA-F]{64}$/.test(contestId) || !["a", "b"].includes(sideName) || !amount) {
    throw new Error("Usage: execute-testnet-campaign-buy.mjs --contest <bytes32> --side <a|b> --amount <Test USDC>");
  }

  const grossInputUnits = parseUnits(amount, 6);
  if (grossInputUnits <= 0n || grossInputUnits > parseUnits("1000", 6)) {
    throw new Error("Campaign buy must be greater than 0 and no more than 1,000 Test USDC.");
  }

  const env = parseEnv(await readFile(path.resolve(process.cwd(), "../contracts-solidity-foundry/.env"), "utf8"));
  const privateKey = env.E2E_PRIVATE_KEY;
  const rpcUrl = env.ROBINHOOD_TESTNET_RPC_URL;
  if (!privateKey || !rpcUrl) throw new Error("Missing E2E testnet credentials or RPC URL.");

  const before = await apiContest(contestId);
  if (Number(before.chainId) !== CHAIN_ID || before.marketVersion !== expectedVersion) {
    throw new Error("Campaign chain or expected market version mismatch.");
  }

  const marketVault = before.marketVault;
  const side = sideName === "a" ? 0 : 1;
  const account = privateKeyToAccount(privateKey);
  const chain = defineChain({
    id: CHAIN_ID,
    name: "Robinhood Chain Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('RPC is not Robinhood Testnet.');
  const identityAbi = parseAbi(['function settlementToken() view returns (address)','function contestId() view returns (bytes32)','function marketVersion() view returns (uint32)']);
  const [settlement, actualId, actualVersion, gasBalance] = await Promise.all([
    publicClient.readContract({address:marketVault,abi:identityAbi,functionName:'settlementToken'}),
    publicClient.readContract({address:marketVault,abi:identityAbi,functionName:'contestId'}),
    publicClient.readContract({address:marketVault,abi:identityAbi,functionName:'marketVersion'}),
    publicClient.getBalance({address:account.address}),
  ]);
  if (settlement.toLowerCase() !== SETTLEMENT_TOKEN.toLowerCase() || actualId.toLowerCase() !== contestId.toLowerCase() || actualVersion !== expectedVersion || gasBalance === 0n) throw new Error('Market identity mismatch or no testnet gas.');

  const quote = await publicClient.readContract({
    address: marketVault,
    abi: marketAbi,
    functionName: "previewBuy",
    args: [side, grossInputUnits],
  });
  if (quote.tokenOutputWei <= 0n) throw new Error("Buy quote returned no output.");

  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({
      mode: "dry-run",
      chainId: CHAIN_ID,
      contestId,
      marketVault,
      side: sideName.toUpperCase(),
      grossInputUsdc: amount,
      before: {
        ...marketSnapshot(before),
        control: control(BigInt(before.market?.qAWei ?? 0), BigInt(before.market?.qBWei ?? 0)),
      },
      projected: {
        qAWei: quote.qAAfterWei.toString(),
        qBWei: quote.qBAfterWei.toString(),
        reserveUnits: quote.reserveAfterUnits.toString(),
        control: control(quote.qAAfterWei, quote.qBAfterWei),
      },
      quotedTokenOutputWei: quote.tokenOutputWei.toString(),
    }, null, 2));
    return;
  }

  const balance = await publicClient.readContract({
    address: SETTLEMENT_TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [account.address],
  });
  let mintTransactionHash;
  if (balance < grossInputUnits) {
    const topUp = grossInputUnits - balance + parseUnits("10", 6);
    mintTransactionHash = await walletClient.writeContract({
      address: SETTLEMENT_TOKEN,
      abi: tokenAbi,
      functionName: "mint",
      args: [account.address, topUp],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintTransactionHash });
  }

  const allowance = await publicClient.readContract({
    address: SETTLEMENT_TOKEN,
    abi: tokenAbi,
    functionName: "allowance",
    args: [account.address, marketVault],
  });
  let approvalTransactionHash;
  if (allowance < grossInputUnits) {
    approvalTransactionHash = await walletClient.writeContract({
      address: SETTLEMENT_TOKEN,
      abi: tokenAbi,
      functionName: "approve",
      args: [marketVault, grossInputUnits],
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalTransactionHash });
  }

  const minimumOutput = quote.tokenOutputWei * 9_950n / 10_000n;
  const deadline = BigInt(Math.floor(Date.now() / 1_000) + 10 * 60);
  const simulation = await publicClient.simulateContract({
    account,
    address: marketVault,
    abi: marketAbi,
    functionName: "buy",
    args: [side, grossInputUnits, minimumOutput, deadline, zeroAddress],
  });
  const transactionHash = await walletClient.writeContract(simulation.request);
  await writeFile(`${receiptPath}.submitted`, JSON.stringify({contestId,side:sideName,grossInputUsdc:amount,transactionHash,approvalTransactionHash,mintTransactionHash,submittedAt:new Date().toISOString()}, null, 2), {flag:"wx"});
  console.log(JSON.stringify({stage:'buy_submitted',contestId,side:sideName,grossInputUsdc:amount,transactionHash,approvalTransactionHash,mintTransactionHash}));
  const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 1 });
  if (receipt.status !== "success") throw new Error("Campaign buy reverted.");

  let after;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const candidate = await apiContest(contestId);
    if (BigInt(candidate.market?.updatedBlock ?? 0) >= receipt.blockNumber) {
      after = candidate;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!after) throw new Error("Trade confirmed but indexer did not update in time.");

  const result = {
    campaignAction: "testnet_buy",
    chainId: CHAIN_ID,
    contestId,
    marketVault,
    trader: account.address,
    side: sideName.toUpperCase(),
    grossInputUnits: grossInputUnits.toString(),
    grossInputUsdc: formatUnits(grossInputUnits, 6),
    quotedTokenOutputWei: quote.tokenOutputWei.toString(),
    minimumTokenOutputWei: minimumOutput.toString(),
    mintTransactionHash,
    approvalTransactionHash,
    transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    before: marketSnapshot(before),
    after: marketSnapshot(after),
    executedAt: new Date().toISOString(),
  };
  await writeFile(receiptPath, JSON.stringify(result, null, 2) + "\n", {flag:"wx"});
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
