# CanonKeeper — demo walkthrough script (~3:30)

For Aminu. Every action is real state already in the app — nothing is faked.
Read the narration lines as guides, not teleprompter; say it however feels
natural. The numbers on screen do the persuading.

## Pre-flight (before hitting record)

```bash
# 1. DKG node up (it survives reboots — check first)
dkg start 2>/dev/null || echo "already running"; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9200/ui  # want 200

# 2. App in real mode
cd /workspaces/workspace/canonkeeper
DKG_MODE=http DKG_TOKEN=$(dkg auth show | tail -1) LIVEPEER_MODE=real PORT=3111 npm start
```

- Open `http://localhost:3111` in a clean browser window (no bookmarks bar,
  few tabs). Full-screen or near it.
- Have the README open in a second tab (you'll flash it at the end).
- Record with any tool (OBS, VS Code screen recorder, QuickTime). 1366x850+.
- Mic check. Speak slower than feels normal.
- **Budget note:** the live part of this demo costs about $0.30–0.50 of the
  shared $100/day allowance. Fine.

## The script

### 0:00 — Hook (canon panel on screen)

> "AI video has a continuity problem. Ask for the same character in scene one
> and scene ten, and you get two different people. On a film set there's a
> whole job for this — the script supervisor, the person who makes sure the
> jacket stays red between shots. AI video doesn't have one.
> This is CanonKeeper. That's the job it does."

**Do:** point/cursor-hover over the canon panel cards as you talk.

### 0:20 — The canon lives on the knowledge graph

> "Every character, prop, location and fact lives as a Knowledge Asset on the
> OriginTrail DKG — versioned, queryable. These descriptions aren't prompt
> decoration: they're the canonical record. And these images —"

**Do:** hover Maya's card — anchor thumbnail, `v4` badge.

> "— are anchor sheets. When we render a scene, Maya is generated *from this
> reference*, not from wishful thinking."

### 0:50 — The A/B (money shot — slow down here)

**Do:** scroll to the Evidence panel. Give it a beat before speaking.

> "Here's the same scene, rendered twice. Same text, same models, same judge.
> The only difference: the left one consulted the canon — verbatim continuity
> tokens in the prompt, plus the anchor passed as a character cast. The right
> one didn't.
> Left: zero-nine-six to one-zero-zero — pass. Right: zero-point-zero-zero —
> fail. The judge's actual note on the right: 'completely different characters
> — and a dog.'
> That's the Track 2 question — does the knowledge graph materially change
> what the app does — answered in one screen."

### 1:40 — Live edit (the part you do live)

**Do:** scroll back to canon. Click **edit canon** on the **Compass** card.

> "Now the part I like most. Say the prop department changes the compass —
> the cracked glass shatters completely."

**Do:** edit the description — change
`glass cracked over north` → `glass fully shattered, needle stuck at north`.
Click **save**. (The anchor regenerates — ~15 seconds. Narrate over it:)

> "Saving bumps the canon to version two — and watch, the anchor sheet
> regenerates itself to match. Corrections propagate visually too."

### 2:20 — Stale propagation

**Do:** scroll slightly to show the stale banner.

> "And here's the ledger paying off. The system knows exactly which renders
> cited the old compass — two scenes — and only those are flagged stale.
> Everything else is untouched. I'm not re-rendering the series; I'm
> re-rendering the *two shots that are now wrong*."

### 2:30 — Re-render (takes ~1 min for 2 scenes — narrate over it)

**Do:** click **Re-render stale scenes**.

> "Each re-render pulls the new canon, casts the new anchor, and gets graded
> again by the vision judge. Everything Livepeer Agent does here — the
> generation, the character casting, the critique — is one API, one key."

**Do:** when it completes, scroll the evidence panel: the two scenes now show
fresh timestamps and cite `compass v2`.

> "Done — same series, corrected canon, and the run ledger on the DKG now
> shows both generations side by side. Anyone can query what changed, when,
> and which renders were made against which version."

### 3:10 — Wrap

**Do:** flash the README tab briefly (the architecture diagram + A/B table).

> "Quick honesty section: one character cast per render today, the critique is
> anchor-relative, and the on-chain UAL publish is one click away — the
> testnet faucet's been dry, that's on their infra, the off-chain assertion
> already has a DID.
> Total build cost: under a dollar on Livepeer's shared demo credit.
> CanonKeeper — a script supervisor for AI video, with a tamper-evident
> notebook. Thanks."

## Fallbacks (if something breaks live)

- **A render hangs:** the existing evidence carries the story — keep talking,
  scroll on. The A/B panel needs nothing live.
- **The edit feels slow:** that's the anchor regenerating — it's supposed to
  show; mention it.
- **Total failure:** play `docs/demo/canonkeeper-demo.mp4` as backup and
  narrate over it — same beats.
- Nervous? The state never resets itself — you can rehearse the whole flow
  twice for ~$0.50 before recording the take.

## Why this shape (for your head, not the camera)

Judges score: does it work end-to-end (the A/B panel is already-rendered
proof), does the DKG change behavior (the A/B *is* that, isolated), Livepeer
doing meaningful work (generation + cast + critique), product judgment (small
scope, reliable loop), continuation potential (any serialized content team).
The script hits each one once. Don't add more — three and a half minutes of
"it works" beats seven of features.
