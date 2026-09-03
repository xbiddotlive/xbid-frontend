"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { formatUnits, isAddress, parseUnits, zeroAddress, type Address, type Hash } from "viem";
import { useAccount, useConnect, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";

import { CloseIcon, InfoIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { contracts, erc20Abi, marketVaultAbi } from "@/lib/blockchain/contracts";
import { normalizeSlippageBps, SlippageControl } from "./slippage-control";

export type TradeMode = "buy" | "sell" | "flip";
type Side = 0 | 1;

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

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return "transaction failed. please try again.";
  if (error.message.toLowerCase().includes("rejected")) return "request rejected in wallet.";
  return error.message.split("\n")[0].slice(0, 180).toLowerCase();
}

export function TradeTicket({ contest, embedded = false, initialAmount, initialMode = "buy", initialSide = 0, initialSlippageBps = 50, onClose, onConfirmed }: TradeTicketProps) {
  const [mode, setMode] = useState<TradeMode>(initialMode);
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState(initialAmount ?? (initialMode === "buy" ? "10" : "0"));
  const [slippageBps, setSlippageBps] = useState(normalizeSlippageBps(initialSlippageBps));
  const [status, setStatus] = useState("enter an amount to receive a live quote.");
  const [lastHash, setLastHash] = useState<Hash>();
  const [isActing, setIsActing] = useState(false);
  const [actingLabel, setActingLabel] = useState("confirm in wallet");
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
  const { data: flipQuote, isFetching: flipLoading, refetch: refetchFlip } = useReadContract({
    address: marketVault, abi: marketVaultAbi, functionName: "previewFlip", args: [side, input],
    query: { enabled: mode === "flip" && input > 0n, refetchInterval: 8_000 },
  });
  const { data: balance = 0n, refetch: refetchBalance } = useReadContract({
    address: activeToken, abi: erc20Abi, functionName: "balanceOf", args: [address ?? zeroAddress],
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });
  const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
    address: activeToken, abi: erc20Abi, functionName: "allowance", args: [address ?? zeroAddress, marketVault],
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });

  const quoteLoading = buyLoading || sellLoading || flipLoading;
  const fee = mode === "buy" ? (buyQuote?.feeUnits ?? 0n) : mode === "sell" ? (sellQuote?.feeUnits ?? 0n) : (flipQuote?.feeUnits ?? 0n);
  const output = mode === "buy" ? (buyQuote?.tokenOutputWei ?? 0n) : mode === "sell" ? (sellQuote?.netOutputUnits ?? 0n) : (flipQuote?.destinationTokenOutputWei ?? 0n);
  const outputDecimals = mode === "sell" ? 6 : 18;
  const minimumOutput = (output * BigInt(10_000 - slippageBps)) / 10_000n;
  const quoteReady = mode === "buy" ? Boolean(buyQuote) : mode === "sell" ? Boolean(sellQuote) : Boolean(flipQuote);

  function changeMode(nextMode: TradeMode) {
    setMode(nextMode);
    setAmount(nextMode === "buy" ? "10" : "0");
    setLastHash(undefined);
    setStatus("enter an amount to receive a live quote.");
  }

  async function submitAndWait(hash: Hash, label: string) {
    if (!publicClient) throw new Error("rpc client is not ready.");
    setActingLabel(`${label}…`);
    setLastHash(hash);
    setStatus(`${label} submitted. waiting for confirmation…`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${label} reverted onchain.`);
    setStatus(`${label} confirmed in block ${receipt.blockNumber}.`);
  }

  async function ensureReady() {
    if (!isConnected) {
      if (openConnectModal) {
        openConnectModal();
        return false;
      }
      if (!connectors[0]) throw new Error("no injected wallet was detected.");
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
    await submitAndWait(hash, `approve ${amount || "0"} ${mode === "buy" ? "test usdc" : `side ${side === 0 ? "a" : "b"}`}`);
    await refetchAllowance();
  }

  async function act() {
    setIsActing(true);
    setActingLabel("confirm in wallet");
    setLastHash(undefined);
    try {
      if (!(await ensureReady())) return;
      if (!address) throw new Error("connect a wallet first.");
      if (input <= 0n) throw new Error("enter a positive amount.");
      if (!quoteReady || output <= 0n) throw new Error("a valid live quote is required.");

      if (balance < input) {
        if (mode !== "buy") throw new Error(`insufficient side ${side === 0 ? "a" : "b"} balance.`);
        const hash = await writeContractAsync({
          address: contracts.settlementToken, abi: erc20Abi, functionName: "mint",
          args: [address, parseUnits("10000", 6)], chainId: robinhoodTestnet.id,
        });
        await submitAndWait(hash, "test usdc mint");
        await refetchBalance();
        return;
      }

      if (allowance < input) {
        await approveInput();
      }

      const deadline = BigInt(Math.floor(Date.now() / 1_000) + 10 * 60);
      if (!publicClient) throw new Error("rpc client is not ready.");
      if (mode === "buy") {
        const simulation = await publicClient.simulateContract({ account: address, address: marketVault, abi: marketVaultAbi, functionName: "buy", args: [side, input, minimumOutput, deadline, referrer] });
        await submitAndWait(await writeContractAsync(simulation.request), `back side ${side === 0 ? "a" : "b"}`);
      } else if (mode === "sell") {
        const simulation = await publicClient.simulateContract({ account: address, address: marketVault, abi: marketVaultAbi, functionName: "sell", args: [side, input, minimumOutput, deadline] });
        await submitAndWait(await writeContractAsync(simulation.request), `sell side ${side === 0 ? "a" : "b"}`);
      } else {
        const simulation = await publicClient.simulateContract({ account: address, address: marketVault, abi: marketVaultAbi, functionName: "flip", args: [side, input, minimumOutput, deadline] });
        await submitAndWait(await writeContractAsync(simulation.request), `flip side ${side === 0 ? "a" : "b"} into side ${side === 0 ? "b" : "a"}`);
      }
      await Promise.all([refetchBalance(), refetchAllowance(), refetchBuy(), refetchSell(), refetchFlip()]);
      onConfirmed();
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setIsActing(false);
    }
  }

  const sourceSymbol = side === 0 ? contest.metadata.sideA.symbol : contest.metadata.sideB.symbol;
  const effectiveSymbol = mode === "sell" ? "usdc" : mode === "buy" ? (side === 0 ? contest.metadata.sideA.symbol : contest.metadata.sideB.symbol) : (side === 0 ? contest.metadata.sideB.symbol : contest.metadata.sideA.symbol);
  const formattedOutput = Number(formatUnits(output, outputDecimals)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  let actionLabel = mode === "buy" ? `buy ${formattedOutput} ${effectiveSymbol}` : mode === "sell" ? `sell for ${formattedOutput} ${effectiveSymbol}` : `flip into ${formattedOutput} ${effectiveSymbol}`;
  if (!isConnected) actionLabel = "connect wallet";
  else if (chainId !== robinhoodTestnet.id) actionLabel = "switch to robinhood testnet";
  else if (mode === "buy" && balance < input) actionLabel = "mint 10,000 test usdc";
  else if (mode !== "buy" && balance < input) actionLabel = "insufficient token balance";
  else if (allowance < input) actionLabel = mode === "buy" ? `approve & buy ${formattedOutput} ${effectiveSymbol}` : `approve & ${mode} ${sourceSymbol}`;
  const isDirectTrade = isConnected && chainId === robinhoodTestnet.id && balance >= input && allowance >= input;

  const balanceDecimals = mode === "buy" ? 6 : 18;
  const balanceLabel = Number(formatUnits(balance, balanceDecimals)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  const amountSymbol = mode === "buy" ? "usdc" : sourceSymbol;
  const defaultStatus = "enter an amount to receive a live quote.";

  return (
    <div className={embedded ? "tradeTicket tradeTicketEmbedded" : "tradeTicket"} role={embedded ? undefined : "dialog"} aria-label={embedded ? "trade execution" : "trade drawer"}>
      {!embedded && <div className="ticketHeader">
        <div><p className="eyebrow">trade drawer</p><h2>move the market</h2></div>
        {onClose ? <button aria-label="close trade drawer" className="iconButton" onClick={onClose} type="button"><CloseIcon /></button> : <span className="liveDot">live</span>}
      </div>}
      <div className="ticketTabs">{(["buy", "sell", "flip"] as const).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => changeMode(item)} type="button">{item}</button>)}</div>
      <div className="sideSelector">
        <button className={side === 0 ? "sideA selected" : "sideA"} onClick={() => setSide(0)} type="button">{mode === "flip" ? "from " : ""}side a</button>
        <button className={side === 1 ? "sideB selected" : "sideB"} onClick={() => setSide(1)} type="button">{mode === "flip" ? "from " : ""}side b</button>
      </div>

      {embedded ? <>
        <label className="compactAmountField">
          <span>{mode === "buy" ? "you pay" : "token amount"}</span>
          <input aria-label={`${mode === "buy" ? "you pay" : "token amount"} ${amountSymbol}`} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
          <b>{amountSymbol}</b>
        </label>
        <div className="compactBalance"><span>balance {balanceLabel}</span><button disabled={!isConnected || balance === 0n} onClick={() => setAmount(formatUnits(balance, balanceDecimals))} type="button">max</button></div>
        <button className={side === 0 ? "tradeAction actionA" : "tradeAction actionB"} disabled={isActing || input <= 0n || (mode !== "buy" && balance < input)} onClick={() => void act()} type="button">{isActing ? actingLabel : isDirectTrade && quoteLoading ? "updating quote…" : actionLabel}</button>
        <div className="compactTradeFooter">
          <SlippageControl onChange={setSlippageBps} value={slippageBps} />
          <button aria-controls={detailsId} aria-expanded={detailsOpen} className="tradeDetailsTrigger" onClick={() => setDetailsOpen((current) => !current)} title="show transaction details" type="button"><InfoIcon /><span>details</span></button>
        </div>
        {detailsOpen && <div className="compactTradeDetails" id={detailsId}>
          {mode === "sell" && <div><span>gross usdc</span><span>{formatUnits(sellQuote?.grossOutputUnits ?? 0n, 6)}</span></div>}
          {mode === "flip" && <div><span>source gross</span><span>{formatUnits(flipQuote?.sourceGrossOutputUnits ?? 0n, 6)} usdc</span></div>}
          <div><span>minimum received</span><span>{formatUnits(minimumOutput, outputDecimals)} {effectiveSymbol}</span></div>
          <div><span>trading fee</span><span>{formatUnits(fee, 6)} usdc · 1%</span></div>
          <div><span>deadline</span><span>10 minutes</span></div>
          {mode === "buy" && referrer !== zeroAddress && <div><span>referrer</span><span>{referrer.slice(0, 6)}…{referrer.slice(-4)}</span></div>}
          {mode === "flip" && <p>one atomic transaction · source is burned only if destination output succeeds</p>}
          <small>real testnet transaction · minimum received is protected onchain</small>
        </div>}
        {(status !== defaultStatus || lastHash) && <p className="ticketStatus" aria-live="polite">{status}</p>}
        {lastHash ? <a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${lastHash}`} rel="noreferrer" target="_blank">view transaction ↗</a> : null}
      </> : <>
        <label className="amountField">
          <span>{mode === "buy" ? "you pay" : "token amount"}</span>
          <div><input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} /><b>{amountSymbol}</b></div>
          <small>balance {balanceLabel}</small>
        </label>
        <div className="quickAmounts">{(mode === "buy" ? ["10", "100", "1000"] : ["25%", "50%", "100%"]).map((value) => <button key={value} onClick={() => setAmount(value.endsWith("%") ? formatUnits((balance * BigInt(value.slice(0, -1))) / 100n, 18) : value)} type="button">{value.endsWith("%") ? value : `${value} usdc`}</button>)}</div>
        <div className="quoteSummary">
          <div><span>{mode === "flip" ? "destination output" : "you receive"}</span><strong>{quoteLoading ? "quoting…" : `${Number(formatUnits(output, outputDecimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${effectiveSymbol}`}</strong></div>
          {mode === "sell" && <div><span>gross usdc</span><span>{formatUnits(sellQuote?.grossOutputUnits ?? 0n, 6)}</span></div>}
          {mode === "flip" && <div><span>source gross</span><span>{formatUnits(flipQuote?.sourceGrossOutputUnits ?? 0n, 6)} usdc</span></div>}
          <div><span>minimum received</span><span>{formatUnits(minimumOutput, outputDecimals)} {effectiveSymbol}</span></div>
          <div><span>trading fee</span><span>{formatUnits(fee, 6)} usdc · 1%</span></div>
        </div>
        {mode === "flip" && <p className="atomicNote">one atomic transaction · one fee · source is burned only if destination output succeeds</p>}
        <div className="ticketExecutionSettings"><SlippageControl onChange={setSlippageBps} value={slippageBps} /><span>10 minute deadline</span></div>
        <button className={side === 0 ? "tradeAction actionA" : "tradeAction actionB"} disabled={isActing || input <= 0n || (mode !== "buy" && balance < input)} onClick={() => void act()} type="button">{isActing ? actingLabel : actionLabel}</button>
        <p className="ticketStatus" aria-live="polite">{status}</p>
        {lastHash ? <a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${lastHash}`} rel="noreferrer" target="_blank">view transaction ↗</a> : null}
        <div className="ticketFootnote">real testnet transaction · minimum received is protected onchain</div>
      </>}
    </div>
  );
}
