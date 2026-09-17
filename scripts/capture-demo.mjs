/**
 * Demo capture: two clips + stills.
 *   clip 1 — canon panel (anchors), A/B evidence arms, live canon edit (v→v+1,
 *            anchor regenerates), stale banner
 *   clip 2 — after rerender-stale completes: fresh evidence, new canon version
 * Run with the app live in real+http mode. APP_URL overrides the default.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.APP_URL ?? "http://localhost:3112";
mkdirSync("docs/demo", { recursive: true });

const MAYA_V4 =
  "Maya Okafor: mid-30s, dark brown skin, close-cropped black curls, small gold hoop earrings, CRIMSON RED bomber jacket, worn white sneakers, carries a brass pocket compass on a chain";

const browser = await chromium.launch();

async function freshPage() {
  const ctx = await browser.newContext({
    viewport: { width: 1360, height: 850 },
    recordVideo: { dir: "docs/demo", size: { width: 1360, height: 850 } },
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

async function hold(page, ms) {
  await page.waitForTimeout(ms);
}

// ---------- clip 1 ----------
{
  const { ctx, page } = await freshPage();

  await page.locator("#canon-panel").scrollIntoViewIfNeeded();
  await hold(page, 3500); // anchors + versions
  await page.screenshot({ path: "docs/demo/1-canon.png", fullPage: false });

  await page.locator("#evidence-panel").scrollIntoViewIfNeeded();
  await hold(page, 4500); // A/B arms, scores, cites chips
  await page.screenshot({ path: "docs/demo/2-ab-arms.png", fullPage: false });

  await page.locator("#canon-panel").scrollIntoViewIfNeeded();
  await hold(page, 1200);

  const mayaCard = page.locator(".entity", { hasText: "Maya" }).first();
  await mayaCard.locator(".edit").click();
  await hold(page, 900);
  await mayaCard.locator("textarea.edit-desc").fill(MAYA_V4);
  await hold(page, 1200);
  await mayaCard.locator(".save").click();
  await hold(page, 6000); // anchor regenerates server-side
  await page.screenshot({ path: "docs/demo/3-edit-saved.png", fullPage: false });

  await page.locator("#board-panel").scrollIntoViewIfNeeded();
  await hold(page, 3500); // stale banner
  await page.screenshot({ path: "docs/demo/4-stale-banner.png", fullPage: false });

  await ctx.close(); // saves clip
}

// ---------- let propagation finish (no recording of the wait) ----------
console.log("waiting for rerender-stale to be triggered + settle…");
// trigger it server-side; the video shows the RESULT.
await fetch(`${URL}/api/rerender-stale`, { method: "POST" }).catch(() => {});
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 10000));
  const s = await (await fetch(`${URL}/api/state`)).json();
  const staleArms = s.runs.filter((r) => r.useCanon && r.stale.length > 0);
  const latest = new Map();
  for (const r of [...s.runs].sort((a, b) => a.at.localeCompare(b.at)))
    if (r.useCanon) latest.set(r.sceneId, r);
  const anyStale = [...latest.values()].some((r) => r.stale.length > 0);
  console.log(`poll ${i}: stale remaining=${anyStale}`);
  if (!anyStale) break;
}

// ---------- clip 2 ----------
{
  const { ctx, page } = await freshPage();
  await page.locator("#canon-panel").scrollIntoViewIfNeeded();
  await hold(page, 2500); // v4 + new anchor
  await page.locator("#evidence-panel").scrollIntoViewIfNeeded();
  await hold(page, 5000); // clean arms, v4 refs
  await page.screenshot({ path: "docs/demo/5-after-propagation.png", fullPage: false });
  await ctx.close();
}

await browser.close();
console.log("capture complete — clips + stills in docs/demo/");
