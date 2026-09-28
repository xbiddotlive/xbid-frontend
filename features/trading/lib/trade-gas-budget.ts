import { formatUnits, type Address, type PublicClient } from "viem";
import { assertArcGasBudget, getArcGasBudget, isArcChain } from "@/lib/blockchain/arc-gas-budget";

export function createTradeGasActions(options: {
  client: PublicClient | undefined;
  account: Address | undefined;
  chainId: number;
  mode: "buy" | "sell" | "flip";
  balance: bigint;
  input: bigint;
  onMaximum: (amount: string) => void;
  onError: (error: unknown) => void;
}) {
  const { client, account, chainId, mode, balance, input, onMaximum, onError } = options;
  return {
    async checkArcBudget(gasUnits = 1_500_000n) {
      if (!isArcChain(chainId)) return;
      if (!client || !account) throw new Error("trade.rpc");
      await assertArcGasBudget(client, account, mode === "buy" ? input : 0n, gasUnits);
    },
    async fillMaximumAmount() {
      try {
        if (mode !== "buy" || !isArcChain(chainId)) {
          onMaximum(formatUnits(balance, mode === "buy" ? 6 : 18));
          return;
        }
        if (!client || !account) throw new Error("trade.rpc");
        // Allowance for approval + trade; exact gas is rechecked before signing.
        const budget = await getArcGasBudget(client, account, 1_500_000n);
        onMaximum(formatUnits(budget.spendableUnits, 6));
      } catch (error) {
        onError(error);
      }
    },
  };
}
