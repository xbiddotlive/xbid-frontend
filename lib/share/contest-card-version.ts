export const contestShareCardVersion = "9";

const versionPattern = /^(\d+)-(\d+)$/;

export function contestShareCardFormat(version: string) {
  const match = versionPattern.exec(version);
  if (!match) return null;
  const designVersion = Number(match[1]);
  if (!Number.isSafeInteger(designVersion) || designVersion < 2) return null;
  return designVersion >= 4 ? "jpeg" : "png";
}
