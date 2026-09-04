import sharp from "sharp";

import { getContest, type IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { formatUsdc, marketControl, marketPrices } from "@/lib/product/market-metrics";

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

function price(value: number) {
  if (value > 0 && value < 0.0001) return `$${value.toExponential(2)}`;
  return `$${value.toFixed(4)}`;
}

function priceChange(current: number, anchor: number) {
  return anchor === 0 ? null : ((current / anchor) - 1) * 100;
}

function priceChangeLabel(value: number | null) {
  if (value === null) return "— · 24H";
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(2)}% · 24H`;
}

function priceChangeColor(value: number | null) {
  if (value === null || Number(value.toFixed(2)) === 0) return "#929cad";
  return value > 0 ? "#5ce292" : "#ff7466";
}

function sideNameSize(value: string) {
  return value.length > 24 ? 18 : value.length > 18 ? 20 : 22;
}

function buildContestCardSvg(contest: IndexedContest) {
  const market = contest.market;
  const qA = market?.qAWei ?? "0";
  const qB = market?.qBWei ?? "0";
  const [sideA, sideB] = marketControl(qA, qB, contest.marketVersion);
  const [sideAPrice, sideBPrice] = marketPrices(qA, qB, contest.marketVersion);
  const createdWithin24Hours = Number.isFinite(Date.parse(contest.createdAt))
    && Date.parse(contest.createdAt) > Date.now() - 24 * 60 * 60 * 1_000;
  const anchorQuantities = market?.qA24hAgoWei !== null && market?.qB24hAgoWei !== null
    && market?.qA24hAgoWei !== undefined && market?.qB24hAgoWei !== undefined
    ? [market.qA24hAgoWei, market.qB24hAgoWei] as const
    : createdWithin24Hours
      ? ["0", "0"] as const
      : null;
  const anchorPrices = anchorQuantities
    ? marketPrices(anchorQuantities[0], anchorQuantities[1], contest.marketVersion)
    : null;
  const sideAChange = anchorPrices ? priceChange(sideAPrice, anchorPrices[0]) : null;
  const sideBChange = anchorPrices ? priceChange(sideBPrice, anchorPrices[1]) : null;
  const liquidity = formatUsdc(market?.reserveUnits ?? "0");
  const volume = formatUsdc(market?.volume24hUnits ?? "0");
  const title = truncate(contest.metadata.title, 82);
  const titleSize = title.length > 68 ? 27 : title.length > 52 ? 30 : 34;
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
      <filter id="glow-blue"><feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#3478f6" flood-opacity=".22"/></filter>
      <filter id="glow-red"><feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#ff603d" flood-opacity=".2"/></filter>
      <style>text{font-family:"DejaVu Sans","Noto Sans CJK SC",sans-serif;font-weight:400}.caps{letter-spacing:2px}</style>
    </defs>
    <rect width="600" height="630" fill="url(#page-left)"/>
    <rect x="600" width="600" height="630" fill="url(#page-right)"/>

    <circle cx="54" cy="57" r="6" fill="#ff603d"/>
    <text x="74" y="65" fill="#f7f9ff" font-size="23">xbid<tspan fill="#ff603d">.live</tspan></text>
    <rect x="1078" y="40" width="74" height="34" rx="17" fill="#102219" stroke="#2f9f5e"/>
    <circle cx="1097" cy="57" r="6" fill="#5ce292"/>
    <text x="1109" y="62" fill="#5ce292" font-size="13">LIVE</text>

    <text x="48" y="110" fill="#a4adbd" font-size="13" class="caps">${category} · MARKET V${contest.marketVersion}</text>
    <text x="48" y="158" fill="#f7f9ff" font-size="${titleSize}">${escapeXml(title)}</text>

    <rect x="48" y="188" width="516" height="234" rx="14" fill="url(#left-bg)" stroke="#3478f6" stroke-width="2" filter="url(#glow-blue)"/>
    <circle cx="91" cy="226" r="17" fill="#3478f6"/>
    <text x="91" y="232" fill="#fff" font-size="15" text-anchor="middle">${sideASymbol.slice(0, 1)}</text>
    <text x="118" y="231" fill="#a9c7ff" font-size="13">SIDE A · ${sideASymbol}</text>
    <rect x="418" y="209" width="123" height="28" rx="14" fill="#0b1832" fill-opacity=".82"/>
    <text x="479.5" y="228" fill="#d9e6ff" font-size="13" text-anchor="middle">${sideA.toFixed(1)}% CONTROL</text>
    <text x="70" y="278" fill="#f7f9ff" font-size="${sideNameSize(sideAName)}">${sideAName}</text>
    <text x="70" y="330" fill="#f7f9ff" font-size="34">${price(sideAPrice)}</text>
    <text x="70" y="357" fill="#a9c7ff" font-size="11" class="caps">LIVE PRICE</text>
    <text x="540" y="330" fill="${priceChangeColor(sideAChange)}" font-size="16" text-anchor="end">${priceChangeLabel(sideAChange)}</text>
    <text x="540" y="357" fill="#7f8da4" font-size="11" text-anchor="end" class="caps">PRICE CHANGE</text>
    <path d="M48 374h516v34a14 14 0 0 1-14 14H62a14 14 0 0 1-14-14z" fill="#3478f6"/>
    <text x="306" y="405" fill="#071020" font-size="17" text-anchor="middle">BACK ${sideASymbol} →</text>

    <rect x="636" y="188" width="516" height="234" rx="14" fill="url(#right-bg)" stroke="#ff603d" stroke-width="2" filter="url(#glow-red)"/>
    <circle cx="679" cy="226" r="17" fill="#ff603d"/>
    <text x="679" y="232" fill="#210904" font-size="15" text-anchor="middle">${sideBSymbol.slice(0, 1)}</text>
    <text x="706" y="231" fill="#ffb09e" font-size="13">SIDE B · ${sideBSymbol}</text>
    <rect x="1006" y="209" width="123" height="28" rx="14" fill="#46110d" fill-opacity=".82"/>
    <text x="1067.5" y="228" fill="#ffe0d9" font-size="13" text-anchor="middle">${sideB.toFixed(1)}% CONTROL</text>
    <text x="658" y="278" fill="#f7f9ff" font-size="${sideNameSize(sideBName)}">${sideBName}</text>
    <text x="658" y="330" fill="#f7f9ff" font-size="34">${price(sideBPrice)}</text>
    <text x="658" y="357" fill="#ffb09e" font-size="11" class="caps">LIVE PRICE</text>
    <text x="1128" y="330" fill="${priceChangeColor(sideBChange)}" font-size="16" text-anchor="end">${priceChangeLabel(sideBChange)}</text>
    <text x="1128" y="357" fill="#9f7f7b" font-size="11" text-anchor="end" class="caps">PRICE CHANGE</text>
    <path d="M636 374h516v34a14 14 0 0 1-14 14H650a14 14 0 0 1-14-14z" fill="#ff603d"/>
    <text x="894" y="405" fill="#210904" font-size="17" text-anchor="middle">BACK ${sideBSymbol} →</text>

    <rect x="599" y="188" width="2" height="234" fill="url(#versus-line)"/>
    <circle cx="600" cy="305" r="21" fill="#0b0e16" stroke="#4a5161" stroke-width="2"/>
    <text x="600" y="311" fill="#f7f9ff" font-size="14" text-anchor="middle">VS</text>

    <rect x="48" y="438" width="1104" height="72" rx="12" fill="#0c0f17" stroke="#343a48"/>
    <path d="M406 456v36M770 456v36" stroke="#303644"/>
    <text x="69" y="464" fill="#929cad" font-size="11" class="caps">LIQUIDITY</text>
    <text x="69" y="491" fill="#f7f9ff" font-size="18">${escapeXml(liquidity)} usdc</text>
    <text x="431" y="464" fill="#929cad" font-size="11" class="caps">24H VOLUME</text>
    <text x="431" y="491" fill="#f7f9ff" font-size="18">${escapeXml(volume)}</text>
    <text x="794" y="464" fill="#929cad" font-size="11" class="caps">24H TRADES</text>
    <text x="794" y="491" fill="#f7f9ff" font-size="18">${escapeXml(market?.tradeCount24h ?? "0")}</text>

    <text x="48" y="542" fill="#f6c85f" font-size="13" class="caps">CHOOSE A SIDE · MOVE THE MARKET</text>
    <text x="1152" y="542" fill="#929cad" font-size="14" text-anchor="end">@xbid_live</text>
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
