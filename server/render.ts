import { config } from "./config.js";
import { callTool, findAssetUrl, mockSceneImage, mockCritique } from "./livepeer.js";
import { mentionedEntities, buildPrompt } from "./canon.js";
import { Run, Entity, addRun, listRuns, listEntities, staleRefs, setAnchorUrl } from "./dkg.js";

/**
 * The orchestration layer — where canon changes what the app does.
 *
 * Mock mode: free placeholders (see livepeer.ts).
 * Real mode, per scene:
 *   1. ensure every non-fact entity has an ANCHOR — a generated reference
 *      image persisted as a versioned quad (the canon's visual face)
 *   2. render with `cast: {reference_url, name}` for the first character —
 *      Livepeer's verified character-consistency control
 *   3. grade the result with critique_shot against the anchor (Gemini Vision)
 * Control renders (canon OFF) skip cast but are STILL graded against the
 * anchor — that's the A/B: same judge, different memory.
 */

const PER_RENDER_CAP_USD = 0.05;
const SESSION_TAG = "canonkeeper";

function anchorPrompt(e: Entity): string {
  const base = e.description;
  if (e.kind === "character")
    return `Character reference sheet, single subject, front-facing portrait, clean neutral studio background, full color: ${base}`;
  if (e.kind === "location")
    return `Location establishing shot, wide angle, no people, consistent architectural details: ${base}`;
  return `Object reference shot, single item centered, neutral background, studio lighting: ${base}`;
}

export async function ensureAnchors(entities: Entity[]): Promise<Map<string, string>> {
  const anchors = new Map<string, string>();
  for (const e of entities) {
    if (e.kind === "fact") continue;
    if (e.anchorUrl) {
      anchors.set(e.id, e.anchorUrl);
      continue;
    }
    const out = await callTool("create_media", {
      action: "generate",
      prompt: anchorPrompt(e),
      prefer_fast: true,
      aspect_ratio: "1:1",
      session_id: SESSION_TAG,
      max_cost_usd: PER_RENDER_CAP_USD,
    });
    const url = findAssetUrl(out);
    if (url) {
      await setAnchorUrl(e.id, url);
      anchors.set(e.id, url);
    }
  }
  return anchors;
}

/** Regenerate an anchor after a canon edit — corrections propagate visually too. */
export async function regenerateAnchor(e: Entity): Promise<string | undefined> {
  if (e.kind === "fact") return undefined;
  const out = await callTool("create_media", {
    action: "generate",
    prompt: anchorPrompt(e),
    prefer_fast: true,
    aspect_ratio: "1:1",
    session_id: SESSION_TAG,
    max_cost_usd: PER_RENDER_CAP_USD,
  });
  const url = findAssetUrl(out);
  if (url) await setAnchorUrl(e.id, url);
  return url;
}

async function critiqueScene(
  generatedUrl: string,
  referenceUrl: string,
  entityName: string,
): Promise<{ score: number; note: string }> {
  const out = await callTool("critique_shot", {
    generated_url: generatedUrl,
    reference_url: referenceUrl,
    entity_name: entityName,
  });
  const text = typeof out === "string" ? out : JSON.stringify(out);
  const m = text.match(/(?:total|overall|weighted)[^0-9]{0,20}([01]\.\d+)/i);
  const score = m ? Number(m[1]) : -1;
  return { score, note: text.replace(/\s+/g, " ").slice(0, 280) };
}

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
    const anchors = await ensureAnchors(entities);
    // Cast is the canon-ON lever; the judge grades BOTH arms against the anchor.
    const castChar = useCanon
      ? entities.find((e) => e.kind === "character" && anchors.has(e.id))
      : undefined;
    const gradeChar = entities.find((e) => e.kind === "character" && anchors.has(e.id));
    const out = await callTool("create_media", {
      action: "generate",
      prompt,
      prefer_fast: true,
      aspect_ratio: "16:9",
      session_id: SESSION_TAG,
      max_cost_usd: PER_RENDER_CAP_USD,
      ...(castChar
        ? { cast: { reference_url: anchors.get(castChar.id), name: castChar.name } }
        : {}),
    });
    resultUrl = findAssetUrl(out) ?? "";
    model = `livepeer:create_media${castChar ? "+cast" : ""}`;
    const anchor = gradeChar ? anchors.get(gradeChar.id) : undefined;
    if (/^https:\/\//.test(resultUrl) && anchor && gradeChar) {
      critique = await critiqueScene(resultUrl, anchor, gradeChar.name);
    } else if (/^https:\/\//.test(resultUrl)) {
      critique = { score: -1, note: "Rendered; no character anchor to grade against." };
    } else {
      critique = { score: -1, note: "Render failed or returned no URL." };
    }
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
  const stale = [...latestByScene.values()].filter(
    (r) => r.useCanon && staleRefs(r, entities).length > 0,
  );
  const out: Run[] = [];
  for (let i = 0; i < stale.length; i++) {
    out.push(
      await renderScene({ sceneId: stale[i].sceneId, text: stale[i].sceneText }, true, i),
    );
  }
  return out;
}
