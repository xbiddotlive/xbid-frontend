import { apiEndpoint, apiJson } from "./http";
import { networkActivitySchema } from "./schemas";

export type NetworkActivity = ReturnType<typeof networkActivitySchema.parse>;
export type NetworkActivityEvent = NetworkActivity["events"][number];

export async function getNetworkActivity(chainId: number, limit = 100, signal?: AbortSignal) {
  const response = await fetch(apiEndpoint(`/v1/chains/${chainId}/activity?limit=${limit}`), { cache: "no-store", signal });
  return networkActivitySchema.parse(await apiJson(response));
}
