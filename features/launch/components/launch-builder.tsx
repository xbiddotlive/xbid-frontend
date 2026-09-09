"use client";

import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

import { ContestCard } from "@/components/contest/contest-card";
import { StockPicker } from "./stock-picker";
import { selectedStocks, validStockSelection } from "@/lib/product/stock-catalog";
import { SideLogo } from "@/components/contest/side-logo-pair";
import { PlusIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { referenceContest } from "@/lib/blockchain/contracts";
import { contestCategories } from "@/lib/product/contest-categories";
import { robinhoodTestnet, settlementTokenLabel } from "@/lib/blockchain/chain";
import { useI18n } from "@/lib/i18n/locale-context";
import { localeInfo, locales } from "@/lib/i18n/locales";
import { RegionSelect } from "@/components/contest/contest-scope";
import { isRegion, isContentLanguage } from "@/lib/product/contest-scope";
import type { MessageKey } from "@/lib/i18n/messages";
import { normalizeTokenSymbol, tokenSymbol, useLaunchContest } from "../hooks/use-launch-contest";

const logoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxLogoBytes = 2 * 1024 * 1024;
const tokenSymbolPattern = /^[A-Z0-9]{2,12}$/;

type LogoDraft = { file: File; fileName: string; url: string };
type LogoSide = "a" | "b";

async function validateLogo(file: File) {
  if (!logoTypes.has(file.type)) return "launch.logoTypeError" as const;
  if (file.size > maxLogoBytes) return "launch.logoSizeError" as const;

  try {
    const bitmap = await createImageBitmap(file);
    const validSize = bitmap.width >= 256 && bitmap.height >= 256;
    bitmap.close();
    return validSize ? "" : "launch.logoDimensionsError" as const;
  } catch {
    return "launch.logoReadError" as const;
  }
}

function validReferenceUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return ["http:", "https:"].includes(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}

function validInitialPosition(side: "none" | "a" | "b", value: string) {
  if (side === "none") return true;
  const amount = Number(value);
  return value.trim() !== ""
    && Number.isFinite(amount)
    && amount >= 0.01
    && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001;
}

function LogoUploadField({ draft, error, name, onRemove, onSelect, side }: {
  draft: LogoDraft | null;
  error: MessageKey | "";
  name: string;
  onRemove: () => void;
  onSelect: (file: File) => void;
  side: LogoSide;
}) {
  const { t } = useI18n();
  const inputId = `side-${side}-logo`;
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onSelect(file);
    event.currentTarget.value = "";
  };
  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };

  return (
    <div className={`field logoUploadField fieldSide${side.toUpperCase()}`}>
      <span>{t("launch.logo", { side: side.toUpperCase() })} <em className="fieldRequirement">{t("launch.optional")}</em></span>
      <div className="logoDropzone" data-tone={side} onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
        <SideLogo imageUrl={draft?.url} name={name || `side ${side}`} tone={side} />
        <div className="logoUploadCopy">
          <strong>{draft ? draft.fileName : t("launch.logoDrop")}</strong>
          <small>{draft ? t("launch.logoReady") : t("launch.logoRules")}</small>
        </div>
        <div className="logoUploadActions">
          <label className="logoUploadButton" htmlFor={inputId}>{draft ? t("launch.replace") : t("launch.chooseLogo")}</label>
          {draft && <button onClick={onRemove} type="button">{t("launch.remove")}</button>}
        </div>
        <input accept="image/jpeg,image/png,image/webp" className="visuallyHidden" id={inputId} name={`side${side.toUpperCase()}Logo`} onChange={chooseFile} type="file" />
      </div>
      {error && <small className="fieldError" role="alert">{t(error)}</small>}
    </div>
  );
}

const previewContest: IndexedContest = {
  chainId: "46630", contestId: referenceContest.contestId, marketVault: referenceContest.marketVault,
  creator: "0x0000000000000000000000000000000000000000", sideAToken: referenceContest.sideAToken,
  sideBToken: referenceContest.sideBToken, marketVersion: 2, metadataHash: "0x", createdBlock: "0", createdAt: "0",
  metadata: { title: referenceContest.title, description: "", category: referenceContest.category, sideA: referenceContest.sideA, sideB: referenceContest.sideB },
  market: { qAWei: "0", qBWei: "0", qA24hAgoWei: "0", qB24hAgoWei: "0", reserveUnits: "0", cumulativeVolumeUnits: "0", cumulativeFeeUnits: "0", tradeCount: "0", volume24hUnits: "0", tradeCount24h: "0", uniqueTraders24h: "0", sideAVolume24hUnits: "0", sideBVolume24hUnits: "0", sideATradeCount24h: "0", sideBTradeCount24h: "0", sideANetFlow24hUnits: "0", sideBNetFlow24hUnits: "0", atomicFlipCount24h: "0", leadFlipCount24h: "0", crownSide: null, crownActivated: false, crownSince: null, commentCount: "0", updatedBlock: "0", history: [] },
};

export function LaunchBuilder() {
  const { locale, t } = useI18n();
  const [title, setTitle] = useState("");
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [sideASymbol, setSideASymbol] = useState("");
  const [sideBSymbol, setSideBSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [category, setCategory] = useState("crypto");
  const [stockIds, setStockIds] = useState<string[]>([]);
  const [region, setRegion] = useState("GLOBAL");
  const [languageOverride, setLanguageOverride] = useState<string | null>(null);
  const contentLanguage = languageOverride ?? locale;
  const [initialSide, setInitialSide] = useState<"none" | "a" | "b">("none");
  const [initialAmount, setInitialAmount] = useState("");
  const [sideALogo, setSideALogo] = useState<LogoDraft | null>(null);
  const [sideBLogo, setSideBLogo] = useState<LogoDraft | null>(null);
  const [logoErrors, setLogoErrors] = useState<Record<LogoSide, MessageKey | "">>({ a: "", b: "" });
  const launchContest = useLaunchContest();
  const resolvedSideASymbol = sideASymbol || tokenSymbol(sideA, "SIDEA");
  const resolvedSideBSymbol = sideBSymbol || tokenSymbol(sideB, "SIDEB");
  const hasDuplicateSymbols = resolvedSideASymbol === resolvedSideBSymbol;
  const hasDuplicateSides = sideA.trim().toLowerCase() === sideB.trim().toLowerCase();
  const formIsValid = title.trim().length >= 3
    && title.trim().length <= 120
    && sideA.trim().length >= 1
    && sideA.trim().length <= 40
    && sideB.trim().length >= 1
    && sideB.trim().length <= 40
    && !hasDuplicateSides
    && tokenSymbolPattern.test(resolvedSideASymbol)
    && tokenSymbolPattern.test(resolvedSideBSymbol)
    && !hasDuplicateSymbols
    && description.trim().length >= 10
    && description.trim().length <= 800
    && contestCategories.some((item) => item.value === category)
    && (category !== "stocks" || validStockSelection(stockIds))
    && isRegion(region) && isContentLanguage(contentLanguage)
    && validReferenceUrl(referenceUrl)
    && validInitialPosition(initialSide, initialAmount)
    && !logoErrors.a
    && !logoErrors.b;
  const canSubmit = launchContest.isConnected && formIsValid && !launchContest.isBusy;
  const preview = useMemo(() => ({ title: title || t("launch.previewTitle"), sideA: sideA || t("common.sideA"), sideASymbol: resolvedSideASymbol, sideALogoUrl: sideALogo?.url, sideB: sideB || t("common.sideB"), sideBSymbol: resolvedSideBSymbol, sideBLogoUrl: sideBLogo?.url, category, stocks: category === "stocks" ? selectedStocks(stockIds) : undefined }), [stockIds, category, resolvedSideASymbol, resolvedSideBSymbol, sideA, sideALogo, sideB, sideBLogo, t, title]);

  useEffect(() => () => { if (sideALogo) URL.revokeObjectURL(sideALogo.url); }, [sideALogo]);
  useEffect(() => () => { if (sideBLogo) URL.revokeObjectURL(sideBLogo.url); }, [sideBLogo]);

  const selectLogo = async (side: LogoSide, file: File) => {
    const error = await validateLogo(file);
    setLogoErrors((current) => ({ ...current, [side]: error }));
    if (error) return;

    const draft = { file, fileName: file.name, url: URL.createObjectURL(file) };
    if (side === "a") setSideALogo(draft);
    else setSideBLogo(draft);
  };
  const removeLogo = (side: LogoSide) => {
    setLogoErrors((current) => ({ ...current, [side]: "" }));
    if (side === "a") setSideALogo(null);
    else setSideBLogo(null);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    void launchContest.launch({
      title: title.trim(),
      description: description.trim(),
      category,
      ...(category === "stocks" ? { stockIds } : {}),
      region,
      contentLanguage,
      referenceUrl: referenceUrl.trim() || undefined,
      sideAName: sideA.trim(),
      sideASymbol: resolvedSideASymbol,
      sideBName: sideB.trim(),
      sideBSymbol: resolvedSideBSymbol,
      sideALogo: sideALogo?.file,
      sideBLogo: sideBLogo?.file,
      initialSide,
      initialAmount,
    });
  };
  const walletBalance = Number(formatUnits(launchContest.balance, 6)).toLocaleString(localeInfo(locale).htmlLang, { maximumFractionDigits: 2 });

  return (
    <main className="pageShell launchPage">
      <section className="launchIntro">
        <div className="launchIntroCopy"><PlusIcon /><div><p className="eyebrow">{t("launch.eyebrow")}</p><h1>{t("launch.title")}</h1><p>{t("launch.description")}</p></div></div>
        <div className="launchFacts"><div><span>{t("launch.walletGuided")}</span><strong>{t("launch.verifiedSteps")}</strong><small>{t("launch.approvalOnly")}</small></div><div><span>{t("launch.marketStructure")}</span><strong>{t("launch.twoSides")}</strong><small>{t("launch.positionTokens")}</small></div><div><span>{t("launch.contractVersion")}</span><strong>{t("launch.marketV2")}</strong><small>{t("launch.vaultClone")}</small></div></div>
      </section>

      <div className="launchWorkspace">
        <form className="launchForm" onSubmit={submit}>
          <div className="formHeader"><span>01</span><div><p className="eyebrow">{t("launch.setup")}</p><h2>{t("launch.define")}</h2></div></div>
          <label className="field fieldWide"><span>{t("launch.titleLabel")} <em aria-label={t("launch.required")} className="fieldRequirement" data-kind="required">※</em></span><input maxLength={120} name="title" onChange={(event) => setTitle(event.target.value)} placeholder={t("launch.titlePlaceholder")} required value={title} /><small>{t("launch.titleHelp")}</small></label>
          <div className="fieldGrid">
            <label className="field fieldSideA"><span>{t("launch.sideName", { side: "A" })} <em aria-label={t("launch.required")} className="fieldRequirement" data-kind="required">※</em></span><input maxLength={40} name="sideA" onChange={(event) => setSideA(event.target.value)} placeholder={t("common.sideA")} required value={sideA} /></label>
            <label className="field fieldSideB"><span>{t("launch.sideName", { side: "B" })} <em aria-label={t("launch.required")} className="fieldRequirement" data-kind="required">※</em></span><input maxLength={40} name="sideB" onChange={(event) => setSideB(event.target.value)} placeholder={t("common.sideB")} required value={sideB} /></label>
            <label className="field fieldSideA"><span>{t("launch.sideTicker", { side: "A" })} <em className="fieldRequirement">{t("launch.editable")}</em></span><input aria-describedby="side-a-ticker-help" autoCapitalize="characters" maxLength={12} minLength={2} name="sideASymbol" onChange={(event) => setSideASymbol(normalizeTokenSymbol(event.target.value))} pattern="[A-Z0-9]{2,12}" required spellCheck={false} value={resolvedSideASymbol} /><small className={hasDuplicateSymbols ? "fieldError" : undefined} id="side-a-ticker-help">{hasDuplicateSymbols ? t("launch.tickerDifferent") : t("launch.tickerHelpA")}</small></label>
            <label className="field fieldSideB"><span>{t("launch.sideTicker", { side: "B" })} <em className="fieldRequirement">{t("launch.editable")}</em></span><input aria-describedby="side-b-ticker-help" autoCapitalize="characters" maxLength={12} minLength={2} name="sideBSymbol" onChange={(event) => setSideBSymbol(normalizeTokenSymbol(event.target.value))} pattern="[A-Z0-9]{2,12}" required spellCheck={false} value={resolvedSideBSymbol} /><small className={hasDuplicateSymbols ? "fieldError" : undefined} id="side-b-ticker-help">{hasDuplicateSymbols ? t("launch.tickerDifferent") : t("launch.tickerHelpB")}</small></label>
            <LogoUploadField draft={sideALogo} error={logoErrors.a} name={sideA} onRemove={() => removeLogo("a")} onSelect={(file) => void selectLogo("a", file)} side="a" />
            <LogoUploadField draft={sideBLogo} error={logoErrors.b} name={sideB} onRemove={() => removeLogo("b")} onSelect={(file) => void selectLogo("b", file)} side="b" />
          </div>
          <label className="field fieldWide"><span>{t("launch.descriptionLabel")} <em aria-label={t("launch.required")} className="fieldRequirement" data-kind="required">※</em></span><textarea maxLength={800} minLength={10} name="description" onChange={(event) => setDescription(event.target.value)} placeholder={t("launch.descriptionPlaceholder")} rows={4} required value={description} /></label>
          <label className="field"><span>{t("launch.category")} <em aria-label={t("launch.required")} className="fieldRequirement" data-kind="required">※</em></span><select name="category" onChange={(event) => setCategory(event.target.value)} required value={category}>{contestCategories.map((item) => <option key={item.value} value={item.value}>{t(`category.${item.value}` as MessageKey)}</option>)}</select></label>
          {category === "stocks" && <StockPicker value={stockIds} onChange={setStockIds} disabled={launchContest.isBusy} />}
          <label className="field"><span>{t("launch.reference")} <em className="fieldRequirement">{t("launch.optional")}</em></span><input maxLength={500} name="reference" onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://…" type="url" value={referenceUrl} /></label>
          <label className="field"><span>{t("scope.region")}</span><RegionSelect value={region} onChange={setRegion} /><small>{t("scope.regionHelp")}</small></label>
          <label className="field"><span>{t("scope.language")}</span><select name="contentLanguage" value={contentLanguage} onChange={event => setLanguageOverride(event.target.value)}>{locales.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select><small>{t("scope.languageHelp")}</small></label>
          <label className="field fieldWide"><span>{t("launch.initialPosition")} <em className="fieldRequirement">{t("launch.optional")}</em></span><div className="initialPosition"><select aria-label={t("launch.initialSide")} onChange={(event) => setInitialSide(event.target.value as "none" | "a" | "b")} value={initialSide}><option value="none">{t("launch.noInitial")}</option><option value="a">{t("common.sideA")}</option><option value="b">{t("common.sideB")}</option></select><input disabled={initialSide === "none"} inputMode="decimal" min="0.01" name="initialAmount" onChange={(event) => setInitialAmount(event.target.value)} placeholder="0 usdc" required={initialSide !== "none"} step="0.01" type="number" value={initialAmount} /></div></label>
          <div className="launchSummary"><div><span>{t("launch.network")}</span><strong>{t("chain.testnet")}</strong></div><div><span>{t("launch.walletBalance")}</span><strong>{launchContest.isConnected ? `${walletBalance} ${settlementTokenLabel}` : t("launch.connectToRead")}</strong></div><div><span>{t("launch.marketCurve")}</span><strong>b = 150k</strong></div></div>
          <button className="button launchSubmit" disabled={!canSubmit} type="submit">{launchContest.isBusy ? t("launch.launching") : launchContest.isConnected && launchContest.chainId !== robinhoodTestnet.id ? t("launch.switchAndLaunch") : launchContest.isConnected ? t("launch.submit") : t("launch.connectAndLaunch")}</button>
          <p aria-live="polite" className="formFootnote">{launchContest.status}</p>
          {launchContest.transactionHash ? <a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${launchContest.transactionHash}`} rel="noreferrer" target="_blank">{t("launch.latestTransaction")}</a> : null}
        </form>
        <aside className="launchPreview"><div className="sectionHeading compact"><div><p className="eyebrow">{t("launch.sharedComponent")}</p><h2>{t("launch.livePreview")}</h2></div><span className="previewBadge">{t("launch.previewOnly")}</span></div><ContestCard contest={previewContest} preview={preview} /></aside>
      </div>
    </main>
  );
}
