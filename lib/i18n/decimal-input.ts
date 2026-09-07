// Only normalize digits and the locale's decimal mark. Never remove grouping
// separators or coerce amounts to Number (which could lose token precision).
export function normalizeDecimalInput(value: string, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const digitBlocks = [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0e50];
  let normalized = [...value].map((character) => {
    const code = character.codePointAt(0)!;
    const start = digitBlocks.find((block) => code >= block && code <= block + 9);
    return start === undefined ? character : String(code - start);
  }).join("");
  for (let digit = 0; digit <= 9; digit++) {
    normalized = normalized.replaceAll(formatter.format(digit), String(digit));
  }
  const decimal = formatter.formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
  if (decimal !== "." && !normalized.includes(".") && normalized.split(decimal).length === 2) {
    normalized = normalized.replace(decimal, ".");
  }
  return normalized;
}
