import { parseUnits } from "viem";

export function parseAmount(value: string, decimals: number) {
  try {
    return parseUnits(value || "0", decimals);
  } catch {
    return 0n;
  }
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "trade.failed";
  if (error.message.toLowerCase().includes("rejected")) return "trade.rejected";
  return error.message.split("\n")[0].slice(0, 180).toLowerCase();
}
