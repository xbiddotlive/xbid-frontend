import { formatUnits, type Address, type PublicClient } from "viem";

export const isArcChain = (chainId: number) => chainId === 5042 || chainId === 5042002;

// Native USDC (18 decimals) and ERC-20 USDC (6 decimals) are the SAME funds.
// Ceil the reserve, floor the balance; never sum the two interfaces.
export function arcSpendableUnits(nativeBalance: bigint, maxFeePerGas: bigint, gasUnits: bigint) {
  if (nativeBalance < 0n || maxFeePerGas <= 0n || gasUnits <= 0n) throw new Error("Invalid Arc gas estimate.");
  const reserveWei = (maxFeePerGas * gasUnits * 125n + 99n) / 100n;
  const reserveUnits = (reserveWei + 10n ** 12n - 1n) / 10n ** 12n;
  const balanceUnits = nativeBalance / 10n ** 12n;
  return { reserveUnits, spendableUnits: balanceUnits > reserveUnits ? balanceUnits - reserveUnits : 0n, balanceUnits };
}

export async function getArcGasBudget(client: Pick<PublicClient, "getBalance" | "estimateFeesPerGas">, account: Address, gasUnits: bigint) {
  const [balance, fees] = await Promise.all([client.getBalance({ address: account }), client.estimateFeesPerGas()]);
  const price = fees.maxFeePerGas ?? fees.gasPrice;
  if (!price) throw new Error("Arc gas estimate unavailable. Try again before signing.");
  return arcSpendableUnits(balance, price, gasUnits);
}

export async function assertArcGasBudget(client: Pick<PublicClient, "getBalance" | "estimateFeesPerGas">, account: Address, spendUnits: bigint, gasUnits: bigint) {
  const budget = await getArcGasBudget(client, account, gasUnits);
  if (spendUnits < 0n || budget.balanceUnits < spendUnits + budget.reserveUnits) {
    throw new Error(`Keep at least ${formatUnits(budget.reserveUnits, 6)} USDC for Arc gas; lower the amount or add USDC.`);
  }
}
