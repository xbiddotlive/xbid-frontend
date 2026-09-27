"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  formatUnits,
  isAddress,
  parseUnits,
  zeroAddress,
  type Address,
  type Hash,
} from "viem";
import { useAccount, useConnect, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";

import { CloseIcon, InfoIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet, settlementTokenLabel } from "@/lib/blockchain/chain";
import { contracts, erc20Abi, marketVaultAbi, supportsPermissionlessMint } from "@/lib/blockchain/contracts";
import { SettlementFaucetLink } from "@/components/navigation/settlement-faucet-link";
import { useI18n } from "@/lib/i18n/locale-context";
import { localeInfo } from "@/lib/i18n/locales";
import { normalizeDecimalInput } from "@/lib/i18n/decimal-input";
import type { MessageKey } from "@/lib/i18n/messages";
import { normalizeSlippageBps, SlippageControl } from "./slippage-control";

export type TradeMode = "buy" | "sell" | "flip";
type Side = 0 | 1;
const minimumFlipGrossUnits = 50_000_000n;

type TradeTicketProps = {
  contest: IndexedContest;
  embedded?: boolean;
  initialAmount?: string;
  initialMode?: TradeMode;
  initialSide?: Side;
  initialSlippageBps?: number;
  onClose?: () => void;
  onConfirmed: () => void;
};

function parseAmount(value: string, decimals: number) {
  try {
    return parseUnits(value || "0", decimals);
  } catch {
    return 0n;
  }
}

function errorMessage(error: unknown): MessageKey | string {
  if (!(error instanceof Error)) return "trade.failed";
  if (error.message.toLowerCase().includes("rejected")) return "trade.rejected";
  return error.message.split("\n")[0].slice(0, 180).toLowerCase();
}

function flipQuoteErrorMessage(error: Error | null, locale: string, t: ReturnType<typeof useI18n>["t"]) {
  if (!error) return null;
  const minimum = `${formatUnits(minimumFlipGrossUnits, 6)} usdc`;
  if (error instanceof BaseError) {
    const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName === "FlipGrossBelowMinimum") {
      const grossOutput = reverted.data.args?.[0];
      const actual = typeof grossOutput === "bigint"
        ? `${Number(formatUnits(grossOutput, 6)).toLocaleString(locale, { maximumFractionDigits: 4 })} usdc`
        : t("portfolio.positions");
      return t("trade.flipInsufficient", { actual, minimum });
    }
  }
  if (error.message.includes("FlipGrossBelowMinimum")) {
    return t("trade.flipBelowMinimum", { minimum });
  }
  return t("trade.flipUnavailableRefresh");
}

function retryFlipQuote(failureCount: number, error: Error) {
  const reverted = error instanceof BaseError
    ? error.walk((cause) => cause instanceof ContractFunctionRevertedError)
    : null;
  const deterministicFailure = reverted instanceof ContractFunctionRevertedError
    || error.message.includes("FlipGrossBelowMinimum")
    || error.message.toLowerCase().includes("execution reverted");
  return !deterministicFailure && failureCount < 1;
}

export function TradeTicket({ contest, embedded = false, initialAmount, initialMode = "buy", initialSide = 0, initialSlippageBps = 50, onClose, onConfirmed }: TradeTicketProps) {
  const { locale, t } = useI18n();
  const numberLocale = localeInfo(locale).htmlLang;
  const [mode, setMode] = useState<TradeMode>(initialMode);
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState(initialAmount ?? (initialMode === "buy" ? "10" : "0"));
  const [slippageBps, setSlippageBps] = useState(normalizeSlippageBps(initialSlippageBps));
  const [status, setStatus] = useState("");
  const [lastHash, setLastHash] = useState<Hash>();
  const [isActing, setIsActing] = useState(false);
  const [actingLabel, setActingLabel] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const searchParams = useSearchParams();
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { connectors, connect } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });

  const input = parseAmount(amount, mode === "buy" ? 6 : 18);
  const [debouncedFlipInput, setDebouncedFlipInput] = useState(input);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedFlipInput(input), mode === "flip" ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [input, mode]);
  const flipInputPending = mode === "flip" && debouncedFlipInput !== input;
  const marketVault = contest.marketVault as Address;
  const sideAToken = contest.sideAToken as Address;
  const sideBToken = contest.sideBToken as Address;
  const activeToken = mode === "buy" ? contracts.settlementToken : side === 0 ? sideAToken : sideBToken;
  const referrerParam = searchParams.get("ref");
  const referrer = referrerParam && isAddress(referrerParam) && referrerParam.toLowerCase() !== address?.toLowerCase()
    ? referrerParam as Address
    : zeroAddress;

  const { data: buyQuote, isFetching: buyLoading, refetch: refetchBuy } = useReadContract({
    address: marketVault, abi: marketVaultAbi, functionName: "previewBuy", args: [side, input],
    query: { enabled: mode === "buy" && input > 0n, refetchInterval: 8_000 },
  });
  const { data: sellQuote, isFetching: sellLoading, refetch: refetchSell } = useReadContract({
    address: marketVault, abi: marketVaultAbi, functionName: "previewSell", args: [side, input],
    query: { enabled: mode === "sell" && input > 0n, refetchInterval: 8_000 },
  });
  const { data: flipQuote, error: flipError, isFetching: flipLoading, refetch: refetchFlip } = useReadContract({
    address: marketVault, abi: marketVaultAbi, functionName: "previewFlip", args: [side, debouncedFlipInput],
    query: {
      enabled: mode === "flip" && debouncedFlipInput > 0n,
      refetchInterval: false,
      refetchOnReconnect: false,
      retry: retryFlipQuote,
      staleTime: Number.POSITIVE_INFINITY,
    },
  });
  const { data: balance = 0n, refetch: refetchBalance } = useReadContract({
    address: activeToken, abi: erc20Abi, functionName: "balanceOf", args: [address ?? zeroAddress],
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });
  const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
    address: activeToken, abi: erc20Abi, functionName: "allowance", args: [address ?? zeroAddress, marketVault],
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });

  const quoteLoading = buyLoading || sellLoading || flipLoading || flipInputPending;
  const fee = mode === "buy" ? (buyQuote?.feeUnits ?? 0n) : mode === "sell" ? (sellQuote?.feeUnits ?? 0n) : (flipQuote?.feeUnits ?? 0n);
  const output = mode === "buy" ? (buyQuote?.tokenOutputWei ?? 0n) : mode === "sell" ? (sellQuote?.netOutputUnits ?? 0n) : (flipQuote?.destinationTokenOutputWei ?? 0n);
  const outputDecimals = mode === "sell" ? 6 : 18;
  const minimumOutput = (output * BigInt(10_000 - slippageBps)) / 10_000n;
  const quoteReady = mode === "buy" ? Boolean(buyQuote) : mode === "sell" ? Boolean(sellQuote) : Boolean(flipQuote) && !flipInputPending;
  const sourceSymbol = side === 0 ? contest.metadata.sideA.symbol : contest.metadata.sideB.symbol;
  const flipQuoteIssue = mode === "flip" && input > 0n && !flipInputPending
    ? flipQuoteErrorMessage(flipError, numberLocale, t)
    : null;

  function changeMode(nextMode: TradeMode) {
    setMode(nextMode);
    setAmount(nextMode === "buy" ? "10" : "0");
    setLastHash(undefined);
    setStatus("");
  }

  function changeSide(nextSide: Side) {
    setSide(nextSide);
    setLastHash(undefined);
    setStatus("");
  }

  function changeAmount(nextAmount: string) {
    setAmount(normalizeDecimalInput(nextAmount, numberLocale));
    setLastHash(undefined);
    setStatus("");
  }

  async function submitAndWait(hash: Hash, label: string) {
    if (!publicClient) throw new Error(t("trade.rpc"));
    setActingLabel(`${label}…`);
    setLastHash(hash);
    setStatus(t("trade.submitted", { label }));
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${label} reverted onchain.`);
    setStatus(t("trade.confirmed", { label, block: receipt.blockNumber.toString() }));
  }

  async function ensureReady() {
    if (!isConnected) {
      if (openConnectModal) {
        openConnectModal();
        return false;
      }
      if (!connectors[0]) throw new Error(t("trade.noWallet"));
      connect({ connector: connectors[0] });
      return false;
    }
    if (chainId !== robinhoodTestnet.id) {
      await switchChainAsync({ chainId: robinhoodTestnet.id });
      return false;
    }
    return true;
  }

  async function approveInput() {
    const hash = await writeContractAsync({
      address: activeToken, abi: erc20Abi, functionName: "approve",
      args: [marketVault, input], chainId: robinhoodTestnet.id,
    });
    await submitAndWait(hash, t("trade.approveAmount", { amount: amount || "0", symbol: mode === "buy" ? settlementTokenLabel : t(side === 0 ? "common.sideA" : "common.sideB") }));
    await refetchAllowance();
  }

  async function freshFlipOutput() {
    setActingLabel(t("trade.checkingFlip"));
    const refreshed = await refetchFlip();
    if (refreshed.error) {
      const fallback = errorMessage(refreshed.error);
      throw new Error(flipQuoteErrorMessage(refreshed.error, numberLocale, t) ?? (fallback.startsWith("trade.") ? t(fallback as MessageKey) : fallback));
    }
    const freshOutput = refreshed.data?.destinationTokenOutputWei;
    if (!freshOutput || freshOutput <= 0n) {
      throw new Error(t("trade.flipUnavailableTry"));
    }
    setActingLabel(t("trade.confirmWallet"));
    return freshOutput;
  }

  async function act() {
    setIsActing(true);
    setActingLabel(t("trade.confirmWallet"));
    setLastHash(undefined);
    try {
      if (!(await ensureReady())) return;
      if (!address) throw new Error(t("trade.connectFirst"));
      if (input <= 0n) throw new Error(t("trade.positiveAmount"));
      let executionOutput = output;
      if (mode === "flip") {
        executionOutput = await freshFlipOutput();
      } else if (!quoteReady || output <= 0n) {
        throw new Error(t("trade.validQuote"));
      }

      if (balance < input) {
        if (mode !== "buy") throw new Error(t("trade.insufficientSide", { side: side === 0 ? "A" : "B" }));
        if (!supportsPermissionlessMint) throw new Error(t("trade.insufficientBalance", { symbol: settlementTokenLabel }));
        const hash = await writeContractAsync({
          address: contracts.settlementToken, abi: erc20Abi, functionName: "mint",
          args: [address, parseUnits("10000", 6)], chainId: robinhoodTestnet.id,
        });
        await submitAndWait(hash, t("trade.mint", { symbol: settlementTokenLabel }));
        await refetchBalance();
        return;
      }

      if (allowance < input) {
        await approveInput();
        if (mode === "flip") executionOutput = await freshFlipOutput();
      }

      // act() runs only from the submit click, not while rendering the quote.
      // eslint-disable-next-line react-hooks/purity
      const deadline = BigInt(Math.floor(Date.now() / 1_000) + 10 * 60);
      const executionMinimumOutput = (executionOutput * BigInt(10_000 - slippageBps)) / 10_000n;
      if (!publicClient) throw new Error(t("trade.rpc"));
      if (mode === "buy") {
        const simulation = await publicClient.simulateContract({ account: address, address: marketVault, abi: marketVaultAbi, functionName: "buy", args: [side, input, minimumOutput, deadline, referrer] });
        await submitAndWait(await writeContractAsync(simulation.request), t("trade.backSide", { side: side === 0 ? "A" : "B" }));
      } else if (mode === "sell") {
        const simulation = await publicClient.simulateContract({ account: address, address: marketVault, abi: marketVaultAbi, functionName: "sell", args: [side, input, minimumOutput, deadline] });
        await submitAndWait(await writeContractAsync(simulation.request), t("trade.sellSide", { side: side === 0 ? "A" : "B" }));
      } else {
        const simulation = await publicClient.simulateContract({ account: address, address: marketVault, abi: marketVaultAbi, functionName: "flip", args: [side, input, executionMinimumOutput, deadline] });
        await submitAndWait(await writeContractAsync(simulation.request), t("trade.flipSides", { source: side === 0 ? "A" : "B", destination: side === 0 ? "B" : "A" }));
      }
      const refetchActiveQuote = mode === "buy" ? refetchBuy : mode === "sell" ? refetchSell : refetchFlip;
      await Promise.all([refetchBalance(), refetchAllowance(), refetchActiveQuote()]);
      onConfirmed();
    } catch (error) {
      const nextStatus = errorMessage(error);
      setStatus(nextStatus.startsWith("trade.") ? t(nextStatus as MessageKey) : nextStatus);
    } finally {
      setIsActing(false);
    }
  }

  const effectiveSymbol = mode === "sell" ? "usdc" : mode === "buy" ? (side === 0 ? contest.metadata.sideA.symbol : contest.metadata.sideB.symbol) : (side === 0 ? contest.metadata.sideB.symbol : contest.metadata.sideA.symbol);
  const formattedOutput = Number(formatUnits(output, outputDecimals)).toLocaleString(numberLocale, { maximumFractionDigits: 4 });
  let actionLabel = mode === "buy" ? t("trade.buyOutput", { amount: formattedOutput, symbol: effectiveSymbol }) : mode === "sell" ? t("trade.sellOutput", { amount: formattedOutput, symbol: effectiveSymbol }) : t("trade.flipOutput", { amount: formattedOutput, symbol: effectiveSymbol });
  if (!isConnected) actionLabel = t("wallet.connect");
  else if (chainId !== robinhoodTestnet.id) actionLabel = t("trade.switchNetwork", { network: t("chain.testnet") });
  else if (mode === "buy" && balance < input && supportsPermissionlessMint) actionLabel = t("trade.mintAmount", { symbol: settlementTokenLabel });
  else if (mode === "buy" && balance < input) actionLabel = t("trade.insufficientBalance", { symbol: settlementTokenLabel });
  else if (mode !== "buy" && balance < input) actionLabel = t("trade.insufficientToken");
  else if (flipQuoteIssue) actionLabel = t("trade.recheckFlip");
  else if (input > 0n && !quoteReady) actionLabel = quoteLoading
    ? mode === "flip" ? t("trade.checkingFlip") : t("trade.fetchingQuote")
    : mode === "flip" ? t("trade.flipUnavailable") : t("trade.quoteUnavailable");
  else if (allowance < input) actionLabel = mode === "buy" ? t("trade.approveBuy", { amount: formattedOutput, symbol: effectiveSymbol }) : t("trade.approveMode", { mode: t(`trade.${mode}` as MessageKey), symbol: sourceSymbol });
  const isDirectTrade = isConnected && chainId === robinhoodTestnet.id && balance >= input && allowance >= input;
  const quoteBlocked = input > 0n && !quoteReady && !flipQuoteIssue;

  const balanceDecimals = mode === "buy" ? 6 : 18;
  const balanceLabel = Number(formatUnits(balance, balanceDecimals)).toLocaleString(numberLocale, { maximumFractionDigits: 4 });
  const amountSymbol = mode === "buy" ? "usdc" : sourceSymbol;
  return (
    <div className={embedded ? "tradeTicket tradeTicketEmbedded" : "tradeTicket"} role={embedded ? undefined : "dialog"} aria-label={t(embedded ? "trade.execution" : "trade.drawer")}>
      {!embedded && <div className="ticketHeader">
        <div><p className="eyebrow">{t("trade.drawer")}</p><h2>{t("trade.moveMarket")}</h2></div>
        {onClose ? <button aria-label={t("trade.closeDrawer")} className="iconButton" onClick={onClose} type="button"><CloseIcon /></button> : <span className="liveDot">{t("common.live")}</span>}
      </div>}
      <div className="ticketTabs">{(["buy", "sell", "flip"] as const).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => changeMode(item)} type="button">{t(`trade.${item}` as MessageKey)}</button>)}</div>
      {mode === "buy" && balance < input ? <SettlementFaucetLink /> : null}
      <div className="sideSelector">
        <button className={side === 0 ? "sideA selected" : "sideA"} onClick={() => changeSide(0)} type="button">{mode === "flip" ? t("trade.fromSide", { side: "A" }) : t("common.sideA")}</button>
        <button className={side === 1 ? "sideB selected" : "sideB"} onClick={() => changeSide(1)} type="button">{mode === "flip" ? t("trade.fromSide", { side: "B" }) : t("common.sideB")}</button>
      </div>

      {embedded ? <>
        <label className="compactAmountField">
          <span>{t(mode === "buy" ? "trade.youPay" : "trade.tokenAmount")}</span>
          <input aria-label={`${t(mode === "buy" ? "trade.youPay" : "trade.tokenAmount")} ${amountSymbol}`} inputMode="decimal" onChange={(event) => changeAmount(event.target.value)} value={amount} />
          <b>{amountSymbol}</b>
        </label>
        <div className="compactBalance"><span>{t("trade.balance", { amount: balanceLabel })}</span><button disabled={!isConnected || balance === 0n} onClick={() => changeAmount(formatUnits(balance, balanceDecimals))} type="button">{t("trade.max")}</button></div>
        <button className={side === 0 ? "tradeAction actionA" : "tradeAction actionB"} disabled={isActing || input <= 0n || quoteBlocked || (mode !== "buy" && balance < input)} onClick={() => void act()} type="button">{isActing ? actingLabel : isDirectTrade && quoteLoading && !flipQuoteIssue ? t("trade.updatingQuote") : actionLabel}</button>
        <div className="compactTradeFooter">
          <SlippageControl onChange={setSlippageBps} value={slippageBps} />
          <button aria-controls={detailsId} aria-expanded={detailsOpen} className="tradeDetailsTrigger" onClick={() => setDetailsOpen((current) => !current)} title={t("trade.showDetails")} type="button"><InfoIcon /><span>{t("trade.details")}</span></button>
        </div>
        {detailsOpen && <div className="compactTradeDetails" id={detailsId}>
          {mode === "sell" && <div><span>{t("trade.grossUsdc")}</span><span>{formatUnits(sellQuote?.grossOutputUnits ?? 0n, 6)}</span></div>}
          {mode === "flip" && <div><span>{t("trade.sourceGross")}</span><span>{formatUnits(flipQuote?.sourceGrossOutputUnits ?? 0n, 6)} usdc</span></div>}
          <div><span>{t("trade.minimumReceived")}</span><span>{formatUnits(minimumOutput, outputDecimals)} {effectiveSymbol}</span></div>
          <div><span>{t("trade.tradingFee")}</span><span>{formatUnits(fee, 6)} usdc · 1%</span></div>
          <div><span>{t("trade.deadline")}</span><span>{t("trade.tenMinutes")}</span></div>
          {mode === "buy" && referrer !== zeroAddress && <div><span>{t("trade.referrer")}</span><span>{referrer.slice(0, 6)}…{referrer.slice(-4)}</span></div>}
          {mode === "flip" && <p>{t("trade.atomicDescription")}</p>}
          <small>{t("trade.protected")}</small>
        </div>}
        {(flipQuoteIssue || status || lastHash) && <p className="ticketStatus" aria-live="polite">{flipQuoteIssue ?? status}</p>}
        {lastHash ? <a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${lastHash}`} rel="noreferrer" target="_blank">{t("common.viewTransaction")}</a> : null}
      </> : <>
        <label className="amountField">
          <span>{t(mode === "buy" ? "trade.youPay" : "trade.tokenAmount")}</span>
          <div><input inputMode="decimal" onChange={(event) => changeAmount(event.target.value)} value={amount} /><b>{amountSymbol}</b></div>
          <small>{t("trade.balance", { amount: balanceLabel })}</small>
        </label>
        <div className="quickAmounts">{(mode === "buy" ? ["10", "100", "1000"] : ["25%", "50%", "100%"]).map((value) => <button key={value} onClick={() => changeAmount(value.endsWith("%") ? formatUnits((balance * BigInt(value.slice(0, -1))) / 100n, 18) : value)} type="button">{value.endsWith("%") ? value : `${value} usdc`}</button>)}</div>
        <div className="quoteSummary">
          <div><span>{t(mode === "flip" ? "trade.destinationOutput" : "trade.youReceive")}</span><strong>{quoteLoading ? t("trade.quoting") : `${Number(formatUnits(output, outputDecimals)).toLocaleString(numberLocale, { maximumFractionDigits: 4 })} ${effectiveSymbol}`}</strong></div>
          {mode === "sell" && <div><span>{t("trade.grossUsdc")}</span><span>{formatUnits(sellQuote?.grossOutputUnits ?? 0n, 6)}</span></div>}
          {mode === "flip" && <div><span>{t("trade.sourceGross")}</span><span>{formatUnits(flipQuote?.sourceGrossOutputUnits ?? 0n, 6)} usdc</span></div>}
          <div><span>{t("trade.minimumReceived")}</span><span>{formatUnits(minimumOutput, outputDecimals)} {effectiveSymbol}</span></div>
          <div><span>{t("trade.tradingFee")}</span><span>{formatUnits(fee, 6)} usdc · 1%</span></div>
        </div>
        {mode === "flip" && <p className="atomicNote">{t("trade.atomicFeeDescription")}</p>}
        <div className="ticketExecutionSettings"><SlippageControl onChange={setSlippageBps} value={slippageBps} /><span>{t("trade.tenMinuteDeadline")}</span></div>
        <button className={side === 0 ? "tradeAction actionA" : "tradeAction actionB"} disabled={isActing || input <= 0n || quoteBlocked || (mode !== "buy" && balance < input)} onClick={() => void act()} type="button">{isActing ? actingLabel : actionLabel}</button>
        <p className="ticketStatus" aria-live="polite">{(flipQuoteIssue ?? status) || t("trade.defaultStatus")}</p>
        {lastHash ? <a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${lastHash}`} rel="noreferrer" target="_blank">{t("common.viewTransaction")}</a> : null}
        <div className="ticketFootnote">{t("trade.protected")}</div>
      </>}
    </div>
  );
}
