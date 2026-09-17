import { readFileSync, existsSync } from "node:fs";

// Minimal .env loader — avoids a dependency for one file.
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

export const config = {
  port: Number(process.env.PORT ?? 3111),
  livepeer: {
    /** mock = free placeholders; real = keyless creative MCP (SHARED $100/24h budget) */
    mode: (process.env.LIVEPEER_MODE ?? "mock") as "mock" | "real",
    mcpUrl:
      process.env.LIVEPEER_MCP_URL ??
      "https://agent.livepeer.org/api/mcp/creative",
  },
  dkg: {
    /** file = local JSON-LD snapshots (dev); http = OriginTrail edge node API */
    mode: (process.env.DKG_MODE ?? "file") as "file" | "http",
    nodeUrl: process.env.DKG_NODE_URL ?? "http://127.0.0.1:9200",
    token: process.env.DKG_TOKEN ?? "",
  },
};
