"use client";

import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

import { ContestCard } from "@/components/contest/contest-card";
import { SideLogo } from "@/components/contest/side-logo-pair";
import { PlusIcon } from "@/components/ui/icons";
import type { IndexedContest } from "@/lib/api/contests";
import { referenceContest } from "@/lib/blockchain/contracts";
import { contestCategories } from "@/lib/product/contest-categories";
import { networkLabel, robinhoodTestnet, settlementTokenLabel } from "@/lib/blockchain/chain";
import { normalizeTokenSymbol, tokenSymbol, useLaunchContest } from "../hooks/use-launch-contest";

const logoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxLogoBytes = 2 * 1024 * 1024;

type LogoDraft = { file: File; fileName: string; url: string };
type LogoSide = "a" | "b";

async function validateLogo(file: File) {
  if (!logoTypes.has(file.type)) return "use a png, jpg or webp image";
  if (file.size > maxLogoBytes) return "logo must be smaller than 2 mb";

  try {
    const bitmap = await createImageBitmap(file);
    const validSize = bitmap.width >= 256 && bitmap.height >= 256;
    bitmap.close();
    return validSize ? "" : "logo must be at least 256 × 256 px";
  } catch {
    return "this image could not be read";
  }
}

function LogoUploadField({ draft, error, name, onRemove, onSelect, side }: {
  draft: LogoDraft | null;
  error: string;
  name: string;
  onRemove: () => void;
  onSelect: (file: File) => void;
  side: LogoSide;
}) {
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
      <span>side {side} logo <em className="fieldRequirement">optional</em></span>
      <div className="logoDropzone" data-tone={side} onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
        <SideLogo imageUrl={draft?.url} name={name || `side ${side}`} tone={side} />
        <div className="logoUploadCopy">
          <strong>{draft ? draft.fileName : "drop a logo or choose a file"}</strong>
          <small>{draft ? "ready · square crop applied" : "png, jpg or webp · 2 mb max · 256px minimum"}</small>
        </div>
        <div className="logoUploadActions">
          <label className="logoUploadButton" htmlFor={inputId}>{draft ? "replace" : "choose logo"}</label>
          {draft && <button onClick={onRemove} type="button">remove</button>}
        </div>
        <input accept="image/jpeg,image/png,image/webp" className="visuallyHidden" id={inputId} name={`side${side.toUpperCase()}Logo`} onChange={chooseFile} type="file" />
      </div>
      {error && <small className="fieldError" role="alert">{error}</small>}
    </div>
  );
}

const previewContest: IndexedContest = {
  chainId: "46630", contestId: referenceContest.contestId, marketVault: referenceContest.marketVault,
  creator: "0x0000000000000000000000000000000000000000", sideAToken: referenceContest.sideAToken,
  sideBToken: referenceContest.sideBToken, marketVersion: 1, metadataHash: "0x", createdBlock: "0", createdAt: "0",
  metadata: { title: referenceContest.title, description: "", category: referenceContest.category, sideA: referenceContest.sideA, sideB: referenceContest.sideB },
  market: { qAWei: "0", qBWei: "0", qA24hAgoWei: "0", qB24hAgoWei: "0", reserveUnits: "0", cumulativeVolumeUnits: "0", cumulativeFeeUnits: "0", tradeCount: "0", volume24hUnits: "0", tradeCount24h: "0", uniqueTraders24h: "0", sideAVolume24hUnits: "0", sideBVolume24hUnits: "0", sideATradeCount24h: "0", sideBTradeCount24h: "0", sideANetFlow24hUnits: "0", sideBNetFlow24hUnits: "0", atomicFlipCount24h: "0", leadFlipCount24h: "0", crownSide: null, crownActivated: false, crownSince: null, commentCount: "0", updatedBlock: "0", history: [] },
};

export function LaunchBuilder() {
  const [title, setTitle] = useState("");
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [sideASymbol, setSideASymbol] = useState("");
  const [sideBSymbol, setSideBSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [category, setCategory] = useState("crypto");
  const [initialSide, setInitialSide] = useState<"none" | "a" | "b">("none");
  const [initialAmount, setInitialAmount] = useState("");
  const [sideALogo, setSideALogo] = useState<LogoDraft | null>(null);
  const [sideBLogo, setSideBLogo] = useState<LogoDraft | null>(null);
  const [logoErrors, setLogoErrors] = useState<Record<LogoSide, string>>({ a: "", b: "" });
  const launchContest = useLaunchContest();
  const resolvedSideASymbol = sideASymbol || tokenSymbol(sideA, "SIDEA");
  const resolvedSideBSymbol = sideBSymbol || tokenSymbol(sideB, "SIDEB");
  const hasDuplicateSymbols = resolvedSideASymbol === resolvedSideBSymbol;
  const preview = useMemo(() => ({ title: title || "your rivalry appears here", sideA: sideA || "side a", sideASymbol: resolvedSideASymbol, sideALogoUrl: sideALogo?.url, sideB: sideB || "side b", sideBSymbol: resolvedSideBSymbol, sideBLogoUrl: sideBLogo?.url, category }), [category, resolvedSideASymbol, resolvedSideBSymbol, sideA, sideALogo, sideB, sideBLogo, title]);

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
    if (sideA.trim().toLowerCase() === sideB.trim().toLowerCase()) {
      setLogoErrors({ a: "side names must be different", b: "side names must be different" });
      return;
    }
    void launchContest.launch({
      title: title.trim(),
      description: description.trim(),
      category,
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
  const walletBalance = Number(formatUnits(launchContest.balance, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <main className="pageShell launchPage">
      <section className="launchIntro">
        <div className="launchIntroCopy"><PlusIcon /><div><p className="eyebrow">launch</p><h1>build the next live rivalry</h1><p>one page, two sides, one immutable market vault. metadata and logos are stored before the wallet confirms the launch.</p></div></div>
        <div className="launchFacts"><div><span>wallet guided</span><strong>verified steps</strong><small>approval only when required</small></div><div><span>market structure</span><strong>2 sides</strong><small>erc-20 position tokens</small></div><div><span>contract version</span><strong>market v1</strong><small>immutable vault clone</small></div></div>
      </section>

      <div className="launchWorkspace">
        <form className="launchForm" onSubmit={submit}>
          <div className="formHeader"><span>01</span><div><p className="eyebrow">contest setup</p><h2>define the arena</h2></div></div>
          <label className="field fieldWide"><span>contest title <em aria-label="required" className="fieldRequirement" data-kind="required">※</em></span><input maxLength={120} name="title" onChange={(event) => setTitle(event.target.value)} placeholder="who will command the live market?" required value={title} /><small>one clear rivalry using direct dominance language.</small></label>
          <div className="fieldGrid">
            <label className="field fieldSideA"><span>side a name <em aria-label="required" className="fieldRequirement" data-kind="required">※</em></span><input maxLength={40} name="sideA" onChange={(event) => setSideA(event.target.value)} placeholder="side a" required value={sideA} /></label>
            <label className="field fieldSideB"><span>side b name <em aria-label="required" className="fieldRequirement" data-kind="required">※</em></span><input maxLength={40} name="sideB" onChange={(event) => setSideB(event.target.value)} placeholder="side b" required value={sideB} /></label>
            <label className="field fieldSideA"><span>side a token ticker <em className="fieldRequirement">editable</em></span><input aria-describedby="side-a-ticker-help" autoCapitalize="characters" maxLength={12} minLength={2} name="sideASymbol" onChange={(event) => setSideASymbol(normalizeTokenSymbol(event.target.value))} pattern="[A-Z0-9]{2,12}" required spellCheck={false} value={resolvedSideASymbol} /><small className={hasDuplicateSymbols ? "fieldError" : undefined} id="side-a-ticker-help">{hasDuplicateSymbols ? "side tickers must be different" : "auto-generated from the name · 2–12 letters or numbers"}</small></label>
            <label className="field fieldSideB"><span>side b token ticker <em className="fieldRequirement">editable</em></span><input aria-describedby="side-b-ticker-help" autoCapitalize="characters" maxLength={12} minLength={2} name="sideBSymbol" onChange={(event) => setSideBSymbol(normalizeTokenSymbol(event.target.value))} pattern="[A-Z0-9]{2,12}" required spellCheck={false} value={resolvedSideBSymbol} /><small className={hasDuplicateSymbols ? "fieldError" : undefined} id="side-b-ticker-help">{hasDuplicateSymbols ? "side tickers must be different" : "clear the field to restore the generated ticker"}</small></label>
            <LogoUploadField draft={sideALogo} error={logoErrors.a} name={sideA} onRemove={() => removeLogo("a")} onSelect={(file) => void selectLogo("a", file)} side="a" />
            <LogoUploadField draft={sideBLogo} error={logoErrors.b} name={sideB} onRemove={() => removeLogo("b")} onSelect={(file) => void selectLogo("b", file)} side="b" />
          </div>
          <label className="field fieldWide"><span>description <em aria-label="required" className="fieldRequirement" data-kind="required">※</em></span><textarea maxLength={800} minLength={10} name="description" onChange={(event) => setDescription(event.target.value)} placeholder="explain the rivalry and what each side represents." rows={4} required value={description} /></label>
          <label className="field"><span>category <em aria-label="required" className="fieldRequirement" data-kind="required">※</em></span><select name="category" onChange={(event) => setCategory(event.target.value)} required value={category}>{contestCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="field"><span>reference link <em className="fieldRequirement">optional</em></span><input maxLength={500} name="reference" onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://…" type="url" value={referenceUrl} /></label>
          <label className="field fieldWide"><span>initial position <em className="fieldRequirement">optional</em></span><div className="initialPosition"><select aria-label="initial side" onChange={(event) => setInitialSide(event.target.value as "none" | "a" | "b")} value={initialSide}><option value="none">no initial position</option><option value="a">side a</option><option value="b">side b</option></select><input disabled={initialSide === "none"} inputMode="decimal" min="0.01" name="initialAmount" onChange={(event) => setInitialAmount(event.target.value)} placeholder="0 usdc" required={initialSide !== "none"} step="0.01" type="number" value={initialAmount} /></div></label>
          <div className="launchSummary"><div><span>network</span><strong>{networkLabel}</strong></div><div><span>wallet balance</span><strong>{launchContest.isConnected ? `${walletBalance} ${settlementTokenLabel}` : "connect to read"}</strong></div><div><span>market curve</span><strong>b = 270k</strong></div></div>
          <button className="button launchSubmit" disabled={launchContest.isBusy || hasDuplicateSymbols} type="submit">{launchContest.isBusy ? "launching…" : launchContest.isConnected && launchContest.chainId !== robinhoodTestnet.id ? "switch network & launch" : launchContest.isConnected ? "launch contest" : "connect wallet to launch"}</button>
          <p aria-live="polite" className="formFootnote">{launchContest.status}</p>
          {launchContest.transactionHash ? <a className="explorerLink" href={`${robinhoodTestnet.blockExplorers.default.url}/tx/${launchContest.transactionHash}`} rel="noreferrer" target="_blank">view latest transaction ↗</a> : null}
        </form>
        <aside className="launchPreview"><div className="sectionHeading compact"><div><p className="eyebrow">shared component</p><h2>live preview</h2></div><span className="previewBadge">preview only</span></div><ContestCard contest={previewContest} preview={preview} /></aside>
      </div>
    </main>
  );
}
