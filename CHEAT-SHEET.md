# CanonKeeper — narration cheat sheet

Key terms and proper nouns to drop while narrating in your own words.
Judges listen for the real stack names.

## What generates the images

- **Livepeer Agent** — the AI media service we call, via **MCP** (Model Context Protocol)
- **flux-schnell** — the actual model generating each image. Fast, cheap (~$0.003/image), running on Livepeer's **decentralized GPU network**. We route to it with `prefer_fast: true`
- Other models on the network: flux-dev, veo (video), kling, seedance — we use flux-schnell for cost

## Who critiques (the judge)

- **critique_shot** — a Livepeer Agent tool that grades every render
- Powered by **Gemini Vision** (Google's vision model) — compares the generated image against the anchor sheet
- Returns sub-scores: **face, wardrobe, palette, marks** — each 0 to 1, threshold 0.70
- The "and a dog" note is literally Gemini Vision's verdict on the control render

## How characters stay consistent

- **cast** — Livepeer's parameter: `cast: {reference_url, name}`. Pass the anchor image + character name, and the model generates from that reference. This is Livepeer's built-in character consistency control — what makes Maya look like Maya across scenes

## Where the canon lives

- **OriginTrail DKG** (Decentralized Knowledge Graph) — the network storing the canon
- A **V10 edge node** running on **Base Sepolia testnet** (a blockchain test network)
- The canon is a **Knowledge Asset** inside a **Context Graph**
- Stored as **RDF triples** (subject → predicate → object) — queryable via **SPARQL** (a graph query language)
- Published on-chain with a **UAL** (Universal Asset Locator): `did:dkg:base:84532/0xec10.../1` — like a URL but for verifiable knowledge on the blockchain

## The three DKG memory layers (if asked)

- **Working Memory** — local, free, where data currently lives
- **Shared Working Memory** — gossip-replicated to peers, free but temporary
- **Verifiable Memory** — anchored on-chain, permanent, costs gas — this is where the UAL comes from

## Terms to naturally drop (judges listen for these)

1. **Livepeer Agent** + **MCP** — how we call the AI
2. **flux-schnell** — the model generating images
3. **critique_shot** + **Gemini Vision** — who grades drift
4. **cast** — Livepeer's character consistency mechanism
5. **OriginTrail DKG** — where the canon lives
6. **Knowledge Asset** + **UAL** — the on-chain evidence
7. **SPARQL** — how we query the canon
8. **Base Sepolia testnet** — the blockchain layer
