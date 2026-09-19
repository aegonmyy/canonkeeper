/**
 * Plain walkthrough + small stage indicator (bottom-right chip).
 * No narration captions — Aminu voices over. The chip names each beat so
 * narration can sync to it. Follows DEMO-SCRIPT.md.
 * Edits Compass canon v2 → v3 (stales 2 scenes, ~1min re-render).
 * Output: docs/demo/canonkeeper-walkthrough.webm → mp4.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.APP_URL ?? "http://localhost:3111";
mkdirSync("docs/demo", { recursive: true });

const COMPASS_V3 =
  "Maya's brass pocket compass: engraving of two flashes on the case, glass fully shattered, needle missing entirely, only shards remain in the housing, warm patina, hangs from a chain";

// Minimal stage chip — bottom-right, small, just names the beat.
const STAGE_JS = `
(() => {
  if (window.__stage) return;
  const s = document.createElement("style");
  s.textContent = \`
    #ck-stage {
      position: fixed; right: 18px; bottom: 18px; max-width: 420px;
      padding: 10px 16px; border-radius: 8px;
      background: rgba(14,14,20,0.92); border: 1px solid #ffb454;
      color: #fff; z-index: 999999; pointer-events: none;
      opacity: 0; transition: opacity 0.4s ease;
      font: 700 13px/1.3 system-ui, sans-serif; letter-spacing: 0.4px;
    }
    #ck-stage .sub { font: 400 12px/1.4 system-ui; color: #b9b9cc; margin-top: 3px; letter-spacing: 0; }
    #ck-stage.show { opacity: 1; }
  \`;
  document.head.appendChild(s);
  const chip = document.createElement("div"); chip.id = "ck-stage";
  document.body.appendChild(chip);
  window.__stage = (title, sub) => {
    chip.innerHTML = title + (sub ? \`<div class="sub">\${sub}</div>\` : "");
    chip.classList.add("show");
  };
})();
`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1360, height: 850 },
  recordVideo: { dir: "docs/demo", size: { width: 1360, height: 850 } },
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.evaluate(STAGE_JS);
const stage = (t, s) => page.evaluate(([a, b]) => window.__stage(a, b), [t, s]);

const hold = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `docs/demo/w-${n}.png` });
const scrollTo = (sel) => page.locator(sel).scrollIntoViewIfNeeded();

// 1 — the canon
await stage("1/6 · THE CANON", "characters, props, locations — Knowledge Assets on the OriginTrail DKG");
await scrollTo("#canon-panel");
await hold(9000);
await shot("1-canon");

// 2 — anchor sheets
await stage("2/6 · ANCHOR SHEETS", "every entity has a generated visual reference — versioned with the canon");
await page.locator(".entity", { hasText: "Maya" }).first().scrollIntoViewIfNeeded();
await hold(7000);

// 3 — A/B evidence
await stage("3/6 · A/B EVIDENCE", "same scene · same models · same judge — only difference: consulting the canon");
await scrollTo("#evidence-panel");
await hold(13000);
await shot("2-ab");

// 4 — live canon edit
await stage("4/6 · LIVE CANON EDIT", "compass v2 → v3 · needle missing, shards only");
await scrollTo("#canon-panel");
await hold(3000);
const compassCard = page.locator(".entity[data-id='prop-compass']");
await compassCard.scrollIntoViewIfNeeded();
await hold(4000);
await compassCard.locator(".edit").click();
await hold(2500);
const ta = page.locator(".entity.editing textarea");
await ta.click();
await hold(1000);
await ta.fill(COMPASS_V3);
await hold(3500);
await page.locator(".entity.editing .save").click();
await shot("3-edit-saved");

// 5 — anchor regenerates + stale propagation
await stage("5/6 · CORRECTION PROPAGATES", "anchor sheet regenerates · only renders citing v2 are flagged stale");
await hold(18000);
await scrollTo("#board-panel");
await hold(9000);
await shot("4-stale");

// 6 — re-render stale
await stage("6/6 · RE-RENDER STALE", "new canon + new anchor + fresh critique — via one Livepeer API");
await page.locator("#rerender-stale").click();
await hold(6000);
for (let i = 0; i < 50; i++) {
  await hold(8000);
  const s = await (await page.evaluate(() => fetch("/api/state").then((r) => r.json())));
  const latest = new Map();
  for (const r of [...s.runs].sort((a, b) => a.at.localeCompare(b.at)))
    if (r.useCanon) latest.set(r.sceneId, r);
  if (![...latest.values()].some((r) => r.stale.length > 0)) break;
}

// end — verified ledger
await stage("✓ VERIFIED", "run ledger shows both generations — queryable on the DKG");
await scrollTo("#evidence-panel");
await hold(10000);
await shot("5-after");

await ctx.close();
await browser.close();
console.log("stage-chip capture complete");
