# Submission crib sheet (for Aminu)

Everything needed for https://atumera.com/hackathon/submit — registered email
+ code **542429**. Deadline **2026-09-24 23:59 Athens (UTC+3)**.

## Before submitting (touchpoints that need Aminu)

1. **Publish the repo**: create a public GitHub repo (suggest `canonkeeper`),
   push this directory (`git remote add origin … && git push -u origin main`).
   MIT LICENSE and README are in place.
2. **Eyeball the demo video**: `docs/demo/canonkeeper-demo.mp4` (stitched) or
   the two source clips. If you want to narrate, re-record over
   `scripts/capture-demo.mjs` output — or just ship it; the A/B scores and
   stale-propagation are visible on screen.
3. **UAL publish** (pending OriginTrail's faucet refilling its ETH pool):
   `bash scripts/fund.sh` until wallets show a balance, then boot the app
   (`DKG_MODE=http DKG_TOKEN=$(dkg auth show | tail -1) npm start`) and click
   **"Publish canon → Verifiable Memory (UAL)"** — paste the UAL into the
   README's evidence-path section and the submission text.

## Suggested submission text (adapt freely)

**Project**: CanonKeeper — a script supervisor for AI video, with a
tamper-evident notebook.

**Track**: 02 — Livepeer Agent + OriginTrail

**What it does**: Serialized AI video dies on continuity — characters drift
between scenes because every generation has amnesia. CanonKeeper keeps the
canon (characters, props, locations, facts) as versioned Knowledge Assets on
the OriginTrail DKG. Every render consults the canon (verbatim continuity
tokens + `cast` character anchors via Livepeer Agent), every result is graded
against the canon anchor (`critique_shot`, Gemini Vision), and corrections
propagate: edit one fact and the system knows exactly which renders cite the
old version, flags them stale, and re-renders only those.

**Measured A/B** (same scene, same models, same judge): canon ON 0.96–1.00;
canon OFF 0.00 ("completely different characters and a dog").

**Livepeer Agent usage**: `create_media` with `cast:{reference_url,name}` and
`max_cost_usd` caps for anchors + scenes; `critique_shot` as the drift judge
on both A/B arms; `get_pricing`/`spend_cap`/`get_cost_report` for budget
discipline. Total build spend: <$1 of the shared allowance.

**Evidence path**: canon + run ledger are Knowledge Assets
(`did:dkg:base:84532/0xec10…/0`); retrieval drives generation behavior;
version history accumulates as triples so any consumer can verify what each
render was made against. [UAL: ______ when faucet funds land]

**Limitations** (honest): single-character cast per render; anchors are
themselves generated references; critique is anchor-relative; UAL minting
pending faucet ETH (assertion URI exists off-chain); SWM is the default layer,
VM publish is explicit.

## Repo state at capture time

- 12 commits telling the build story day by day
- Mock mode works with zero setup (`npm install && npm start`)
- Real mode verified end-to-end against Livepeer creative MCP + local DKG
  edge node on testnet
