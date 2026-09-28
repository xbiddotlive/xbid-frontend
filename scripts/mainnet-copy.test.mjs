import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const context = { exports: {}, require: (id) => {
    assert.ok(id in dependencies, `unexpected dependency ${id}`);
    return dependencies[id];
  } };
  vm.runInNewContext(output.outputText, context);
  return context.exports;
}
const messages = load("../lib/i18n/messages.ts");
const { mainnetDictionary } = load("../lib/i18n/mainnet-copy.ts", { "./messages": messages });

for (const locale of ["en", "zh", "ja"]) {
  test(`${locale}: mainnet copy never describes funds as valueless test assets`, () => {
    const original = locale === "ja" ? JSON.parse(readFileSync(new URL("../lib/i18n/translations/ja.json", import.meta.url))) : messages[locale];
    const before = JSON.stringify(original);
    const actual = mainnetDictionary(original, locale, "USDC");
    for (const key of Object.keys(messages.en)) {
      if (/testnet|test (?:usdc|eth)/i.test(messages.en[key])) {
        assert.doesNotMatch(actual[key], /testnet|test usdc|test eth|测试网|测试\s*USDC|no monetary value|没有货币价值/i, key);
      }
    }
    assert.match(actual["launch.status.gas"], /USDC/);
    assert.match(actual["docs.exampleText"], /0\.50/);
    assert.match(actual["docs.exampleText"], /0\.40/);
    assert.match(actual["docs.testnetNoticeText"], /真实 USDC|real USDC/);
    assert.match(actual["how.activateValue"], /15,000 USDC/);
    assert.match(actual["how.activateDescription"], /V4/);
    assert.match(actual["docs.crown.activationText"], /15,000 USDC/);
    assert.match(actual["docs.crown.activationText"], /旧版本竞赛|Older contests/);
    assert.doesNotMatch(actual["how.activateValue"], /70,000/);
    assert.match(actual["docs.eyebrow"], /4/);
    assert.match(actual["docs.pricingText"], /V4/);
    assert.equal(JSON.stringify(original), before, "testnet dictionary must stay unchanged");
    assert.equal(actual["nav.explore"], original["nav.explore"]);
  });
}
