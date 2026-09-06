// Build first. Uses an isolated fixture API and local Next server, never live writes.
// PLAYWRIGHT_MODULE_PATH may point to an existing Playwright installation.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const wallet = (n) => `0x${n.toString(16).padStart(40, "0")}`;
let empty = false;
const fixture = () => ({
  chainId: "46630", dataSource: "indexed",
  summary: { rankedTraders: 0, topRealizedPnlUnits: "0", referralRewardsUnits: "0", referredVolumeUnits: "0", creators: empty ? 0 : 58, creatorRewardsUnits: empty ? "0" : "254023156" },
  trading: [], referrals: [],
  creators: empty ? [] : [
    { address: wallet(1), contestCount: 3, creatorEarnedUnits: "124567890" },
    { address: wallet(2), contestCount: 1, creatorEarnedUnits: "0" },
  ],
});
const api = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/v1/chains/46630/leaderboard") res.end(JSON.stringify(fixture()));
  else { res.statusCode = 404; res.end("{}"); }
});
api.listen(0, "127.0.0.1");
await once(api, "listening");
const port = Number(process.env.LEADERBOARD_TEST_PORT || 3307);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, API_INTERNAL_URL: `http://127.0.0.1:${api.address().port}` },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (v) => { logs += v; });
server.stderr.on("data", (v) => { logs += v; });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw Error(logs);
    try { if ((await fetch(`${base}/leaderboard`)).ok) { ready = true; break; } } catch {}
    await delay(500);
  }
  assert.ok(ready, logs);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("xbid-locale", "en");
    localStorage.setItem("xbid-theme", "light");
  });
  await page.goto(`${base}/leaderboard`, { waitUntil: "load" });
  assert.equal(await page.locator(".leaderboardSummary > div").last().innerText(), "creators\n58\n$254.02 total rewards");
  assert.equal(await page.locator(".leaderboardSummary").getByText("referred volume", { exact: true }).count(), 0);
  await page.locator(".leaderboardTabs").getByRole("button", { name: "creators", exact: true }).click();
  const table = page.getByRole("table", { name: "creator earnings leaderboard" });
  await table.waitFor();
  assert.equal(await table.getByRole("columnheader").count(), 4);
  assert.equal(await table.getByRole("row").count(), 3);
  assert.match(await table.innerText(), /\$124\.57/);
  assert.match(await table.innerText(), /\$0\.00/);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    for (const width of [320, 375, 390, 767, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme}: overflow at ${width}`);
      if (width <= 600) assert.ok(await table.evaluate((el) => el.scrollWidth <= el.clientWidth), `creator columns overflow at ${width}`);
      assert.ok(await page.locator(".leaderboardTabs").getByRole("button", { name: "creators", exact: true }).isVisible());
    }
  }
  await page.locator(".leaderboardTabs").getByRole("button", { name: "referral rewards", exact: true }).click();
  await page.getByText("no referral rewards yet", { exact: true }).waitFor();
  await page.locator(".leaderboardTabs").getByRole("button", { name: "trading profit", exact: true }).click();
  await page.getByText("no realized trading results yet", { exact: true }).waitFor();
  await page.getByRole("combobox", { name: "site language" }).selectOption("zh");
  await page.locator(".leaderboardTabs").getByRole("button", { name: "创作者", exact: true }).click();
  await page.getByRole("table", { name: "创作者收入排行榜" }).waitFor();
  await page.getByRole("columnheader", { name: "创作者累计收入" }).waitFor();
  assert.equal(await page.locator(".leaderboardSummaryDetail").innerText(), "累计奖励 $254.02");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/private/tmp/xbid-creator-leaderboard-mobile.png", fullPage: true });
  empty = true;
  await page.reload({ waitUntil: "load" });
  await page.locator(".leaderboardTabs").getByRole("button", { name: "creators", exact: true }).click();
  await page.getByText("no creators yet", { exact: true }).waitFor();
  assert.equal(await page.locator(".leaderboardSummary > div").last().innerText(), "creators\n0\n$0.00 total rewards");
  assert.deepEqual(errors, []);
  console.log("PASS creator ranking, summary, zero earnings, empty state, existing tabs, en/zh, light/dark, 320–1440px");
} finally {
  await browser?.close();
  const stopped = once(server, "exit");
  if (server.exitCode === null) { server.kill("SIGTERM"); await stopped; }
  api.closeAllConnections();
  await new Promise((resolve) => api.close(resolve));
}
