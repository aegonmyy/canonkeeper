import { config } from "./config.js";
import { callTool, findAssetUrl, mockSceneImage, mockCritique } from "./livepeer.js";
import { mentionedEntities, buildPrompt } from "./canon.js";
import { Run, addRun, listRuns, listEntities, staleRefs } from "./dkg.js";

/**
 * The orchestration layer — where canon changes what the app does.
 *
 * Mock mode: free placeholders (see livepeer.ts).
 * Real mode: create_media per scene with prefer_fast (flux-schnell), a hard
 * per-render cap (max_cost_usd), and a session tag for cost attribution.
 * Day 3: switch to generate_project + cast anchors so critique_shot can grade
 * against canon, and director_re_render for stale-scene recovery.
 */

const PER_RENDER_CAP_USD = 0.05;
const SESSION_TAG = "canonkeeper";

export async function renderScene(
  scene: { sceneId: string; text: string },
  useCanon: boolean,
  index: number,
): Promise<Run> {
  const entities = await mentionedEntities(scene.text);
  const prompt = buildPrompt(scene.text, entities, useCanon);
  const canonRefs = entities.map((e) => ({ entityId: e.id, version: e.version }));

  let resultUrl: string;
  let model: string;
  let critique: { score: number; note: string };

  if (config.livepeer.mode === "mock") {
    resultUrl = mockSceneImage({
      sceneText: scene.text,
      entityDescriptions: entities.map((e) => e.description),
      useCanon,
      sceneIndex: index,
    });
    model = "mock-placeholder";
    critique = mockCritique(scene.text, useCanon);
  } else {
    const out = await callTool("create_media", {
      action: "generate",
      prompt,
      prefer_fast: true, // flux-schnell — cheapest sibling
      aspect_ratio: "16:9",
      session_id: SESSION_TAG,
      max_cost_usd: PER_RENDER_CAP_USD,
    });
    resultUrl = findAssetUrl(out) ?? "";
    model = "livepeer:create_media(prefer_fast)";
    // Real critique needs both a public https result and a hosted canon anchor
    // (upload_image, day 3). Until anchors exist, grade as pending.
    critique = /^https:\/\//.test(resultUrl)
      ? { score: -1, note: "Pending: critique_shot needs a hosted canon anchor (day 3)." }
      : { score: -1, note: "Render failed or returned no URL." };
  }

  const run: Run = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sceneId: scene.sceneId,
    sceneText: scene.text,
    useCanon,
    prompt,
    canonRefs,
    resultUrl,
    model,
    critique,
    at: new Date().toISOString(),
  };
  await addRun(run);
  return run;
}

export async function renderScenes(
  scenes: { sceneId: string; text: string }[],
  useCanon: boolean,
): Promise<Run[]> {
  const runs: Run[] = [];
  for (let i = 0; i < scenes.length; i++) {
    runs.push(await renderScene(scenes[i], useCanon, i));
  }
  return runs;
}

/** Correction propagation: re-render ONLY scenes whose canon has since changed. */
export async function rerenderStale(): Promise<Run[]> {
  const entities = await listEntities();
  const latestByScene = new Map<string, Run>();
  const runs = (await listRuns()).sort((a, b) => a.at.localeCompare(b.at));
  for (const r of runs) latestByScene.set(r.sceneId, r);
  const stale = [...latestByScene.values()].filter((r) => staleRefs(r, entities).length > 0);
  const out: Run[] = [];
  for (let i = 0; i < stale.length; i++) {
    out.push(
      await renderScene({ sceneId: stale[i].sceneId, text: stale[i].sceneText }, true, i),
    );
  }
  return out;
}
