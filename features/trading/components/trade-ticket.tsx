"use client";

import { useState } from "react";
import {
  formatUnits,
  parseUnits,
  zeroAddress,
  type Hash,
} from "viem";
import {
  useAccount,
  useConnect,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import {
  contracts,
  demoContest,
  erc20Abi,
  marketVaultAbi,
} from "@/lib/blockchain/contracts";

type Side = 0 | 1;

function parseUsdc(value: string) {
  try {
    return parseUnits(value || "0", 6);
  } catch {
    return 0n;
  }
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Transaction failed. Please try again.";
  if (error.message.toLowerCase().includes("rejected")) return "Request rejected in wallet.";
  return error.message.split("\n")[0].slice(0, 180);
}

export function TradeTicket({ onConfirmed }: { onConfirmed: () => void }) {
  const [side, setSide] = useState<Side>(0);
  const [amount, setAmount] = useState("10");
  const [status, setStatus] = useState("Enter an amount to receive a live quote.");
  const [lastHash, setLastHash] = useState<Hash>();
  const [isActing, setIsActing] = useState(false);
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });

  const grossInput = parseUsdc(amount);

  const { data: quote, isFetching: quoteLoading, refetch: refetchQuote } =
    useReadContract({
      address: demoContest.marketVault,
      abi: marketVaultAbi,
      functionName: "previewBuy",
      args: [side, grossInput],
      query: { enabled: grossInput > 0n, refetchInterval: 8_000 },
    });
  const { data: balance = 0n, refetch: refetchBalance } = useReadContract({
    address: contracts.settlementToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });
  const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
    address: contracts.settlementToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? zeroAddress, demoContest.marketVault],
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });

  const output = quote?.tokenOutputWei ?? 0n;
  const minimumOutput = (output * 9_950n) / 10_000n;
  const fee = quote?.feeUnits ?? 0n;

  async function submitAndWait(hash: Hash, label: string) {
    if (!publicClient) throw new Error("RPC client is not ready.");
    setLastHash(hash);
    setStatus(`${label} submitted. Waiting for confirmation…`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`${label} reverted onchain.`);
    setStatus(`${label} confirmed in block ${receipt.blockNumber}.`);
    return receipt;
  }

  async function ensureReady() {
    if (!isConnected) {
      if (!connectors[0]) throw new Error("No injected wallet was detected.");
      connect({ connector: connectors[0] });
      return false;
    }
    if (chainId !== robinhoodTestnet.id) {
      await switchChainAsync({ chainId: robinhoodTestnet.id });
      return false;
    }
    return true;
  }

  async function act() {
    setIsActing(true);
    setLastHash(undefined);
    try {
      if (!(await ensureReady())) return;
      if (!address) throw new Error("Connect a wallet first.");
      if (grossInput <= 0n) throw new Error("Enter a positive amount.");
      if (!quote || output <= 0n) throw new Error("A valid live quote is required.");

      if (balance < grossInput) {
        const hash = await writeContractAsync({
          address: contracts.settlementToken,
          abi: erc20Abi,
          functionName: "mint",
          args: [address, parseUnits("10000", 6)],
          chainId: robinhoodTestnet.id,
        });
        await submitAndWait(hash, "Test USDC mint");
        await refetchBalance();
        return;
      }

      if (allowance < grossInput) {
        const hash = await writeContractAsync({
          address: contracts.settlementToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [demoContest.marketVault, grossInput],
          chainId: robinhoodTestnet.id,
        });
        await submitAndWait(hash, "Exact approval");
        await refetchAllowance();
        return;
      }

      const deadline = BigInt(Math.floor(Date.now() / 1_000) + 10 * 60);
      const simulation = await publicClient?.simulateContract({
        account: address,
        address: demoContest.marketVault,
        abi: marketVaultAbi,
        functionName: "buy",
        args: [side, grossInput, minimumOutput, deadline, zeroAddress],
      });
      if (!simulation) throw new Error("Unable to simulate this trade.");
      setStatus("Simulation passed. Confirm the BUY in your wallet…");
      const hash = await writeContractAsync(simulation.request);
      await submitAndWait(hash, `Back ${side === 0 ? "Side A" : "Side B"}`);
      await Promise.all([refetchBalance(), refetchAllowance(), refetchQuote()]);
      onConfirmed();
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setIsActing(false);
    }
  }

  let actionLabel = `Back ${side === 0 ? "Side A" : "Side B"}`;
  if (!isConnected) actionLabel = "Connect wallet";
  else if (chainId !== robinhoodTestnet.id) actionLabel = "Switch to Robinhood Testnet";
  else if (balance < grossInput) actionLabel = "Mint 10,000 Test USDC";
  else if (allowance < grossInput) actionLabel = `Approve ${amount || "0"} Test USDC`;

  return (
    <div className="tradeTicket">
      <div className="ticketHeader"><div><p className="eyebrow">Trade ticket</p><h2>Back a side</h2></div><span className="liveDot">Live</span></div>
      <div className="ticketTabs"><button className="active" type="button">Back</button><button disabled type="button">Sell</button><button disabled type="button">Flip</button></div>
      <div className="sideSelector">
        <button className={side === 0 ? "sideA selected" : "sideA"} onClick={() => setSide(0)} type="button">Side A</button>
        <button className={side === 1 ? "sideB selected" : "sideB"} onClick={() => setSide(1)} type="button">Side B</button>
      </div>
      <label className="amountField">
        <span>You pay</span>
        <div><input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} /><b>USDC</b></div>
        <small>Balance {formatUnits(balance, 6)} Test USDC</small>
      </label>
      <div className="quickAmounts">{["10", "100", "1000"].map((value) => <button key={value} onClick={() => setAmount(value)} type="button">${value}</button>)}</div>
      <div className="quoteSummary">
        <div><span>You receive</span><strong>{quoteLoading ? "Quoting…" : `${Number(formatUnits(output, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${side === 0 ? demoContest.sideA.symbol : demoContest.sideB.symbol}`}</strong></div>
        <div><span>Minimum received</span><span>{formatUnits(minimumOutput, 18)}</span></div>
        <div><span>Trading fee</span><span>{formatUnits(fee, 6)} USDC · 1%</span></div>
      </div>
      <button className={side === 0 ? "tradeAction actionA" : "tradeAction actionB"} disabled={isActing || grossInput <= 0n} onClick={() => void act()} type="button">{isActing ? "Working…" : actionLabel}</button>
      <p className="ticketStatus" aria-live="polite">{status}</p>
      {lastHash ? <a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${lastHash}`} rel="noreferrer" target="_blank">View transaction ↗</a> : null}
      <div className="ticketFootnote">Real Testnet transaction · 0.5% slippage · 10 minute deadline</div>
    </div>
  );
}
