import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { config } from "./config.js";

/**
 * DKG adapter — two backends behind one interface.
 *
 * `file`  (dev default): JSON-LD-flavored snapshots on disk.
 * `http`  (the real thing): the OriginTrail edge node at 127.0.0.1:9200.
 *        Canon entities and the run ledger live as Knowledge Assets in the
 *        "canonkeeper" Context Graph (SWM — free, gossip-replicated); every
 *        mutation runs the pull-from → write → share cycle, and triples
 *        ACCUMULATE, so version history is queryable via SPARQL. Publishing
 *        to Verifiable Memory (vm/publish) mints the chain-anchored UAL.
 *
 * RDF shapes:
 *   entity: <NS/entity/<id>>  schema:name, pred:kind, pred:current-version,
 *                             pred:v<n>-description  (history accumulates)
 *   run:    <NS/run/<id>>     pred:scene-text / use-canon / prompt / result-url
 *                             / model / score / note / at,
 *                             pred:cites → <NS/entity/<id>>   (the drift edge)
 *                             pred:rendered-version/<entityId> "n"
 */

export type EntityKind = "character" | "prop" | "location" | "fact";

export interface Entity {
  id: string;
  "@type": string;
  kind: EntityKind;
  name: string;
  description: string;
  anchorUrl?: string;
  version: number;
  history: { version: number; description: string; at: string }[];
}

export interface CanonRef {
  entityId: string;
  version: number;
}

export interface Run {
  id: string;
  sceneId: string;
  sceneText: string;
  useCanon: boolean;
  prompt: string;
  canonRefs: CanonRef[];
  resultUrl: string;
  model: string;
  critique: { score: number; note: string };
  at: string;
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ---------- shared RDF helpers ----------

const NS = "https://canonkeeper.dev";
const PRED = (p: string) => `${NS}/predicate/${p}`;
const entityIri = (id: string) => `${NS}/entity/${id}`;
const runIri = (id: string) => `${NS}/run/${id}`;
const lit = (v: string | number | boolean) => JSON.stringify(String(v));

interface Quad {
  subject: string;
  predicate: string;
  object: string;
}

function entityFromId(id: string, kind: EntityKind): Entity {
  return {
    id,
    "@type": kind[0].toUpperCase() + kind.slice(1),
    kind,
    name: id.replace(/^[a-z]+-/, "").replace(/-/g, " "),
    description: "",
    version: 0,
    history: [],
  };
}

/** Pure staleness: a run is stale when a cited entity has since changed. */
export function staleRefs(run: Run, entities: Entity[]): CanonRef[] {
  return run.canonRefs
    .map((ref) => {
      const e = entities.find((x) => x.id === ref.entityId);
      return e && e.version > ref.version ? ref : null;
    })
    .filter((r): r is CanonRef => r !== null);
}

// ---------- file backend (dev default) ----------

class FileBackend {
  entities: Entity[] = [];
  runs: Run[] = [];

  constructor() {
    if (existsSync("data/canon.json"))
      this.entities = JSON.parse(readFileSync("data/canon.json", "utf8"));
    if (existsSync("data/runs.json"))
      this.runs = JSON.parse(readFileSync("data/runs.json", "utf8"));
  }

  private persist() {
    mkdirSync("data", { recursive: true });
    writeFileSync("data/canon.json", JSON.stringify(this.entities, null, 2));
    writeFileSync("data/runs.json", JSON.stringify(this.runs, null, 2));
  }

  async createEntity(input: { id: string; kind: EntityKind; name: string; description: string }) {
    const e: Entity = {
      ...entityFromId(input.id, input.kind),
      name: input.name,
      description: input.description,
      version: 1,
      history: [{ version: 1, description: input.description, at: new Date().toISOString() }],
    };
    this.entities.push(e);
    this.persist();
    return e;
  }

  async updateEntity(id: string, description: string) {
    const e = this.entities.find((x) => x.id === id);
    if (!e) return undefined;
    e.version += 1;
    e.description = description;
    e.history.push({ version: e.version, description, at: new Date().toISOString() });
    this.persist();
    return e;
  }

  async addRun(run: Run) {
    this.runs.push(run);
    this.persist();
  }

  async setAnchorUrl(id: string, url: string) {
    const e = this.entities.find((x) => x.id === id);
    if (e) {
      e.anchorUrl = url;
      this.persist();
    }
  }
}

// ---------- http backend (DKG edge node) ----------

const CG = "canonkeeper-live";
const KA = "canon";

class HttpBackend {
  constructor(
    private base: string,
    private token: string,
  ) {}

  private async req(path: string, body?: unknown): Promise<any> {
    const res = await fetch(`${this.base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body ?? {}),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) throw new Error(String(json?.error ?? `HTTP ${res.status}`));
    return json;
  }

  async ready() {
    try {
      await this.req("/api/context-graph/create", { id: CG, name: "CanonKeeper Canon" });
    } catch {
      /* already exists — fine */
    }
    try {
      await this.req("/api/knowledge-assets", { contextGraphId: CG, name: KA });
    } catch {
      /* already exists — fine (returns alreadyExists:true normally) */
    }
  }

  /** pull-from → write → share. The canonical mutation cycle. */
  private async mutate(quads: Quad[]) {
    try {
      await this.req(`/api/knowledge-assets/${KA}/wm/pull-from`, {
        contextGraphId: CG,
        layer: "swm",
        onConflict: "replace",
      });
    } catch {
      /* fresh draft, nothing to pull */
    }
    const w = await this.req(`/api/knowledge-assets/${KA}/wm/write`, {
      contextGraphId: CG,
      quads,
    });
    await this.req(`/api/knowledge-assets/${KA}/swm/share`, {
      contextGraphId: CG,
      entities: "all",
    });
    return w;
  }

  private async sparql(sparql: string): Promise<Record<string, string>[]> {
    const r = await this.req("/api/query", {
      sparql,
      contextGraphId: CG,
      view: "shared-working-memory",
    });
    return r?.result?.bindings ?? [];
  }

  async loadEntities(): Promise<Entity[]> {
    const rows = await this.sparql(
      `SELECT ?e ?p ?o WHERE { ?e ?p ?o . FILTER(STRSTARTS(STR(?e), "${NS}/entity/")) }`,
    );
    const byId = new Map<string, Entity>();
    const idOf = (iri: string) => iri.slice(`${NS}/entity/`.length);
    for (const row of rows) {
      const id = idOf(row.e);
      if (!byId.has(id)) {
        const kind = "character" as EntityKind;
        byId.set(id, entityFromId(id, kind));
      }
      const e = byId.get(id)!;
      const p = row.p;
      const o = row.o.replace(/^"|"$/g, "");
      if (p === "https://schema.org/name") e.name = o;
      else if (p === PRED("kind")) {
        e.kind = o as EntityKind;
        e["@type"] = o[0].toUpperCase() + o.slice(1);
      } else if (p === PRED("current-version")) e.version = Math.max(e.version, Number(o));
      else if (p.startsWith(PRED("anchor-url-v"))) {
        const v = Number(p.slice(PRED("anchor-url-v").length));
        const prev = ((e as Entity & { _anchorV?: number })._anchorV ?? -1) as number;
        if (v >= prev) {
          (e as Entity & { _anchorV?: number })._anchorV = v;
          e.anchorUrl = o;
        }
      } else {
        const m = p.match(/\/predicate\/v(\d+)-description$/);
        if (m) e.history.push({ version: Number(m[1]), description: o, at: "" });
      }
    }
    for (const e of byId.values()) {
      e.history.sort((a, b) => a.version - b.version);
      e.description = e.history.at(-1)?.description ?? e.description;
    }
    return [...byId.values()];
  }

  async loadRuns(): Promise<Run[]> {
    const rows = await this.sparql(
      `SELECT ?r ?p ?o WHERE { ?r ?p ?o . FILTER(STRSTARTS(STR(?r), "${NS}/run/")) }`,
    );
    const byId = new Map<string, Run>();
    const idOf = (iri: string) => iri.slice(`${NS}/run/`.length);
    const entityIdOf = (iri: string) => iri.slice(`${NS}/entity/`.length);
    for (const row of rows) {
      const id = idOf(row.r);
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          sceneId: "",
          sceneText: "",
          useCanon: true,
          prompt: "",
          canonRefs: [],
          resultUrl: "",
          model: "",
          critique: { score: -1, note: "" },
          at: "",
        });
      }
      const r = byId.get(id)!;
      const p = row.p;
      const o = row.o;
      const plain = o.replace(/^"|"$/g, "");
      if (p === PRED("scene-id")) r.sceneId = plain;
      else if (p === PRED("scene-text")) r.sceneText = plain;
      else if (p === PRED("use-canon")) r.useCanon = plain === "true";
      else if (p === PRED("prompt")) r.prompt = plain;
      else if (p === PRED("result-url")) r.resultUrl = plain;
      else if (p === PRED("model")) r.model = plain;
      else if (p === PRED("score")) r.critique.score = Number(plain);
      else if (p === PRED("note")) r.critique.note = plain;
      else if (p === PRED("at")) r.at = plain;
      else if (p === PRED("cites")) r.canonRefs.push({ entityId: entityIdOf(o), version: 0 });
      else {
        const m = p.match(/\/predicate\/rendered-version\/(.+)$/);
        if (m) {
          const ref = r.canonRefs.find((c) => c.entityId === m[1]);
          if (ref) ref.version = Number(plain);
          else r.canonRefs.push({ entityId: m[1], version: Number(plain) });
        }
      }
    }
    return [...byId.values()];
  }

  private entityQuads(e: Entity, historyEntry: { version: number; description: string; at: string }): Quad[] {
    const quads: Quad[] = [
      { subject: entityIri(e.id), predicate: "https://schema.org/name", object: lit(e.name) },
      { subject: entityIri(e.id), predicate: PRED("kind"), object: lit(e.kind) },
      { subject: entityIri(e.id), predicate: PRED("current-version"), object: lit(e.version) },
      {
        subject: entityIri(e.id),
        predicate: PRED(`v${historyEntry.version}-description`),
        object: lit(historyEntry.description),
      },
      { subject: entityIri(e.id), predicate: PRED("updated-at"), object: lit(historyEntry.at) },
    ];
    if (e.anchorUrl)
      quads.push({
        subject: entityIri(e.id),
        predicate: PRED(`anchor-url-v${e.version}`),
        object: e.anchorUrl,
      });
    return quads;
  }

  async createEntity(input: { id: string; kind: EntityKind; name: string; description: string }) {
    const at = new Date().toISOString();
    const e: Entity = {
      ...entityFromId(input.id, input.kind),
      name: input.name,
      description: input.description,
      version: 1,
      history: [{ version: 1, description: input.description, at }],
    };
    await this.mutate(this.entityQuads(e, e.history[0]));
    return e;
  }

  async updateEntity(id: string, description: string) {
    const current = (await this.loadEntities()).find((x) => x.id === id);
    if (!current) return undefined;
    const at = new Date().toISOString();
    const nextVersion = current.version + 1;
    const e: Entity = { ...current, description, version: nextVersion };
    e.history = [...current.history, { version: nextVersion, description, at }];
    await this.mutate(this.entityQuads(e, { version: nextVersion, description, at }));
    return e;
  }

  async addRun(run: Run) {
    const quads: Quad[] = [
      { subject: runIri(run.id), predicate: PRED("scene-id"), object: lit(run.sceneId) },
      { subject: runIri(run.id), predicate: PRED("scene-text"), object: lit(run.sceneText) },
      { subject: runIri(run.id), predicate: PRED("use-canon"), object: lit(run.useCanon) },
      { subject: runIri(run.id), predicate: PRED("prompt"), object: lit(run.prompt) },
      { subject: runIri(run.id), predicate: PRED("result-url"), object: lit(run.resultUrl) },
      { subject: runIri(run.id), predicate: PRED("model"), object: lit(run.model) },
      { subject: runIri(run.id), predicate: PRED("score"), object: lit(run.critique.score) },
      { subject: runIri(run.id), predicate: PRED("note"), object: lit(run.critique.note) },
      { subject: runIri(run.id), predicate: PRED("at"), object: lit(run.at) },
    ];
    for (const ref of run.canonRefs) {
      quads.push({ subject: runIri(run.id), predicate: PRED("cites"), object: entityIri(ref.entityId) });
      quads.push({
        subject: runIri(run.id),
        predicate: PRED(`rendered-version/${ref.entityId}`),
        object: lit(ref.version),
      });
    }
    await this.mutate(quads);
  }

  /** Attach (or replace) the entity's visual anchor — versioned, like descriptions. */
  async setAnchorUrl(id: string, url: string) {
    const current = (await this.loadEntities()).find((x) => x.id === id);
    if (!current) return;
    await this.mutate([
      { subject: entityIri(id), predicate: PRED(`anchor-url-v${current.version}`), object: url },
    ]);
  }

  /** Mint the canon on Verifiable Memory — returns the UAL. Needs gas+TRAC (faucet). */
  async publish(): Promise<{ ual?: string; txHash?: string; error?: string }> {
    try {
      const r = await this.req(`/api/knowledge-assets/${KA}/vm/publish`, { contextGraphId: CG });
      return { ual: r.ual, txHash: r.txHash };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}

// ---------- unified API ----------

const fileBackend = new FileBackend();
let httpBackend: HttpBackend | null = null;

export function mode() {
  return config.dkg.mode;
}

export async function initStore() {
  if (config.dkg.mode === "http") {
    httpBackend = new HttpBackend(config.dkg.nodeUrl, config.dkg.token);
    await httpBackend.ready();
  }
}

function be(): FileBackend | HttpBackend {
  return (httpBackend ?? fileBackend) as FileBackend | HttpBackend;
}

export async function listEntities(): Promise<Entity[]> {
  return httpBackend ? httpBackend.loadEntities() : fileBackend.entities;
}

export async function getEntity(id: string): Promise<Entity | undefined> {
  return (await listEntities()).find((e) => e.id === id);
}

export async function createEntity(input: {
  kind: EntityKind;
  name: string;
  description: string;
}): Promise<Entity> {
  const id = `${input.kind}-${slug(input.name)}`;
  return be().createEntity({ ...input, id });
}

export async function updateEntity(id: string, description: string): Promise<Entity | undefined> {
  return be().updateEntity(id, description);
}

export async function setAnchorUrl(id: string, url: string) {
  return be().setAnchorUrl(id, url);
}

export async function addRun(run: Run) {
  return be().addRun(run);
}

export async function listRuns(): Promise<Run[]> {
  return httpBackend ? httpBackend.loadRuns() : fileBackend.runs;
}

export async function publishCanon(): Promise<{ ual?: string; txHash?: string; error?: string }> {
  if (!httpBackend) return { error: "publish requires DKG_MODE=http (edge node)" };
  return httpBackend.publish();
}
