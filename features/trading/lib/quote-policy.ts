import { BaseError, ContractFunctionRevertedError } from "viem";
import type { MessageKey, MessageValues } from "@/lib/i18n/messages";

// All deployed MarketVault versions use 6-decimal USDC and this buy minimum.
export const minimumBuyUnits = 1_000_000n;

export function isBuyBelowMinimum(input: bigint) {
  return input > 0n && input < minimumBuyUnits;
}

function revertedError(error: Error) {
  if (error instanceof ContractFunctionRevertedError) return error;
  if (error instanceof BaseError) {
    const cause = error.walk((item) => item instanceof ContractFunctionRevertedError);
    if (cause instanceof ContractFunctionRevertedError) return cause;
  }
  return null;
}

export function isQuoteRevert(error: Error) {
  return Boolean(revertedError(error)) || /execution reverted|BuyGrossBelowMinimum|SellGrossBelowMinimum|FlipGrossBelowMinimum/i.test(error.message);
}

export function retryQuote(failureCount: number, error: Error) {
  return !isQuoteRevert(error) && failureCount < 1;
}

// Stop polling after any failed quote. Input changes or explicit retry recover it.
export function quoteRefetchInterval(query: { state: { error: unknown } }): number | false {
  return query.state.error ? false : 8_000;
}

export function quoteErrorMessage(error: Error): { key: MessageKey; values?: MessageValues } {
  const name = revertedError(error)?.data?.errorName;
  if (name === "BuyGrossBelowMinimum") return { key: "trade.buyMinimum" };
  if (name === "SellGrossBelowMinimum") return { key: "trade.sellMinimum" };
  if (name === "FlipGrossBelowMinimum") return { key: "trade.flipBelowMinimum", values: { minimum: "50 USDC" } };
  if (name === "ContestPaused") return { key: "trade.quotePaused" };
  if (isQuoteRevert(error)) {
    return { key: "trade.quoteReverted", values: { reason: name ?? "execution reverted" } };
  }
  if (/429|RPC busy|rate limit/i.test(error.message)) return { key: "trade.quoteBusy" };
  return { key: "trade.quoteConnection" };
}
