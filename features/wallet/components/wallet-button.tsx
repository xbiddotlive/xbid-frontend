"use client";

import { useAccountModal, useChainModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();

  if (!isConnected) {
    return (
      <button
        className="button buttonPrimary"
        disabled={!openConnectModal}
        onClick={openConnectModal}
        type="button"
      >
        connect wallet
      </button>
    );
  }

  if (chainId !== robinhoodTestnet.id) {
    return (
      <button
        className="button buttonPrimary"
        disabled={!openChainModal}
        onClick={openChainModal}
        type="button"
      >
        switch network
      </button>
    );
  }

  return (
    <button className="button buttonQuiet" disabled={!openAccountModal} onClick={openAccountModal} type="button">
      {address ? shortAddress(address) : "account"}
    </button>
  );
}
