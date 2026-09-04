import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourcePath = fileURLToPath(new URL("../lib/i18n/messages.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");

function dictionarySource(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`could not locate ${start}`);
  return source.slice(from + start.length, to);
}

function entries(block, locale) {
  const result = new Map();
  const pattern = /^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm;
  for (const match of block.matchAll(pattern)) {
    if (result.has(match[1])) throw new Error(`${locale} contains duplicate key: ${match[1]}`);
    result.set(match[1], match[2]);
  }
  return result;
}

function placeholders(value) {
  return [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort().join(",");
}

const english = entries(dictionarySource("export const en = {", "} as const;"), "en");
const chinese = entries(dictionarySource("export const zh: Record<MessageKey, string> = {", "\n};"), "zh");
const missingChinese = [...english.keys()].filter((key) => !chinese.has(key));
const missingEnglish = [...chinese.keys()].filter((key) => !english.has(key));
const placeholderMismatches = [...english.keys()].filter((key) => placeholders(english.get(key)) !== placeholders(chinese.get(key) ?? ""));

if (missingChinese.length || missingEnglish.length || placeholderMismatches.length) {
  if (missingChinese.length) console.error(`missing zh keys: ${missingChinese.join(", ")}`);
  if (missingEnglish.length) console.error(`missing en keys: ${missingEnglish.join(", ")}`);
  if (placeholderMismatches.length) console.error(`placeholder mismatch: ${placeholderMismatches.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`i18n dictionaries aligned: ${english.size} keys across en and zh`);
}
