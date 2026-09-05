import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import {
  bytesToHex,
  createPublicClient,
  createWalletClient,
  defineChain,
  decodeEventLog,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const CHAIN_ID = 46630;
const API_ORIGIN = "https://testnet.xbid.live/api/backend";
const APP_ORIGIN = "https://testnet.xbid.live";
const FACTORY = "0x8f9208FD358c62FB4052e4C2FBbCA3152A17E4b6";
const SETTLEMENT_TOKEN = "0xAc80194dc1aE8eF52df73e7e1864fB3C62290fe0";
const CREATION_FEE = 5_000_000n;

const factoryAbi = [
  {
    type: "function",
    name: "computeContestId",
    stateMutability: "view",
    inputs: [
      { name: "creator", type: "address" },
      { name: "userSalt", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "contestId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "createContest",
    stateMutability: "nonpayable",
    inputs: [{
      name: "params",
      type: "tuple",
      components: [
        { name: "userSalt", type: "bytes32" },
        { name: "metadataHash", type: "bytes32" },
        { name: "metadataURI", type: "string" },
        { name: "sideAName", type: "string" },
        { name: "sideASymbol", type: "string" },
        { name: "sideBName", type: "string" },
        { name: "sideBSymbol", type: "string" },
      ],
    }],
    outputs: [
      { name: "contestId", type: "bytes32" },
      { name: "marketVault", type: "address" },
      { name: "sideAToken", type: "address" },
      { name: "sideBToken", type: "address" },
    ],
  },
  {
    type: "event",
    name: "ContestCreated",
    anonymous: false,
    inputs: [
      { name: "contestId", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "marketVault", type: "address", indexed: true },
      { name: "sideAToken", type: "address", indexed: false },
      { name: "sideBToken", type: "address", indexed: false },
      { name: "marketVersion", type: "uint32", indexed: false },
      { name: "metadataHash", type: "bytes32", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
];

const tokenAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "balance", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "amount", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "ok", type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "account", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
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

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

async function api(pathname, init) {
  const response = await fetch(`${API_ORIGIN}${pathname}`, { ...init, signal: AbortSignal.timeout(60_000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`API ${pathname} failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

async function logo(symbol, label, color, destination) {
  const symbolSize = symbol.length <= 2 ? 142 : symbol.length <= 4 ? 100 : symbol.length <= 6 ? 72 : 58;
  const labelSize = label.length <= 12 ? 30 : label.length <= 18 ? 25 : 21;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#080b12"/></linearGradient></defs>
    <rect width="512" height="512" rx="128" fill="#0b0e16"/><rect x="18" y="18" width="476" height="476" rx="112" fill="url(#g)" stroke="${color}" stroke-width="10"/>
    <text x="256" y="285" fill="#fff" font-family="DejaVu Sans,Arial,sans-serif" font-size="${symbolSize}" font-weight="400" text-anchor="middle">${escapeXml(symbol)}</text>
    <text x="256" y="370" fill="#d8deea" font-family="DejaVu Sans,Arial,sans-serif" font-size="${labelSize}" font-weight="400" text-anchor="middle">${escapeXml(label)}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(destination);
}

async function uploadLogo(filePath, token) {
  const buffer = await readFile(filePath);
  const form = new FormData();
  form.set("file", new Blob([buffer], { type: "image/png" }), path.basename(filePath));
  return api("/v1/assets/logos", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
}

async function renderPostImage(input, contest, destinations) {
  const logoA = (await readFile(destinations.logoA)).toString("base64");
  const logoB = (await readFile(destinations.logoB)).toString("base64");
  const title = escapeXml(input.title);
  const titleSize = input.title.length > 54 ? 36 : 44;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="left" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#173b78"/><stop offset="1" stop-color="#080b12"/></linearGradient>
      <linearGradient id="right" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#6d281f"/><stop offset="1" stop-color="#100b10"/></linearGradient>
      <style>text{font-family:"DejaVu Sans",Arial,sans-serif;font-weight:400}</style>
    </defs>
    <rect width="600" height="630" fill="url(#left)"/><rect x="600" width="600" height="630" fill="url(#right)"/>
    <circle cx="52" cy="54" r="6" fill="#ff603d"/><text x="70" y="64" fill="#f7f9ff" font-size="25">xbid<tspan fill="#ff603d">.live</tspan></text>
    <rect x="1074" y="34" width="82" height="40" rx="20" fill="#102219" stroke="#2f9f5e"/><circle cx="1095" cy="54" r="6" fill="#5ce292"/><text x="1108" y="60" fill="#5ce292" font-size="15">LIVE</text>
    <text x="48" y="111" fill="#a4adbd" font-size="15" letter-spacing="2">ROBINHOOD CHAIN · MARKET V${contest.marketVersion}</text>
    <text x="48" y="164" fill="#f7f9ff" font-size="${titleSize}">${title}</text>
    <rect x="48" y="197" width="510" height="235" rx="18" fill="#101a31" stroke="#3478f6" stroke-width="3"/>
    <image href="data:image/png;base64,${logoA}" x="76" y="224" width="68" height="68"/>
    <text x="164" y="250" fill="#a9c7ff" font-size="16">SIDE A · ${escapeXml(input.sideASymbol)}</text>
    <text x="164" y="282" fill="#f7f9ff" font-size="25">${escapeXml(input.sideAName)}</text>
    <text x="78" y="350" fill="#f7f9ff" font-size="43">$0.0100</text><text x="78" y="380" fill="#a9c7ff" font-size="14">LIVE PRICE</text>
    <rect x="414" y="224" width="116" height="34" rx="17" fill="#0b1832"/><text x="472" y="247" fill="#d9e6ff" font-size="15" text-anchor="middle">50.0%</text>
    <rect x="642" y="197" width="510" height="235" rx="18" fill="#2d1519" stroke="#ff603d" stroke-width="3"/>
    <image href="data:image/png;base64,${logoB}" x="670" y="224" width="68" height="68"/>
    <text x="758" y="250" fill="#ffb09e" font-size="16">SIDE B · ${escapeXml(input.sideBSymbol)}</text>
    <text x="758" y="282" fill="#f7f9ff" font-size="25">${escapeXml(input.sideBName)}</text>
    <text x="672" y="350" fill="#f7f9ff" font-size="43">$0.0100</text><text x="672" y="380" fill="#ffb09e" font-size="14">LIVE PRICE</text>
    <rect x="1008" y="224" width="116" height="34" rx="17" fill="#46110d"/><text x="1066" y="247" fill="#ffe0d9" font-size="15" text-anchor="middle">50.0%</text>
    <rect x="577" y="286" width="46" height="46" rx="23" fill="#0b0e16" stroke="#596173" stroke-width="2"/><text x="600" y="315" fill="#f7f9ff" font-size="17" text-anchor="middle">VS</text>
    <rect x="48" y="454" width="1104" height="74" rx="12" fill="#0c0f17" stroke="#343a48"/>
    <text x="72" y="481" fill="#929cad" font-size="13" letter-spacing="1.5">LIQUIDITY</text><text x="72" y="511" fill="#f7f9ff" font-size="21">$0 USDC</text>
    <text x="434" y="481" fill="#929cad" font-size="13" letter-spacing="1.5">24H VOLUME</text><text x="434" y="511" fill="#f7f9ff" font-size="21">$0</text>
    <text x="796" y="481" fill="#929cad" font-size="13" letter-spacing="1.5">MARKET</text><text x="796" y="511" fill="#f7f9ff" font-size="21">JUST LAUNCHED</text>
    <text x="48" y="574" fill="#f6c85f" font-size="16" letter-spacing="1.5">PICK A SIDE · MOVE THE MARKET</text><text x="1152" y="574" fill="#929cad" font-size="16" text-anchor="end">@xbid_live</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toFile(destinations.card);
}

async function main() {
  const inputArgument = argumentValue("--input");
  if (!inputArgument) throw new Error("Usage: create-automated-testnet-contest.mjs --input <file>");
  const projectDirectory = process.cwd();
  const inputPath = path.resolve(projectDirectory, inputArgument);
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  const artifactDirectory = path.resolve(projectDirectory, "content/x-posts", input.campaign);
  await mkdir(artifactDirectory, { recursive: true });
  const destinations = {
    logoA: path.join(artifactDirectory, "side-a.png"),
    logoB: path.join(artifactDirectory, "side-b.png"),
    card: path.join(artifactDirectory, "post.png"),
    record: path.join(artifactDirectory, "record.json"),
  };
  await Promise.all([
    logo(input.sideASymbol, input.sideALogoLabel, "#3478f6", destinations.logoA),
    logo(input.sideBSymbol, input.sideBLogoLabel, "#ff603d", destinations.logoB),
  ]);

  if (process.argv.includes("--render-only")) {
    const existingRecord = JSON.parse(await readFile(destinations.record, "utf8"));
    await renderPostImage(input, { marketVersion: existingRecord.marketVersion }, destinations);
    console.log(JSON.stringify({ mode: "render-only", imagePath: path.relative(projectDirectory, destinations.card) }, null, 2));
    return;
  }

  const env = parseEnv(await readFile(path.resolve(projectDirectory, "../contracts-solidity-foundry/.env"), "utf8"));
  const privateKey = env.E2E_PRIVATE_KEY;
  const rpcUrl = env.ROBINHOOD_TESTNET_RPC_URL;
  if (!privateKey || !rpcUrl) throw new Error("Missing E2E testnet credentials or RPC URL.");

  const account = privateKeyToAccount(privateKey);
  const chain = defineChain({ id: CHAIN_ID, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const challenge = await api(`/v1/chains/${CHAIN_ID}/write-session/challenge`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ walletAddress: account.address }) });
  const signature = await account.signMessage({ message: challenge.message });
  const session = await api(`/v1/chains/${CHAIN_ID}/write-session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ walletAddress: account.address, challengeId: challenge.challengeId, signature }) });
  const [sideAAsset, sideBAsset] = await Promise.all([uploadLogo(destinations.logoA, session.token), uploadLogo(destinations.logoB, session.token)]);
  const prepared = await api("/v1/metadata/contests", {
    method: "POST",
    headers: { authorization: `Bearer ${session.token}`, "content-type": "application/json" },
    body: JSON.stringify({
      creatorAddress: account.address,
      title: input.title,
      description: input.description,
      category: input.category,
      referenceUrl: input.referenceUrl,
      sideAName: input.sideAName,
      sideASymbol: input.sideASymbol,
      sideALogoHash: sideAAsset.contentHash,
      sideBName: input.sideBName,
      sideBSymbol: input.sideBSymbol,
      sideBLogoHash: sideBAsset.contentHash,
    }),
  });

  const userSalt = bytesToHex(randomBytes(32));
  const contestId = await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: "computeContestId", args: [account.address, userSalt, prepared.metadataHash] });
  const balance = await publicClient.readContract({ address: SETTLEMENT_TOKEN, abi: tokenAbi, functionName: "balanceOf", args: [account.address] });
  if (balance < CREATION_FEE) {
    const mintHash = await walletClient.writeContract({ address: SETTLEMENT_TOKEN, abi: tokenAbi, functionName: "mint", args: [account.address, 10_000_000n] });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
  }
  const allowance = await publicClient.readContract({ address: SETTLEMENT_TOKEN, abi: tokenAbi, functionName: "allowance", args: [account.address, FACTORY] });
  if (allowance < CREATION_FEE) {
    const approvalHash = await walletClient.writeContract({ address: SETTLEMENT_TOKEN, abi: tokenAbi, functionName: "approve", args: [FACTORY, CREATION_FEE] });
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  }
  const params = { userSalt, metadataHash: prepared.metadataHash, metadataURI: prepared.metadataUri, sideAName: input.sideAName, sideASymbol: input.sideASymbol, sideBName: input.sideBName, sideBSymbol: input.sideBSymbol };
  const simulation = await publicClient.simulateContract({ account, address: FACTORY, abi: factoryAbi, functionName: "createContest", args: [params] });
  const transactionHash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 1 });
  if (receipt.status !== "success") throw new Error("Contest creation reverted.");
  const created = receipt.logs.flatMap((log) => {
    try { return [decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics })]; } catch { return []; }
  }).find((event) => event.eventName === "ContestCreated");
  if (!created) throw new Error("ContestCreated event was not found.");

  let contest;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const response = await fetch(`${API_ORIGIN}/v1/chains/${CHAIN_ID}/contests/${contestId}`, { cache: "no-store" });
    if (response.ok) { contest = await response.json(); break; }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!contest) throw new Error("Contest was confirmed but did not become publicly indexed in time.");
  await renderPostImage(input, contest, destinations);
  const record = {
    campaign: input.campaign,
    createdAt: new Date().toISOString(),
    creator: account.address,
    contestId,
    contestUrl: `${APP_ORIGIN}/contest/${contestId}`,
    transactionHash,
    marketVault: created.args.marketVault,
    marketVersion: Number(created.args.marketVersion),
    metadataHash: prepared.metadataHash,
    metadataUri: prepared.metadataUri,
    sources: input.sources,
    mentions: input.mentions,
    imagePath: path.relative(projectDirectory, destinations.card),
  };
  await writeFile(destinations.record, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(record, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
