# CanonKeeper

**A script supervisor for AI video — with a tamper-evident notebook.**

Every film set has a script supervisor whose whole job is continuity: the jacket
stays red, the coffee cup stays in the left hand, the kitchen stays yellow.
AI video has no script supervisor — every generation has amnesia, so characters
drift between scenes. CanonKeeper is that missing person.

- **Canon** (characters, props, locations, facts) lives as Knowledge Assets on the
  OriginTrail DKG — versioned, verifiable, shared.
- Every render **consults the canon**: continuity tokens are injected verbatim
  into each scene prompt on the Livepeer Agent network.
- Every result is **graded against the canon** (`critique_shot`); drift is flagged.
- **Corrections propagate**: change one fact (new jacket, rebranded logo) and the
  system knows exactly which rendered scenes cite the old version — it marks them
  stale and re-renders only those, via `director_re_render`.

## Run it

```bash
npm install
cp .env.example .env
npm start          # http://localhost:3111
```

Defaults to **mock mode** — fully working pipeline with local placeholders,
zero network spend. Flip `LIVEPEER_MODE=real` for live rendering (shared
hackathon budget — see `.env.example`).

## The A/B demo

Render the same storyboard twice:

- **Canon ON** — entity descriptions are injected into every prompt; critique
  scores are high; scenes stay consistent.
- **Canon OFF (control)** — raw scene text only; the same character visibly
  becomes different people across scenes; drift scores drop.

Same models, same script. The knowledge is the difference — that's Track 2's
"does the DKG materially change what the app does," answered in thirty seconds.

## Status

Work in progress (hackathon build, deadline 2026-09-24). See `docs/` for the
Livepeer MCP tool schemas used.

## License

MIT
