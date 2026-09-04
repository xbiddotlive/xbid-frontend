"use client";

import { useAccountModal, useChainModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { useI18n } from "@/lib/i18n/locale-context";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { t } = useI18n();
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
        {t("wallet.connect")}
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
        {t("wallet.switch")}
      </button>
    );
  }

  return (
    <button className="button buttonQuiet" disabled={!openAccountModal} onClick={openAccountModal} type="button">
      {address ? shortAddress(address) : t("wallet.account")}
    </button>
  );
}
