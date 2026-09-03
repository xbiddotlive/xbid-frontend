"use client";

import { useChainModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { formatUnits, zeroAddress, type Hash } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { contracts, feeVaultAbi } from "@/lib/blockchain/contracts";

function displayUsdc(value: bigint) {
  const [whole, fraction = ""] = formatUnits(value, 6).split(".");
  const trimmed = fraction.replace(/0+$/, "").slice(0, 4);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}${trimmed ? `.${trimmed}` : ""}`;
}

function claimError(error: unknown) {
  if (!(error instanceof Error)) return "claim failed. please try again.";
  const message = error.message.toLowerCase();
  if (message.includes("rejected") || message.includes("denied")) return "claim was rejected in the wallet.";
  if (message.includes("nothingtoclaim")) return "there is currently nothing to claim.";
  if (message.includes("claimsarepaused")) return "claims are temporarily paused.";
  return error.message.split("\n")[0].slice(0, 180);
}

export function EarningsClaimPanel({ onConfirmed }: { onConfirmed?: () => void } = {}) {
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });
  const { writeContractAsync, isPending } = useWriteContract();
  const [status, setStatus] = useState("connect your wallet to read the live fee vault balance.");
  const [statusTone, setStatusTone] = useState<"neutral" | "positive" | "negative">("neutral");
  const [lastHash, setLastHash] = useState<Hash>();

  const { data: claimable = 0n, isFetching, refetch } = useReadContract({
    address: contracts.feeVault,
    abi: feeVaultAbi,
    functionName: "claimable",
    args: [address ?? zeroAddress],
    chainId: robinhoodTestnet.id,
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });
  const { data: claimPaused = false } = useReadContract({
    address: contracts.feeVault,
    abi: feeVaultAbi,
    functionName: "claimPaused",
    chainId: robinhoodTestnet.id,
    query: { refetchInterval: 8_000 },
  });

  const amount = displayUsdc(claimable);
  let actionLabel = `claim ${amount} usdc`;
  let disabled = isPending || isFetching || claimPaused || claimable === 0n;
  if (!isConnected) {
    actionLabel = "connect to claim";
    disabled = !openConnectModal;
  } else if (chainId !== robinhoodTestnet.id) {
    actionLabel = "switch network to claim";
    disabled = !openChainModal;
  } else if (isFetching) actionLabel = "checking claimable…";
  else if (claimPaused) actionLabel = "claims paused";
  else if (claimable === 0n) actionLabel = "nothing to claim";
  else if (isPending) actionLabel = "confirm in wallet…";

  async function claim() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (chainId !== robinhoodTestnet.id) {
      openChainModal?.();
      return;
    }
    if (!publicClient || claimPaused || claimable === 0n) return;

    setLastHash(undefined);
    setStatusTone("neutral");
    try {
      const hash = await writeContractAsync({
        address: contracts.feeVault,
        abi: feeVaultAbi,
        functionName: "claimFees",
        chainId: robinhoodTestnet.id,
      });
      setLastHash(hash);
      setStatus("Claim submitted. Waiting for confirmation…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("claim reverted onchain.");
      await refetch();
      onConfirmed?.();
      setStatus(`Claim confirmed in block ${receipt.blockNumber}.`);
      setStatusTone("positive");
    } catch (error) {
      setStatus(claimError(error));
      setStatusTone("negative");
    }
  }

  return (
    <div className="earningsClaim">
      <div className="earningsClaimValue">
        <div><span>live fee vault claimable</span><strong>{isConnected ? amount : "—"} usdc</strong></div>
        <small>robinhood testnet</small>
      </div>
      <div className="earningsClaimActions">
        <button className="button buttonPrimary" disabled={disabled} onClick={claim} type="button">{actionLabel}</button>
      </div>
      <p aria-live="polite" className="earningsClaimStatus" data-tone={statusTone}>{status}</p>
      {lastHash && <a className="earningsClaimTx" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${lastHash}`} rel="noreferrer" target="_blank">view transaction ↗</a>}
    </div>
  );
}
