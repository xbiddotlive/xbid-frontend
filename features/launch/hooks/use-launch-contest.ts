"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bytesToHex, decodeEventLog, parseUnits, zeroAddress, type Address, type Hash, type Hex } from "viem";
import { useAccount, useConnect, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";

import { getContest } from "@/lib/api/contests";
import { prepareContestMetadata, uploadContestLogo } from "@/lib/api/metadata";
import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { contestCreationFeeUnits, contracts, erc20Abi, factoryAbi, marketVaultAbi } from "@/lib/blockchain/contracts";

export type LaunchContestInput = {
  title: string;
  description: string;
  category: string;
  referenceUrl?: string;
  sideAName: string;
  sideBName: string;
  sideALogo?: File;
  sideBLogo?: File;
  initialSide: "none" | "a" | "b";
  initialAmount: string;
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function transactionError(error: unknown) {
  if (!(error instanceof Error)) return "launch failed. please try again.";
  const message = error.message.toLowerCase();
  if (message.includes("rejected") || message.includes("denied")) return "request rejected in wallet.";
  if (message.includes("insufficient funds")) return "the wallet needs testnet eth for gas.";
  if (message.includes("duplicatesides")) return "side names and token symbols must be different.";
  if (message.includes("creationispaused")) return "new contest creation is temporarily paused.";
  return error.message.split("\n")[0].slice(0, 200).toLowerCase();
}

export function tokenSymbol(name: string, fallback: string) {
  const symbol = name.normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
  return symbol || fallback;
}

export function useLaunchContest() {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { connectors, connect } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: robinhoodTestnet.id });
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("connect a wallet, then review and launch on testnet.");
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

  async function confirm(hash: Hash, label: string) {
    if (!publicClient) throw new Error("rpc client is not ready.");
    setTransactionHash(hash);
    setStatus(`${label} submitted · waiting for confirmation…`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    if (receipt.status !== "success") throw new Error(`${label} reverted onchain.`);
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
    setStatus("test usdc is required · confirm the faucet mint in your wallet.");
    const mintAmount = requiredUnits > parseUnits("10000", 6) ? requiredUnits : parseUnits("10000", 6);
    await confirm(await writeContractAsync({
      address: contracts.settlementToken,
      abi: erc20Abi,
      functionName: "mint",
      args: [account, mintAmount],
      chainId: robinhoodTestnet.id,
    }), "test usdc mint");
    await refetchBalance();
  }

  async function waitUntilIndexed(contestId: Hex) {
    setStatus("contest confirmed · waiting for the indexer…");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        await getContest(robinhoodTestnet.id, contestId);
        return;
      } catch {
        await wait(2_000);
      }
    }
  }

  async function launch(input: LaunchContestInput) {
    if (!(await ensureWallet())) return;
    if (!address || !publicClient) return;
    setIsBusy(true);
    setTransactionHash(undefined);
    try {
      const sideASymbol = tokenSymbol(input.sideAName, "SIDEA");
      let sideBSymbol = tokenSymbol(input.sideBName, "SIDEB");
      if (sideASymbol === sideBSymbol) sideBSymbol = `${sideBSymbol.slice(0, 11)}B`;
      const initialUnits = input.initialSide === "none" ? 0n : parseUnits(input.initialAmount || "0", 6);
      if (input.initialSide !== "none" && initialUnits <= 0n) throw new Error("enter an initial position amount or select no initial position.");

      setStatus("uploading contest assets…");
      const [sideAAsset, sideBAsset] = await Promise.all([
        input.sideALogo ? uploadContestLogo(input.sideALogo) : null,
        input.sideBLogo ? uploadContestLogo(input.sideBLogo) : null,
      ]);
      setStatus("creating immutable contest metadata…");
      const prepared = await prepareContestMetadata({
        creatorAddress: address,
        title: input.title,
        description: input.description,
        category: input.category,
        referenceUrl: input.referenceUrl || undefined,
        sideAName: input.sideAName,
        sideASymbol,
        sideALogoHash: sideAAsset?.contentHash,
        sideBName: input.sideBName,
        sideBSymbol,
        sideBLogoHash: sideBAsset?.contentHash,
      });
      const userSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
      const contestId = await publicClient.readContract({
        address: contracts.factory,
        abi: factoryAbi,
        functionName: "computeContestId",
        args: [address, userSalt, prepared.metadataHash as Hex],
      });

      await ensureTestUsdc(contestCreationFeeUnits + initialUnits, address);
      if (factoryAllowance < contestCreationFeeUnits) {
        setStatus("approve the 5 test usdc creation fee in your wallet.");
        await confirm(await writeContractAsync({
          address: contracts.settlementToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [contracts.factory, contestCreationFeeUnits],
          chainId: robinhoodTestnet.id,
        }), "factory approval");
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
      setStatus("confirm launch contest in your wallet.");
      const simulation = await publicClient.simulateContract({
        account: address,
        address: contracts.factory,
        abi: factoryAbi,
        functionName: "createContest",
        args: [params],
      });
      const receipt = await confirm(await writeContractAsync(simulation.request), "contest launch");

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
        setStatus("approve the initial backing amount in your wallet.");
        await confirm(await writeContractAsync({
          address: contracts.settlementToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [marketVault, initialUnits],
          chainId: robinhoodTestnet.id,
        }), "initial position approval");
        const side = input.initialSide === "a" ? 0 : 1;
        const quote = await publicClient.readContract({ address: marketVault, abi: marketVaultAbi, functionName: "previewBuy", args: [side, initialUnits] });
        const minimumOutput = quote.tokenOutputWei * 9_950n / 10_000n;
        const deadline = BigInt(Math.floor(Date.now() / 1_000) + 10 * 60);
        const buy = await publicClient.simulateContract({ account: address, address: marketVault, abi: marketVaultAbi, functionName: "buy", args: [side, initialUnits, minimumOutput, deadline, zeroAddress] });
        await confirm(await writeContractAsync(buy.request), "initial position");
      }

      await waitUntilIndexed(contestId);
      setStatus("contest is live · opening the market…");
      router.push(`/contest/${contestId}`);
    } catch (error) {
      setStatus(transactionError(error));
    } finally {
      setIsBusy(false);
    }
  }

  return { address, balance, chainId, isConnected, isBusy, launch, status, transactionHash };
}
