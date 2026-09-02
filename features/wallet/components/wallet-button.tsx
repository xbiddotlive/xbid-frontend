"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        className="button buttonPrimary"
        disabled={isPending || connectors.length === 0}
        onClick={() => connectors[0] && connect({ connector: connectors[0] })}
        type="button"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (chainId !== robinhoodTestnet.id) {
    return (
      <button
        className="button buttonPrimary"
        disabled={isSwitching}
        onClick={() => switchChain({ chainId: robinhoodTestnet.id })}
        type="button"
      >
        {isSwitching ? "Switching…" : "Switch network"}
      </button>
    );
  }

  return (
    <button className="button buttonQuiet" onClick={() => disconnect()} type="button">
      {address ? shortAddress(address) : "Disconnect"}
    </button>
  );
}
