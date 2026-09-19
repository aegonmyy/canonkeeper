/**
 * Plain walkthrough capture — slow pacing, no overlay, no captions.
 * Aminu adds voice/captions in editing. Follows DEMO-SCRIPT.md beats.
 * Edits the Compass canon (stales 2 scenes, ~1min re-render).
 * Output: docs/demo/canonkeeper-walkthrough.webm (+ stills).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.APP_URL ?? "http://localhost:3111";
mkdirSync("docs/demo", { recursive: true });

const COMPASS_V2 =
  "Maya's brass pocket compass: engraving of two flashes on the case, glass fully shattered, needle stuck at north, warm patina, hangs from a chain";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1360, height: 850 },
  recordVideo: { dir: "docs/demo", size: { width: 1360, height: 850 } },
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const hold = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `docs/demo/n-${n}.png` });
const scrollTo = (sel) => page.locator(sel).scrollIntoViewIfNeeded();

// 1 — canon panel (let anchors + versions read)
await scrollTo("#canon-panel");
await hold(9000);
await shot("1-canon");

// 2 — Maya card specifically
await page.locator(".entity", { hasText: "Maya" }).first().scrollIntoViewIfNeeded();
await hold(6000);

// 3 — A/B evidence (the money shot — extra time)
await scrollTo("#evidence-panel");
await hold(12000);
await shot("2-ab");

// 4 — back to canon, hover Compass
await scrollTo("#canon-panel");
await hold(3000);
const compassCard = page.locator(".entity[data-id='prop-compass']");
await compassCard.scrollIntoViewIfNeeded();
await hold(4000);

// 5 — edit canon
await compassCard.locator(".edit").click();
await hold(2500);
const ta = page.locator(".entity.editing textarea");
await ta.click();
await hold(1000);
await ta.fill(COMPASS_V2);
await hold(3500);
await page.locator(".entity.editing .save").click();
await shot("3-edit-saved");
await hold(18000); // anchor regenerates server-side

// 6 — stale banner
await scrollTo("#board-panel");
await hold(9000);
await shot("4-stale");

// 7 — re-render stale
await page.locator("#rerender-stale").click();
await hold(6000);
// poll until settled
for (let i = 0; i < 50; i++) {
  await hold(8000);
  const s = await (await page.evaluate(() => fetch("/api/state").then((r) => r.json())));
  const latest = new Map();
  for (const r of [...s.runs].sort((a, b) => a.at.localeCompare(b.at)))
    if (r.useCanon) latest.set(r.sceneId, r);
  if (![...latest.values()].some((r) => r.stale.length > 0)) break;
}

// 8 — fresh evidence
await scrollTo("#evidence-panel");
await hold(10000);
await shot("5-after");

await ctx.close();
await browser.close();
console.log("plain capture complete — docs/demo/canonkeeper-walkthrough.webm");
