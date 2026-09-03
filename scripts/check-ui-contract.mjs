import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const cssFiles = ["styles/base.css", "styles/discovery.css", "styles/contest.css", "styles/utility.css"];
const css = cssFiles.map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")).join("\n");
const requiredTokens = [
  "--bg: #090b10", "--panel: #11151d", "--line: #252c38", "--text: #f4f7fb", "--muted: #8f99aa",
  "--side-a: #3478f6", "--side-b: #ff603d", "--crown: #ffc857", "--positive: #35d07f", "--font-size-ui: 12px",
];

const failures = requiredTokens.filter((token) => !css.includes(token)).map((token) => `missing token ${token}`);
const fontSizes = [...css.matchAll(/font-size\s*:\s*([^;]+);/g)].map((match) => match[1].trim());
for (const value of fontSizes) if (value !== "var(--font-size-ui)") failures.push(`unsupported font-size: ${value}`);
if (/text-transform\s*:\s*uppercase/i.test(css)) failures.push("uppercase text transform is forbidden");
if (!css.includes("@media (max-width: 767px)")) failures.push("mobile breakpoint is missing");

const files = execFileSync("rg", ["--files", "app", "components", "features", "widgets", "-g", "*.tsx"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const uppercaseText = [];
for (const file of files) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (/[A-Z]/.test(text)) uppercaseText.push(`${file}: ${text}`);
    }
    if (ts.isJsxAttribute(node) && ["aria-label", "placeholder", "title"].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) {
      if (/[A-Z]/.test(node.initializer.text)) uppercaseText.push(`${file}: ${node.initializer.text}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
if (uppercaseText.length) failures.push(`uppercase static ui copy:\n${uppercaseText.join("\n")}`);

if (failures.length) {
  console.error(`ui contract failed\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`ui contract passed · ${cssFiles.length} css layers · ${fontSizes.length} font-size declarations · ${files.length} tsx files checked`);
