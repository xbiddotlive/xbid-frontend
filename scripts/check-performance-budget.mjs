import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import vm from "node:vm";

const routeManifests = [
  ".next/server/app/page_client-reference-manifest.js",
  ".next/server/app/(platform)/contest/[contestId]/page_client-reference-manifest.js",
];
if (routeManifests.some((file) => !existsSync(file))) {
  console.error("performance budget requires a completed next build");
  process.exit(1);
}
const buildManifest = JSON.parse(readFileSync(".next/build-manifest.json", "utf8"));
const routeFiles = new Set(buildManifest.rootMainFiles);
for (const file of routeManifests) {
  const context = { globalThis: {} };
  vm.runInNewContext(readFileSync(file, "utf8"), context);
  for (const manifest of Object.values(context.globalThis.__RSC_MANIFEST)) {
    for (const moduleEntry of Object.values(manifest.clientModules)) {
      for (const chunk of moduleEntry.chunks ?? []) if (typeof chunk === "string" && /\.(js|css)$/.test(chunk)) routeFiles.add(chunk);
    }
    for (const entries of Object.values(manifest.entryCSSFiles ?? {})) {
      for (const entry of entries) if (entry.path) routeFiles.add(entry.path);
    }
  }
}
let total = 0;
for (const file of routeFiles) {
  const relativePath = decodeURIComponent(file).replace(/^\/?_next\//, "");
  total += gzipSync(readFileSync(resolve(".next", relativePath))).byteLength;
}
const limit = 500 * 1024;
if (total > limit) {
  console.error(`performance budget failed · critical routes ${Math.round(total / 1024)} kb gzip > ${limit / 1024} kb`);
  process.exit(1);
}
console.log(`performance budget passed · critical route assets ${Math.round(total / 1024)} kb gzip / ${limit / 1024} kb`);
