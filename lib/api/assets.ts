const uploadedAssetPath = /^(?:\/api\/backend)?\/v1\/assets\/(0x[0-9a-fA-F]{64})$/;

export function displayAssetUrl(value?: string) {
  if (!value) return value;

  try {
    const parsed = new URL(value, "http://xbid.local");
    const match = parsed.pathname.match(uploadedAssetPath);
    return match ? `/api/backend/v1/assets/${match[1].toLowerCase()}` : value;
  } catch {
    return value;
  }
}
