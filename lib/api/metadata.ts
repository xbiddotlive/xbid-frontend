import type { Address } from "viem";

import { apiEndpoint, apiJson } from "./http";
import { preparedContestMetadataSchema, uploadedAssetSchema } from "./schemas";

export type PrepareContestMetadataInput = {
  creatorAddress: Address;
  title: string;
  description: string;
  category: string;
  sideAName: string;
  sideASymbol: string;
  sideALogoHash?: string;
  sideBName: string;
  sideBSymbol: string;
  sideBLogoHash?: string;
  referenceUrl?: string;
};

export async function uploadContestLogo(file: File) {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(apiEndpoint("/v1/assets/logos"), { method: "POST", body: form });
  return uploadedAssetSchema.parse(await apiJson(response));
}

export async function prepareContestMetadata(input: PrepareContestMetadataInput) {
  const response = await fetch(apiEndpoint("/v1/metadata/contests"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return preparedContestMetadataSchema.parse(await apiJson(response));
}
