"use client";

import { useChainModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { zeroAddress, type Hash } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { contracts, feeVaultAbi } from "@/lib/blockchain/contracts";
import { formatUsdcUnits } from "@/lib/formatters/usdc";
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";

function claimError(error: unknown): MessageKey | string {
  if (!(error instanceof Error)) return "earnings.failed";
  const message = error.message.toLowerCase();
  if (message.includes("rejected") || message.includes("denied")) return "earnings.rejected";
  if (message.includes("nothingtoclaim")) return "earnings.nothingError";
  if (message.includes("claimsarepaused")) return "earnings.pausedError";
  if (message.includes("claim reverted onchain")) return "earnings.reverted";
  return error.message.split("\n")[0].slice(0, 180);
}

export function EarningsClaimPanel({ onConfirmed }: { onConfirmed?: () => void } = {}) {
  const { t } = useI18n();
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });
  const { writeContractAsync, isPending } = useWriteContract();
  const [statusKey, setStatusKey] = useState<MessageKey>("earnings.connectStatus");
  const [statusValues, setStatusValues] = useState<Record<string, string | number>>({});
  const [rawStatus, setRawStatus] = useState("");
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

  const amount = formatUsdcUnits(claimable);
  let actionLabel = t("earnings.claim", { amount });
  let disabled = isPending || isFetching || claimPaused || claimable === 0n;
  if (!isConnected) {
    actionLabel = t("earnings.connectToClaim");
    disabled = !openConnectModal;
  } else if (chainId !== robinhoodTestnet.id) {
    actionLabel = t("earnings.switchToClaim");
    disabled = !openChainModal;
  } else if (isFetching) actionLabel = t("earnings.checking");
  else if (claimPaused) actionLabel = t("earnings.paused");
  else if (claimable === 0n) actionLabel = t("earnings.nothing");
  else if (isPending) actionLabel = t("earnings.confirmWallet");

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
      setRawStatus("");
      setStatusKey("earnings.submitted");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("claim reverted onchain.");
      await refetch();
      onConfirmed?.();
      setStatusKey("earnings.confirmed");
      setStatusValues({ block: receipt.blockNumber.toString() });
      setStatusTone("positive");
    } catch (error) {
      const errorStatus = claimError(error);
      if (errorStatus.startsWith("earnings.")) {
        setStatusKey(errorStatus as MessageKey);
        setRawStatus("");
      } else setRawStatus(errorStatus);
      setStatusTone("negative");
    }
  }

  return (
    <div className="earningsClaim">
      <div className="earningsClaimValue">
        <div><span>{t("earnings.vaultClaimable")}</span><strong>{isConnected ? amount : "—"} usdc</strong></div>
        <small>{t("chain.testnet")}</small>
      </div>
      <div className="earningsClaimActions">
        <button className="button buttonPrimary" disabled={disabled} onClick={claim} type="button">{actionLabel}</button>
      </div>
      <p aria-live="polite" className="earningsClaimStatus" data-tone={statusTone}>{rawStatus || t(statusKey, statusValues)}</p>
      {lastHash && <a className="earningsClaimTx" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${lastHash}`} rel="noreferrer" target="_blank">{t("common.viewTransaction")}</a>}
    </div>
  );
}
