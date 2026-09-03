import { formatUnits } from "viem";

const USDC_DECIMALS = 6;

/** Keep ordinary balances compact while preserving sub-cent fee precision. */
export function formatUsdcUnits(value: bigint | string) {
  const amount = Number(formatUnits(BigInt(value), USDC_DECIMALS));
  const maximumFractionDigits = amount !== 0 && Math.abs(amount) < 0.01 ? USDC_DECIMALS : 2;

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });
}
