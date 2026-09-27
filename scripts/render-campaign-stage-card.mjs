import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const CHAIN_ID = 46630;
const APP_ORIGIN = "https://testnet.xbid.live";
const API_ORIGIN = `${APP_ORIGIN}/api/backend`;
const CARD_DESIGN_VERSION = "9";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

async function main() {
  const contestId = argumentValue("--contest");
  const stage = argumentValue("--stage") ?? "LEAD MOVE";
  const outputArgument = argumentValue("--output");
  if (!contestId || !/^0x[0-9a-fA-F]{64}$/.test(contestId) || !outputArgument) {
    throw new Error("Usage: render-campaign-stage-card.mjs --contest <bytes32> --stage <label> --output <file>");
  }

  const contestResponse = await fetch(`${API_ORIGIN}/v1/chains/${CHAIN_ID}/contests/${contestId}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!contestResponse.ok) throw new Error(`Contest API failed (${contestResponse.status}).`);
  const contest = await contestResponse.json();
  const revision = contest.market?.updatedBlock ?? contest.createdBlock;
  const cardUrl = `${APP_ORIGIN}/share/contest/${contestId}/${CARD_DESIGN_VERSION}-${revision}/card.jpg`;
  const cardResponse = await fetch(cardUrl, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!cardResponse.ok) throw new Error(`Share card failed (${cardResponse.status}).`);
  const card = Buffer.from(await cardResponse.arrayBuffer());

  const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect x="860" y="40" width="204" height="34" rx="17" fill="#0c0f17" stroke="#596173"/>
    <text x="962" y="62" fill="#d8deea" font-family="DejaVu Sans,Arial,sans-serif" font-size="12" font-weight="400" text-anchor="middle" letter-spacing="1.2">${escapeXml(stage.toUpperCase())} · TESTNET</text>
  </svg>`;

  const outputPath = path.resolve(process.cwd(), outputArgument);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const rendered = await sharp(card)
    .composite([{ input: Buffer.from(badge), top: 0, left: 0 }])
    .png({ compressionLevel: 8, adaptiveFiltering: true })
    .toBuffer();
  await writeFile(outputPath, rendered);

  console.log(JSON.stringify({
    contestId,
    stage,
    revision,
    cardUrl,
    outputPath: path.relative(process.cwd(), outputPath),
    bytes: rendered.byteLength,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
