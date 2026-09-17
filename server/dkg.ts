import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { config } from "./config.js";

/**
 * DKG adapter.
 *
 * `file` mode (dev): JSON-LD-flavored snapshots on disk. Same record shapes we
 * push to the OriginTrail edge node, so switching is a transport change, not a
 * data-model change.
 *
 * `http` mode (day 2+): talk to the local edge node (`npm i -g
 * @origintrail-official/dkg && dkg init && dkg start`, then `dkg auth show` for
 * the bearer token). Knowledge Assets get created/queried through the node
 * gateway; publishing to Verifiable Memory on testnet mints UALs — that's the
 * create → retrieve → verify evidence path the judges want to see.
 */

export type EntityKind = "character" | "prop" | "location" | "fact";

export interface Entity {
  id: string; // slug, e.g. "char-maya"
  "@type": string; // Character | Prop | Location | Fact
  kind: EntityKind;
  name: string;
  /** Continuity tokens — injected VERBATIM into scene prompts. */
  description: string;
  /** Hosted reference image (Livepeer upload_image) — canon anchor, wired day 3. */
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
  /** Exactly what was sent to the model — the audit record. */
  prompt: string;
  canonRefs: CanonRef[];
  resultUrl: string;
  model: string;
  critique: { score: number; note: string };
  at: string;
}

interface Store {
  entities: Entity[];
  runs: Run[];
}

const DATA_DIR = "data";
const store: Store = { entities: [], runs: [] };

function persist() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(`${DATA_DIR}/canon.json`, JSON.stringify(store.entities, null, 2));
  writeFileSync(`${DATA_DIR}/runs.json`, JSON.stringify(store.runs, null, 2));
}

export function loadStore() {
  if (existsSync(`${DATA_DIR}/canon.json`))
    store.entities = JSON.parse(readFileSync(`${DATA_DIR}/canon.json`, "utf8"));
  if (existsSync(`${DATA_DIR}/runs.json`))
    store.runs = JSON.parse(readFileSync(`${DATA_DIR}/runs.json`, "utf8"));
}

export function listEntities(): Entity[] {
  return store.entities;
}

export function getEntity(id: string): Entity | undefined {
  return store.entities.find((e) => e.id === id);
}

export function createEntity(input: {
  kind: EntityKind;
  name: string;
  description: string;
}): Entity {
  const entity: Entity = {
    id: `${input.kind}-${slug(input.name)}`,
    "@type": input.kind[0].toUpperCase() + input.kind.slice(1),
    kind: input.kind,
    name: input.name,
    description: input.description,
    version: 1,
    history: [
      { version: 1, description: input.description, at: new Date().toISOString() },
    ],
  };
  store.entities.push(entity);
  persist();
  return entity;
}

/** Canon edit — bumps the version; every run citing an older version goes stale. */
export function updateEntity(id: string, description: string): Entity | undefined {
  const e = getEntity(id);
  if (!e) return undefined;
  e.version += 1;
  e.description = description;
  e.history.push({ version: e.version, description, at: new Date().toISOString() });
  persist();
  return e;
}

export function addRun(run: Run) {
  store.runs.push(run);
  persist();
}

export function listRuns(): Run[] {
  return store.runs;
}

/** A run is stale when any canon entity it rendered against has since changed. */
export function staleRefs(run: Run): CanonRef[] {
  return run.canonRefs
    .map((ref) => {
      const e = getEntity(ref.entityId);
      return e && e.version > ref.version ? { ...ref, version: ref.version } : null;
    })
    .filter((r): r is CanonRef => r !== null);
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function mode() {
  return config.dkg.mode;
}
