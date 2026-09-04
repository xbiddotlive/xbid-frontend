"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { robinhoodTestnet } from "@/lib/blockchain/chain";
import { useI18n } from "@/lib/i18n/locale-context";

const robinhoodMainnetId = 4663;

export function ChainSelector() {
  const [open, setOpen] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { chainId, isConnected } = useAccount();
  const { t } = useI18n();
  const { isPending, switchChainAsync } = useSwitchChain();
  const selectedChainId = isConnected ? chainId : robinhoodTestnet.id;
  const isTestnet = selectedChainId === robinhoodTestnet.id;
  const isMainnet = selectedChainId === robinhoodMainnetId;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const switchToTestnet = async () => {
    if (!isConnected || isTestnet || isPending) return;
    setSwitchError("");
    try {
      await switchChainAsync({ chainId: robinhoodTestnet.id });
      setOpen(false);
    } catch {
      setSwitchError(t("chain.cancelled"));
    }
  };

  return (
    <div className="chainSelector" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("chain.select")}
        className={`chainSelectorTrigger${isTestnet ? " isReady" : " isUnavailable"}`}
        onClick={() => {
          setSwitchError("");
          setOpen((current) => !current);
        }}
        title={isMainnet ? t("chain.mainnetSoon") : t("chain.testnet")}
        type="button"
      >
        <Image alt="" height={24} priority src="/icons/robinhood-chain-avatar.jpg" width={24} />
        <span aria-hidden="true" className="chainSelectorStatus" />
      </button>

      {open ? (
        <div className="chainSelectorMenu" id={menuId} role="menu">
          <div className="chainSelectorHeading">
            <span>{t("chain.network")}</span>
            <small>{t("chain.name")}</small>
          </div>

          <button
            aria-current={isTestnet ? "true" : undefined}
            className="chainOption"
            disabled={!isConnected || isTestnet || isPending}
            onClick={switchToTestnet}
            role="menuitem"
            type="button"
          >
            <Image alt="" height={24} src="/icons/robinhood-chain-avatar.jpg" width={24} />
            <span className="chainOptionCopy">
              <strong>{t("chain.testnet")}</strong>
              <small>{t("chain.id", { id: 46630 })}</small>
            </span>
            <span className="chainOptionState">{isPending ? t("chain.switching") : isTestnet ? t("chain.active") : t("chain.switch")}</span>
          </button>

          <button
            aria-current={isMainnet ? "true" : undefined}
            className="chainOption isComingSoon"
            disabled
            role="menuitem"
            type="button"
          >
            <Image alt="" height={24} src="/icons/robinhood-chain-avatar.jpg" width={24} />
            <span className="chainOptionCopy">
              <strong>{t("chain.mainnet")}</strong>
              <small>{t("chain.id", { id: 4663 })}</small>
            </span>
            <span className="chainOptionState">{t("chain.comingSoon")}</span>
          </button>

          {switchError ? <p className="chainSelectorError" role="status">{switchError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
