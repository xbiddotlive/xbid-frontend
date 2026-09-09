"use client";
import { ChevronIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/locale-context";

export function DiscoveryPager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  const { t } = useI18n();
  if (pages <= 1) return null;
  return <div className="discoveryPager">
    <button type="button" aria-label={t("discovery.previousPage")} disabled={page === 0} onClick={() => onChange(page - 1)}><ChevronIcon /></button>
    <span aria-live="polite">{page + 1} / {pages}</span>
    <button type="button" aria-label={t("discovery.nextPage")} disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}><ChevronIcon /></button>
  </div>;
}
