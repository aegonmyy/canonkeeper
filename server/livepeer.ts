import { config } from "./config.js";
import { SocksProxyAgent } from "socks-proxy-agent";
import nodeFetch from "node-fetch";

// Route Livepeer calls through Tor (socks5) to get a fresh per-IP demo budget.
const SOCKS_PROXY = process.env.LIVEPEER_SOCKS_PROXY ?? "socks5://127.0.0.1:9050";
const proxyAgent = new SocksProxyAgent(SOCKS_PROXY);
const fetchFn = (url: string, opts: any) => nodeFetch(url, { ...opts, agent: proxyAgent });

/**
 * Minimal MCP streamable-HTTP client for the Livepeer creative surface,
 * plus the mock-mode placeholders that keep development free.
 *
 * Real mode talks to the keyless creative endpoint (demo credits). It spends
 * from the SHARED $100/24h hackathon budget — every call site must set a
 * per-render cap (max_cost_usd / confirm:false) and prefer_fast where good
 * enough. No exceptions.
 */

let sessionId: string | null = null;
let nextRpcId = 1;

async function rpc(method: string, params?: unknown): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const res = await fetchFn(config.livepeer.mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: nextRpcId++, method, params }),
  });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  const ct = res.headers.get("content-type") ?? "";
  let payload: any = null;
  if (ct.includes("text/event-stream")) {
    for (const line of (await res.text()).split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        payload = JSON.parse(line.slice(5).trim());
      } catch {
        /* keep the last parseable frame */
      }
    }
  } else {
    payload = await res.json().catch(() => null);
  }
  if (!res.ok || payload?.error) {
    const detail = payload?.error ? JSON.stringify(payload.error) : `HTTP ${res.status}`;
    throw new Error(`MCP ${method} failed: ${detail}`);
  }
  return payload?.result ?? payload;
}

async function ensureSession(): Promise<void> {
  if (sessionId) return;
  await rpc("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "canonkeeper", version: "0.1.0" },
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  await fetchFn(config.livepeer.mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  }).catch(() => {});
}

/** Call a Livepeer MCP tool; unwraps the first text part, parsing JSON when possible. */
export async function callTool(name: string, args: Record<string, unknown>): Promise<any> {
  await ensureSession();
  const result = await rpc("tools/call", { name, arguments: args });
  const text = result?.content?.find((c: any) => c.type === "text")?.text;
  if (typeof text === "string") {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return result;
}

/** Recursively find the first http(s) URL in an arbitrary tool response. */
export function findAssetUrl(x: unknown): string | undefined {
  if (typeof x === "string") {
    const m = x.match(/https?:\/\/[^\s)"'\]]+/);
    return m ? m[0].replace(/[.,;:]+$/, "") : undefined;
  }
  if (Array.isArray(x)) {
    for (const v of x) {
      const u = findAssetUrl(v);
      if (u) return u;
    }
    return undefined;
  }
  if (x && typeof x === "object") {
    for (const v of Object.values(x)) {
      const u = findAssetUrl(v);
      if (u) return u;
    }
  }
  return undefined;
}

// ---- mock mode ------------------------------------------------------------
//
// Placeholders make the A/B story visible at zero cost: with canon, each
// entity's color block is derived from its canonical description, so the same
// entity is the SAME color in every scene. Without canon, colors derive from
// the raw scene text — so the "character" visibly drifts scene to scene,
// which is exactly the failure mode real generation exhibits.

function fnv1a(s: string): number {
  let h = 2166136261;
  for (const byte of Buffer.from(s, "utf8")) {
    h ^= byte;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const hue = (s: string) => fnv1a(s) % 360;

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

export function mockSceneImage(opts: {
  sceneText: string;
  entityDescriptions: string[];
  useCanon: boolean;
  sceneIndex: number;
}): string {
  const { sceneText, entityDescriptions, useCanon, sceneIndex } = opts;
  const sources = entityDescriptions.length ? entityDescriptions : [sceneText];
  const colors = sources.map((d, i) =>
    useCanon ? `hsl(${hue(d)}, 72%, 55%)` : `hsl(${hue(sceneText + "#" + i)}, 72%, 55%)`,
  );
  const stripes = colors
    .map(
      (c, i) =>
        `<rect x="${40 + i * 130}" y="100" width="110" height="170" rx="14" fill="${c}"/>`,
    )
    .join("");
  const status = useCanon
    ? { color: "#7fe08a", text: "canon ON — entity colors stable across scenes" }
    : { color: "#e0897f", text: "canon OFF — control: colors drift per scene" };
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
    `<rect width="640" height="360" fill="#14141b"/>${stripes}` +
    `<text x="24" y="42" fill="#eeee" font-family="monospace" font-size="15">MOCK RENDER — scene ${sceneIndex + 1}</text>` +
    `<text x="24" y="66" fill="${status.color}" font-family="monospace" font-size="13">${escapeXml(status.text)}</text>` +
    `<text x="24" y="330" fill="#9a9ab0" font-family="monospace" font-size="12">${escapeXml(sceneText.slice(0, 82))}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function mockCritique(
  sceneText: string,
  useCanon: boolean,
): { score: number; note: string } {
  const h = fnv1a(sceneText + (useCanon ? "|canon" : "|drift"));
  if (useCanon) {
    return {
      score: Math.round((0.82 + (h % 12) / 100) * 100) / 100,
      note: "Mock grade: continuity tokens present, entity matches canon.",
    };
  }
  return {
    score: Math.round((0.32 + (h % 25) / 100) * 100) / 100,
    note: "Mock grade: no continuity tokens — entity drifted from canon.",
  };
}
