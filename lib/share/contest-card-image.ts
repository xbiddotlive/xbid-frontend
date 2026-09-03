import sharp from "sharp";

import { getContest, type IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { formatUsdc, marketPrices } from "@/lib/product/market-metrics";

type ContestCardFormat = "jpeg" | "png";

const cardCache = new Map<string, Promise<Buffer>>();
const maximumCachedCards = 48;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value: string, maximum: number) {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

function dominance(aValue: string, bValue: string) {
  const a = BigInt(aValue);
  const b = BigInt(bValue);
  const total = a + b;
  if (total === 0n) return [50, 50] as const;
  const sideA = Number((a * 1_000n) / total) / 10;
  return [sideA, 100 - sideA] as const;
}

function price(value: number) {
  if (value > 0 && value < 0.0001) return `$${value.toExponential(2)}`;
  return `$${value.toFixed(4)}`;
}

function buildContestCardSvg(contest: IndexedContest) {
  const market = contest.market;
  const qA = market?.qAWei ?? "0";
  const qB = market?.qBWei ?? "0";
  const [sideA, sideB] = dominance(qA, qB);
  const [sideAPrice, sideBPrice] = marketPrices(qA, qB, contest.marketVersion);
  const liquidity = formatUsdc(market?.reserveUnits ?? "0");
  const volume = formatUsdc(market?.volume24hUnits ?? "0");
  const title = truncate(contest.metadata.title, 82);
  const titleSize = title.length > 64 ? 32 : title.length > 50 ? 36 : 42;
  const category = escapeXml(truncate(contest.metadata.category.toUpperCase(), 28));
  const sideAName = escapeXml(truncate(contest.metadata.sideA.name, 28));
  const sideBName = escapeXml(truncate(contest.metadata.sideB.name, 28));
  const sideASymbol = escapeXml(truncate(contest.metadata.sideA.symbol.toUpperCase(), 12));
  const sideBSymbol = escapeXml(truncate(contest.metadata.sideB.symbol.toUpperCase(), 12));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="left-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#173f86"/><stop offset="0.72" stop-color="#101a31"/></linearGradient>
      <linearGradient id="right-bg" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#7a281e"/><stop offset="0.72" stop-color="#2d1519"/></linearGradient>
      <linearGradient id="page-left" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17315d"/><stop offset="1" stop-color="#080b12"/></linearGradient>
      <linearGradient id="page-right" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#57231d"/><stop offset="1" stop-color="#100c11"/></linearGradient>
      <linearGradient id="versus-line" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3478f6"/><stop offset="0.48" stop-color="#343a48"/><stop offset="1" stop-color="#ff603d"/></linearGradient>
      <filter id="glow-blue"><feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#3478f6" flood-opacity=".28"/></filter>
      <filter id="glow-red"><feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#ff603d" flood-opacity=".26"/></filter>
      <style>text{font-family:"DejaVu Sans","Noto Sans CJK SC",sans-serif}.caps{letter-spacing:2px}</style>
    </defs>
    <rect width="600" height="630" fill="url(#page-left)"/>
    <rect x="600" width="600" height="630" fill="url(#page-right)"/>

    <circle cx="54" cy="57" r="6" fill="#ff603d"/>
    <text x="74" y="67" fill="#f7f9ff" font-size="26">xbid<tspan fill="#ff603d">.live</tspan></text>
    <rect x="999" y="38" width="153" height="39" rx="20" fill="#102219" stroke="#2f9f5e"/>
    <circle cx="1021" cy="57" r="6" fill="#5ce292"/>
    <text x="1033" y="63" fill="#5ce292" font-size="15">LIVE · TESTNET</text>

    <text x="48" y="112" fill="#a4adbd" font-size="16" font-weight="700" class="caps">${category} · MARKET V${contest.marketVersion}</text>
    <text x="48" y="163" fill="#f7f9ff" font-size="${titleSize}" font-weight="700">${escapeXml(title)}</text>

    <rect x="48" y="193" width="516" height="229" rx="16" fill="url(#left-bg)" stroke="#3478f6" stroke-width="3" filter="url(#glow-blue)"/>
    <circle cx="92" cy="232" r="19" fill="#3478f6"/>
    <text x="92" y="239" fill="#fff" font-size="18" font-weight="800" text-anchor="middle">${sideASymbol.slice(0, 1)}</text>
    <text x="122" y="238" fill="#a9c7ff" font-size="16" font-weight="700">SIDE A · ${sideASymbol}</text>
    <rect x="416" y="216" width="125" height="32" rx="16" fill="#0b1832" fill-opacity=".82"/>
    <text x="478.5" y="238" fill="#d9e6ff" font-size="15" text-anchor="middle">${sideA.toFixed(1)}% backing</text>
    <text x="73" y="287" fill="#f7f9ff" font-size="25" font-weight="700">${sideAName}</text>
    <text x="73" y="343" fill="#f7f9ff" font-size="43" font-weight="800">${price(sideAPrice)}</text>
    <text x="73" y="364" fill="#a9c7ff" font-size="13">LIVE PRICE</text>
    <path d="M48 370h516v36a16 16 0 0 1-16 16H64a16 16 0 0 1-16-16z" fill="#3478f6"/>
    <text x="306" y="402" fill="#071020" font-size="20" font-weight="800" text-anchor="middle">BACK ${sideASymbol} →</text>

    <rect x="636" y="193" width="516" height="229" rx="16" fill="url(#right-bg)" stroke="#ff603d" stroke-width="3" filter="url(#glow-red)"/>
    <circle cx="680" cy="232" r="19" fill="#ff603d"/>
    <text x="680" y="239" fill="#210904" font-size="18" font-weight="800" text-anchor="middle">${sideBSymbol.slice(0, 1)}</text>
    <text x="710" y="238" fill="#ffb09e" font-size="16" font-weight="700">SIDE B · ${sideBSymbol}</text>
    <rect x="1004" y="216" width="125" height="32" rx="16" fill="#46110d" fill-opacity=".82"/>
    <text x="1066.5" y="238" fill="#ffe0d9" font-size="15" text-anchor="middle">${sideB.toFixed(1)}% backing</text>
    <text x="661" y="287" fill="#f7f9ff" font-size="25" font-weight="700">${sideBName}</text>
    <text x="661" y="343" fill="#f7f9ff" font-size="43" font-weight="800">${price(sideBPrice)}</text>
    <text x="661" y="364" fill="#ffb09e" font-size="13">LIVE PRICE</text>
    <path d="M636 370h516v36a16 16 0 0 1-16 16H652a16 16 0 0 1-16-16z" fill="#ff603d"/>
    <text x="894" y="402" fill="#210904" font-size="20" font-weight="800" text-anchor="middle">BACK ${sideBSymbol} →</text>

    <rect x="599" y="193" width="2" height="229" fill="url(#versus-line)"/>
    <circle cx="600" cy="307" r="23" fill="#0b0e16" stroke="#4a5161" stroke-width="2"/>
    <text x="600" y="313" fill="#f7f9ff" font-size="15" font-weight="800" text-anchor="middle">VS</text>

    <rect x="48" y="438" width="1104" height="72" rx="12" fill="#0c0f17" stroke="#343a48"/>
    <path d="M406 456v36M770 456v36" stroke="#303644"/>
    <text x="69" y="464" fill="#929cad" font-size="13" class="caps">LIQUIDITY</text>
    <text x="69" y="491" fill="#f7f9ff" font-size="21" font-weight="700">${escapeXml(liquidity)} usdc</text>
    <text x="431" y="464" fill="#929cad" font-size="13" class="caps">24H VOLUME</text>
    <text x="431" y="491" fill="#f7f9ff" font-size="21" font-weight="700">${escapeXml(volume)}</text>
    <text x="794" y="464" fill="#929cad" font-size="13" class="caps">24H TRADES</text>
    <text x="794" y="491" fill="#f7f9ff" font-size="21" font-weight="700">${escapeXml(market?.tradeCount24h ?? "0")}</text>

    <text x="48" y="542" fill="#f6c85f" font-size="16" font-weight="700" class="caps">CHOOSE A SIDE · MOVE THE MARKET</text>
    <text x="1152" y="542" fill="#929cad" font-size="16" text-anchor="end">@xbid_live</text>
  </svg>`;
}

async function renderContestCard(contestId: string, format: ContestCardFormat) {
  const contest = await getContest(robinhoodTestnet.id, contestId, AbortSignal.timeout(8_000));
  const card = sharp(Buffer.from(buildContestCardSvg(contest))).flatten({ background: "#080b12" });
  return format === "jpeg"
    ? card.jpeg({ quality: 90, chromaSubsampling: "4:4:4", progressive: false }).toBuffer()
    : card.png({ adaptiveFiltering: true, compressionLevel: 6 }).toBuffer();
}

export async function contestCardResponse(
  contestId: string,
  version: string,
  format: ContestCardFormat = "png",
) {
  const cacheKey = `${contestId}:${version}:${format}`;
  let card = cardCache.get(cacheKey);
  if (!card) {
    if (cardCache.size >= maximumCachedCards) {
      const oldestKey = cardCache.keys().next().value;
      if (oldestKey) cardCache.delete(oldestKey);
    }
    card = renderContestCard(contestId, format);
    cardCache.set(cacheKey, card);
    card.catch(() => cardCache.delete(cacheKey));
  }

  const png = await card;
  return new Response(new Uint8Array(png), {
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable, no-transform",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(png.byteLength),
      "Content-Type": format === "jpeg" ? "image/jpeg" : "image/png",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
