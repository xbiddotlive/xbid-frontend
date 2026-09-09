import type { Address } from "viem";

import { apiEndpoint, apiJson } from "./http";
import { preparedContestMetadataSchema, uploadedAssetSchema } from "./schemas";

export type PrepareContestMetadataInput = {
  creatorAddress: Address;
  title: string;
  description: string;
  category: string;
  region?: string;
  contentLanguage?: string;
  sideAName: string;
  sideASymbol: string;
  sideALogoHash?: string;
  sideBName: string;
  sideBSymbol: string;
  sideBLogoHash?: string;
  referenceUrl?: string;
};

export async function uploadContestLogo(file: File, writeToken: string) {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(apiEndpoint("/v1/assets/logos"), {
    method: "POST",
    headers: { authorization: `Bearer ${writeToken}` },
    body: form,
  });
  return uploadedAssetSchema.parse(await apiJson(response));
}

export async function prepareContestMetadata(input: PrepareContestMetadataInput, writeToken: string) {
  const response = await fetch(apiEndpoint("/v1/metadata/contests"), {
    method: "POST",
    headers: { authorization: `Bearer ${writeToken}`, "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const prepared = preparedContestMetadataSchema.parse(await apiJson(response));
  // Fail before a wallet transaction if an older backend silently strips these fields.
  if ((input.region !== undefined && prepared.metadata.region !== input.region)
    || (input.contentLanguage !== undefined && prepared.metadata.contentLanguage !== input.contentLanguage)) {
    throw new Error("The server did not preserve the contest region or content language. Please retry after the server is updated.");
  }
  return prepared;
}
