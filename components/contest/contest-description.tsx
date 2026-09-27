"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/locale-context";

export function ContestDescription({ description }: { description?: string }) {
  const { t } = useI18n();
  const id = useId();
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const paragraphs = (description ?? "").trim().split(/\n\s*\n/).filter(Boolean);
  // Keep explicit test-funding disclosures visible even when the background is collapsed.
  const isDisclosure = (text: string) => /^本竞赛为测试网演示|^(?:testnet (?:disclosure|demo)|test (?:funding|seeding) disclosure)\s*[:：]/i.test(text);
  const disclosure = paragraphs.filter(isDisclosure).join("\n\n");
  const body = paragraphs.filter((text) => !isDisclosure(text)).join("\n\n");

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      setOverflowing(element.scrollHeight > lineHeight * 3 + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [body]);

  if (!body && !disclosure) return null;
  return (
    <section className="contestDescription" aria-label={t("launch.descriptionLabel")}>
      {body ? <p className="contestDescriptionBody" data-expanded={expanded} id={id} ref={bodyRef}>{body}</p> : null}
      {body && overflowing ? (
        <button className="contestDescriptionToggle" type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((value) => !value)}>
          {t(expanded ? "contest.descriptionLess" : "contest.descriptionMore")}
        </button>
      ) : null}
      {disclosure ? <p className="contestDescriptionDisclosure">{disclosure}</p> : null}
    </section>
  );
}
