# CanonKeeper

**A script supervisor for AI video — with a tamper-evident notebook.**

Every film set has a script supervisor whose whole job is continuity: the jacket
stays red, the coffee cup stays in the left hand, the kitchen stays yellow. AI
video has no script supervisor — every generation has amnesia, so characters
drift between scenes. CanonKeeper is that missing person:

- **Canon** (characters, props, locations, facts) lives as Knowledge Assets on
  the OriginTrail DKG — versioned, shared, queryable.
- Every render **consults the canon**: entity descriptions are injected
  *verbatim* into each scene prompt, and character anchors are passed to
  Livepeer's `cast` control for verified consistency.
- Every result is **graded against the canon anchor** (`critique_shot`,
  Gemini Vision) — drift becomes a number, not a vibe.
- **Corrections propagate**: change one fact (red jacket → navy) and the system
  knows exactly which renders cited the old version — it flags them stale and
  re-renders only those.

Livepeer's creative harness keeps a character consistent *within* one job.
CanonKeeper keeps it consistent *across* jobs, sessions, and teams — verifiably.

## The A/B (measured, not asserted)

Same scene text, same models, same judge (`critique_shot` against the same
canon anchor). The only variable is whether the render consults the knowledge
graph:

| Arm | Score | Judge's note |
|---|---|---|
| canon ON (`cast` + verbatim continuity tokens) | **0.96–1.00** | "compass necklace missing" (minor wardrobe note) |
| canon OFF (raw scene text) | **0.00 FAIL** | "completely different characters and a dog, none of whom match the anchor" |

Six-scene storyboard, canon ON: 0.97 / 1.00 / 1.00 / 1.00 / 0.99 / 0.97.
After editing the canon (jacket red → navy), all canon-ON renders were flagged
stale (cited v2, canon now v3), the anchor sheet regenerated itself, and
`rerender-stale` re-rendered the series against v3.

## Architecture

```
Storyboard (@maya, @the-perch …)              ┌──────────────────────┐
        │                                     │ OriginTrail DKG      │
        ▼                                     │ (edge node, testnet) │
  mention resolution ──── SPARQL ────────────▶│ canon Knowledge Asset│
        │                                     │  schema:name, kind,  │
        ▼                                     │  current-version,    │
  prompt build (verbatim tokens)              │  v<n>-description,   │
        │                                     │  anchor-url-v<n>     │
        ▼                                     │ run ledger KA:       │
  Livepeer Agent (creative MCP)               │  pred:cites ─▶entity │
   · create_media + cast:{reference_url,name} │  rendered-version/n  │
   · critique_shot (Gemini Vision grade)      └──────────────────────┘
        │                                              ▲
        ▼                                      staleness = pure SPARQL:
  run written back to DKG                     "did a cited entity version bump?"
   (result URL, prompt, score, cites)
```

## Evidence path (Track 2)

- **Create**: entities and runs are written via the canonical Knowledge Asset
  lifecycle (`wm/write` → `swm/share`; the asset's assertion URI is
  `did:dkg:base:84532/0xec10…/0`).
- **Retrieve**: every render resolves @mentions and reads entity state from
  the graph — the app's behavior *changes* because of what it retrieves
  (that's the A/B above).
- **Verify**: version history accumulates as triples (`v1-description`,
  `v2-description`, …), so any consumer can SPARQL exactly what canon any
  render was made against, and what changed since. The canon is published to
  Verifiable Memory on the Base Sepolia testnet:
  **UAL: `did:dkg:base:84532/0xec101b19f62667223ed8b83f08a7edcca78fb0a2/1`**
  (tx `0x674948a668332895a937d6f7ab1de19ba1d522612f1665e72d9d546664c600a1`).

## Run it

```bash
npm install
cp .env.example .env
npm start                    # http://localhost:3111 — mock mode, $0

# Real rendering + real DKG:
DKG_MODE=http DKG_TOKEN=$(dkg auth show | tail -1) LIVEPEER_MODE=real npm start
```

Requires the DKG edge node (`npm i -g @origintrail-official/dkg`, config in
`~/.dkg/config.json`, `dkg start`) for http mode. Mock mode needs nothing.

## Livepeer Agent usage

| Tool | Role in CanonKeeper |
|---|---|
| `create_media` | anchors (reference sheets) + scene renders, with `cast:{reference_url, name}` for character consistency |
| `critique_shot` | the drift judge — grades every render (both A/B arms) against the canon anchor |
| `get_pricing`, `spend_cap`, `get_cost_report` | budget guardrails on the shared demo allowance |

Every render is capped (`max_cost_usd`), routed cheap (`prefer_fast` →
flux-schnell), and tagged (`session_id`) for attribution. Total spend building
this demo: **$0.60** of the shared $100/day allowance.

## Honest limitations

- **UAL minted**: the canon Knowledge Asset is published on Base Sepolia
  testnet at `did:dkg:base:84532/0xec101b19f62667223ed8b83f08a7edcca78fb0a2/1`.
- **One cast per render**: Livepeer's `cast` takes a single character
  reference, so multi-character scenes rely on verbatim tokens for everyone
  but the first-mentioned character (the grader keys off that one too).
- **Anchors are themselves generated images** — they pin *a* visual
  interpretation of the description, not a ground-truth photo.
- **Critique is anchor-relative**: it measures consistency with the canon
  anchor, not general aesthetic quality.
- **Shared demo bearer**: `get_cost_report` scope mixes all hackers' jobs;
  our accounting above comes from `spend_cap` readings.
- **SWM, not VM, by default**: day-to-day canon lives in Shared Working
  Memory (free, gossip-replicated). On-chain Verifiable Memory is the explicit
  publish step.

## Status

Built for the Livepeer Agent Hackathon (Track 2), deadline 2026-09-24.
Git history tells the build story day by day.

## License

MIT
