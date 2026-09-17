import express from "express";
import { config } from "./config.js";
import {
  initStore,
  listEntities,
  createEntity,
  updateEntity,
  getEntity,
  listRuns,
  staleRefs,
  publishCanon,
  mode as dkgMode,
  EntityKind,
} from "./dkg.js";
import { seedIfEmpty, SEED_SCENES } from "./canon.js";
import { renderScenes, rerenderStale, regenerateAnchor } from "./render.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

await initStore();
await seedIfEmpty();

app.get("/api/state", async (_req, res) => {
  const entities = await listEntities();
  const currentVersions = new Map(entities.map((e) => [e.id, e.version]));
  res.json({
    modes: { livepeer: config.livepeer.mode, dkg: config.dkg.mode },
    entities,
    runs: (await listRuns()).map((r) => ({
      ...r,
      // Control arms deliberately ignore canon — staleness doesn't apply.
      stale: r.useCanon
        ? staleRefs(r, entities).map((ref) => ({
            entityId: ref.entityId,
            renderedVersion: ref.version,
            currentVersion: currentVersions.get(ref.entityId) ?? ref.version,
          }))
        : [],
    })),
  });
});

app.get("/api/scenes", (_req, res) => {
  res.json({ scenes: SEED_SCENES });
});

app.post("/api/canon", async (req, res) => {
  const { kind, name, description } = req.body ?? {};
  if (!kind || !name || !description) {
    res.status(400).json({ error: "kind, name and description are required" });
    return;
  }
  res.status(201).json(await createEntity({ kind: kind as EntityKind, name, description }));
});

app.patch("/api/canon/:id", async (req, res) => {
  const updated = await updateEntity(req.params.id, String(req.body?.description ?? ""));
  if (!updated) {
    res.status(404).json({ error: "entity not found" });
    return;
  }
  // Corrections propagate visually: a canon edit regenerates the anchor sheet.
  if (config.livepeer.mode === "real" && updated.kind !== "fact") {
    try {
      const anchorUrl = await regenerateAnchor(updated);
      if (anchorUrl) updated.anchorUrl = anchorUrl;
    } catch (err) {
      console.warn("anchor regeneration failed:", err);
    }
  }
  res.json(updated);
});

app.post("/api/render", async (req, res) => {
  const scenes = Array.isArray(req.body?.scenes) ? req.body.scenes : [];
  const useCanon = req.body?.useCanon !== false;
  if (scenes.length === 0) {
    res.status(400).json({ error: "scenes[] required" });
    return;
  }
  try {
    const runs = await renderScenes(
      scenes.map((s: { text?: unknown }, i: number) => ({
        sceneId: `scene-${i}`,
        text: String(s.text ?? ""),
      })),
      useCanon,
    );
    res.json({ runs });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/rerender-stale", async (_req, res) => {
  try {
    res.json({ runs: await rerenderStale() });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Mint the canon Knowledge Asset on Verifiable Memory — mints the UAL. */
app.post("/api/publish", async (_req, res) => {
  const result = await publishCanon();
  if (result.error) res.status(502).json(result);
  else res.json(result);
});

app.get("/api/dkg-mode", (_req, res) => {
  res.json({ mode: dkgMode() });
});

app.listen(config.port, () => {
  console.log(
    `CanonKeeper on http://localhost:${config.port} ` +
      `(livepeer=${config.livepeer.mode} dkg=${config.dkg.mode})`,
  );
});
