"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/locale-context";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("route render failed", { digest: error.digest, message: error.message });
  }, [error]);
  return <main className="pageShell utilityPage"><div className="emptyState errorState"><strong>{t("error.view.title")}</strong><span>{t("error.view.description")}</span><button className="button buttonPrimary" onClick={reset} type="button">{t("error.retry")}</button></div></main>;
}
