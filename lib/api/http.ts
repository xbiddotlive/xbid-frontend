const serverApiUrl = process.env.API_INTERNAL_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? "http://localhost:4000";

export function apiEndpoint(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return typeof window === "undefined"
    ? `${serverApiUrl}${normalizedPath}`
    : `/api/backend${normalizedPath}`;
}

export async function apiJson(response: Response) {
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { message?: string; code?: string } | null;
    throw new Error(problem?.code ?? problem?.message ?? `API returned ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}
