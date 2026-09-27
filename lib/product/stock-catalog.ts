// Small, curated equity directory. Keep frontend/backend copies in sync.
// IDs identify listings; snapshots in published metadata must never be rewritten.
export type StockReference = { id: string; symbol: string; name: string; exchange: string };
export const stockCatalog = [
  { id: "xnas-tsla", symbol: "TSLA", name: "Tesla", exchange: "NASDAQ", aliases: "特斯拉" },
  { id: "xnas-nvda", symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ", aliases: "英伟达 輝達 辉达" },
  { id: "xnas-amd", symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", aliases: "超威半导体 超微半導體" },
  { id: "xnas-aapl", symbol: "AAPL", name: "Apple", exchange: "NASDAQ", aliases: "苹果 蘋果" },
  { id: "xnas-msft", symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ", aliases: "微软 微軟" },
  { id: "xnas-amzn", symbol: "AMZN", name: "Amazon", exchange: "NASDAQ", aliases: "亚马逊 亞馬遜" },
  { id: "xnas-meta", symbol: "META", name: "Meta Platforms", exchange: "NASDAQ", aliases: "脸书 臉書 Facebook" },
  { id: "xnas-coin", symbol: "COIN", name: "Coinbase", exchange: "NASDAQ", aliases: "Coinbase Global" },
] as const;
export function selectedStocks(ids: readonly string[]): StockReference[] {
  return ids.flatMap(id => {
    const item = stockCatalog.find(stock => stock.id === id);
    return item ? [{ id: item.id, symbol: item.symbol, name: item.name, exchange: item.exchange }] : [];
  });
}
export function validStockSelection(ids: unknown): ids is string[] {
  return Array.isArray(ids) && ids.length >= 1 && ids.length <= 2
    && new Set(ids).size === ids.length
    && ids.every(id => typeof id === "string" && stockCatalog.some(stock => stock.id === id));
}
export function searchStocks(query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return stockCatalog.filter(stock => {
    const text = `${stock.symbol} ${stock.name} ${stock.exchange} ${stock.aliases}`.toLowerCase();
    return terms.every(term => text.includes(term));
  });
}
