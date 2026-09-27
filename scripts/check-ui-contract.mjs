import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const cssFiles = ["styles/base.css", "styles/discovery.css", "styles/contest.css", "styles/utility.css", "styles/quiet-theme.css"];
const css = cssFiles.map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")).join("\n");
const requiredTokens = [
  "--bg: #14161b", "--panel: #181a20", "--line: #22262e", "--text: #eaecef", "--muted: #929aa5",
  "--side-a: #6e8fb6", "--side-b: #aa817b", "--crown: #c2ad7a", "--positive: #45b395", "--font-size-ui: 12px",
];

const failures = requiredTokens.filter((token) => !css.includes(token)).map((token) => `missing token ${token}`);
// Neutral palettes must retain readable copy and meaningful gain/loss colors.
const baseCss = readFileSync(new URL("../styles/base.css", import.meta.url), "utf8");
const palette = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[\da-f]{6});/gi)].map((match) => [match[1], match[2]]));
const darkPalette = palette(baseCss.match(/:root\s*\{([^}]+)\}/)[1]);
const lightPalette = { ...darkPalette, ...palette(baseCss.match(/:root\[data-theme="light"\]\s*\{([^}]+)\}/)[1]) };
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
for (const [theme, tokens] of Object.entries({ dark: darkPalette, light: lightPalette })) {
  for (const [foreground, background] of ["--text", "--muted", "--positive", "--negative"].map((token) => [token, "--panel"]).concat([["--primary-text", "--primary-bg"]])) {
    const a = luminance(tokens[foreground]), b = luminance(tokens[background]);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    if (ratio < 4.5) failures.push(`${theme} ${foreground} contrast too low: ${ratio.toFixed(2)}`);
  }
}
const fontSizes = [...css.matchAll(/font-size\s*:\s*([^;]+);/g)].map((match) => match[1].trim());
// Approved compact token identity hierarchy; all other UI stays at the base size.
const compactFontSizes = new Map([[".tokenListName", "11px"], [".tokenSideBadge", "10px"]]);
for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  for (const declaration of block[2].matchAll(/font-size\s*:\s*([^;]+);/g)) {
    const value = declaration[1].trim();
    if (value !== "var(--font-size-ui)" && compactFontSizes.get(block[1].trim()) !== value) failures.push(`unsupported font-size: ${value}`);
  }
}
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
