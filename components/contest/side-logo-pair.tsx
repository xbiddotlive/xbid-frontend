"use client";

import Image from "next/image";
import { useState } from "react";

import { displayAssetUrl } from "@/lib/api/assets";

export type SideLogoData = {
  imageUrl?: string;
  name: string;
};

function initialFor(name: string) {
  return name.trim().charAt(0).toLowerCase() || "?";
}

export function SideLogo({ imageUrl, name, tone }: SideLogoData & { tone: "a" | "b" }) {
  const resolvedImageUrl = displayAssetUrl(imageUrl);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(resolvedImageUrl && failedUrl !== resolvedImageUrl);

  return (
    <span className="sideLogo" data-tone={tone}>
      {resolvedImageUrl && showImage
        ? <Image alt="" height={64} onError={() => setFailedUrl(resolvedImageUrl)} src={resolvedImageUrl} unoptimized width={64} />
        : <b aria-hidden="true">{initialFor(name)}</b>}
    </span>
  );
}

export function SideLogoPair({ sideA, sideB }: { sideA: SideLogoData; sideB: SideLogoData }) {
  return (
    <span aria-label={`${sideA.name} versus ${sideB.name}`} className="sideLogoPair" role="img">
      <SideLogo {...sideA} tone="a" />
      <SideLogo {...sideB} tone="b" />
    </span>
  );
}
