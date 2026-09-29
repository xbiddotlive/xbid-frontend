import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as viem from "viem";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(path, imports = {}) {
  const context = { exports: {}, Error, URLSearchParams, process: { env: {} }, require(id) {
    assert.ok(id in imports, `unexpected import: ${id}`);
    return imports[id];
  } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}
const policy = load("../features/trading/lib/quote-policy.ts", { viem });
const { marketVaultAbi } = load("../lib/blockchain/contracts.ts", { "./chain": { activeChain: { id: 46630 } } });
const { en } = load("../lib/i18n/messages.ts");
const { message } = load("../lib/i18n/format-message.ts");
function revert(name, args) {
  return new viem.ContractFunctionRevertedError({ abi: marketVaultAbi, functionName: "previewBuy",
    data: viem.encodeErrorResult({ abi: marketVaultAbi, errorName: name, args }) });
}
test("buy minimum boundary matches deployed math; zero is not a minimum error", () => {
  for (const input of [1n, 100_000n, 999_999n]) assert.equal(policy.isBuyBelowMinimum(input), true);
  for (const input of [0n, -1n, 1_000_000n, 10_000_000n]) assert.equal(policy.isBuyBelowMinimum(input), false);
  assert.equal(policy.minimumBuyUnits, 1_000_000n);
});
test("real ABI revert data maps to useful errors with no automatic retry", () => {
  for (const [name, args, key] of [
    ["BuyGrossBelowMinimum", [100_000n], "trade.buyMinimum"],
    ["SellGrossBelowMinimum", [100_000n], "trade.sellMinimum"],
    ["FlipGrossBelowMinimum", [1_000_000n], "trade.flipBelowMinimum"],
    ["ContestPaused", [1], "trade.quotePaused"],
  ]) {
    const error = new viem.BaseError("read failed", { cause: revert(name, args) });
    assert.equal(policy.quoteErrorMessage(error).key, key);
    assert.equal(policy.retryQuote(0, error), false);
    assert.equal(policy.quoteRefetchInterval({ state: { error } }), false);
  }
  assert.equal(policy.retryQuote(0, new Error("Execution Reverted")), false);
  assert.equal(policy.quoteErrorMessage(new Error("execution reverted")).key, "trade.quoteReverted");
});
test("network failures have bounded retry; polling stops until explicit recovery", () => {
  for (const error of [new Error("timeout"), new Error("HTTP 429 RPC busy")]) {
    assert.equal(policy.retryQuote(0, error), true);
    assert.equal(policy.retryQuote(1, error), false);
    assert.equal(policy.quoteRefetchInterval({ state: { error } }), false);
  }
  assert.equal(policy.quoteErrorMessage(new Error("429 RPC busy")).key, "trade.quoteBusy");
  assert.equal(policy.quoteErrorMessage(new Error("request timed out")).key, "trade.quoteConnection");
  assert.equal(policy.quoteRefetchInterval({ state: { error: null } }), 8_000);
});

function renderTicket({ mode = "buy", amount = "1", quoteError = null, fetching = false, data = true, embedded = true, inactiveFetching = false } = {}) {
  const reads = [];
  const quote = { feeUnits: 10_000n, tokenOutputWei: 99n * 10n ** 18n, netOutputUnits: 990_000n, destinationTokenOutputWei: 98n * 10n ** 18n };
  const chain = { id: 5042, blockExplorers: { default: { url: "https://explorer.arc.io" } } };
  const { TradeTicket } = load("../features/trading/components/trade-ticket.tsx", {
    react: React, "react/jsx-runtime": jsxRuntime, viem,
    "@rainbow-me/rainbowkit": { useConnectModal: () => ({}) },
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    wagmi: {
      useAccount: () => ({ address: viem.zeroAddress, chainId: 5042, isConnected: true }),
      useConnect: () => ({ connectors: [] }), usePublicClient: () => undefined,
      useSwitchChain: () => ({}), useWriteContract: () => ({}),
      useReadContract(options) {
        reads.push(options);
        if (["balanceOf", "allowance"].includes(options.functionName)) return { data: 100n * 10n ** 18n };
        const active = options.functionName.toLowerCase() === `preview${mode}`;
        return { data: active && data ? quote : undefined, error: active ? quoteError : null,
          isFetching: active ? fetching : inactiveFetching, refetch: async () => ({ data: quote }) };
      },
    },
    "@/components/ui/icons": { CloseIcon: () => null, InfoIcon: () => null },
    "@/lib/blockchain/chain": { robinhoodTestnet: chain, settlementTokenLabel: "usdc" },
    "../lib/trade-gas-budget": { createTradeGasActions: () => ({}) },
    "../lib/trade-input": load("../features/trading/lib/trade-input.ts", { viem }),
    "../lib/quote-policy": policy,
    "@/lib/blockchain/arc-gas-budget": { isArcChain: () => true },
    "@/lib/blockchain/contracts": { contracts: { settlementToken: viem.zeroAddress }, erc20Abi: [], marketVaultAbi, supportsPermissionlessMint: false },
    "@/components/navigation/settlement-faucet-link": { SettlementFaucetLink: () => null },
    "@/lib/i18n/locale-context": { useI18n: () => ({ locale: "en", t: (key, values) => message(en, key, values) }) },
    "@/lib/i18n/locales": { localeInfo: () => ({ htmlLang: "en" }) },
    "@/lib/i18n/decimal-input": { normalizeDecimalInput: value => value },
    "./slippage-control": { normalizeSlippageBps: value => value, SlippageControl: () => null },
  });
  const html = renderToStaticMarkup(React.createElement(TradeTicket, {
    contest: { marketVault: viem.zeroAddress, sideAToken: viem.zeroAddress, sideBToken: viem.zeroAddress,
      metadata: { sideA: { symbol: "AAA" }, sideB: { symbol: "BBB" } } },
    initialMode: mode, initialAmount: amount, embedded, onConfirmed() {},
  }));
  return { html, reads };
}
test("0.1 USDC disables the actual buy query and action in both layouts", () => {
  for (const embedded of [true, false]) {
    const { html, reads } = renderTicket({ amount: "0.1", embedded, fetching: true, data: false });
    assert.equal(reads.find(r => r.functionName === "previewBuy").query.enabled, false);
    assert.match(html, /minimum buy: 1 USDC/);
    assert.match(html, /class="tradeAction actionA" disabled/);
    assert.doesNotMatch(html, /quoting|updating quote|retry quote/);
    assert.ok(reads.every(r => r.chainId === 5042));
  }
});
test("1 USDC requests a quote; background refresh does not replace a valid action", () => {
  const { html, reads } = renderTicket({ fetching: true });
  assert.equal(reads.find(r => r.functionName === "previewBuy").query.enabled, true);
  assert.match(html, />buy 99 AAA<\/button>/);
  assert.doesNotMatch(html, /class="tradeAction actionA" disabled|updating quote/);
});
test("failed refresh never enables stale quote; error and manual retry are visible", () => {
  for (const mode of ["buy", "sell", "flip"]) {
    for (const embedded of [true, false]) {
      const { html } = renderTicket({ mode, embedded, quoteError: new Error("HTTP 429 RPC busy"), data: true });
      assert.match(html, /RPC is busy or rate-limited/);
      assert.match(html, /class="tradeAction actionA" disabled/);
      assert.match(html, />retry quote<\/button>/);
      assert.doesNotMatch(html, /updating quote/);
    }
  }
});
test("inactive query activity does not mask the current quote", () => {
  const { html } = renderTicket({ inactiveFetching: true });
  assert.match(html, />buy 99 AAA<\/button>/);
  assert.doesNotMatch(html, /updating quote|quoting/);
});
