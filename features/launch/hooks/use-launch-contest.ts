"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bytesToHex, decodeEventLog, parseUnits, zeroAddress, type Address, type Hash, type Hex } from "viem";
import { useAccount, useConnect, usePublicClient, useReadContract, useSignMessage, useSwitchChain, useWriteContract } from "wagmi";

import { getContest } from "@/lib/api/contests";
import { prepareContestMetadata, uploadContestLogo } from "@/lib/api/metadata";
import { ensureWriteSession as getWriteSession } from "@/lib/api/write-session";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { contestCreationFeeUnits, contracts, erc20Abi, factoryAbi, marketVaultAbi, supportsPermissionlessMint } from "@/lib/blockchain/contracts";
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageKey, MessageValues } from "@/lib/i18n/messages";

export type LaunchContestInput = {
  title: string;
  description: string;
  category: string;
  stockIds?: string[];
  region?: string;
  contentLanguage?: string;
  referenceUrl?: string;
  sideAName: string;
  sideASymbol: string;
  sideBName: string;
  sideBSymbol: string;
  sideALogo?: File;
  sideBLogo?: File;
  initialSide: "none" | "a" | "b";
  initialAmount: string;
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function transactionError(error: unknown): MessageKey | string {
  if (!(error instanceof Error)) return "launch.status.failed";
  const message = error.message.toLowerCase();
  if (message.includes("rejected") || message.includes("denied")) return "launch.status.rejected";
  if (message.includes("insufficient funds")) return "launch.status.gas";
  if (message.includes("duplicatesides")) return "launch.status.duplicate";
  if (message.includes("creationispaused")) return "launch.status.paused";
  if (message.includes("token tickers must")) return "launch.status.ticker";
  if (message.includes("token tickers must be different")) return "launch.status.tickerDuplicate";
  if (message.includes("initial position amount")) return "launch.status.initialRequired";
  if (message.includes("market address was not found")) return "launch.status.marketMissing";
  if (message.includes("rpc client is not ready")) return "launch.status.rpc";
  if (message.includes("no wallet connector")) return "launch.status.noConnector";
  return error.message.split("\n")[0].slice(0, 200).toLowerCase();
}

export function tokenSymbol(name: string, fallback: string) {
  const symbol = normalizeTokenSymbol(name);
  return symbol || fallback;
}

export function normalizeTokenSymbol(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
}

export function useLaunchContest() {
  const { t } = useI18n();
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { connectors, connect } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ key: MessageKey; values?: MessageValues } | { raw: string }>({ key: "launch.status.connect" });
  const [transactionHash, setTransactionHash] = useState<Hash>();

  const { data: balance = 0n, refetch: refetchBalance } = useReadContract({
    address: contracts.settlementToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address), refetchInterval: 10_000 },
  });
  const { data: factoryAllowance = 0n, refetch: refetchFactoryAllowance } = useReadContract({
    address: contracts.settlementToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? zeroAddress, contracts.factory],
    query: { enabled: Boolean(address), refetchInterval: 10_000 },
  });

  const setLocalizedStatus = (key: MessageKey, values?: MessageValues) => setStatusMessage({ key, values });
  const status = "raw" in statusMessage ? statusMessage.raw : t(statusMessage.key, statusMessage.values);

  async function confirm(hash: Hash, labelKey: MessageKey) {
    if (!publicClient) throw new Error("rpc client is not ready.");
    setTransactionHash(hash);
    setLocalizedStatus("launch.status.submitted", { label: t(labelKey) });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    if (receipt.status !== "success") throw new Error(`${t(labelKey)} reverted onchain.`);
    return receipt;
  }

  async function ensureWallet() {
    if (!isConnected || !address) {
      if (openConnectModal) openConnectModal();
      else if (connectors[0]) connect({ connector: connectors[0] });
      else throw new Error("no wallet connector is available.");
      return false;
    }
    if (chainId !== robinhoodTestnet.id) await switchChainAsync({ chainId: robinhoodTestnet.id });
    return true;
  }

  async function ensureTestUsdc(requiredUnits: bigint, account: Address) {
    if (balance >= requiredUnits) return;
    if (!supportsPermissionlessMint) throw new Error(t("trade.insufficientBalance", { symbol: "USDC" }));
    setLocalizedStatus("launch.status.faucet");
    const mintAmount = requiredUnits > parseUnits("10000", 6) ? requiredUnits : parseUnits("10000", 6);
    await confirm(await writeContractAsync({
      address: contracts.settlementToken,
      abi: erc20Abi,
      functionName: "mint",
      args: [account, mintAmount],
      chainId: robinhoodTestnet.id,
    }), "launch.status.mint");
    await refetchBalance();
  }

  async function waitUntilIndexed(contestId: Hex) {
    setLocalizedStatus("launch.status.indexer");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        await getContest(robinhoodTestnet.id, contestId);
        return;
      } catch {
        await wait(2_000);
      }
    }
  }

  async function ensureWriteSession(account: Address) {
    setLocalizedStatus("launch.status.session");
    return getWriteSession(account, (message) => signMessageAsync({ message }));
  }

  async function launch(input: LaunchContestInput) {
    if (!(await ensureWallet())) return;
    if (!address || !publicClient) return;
    setIsBusy(true);
    setTransactionHash(undefined);
    try {
      const sideASymbol = normalizeTokenSymbol(input.sideASymbol);
      const sideBSymbol = normalizeTokenSymbol(input.sideBSymbol);
      if (!/^[A-Z0-9]{2,12}$/.test(sideASymbol) || !/^[A-Z0-9]{2,12}$/.test(sideBSymbol)) {
        throw new Error("token tickers must use 2–12 letters or numbers.");
      }
      if (sideASymbol === sideBSymbol) throw new Error("side a and side b token tickers must be different.");
      const initialUnits = input.initialSide === "none" ? 0n : parseUnits(input.initialAmount || "0", 6);
      if (input.initialSide !== "none" && initialUnits <= 0n) throw new Error("enter an initial position amount or select no initial position.");

      const writeToken = await ensureWriteSession(address);
      setLocalizedStatus("launch.status.uploading");
      const [sideAAsset, sideBAsset] = await Promise.all([
        input.sideALogo ? uploadContestLogo(input.sideALogo, writeToken) : null,
        input.sideBLogo ? uploadContestLogo(input.sideBLogo, writeToken) : null,
      ]);
      setLocalizedStatus("launch.status.metadata");
      const prepared = await prepareContestMetadata({
        creatorAddress: address,
        title: input.title,
        description: input.description,
        category: input.category,
        ...(input.category === "stocks" ? { stockIds: input.stockIds } : {}),
        region: input.region,
        contentLanguage: input.contentLanguage,
        referenceUrl: input.referenceUrl || undefined,
        sideAName: input.sideAName,
        sideASymbol,
        sideALogoHash: sideAAsset?.contentHash,
        sideBName: input.sideBName,
        sideBSymbol,
        sideBLogoHash: sideBAsset?.contentHash,
      }, writeToken);
      const userSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
      const contestId = await publicClient.readContract({
        address: contracts.factory,
        abi: factoryAbi,
        functionName: "computeContestId",
        args: [address, userSalt, prepared.metadataHash as Hex],
      });

      await ensureTestUsdc(contestCreationFeeUnits + initialUnits, address);
      if (factoryAllowance < contestCreationFeeUnits) {
        setLocalizedStatus("launch.status.feeApproval");
        await confirm(await writeContractAsync({
          address: contracts.settlementToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [contracts.factory, contestCreationFeeUnits],
          chainId: robinhoodTestnet.id,
        }), "launch.status.factoryApproval");
        await refetchFactoryAllowance();
      }

      const params = {
        userSalt,
        metadataHash: prepared.metadataHash as Hex,
        metadataURI: prepared.metadataUri,
        sideAName: input.sideAName,
        sideASymbol,
        sideBName: input.sideBName,
        sideBSymbol,
      } as const;
      setLocalizedStatus("launch.status.confirmLaunch");
      const simulation = await publicClient.simulateContract({
        account: address,
        address: contracts.factory,
        abi: factoryAbi,
        functionName: "createContest",
        args: [params],
      });
      const receipt = await confirm(await writeContractAsync(simulation.request), "launch.status.contestLaunch");

      if (initialUnits > 0n) {
        const decoded = receipt.logs
          .filter((log) => log.address.toLowerCase() === contracts.factory.toLowerCase())
          .map((log) => {
            try {
              return decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
            } catch {
              return null;
            }
          })
          .find((event) => event?.eventName === "ContestCreated");
        const marketVault = decoded?.eventName === "ContestCreated" ? decoded.args.marketVault : undefined;
        if (!marketVault) throw new Error("contest launched, but its market address was not found in the receipt.");
        setLocalizedStatus("launch.status.initialApproval");
        await confirm(await writeContractAsync({
          address: contracts.settlementToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [marketVault, initialUnits],
          chainId: robinhoodTestnet.id,
        }), "launch.status.initialApprovalLabel");
        const side = input.initialSide === "a" ? 0 : 1;
        const quote = await publicClient.readContract({ address: marketVault, abi: marketVaultAbi, functionName: "previewBuy", args: [side, initialUnits] });
        const minimumOutput = quote.tokenOutputWei * 9_950n / 10_000n;
        const deadline = BigInt(Math.floor(Date.now() / 1_000) + 10 * 60);
        const buy = await publicClient.simulateContract({ account: address, address: marketVault, abi: marketVaultAbi, functionName: "buy", args: [side, initialUnits, minimumOutput, deadline, zeroAddress] });
        await confirm(await writeContractAsync(buy.request), "launch.status.initialPosition");
      }

      await waitUntilIndexed(contestId);
      setLocalizedStatus("launch.status.live");
      router.push(`/contest/${contestId}`);
    } catch (error) {
      const nextStatus = transactionError(error);
      if (nextStatus.startsWith("launch.")) setLocalizedStatus(nextStatus as MessageKey);
      else setStatusMessage({ raw: nextStatus });
    } finally {
      setIsBusy(false);
    }
  }

  return { address, balance, chainId, isConnected, isBusy, launch, status, transactionHash };
}
