import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const roots = ["app", "components", "features", "widgets", "lib"];
const files = execFileSync("rg", ["--files", ...roots, "-g", "*.ts", "-g", "*.tsx"], { encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
const failures = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n").length;
  if (file.endsWith(".tsx") && lines > 380) failures.push(`${file} is ${lines} lines; split responsibilities before it grows further`);
  if (/from ["']@\/lib\/mock\//.test(source)) failures.push(`${file} imports presentation mock data directly`);
  if (/demoContest/.test(source) && !["lib/blockchain/contracts.ts", "features/launch/components/launch-builder.tsx"].includes(file)) {
    failures.push(`${file} depends on the default demo contest at runtime`);
  }
  if (source.includes("NEXT_PUBLIC_API_URL") && !["lib/api/http.ts", "app/api/backend/[...path]/route.ts"].includes(file)) {
    failures.push(`${file} bypasses the same-origin api boundary`);
  }
  if (/\(await response\.json\(\)\) as /.test(source)) failures.push(`${file} trusts an unvalidated api response`);
}

if (failures.length) {
  console.error(`architecture contract failed\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`architecture contract passed · ${files.length} source files checked`);
