import express from "express";
import { config } from "./config.js";
import {
  loadStore,
  listEntities,
  createEntity,
  updateEntity,
  getEntity,
  listRuns,
  staleRefs,
  EntityKind,
} from "./dkg.js";
import { seedIfEmpty, SEED_SCENES } from "./canon.js";
import { renderScenes, rerenderStale } from "./render.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

loadStore();
seedIfEmpty();

app.get("/api/state", (_req, res) => {
  res.json({
    modes: { livepeer: config.livepeer.mode, dkg: config.dkg.mode },
    entities: listEntities(),
    runs: listRuns().map((r) => ({
      ...r,
      stale: staleRefs(r).map((ref) => ({
        entityId: ref.entityId,
        renderedVersion: ref.version,
        currentVersion: getEntity(ref.entityId)?.version ?? ref.version,
      })),
    })),
  });
});

app.get("/api/scenes", (_req, res) => {
  res.json({ scenes: SEED_SCENES });
});

app.post("/api/canon", (req, res) => {
  const { kind, name, description } = req.body ?? {};
  if (!kind || !name || !description) {
    res.status(400).json({ error: "kind, name and description are required" });
    return;
  }
  res.status(201).json(createEntity({ kind: kind as EntityKind, name, description }));
});

app.patch("/api/canon/:id", (req, res) => {
  const updated = updateEntity(req.params.id, String(req.body?.description ?? ""));
  if (!updated) {
    res.status(404).json({ error: "entity not found" });
    return;
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

app.listen(config.port, () => {
  console.log(
    `CanonKeeper on http://localhost:${config.port} ` +
      `(livepeer=${config.livepeer.mode} dkg=${config.dkg.mode})`,
  );
});
