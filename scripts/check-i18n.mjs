import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";

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

function loadTypeScript(path) {
  const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {} };
  vm.runInNewContext(output.outputText, context);
  return context.exports;
}

const { locales, isLocale, matchLocale, resolveLocale, acceptLanguageLocale, localeInfo } = loadTypeScript("../lib/i18n/locales.ts");
assert.equal(locales.length, 16);
assert.equal(new Set(locales.map((entry) => entry.code)).size, 16);
for (const locale of locales) {
  assert.equal(isLocale(locale.code), true);
  assert.equal(matchLocale(locale.htmlLang), locale.code);
  assert.doesNotThrow(() => new Intl.DateTimeFormat(localeInfo(locale.code).htmlLang).format(0));
  const jsonSource = ["en", "zh"].includes(locale.code) ? null
    : readFileSync(new URL(`../lib/i18n/translations/${locale.code}.json`, import.meta.url), "utf8");
  if (jsonSource) {
    assert.equal(entries(jsonSource, locale.code).size, english.size, `${locale.code}: invalid or duplicate JSON keys`);
  }
  const entriesForLocale = locale.code === "en" ? english : locale.code === "zh" ? chinese
    : new Map(Object.entries(JSON.parse(jsonSource)));
  for (const [key, value] of english) {
    const translation = entriesForLocale.get(key);
    assert.equal(typeof translation, "string", `${locale.code}: missing ${key}`);
    assert.ok(translation.trim(), `${locale.code}: empty ${key}`);
    assert.equal(placeholders(translation), placeholders(value), `${locale.code}: placeholders in ${key}`);
    assert.ok(!/9876\d\d|\uFFFD/.test(translation), `${locale.code}: damaged translation ${key}`);
    assert.ok(!/(\S+)(?:\s+\1){3,}/u.test(translation), `${locale.code}: repeated translation ${key}`);
  }
  assert.equal(entriesForLocale.size, english.size, `${locale.code}: unexpected keys`);
}
assert.equal(isLocale("__proto__"), false);
assert.equal(isLocale("en-US"), false);
assert.equal(matchLocale("pt_BR"), "pt");
assert.equal(matchLocale("fil-PH"), "tl");
assert.equal(resolveLocale(["ko-KR", "uk-UA", "en"]), "uk");
assert.equal(resolveLocale(["unsupported"]), "en");
assert.equal(acceptLanguageLocale("es;q=0.5,de-DE;q=0.9,en;q=0.7"), "de");
assert.equal(acceptLanguageLocale("fr;q=0,hi;q=0.8"), "hi");
assert.equal(acceptLanguageLocale("xx;q=1,ja;q=0.8"), "ja");
const { en } = loadTypeScript("../lib/i18n/messages.ts");
const { message } = loadTypeScript("../lib/i18n/format-message.ts");
assert.equal(message(en, "trade.buyOutput", { amount: "{symbol}", symbol: "$&" }), "buy {symbol} $&");
const { normalizeDecimalInput } = loadTypeScript("../lib/i18n/decimal-input.ts");
assert.equal(normalizeDecimalInput("0,50", "de"), "0.50");
assert.equal(normalizeDecimalInput("0.50", "de"), "0.50");
assert.equal(normalizeDecimalInput("১২.৫০", "bn"), "12.50");
assert.equal(normalizeDecimalInput("१२.५०", "hi"), "12.50");
assert.equal(normalizeDecimalInput("๑๒.๕๐", "th"), "12.50");
assert.equal(normalizeDecimalInput("1,000", "en"), "1,000");
assert.equal(normalizeDecimalInput("1.000,50", "de"), "1.000,50");
assert.equal(normalizeDecimalInput("9007199254740993.123456", "fr"), "9007199254740993.123456");
console.log(`i18n dictionaries aligned: ${english.size} keys across ${locales.length} languages; locale resolution and interpolation passed`);
