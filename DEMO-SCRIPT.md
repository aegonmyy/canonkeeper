# CanonKeeper — narration track for canonkeeper-walkthrough.mp4

Talk like you're showing a friend, not reading a script. If you stumble,
keep going — the screen is the proof, your voice is just guiding the eye.
Pause when the stage chip changes so people can look first. The numbers
on screen do the heavy lifting; you don't have to sell anything.

Trim, ad-lib, skip lines. Nothing here is mandatory — it's scaffolding.

## Pre-flight

```bash
dkg start 2>/dev/null; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9200/ui  # want 200
cd /workspaces/workspace/canonkeeper
DKG_MODE=http DKG_TOKEN=$(dkg auth show | tail -1) LIVEPEER_MODE=real PORT=3111 npm start
```
Open `http://localhost:3111`, clean browser, hit record. The video file is
already captured (`docs/demo/canonkeeper-walkthrough.mp4`) — you can also
just play that and narrate over it in editing instead of recording live.

**Where do generated images appear?** When you click Render, new images
show up in the **Evidence panel at the bottom** — each scene gets two cards
side by side: left = canon ON, right = canon OFF. The latest render for
each arm replaces the previous one in that slot. The images are real
AI-generated images hosted on Livepeer's GPU network.

---

## UI reference — what every element on screen is

Read this before recording so you know what you're looking at. You don't
need to say all of this in the video — the "UI walkthrough" narration section
covers the essentials. This is so you understand it yourself.

### Header (top of page)

- **"CanonKeeper"** — the app name (the "Keeper" part is in amber/orange).
- **Subtitle** — "A script supervisor for AI video — canon lives as Knowledge
  Assets on the DKG, every render consults it, corrections propagate."
- **Two badges, top-right** — `livepeer: real` and `dkg: http`. These show
  the app is running against the real Livepeer network and the real DKG node
  (not mock mode). If it said `mock`, you'd be looking at placeholders.

### Section 1: Canon panel (top-left)

Header reads **"CANON · Knowledge Assets · versioned"**. Below it, five cards
stacked vertically. Each card is one entity in the story's canon:

**Card layout (same for all five):**
- **Colored chip** (top-left of card) — the entity type:
  - Purple = character (Maya, Biscuit)
  - Teal = prop (Compass)
  - Gold = location (The Perch)
  - Blue = fact (Lighthouse rule)
- **Name** (bold, next to chip) — the entity's name
- **Version badge** (right side, amber) — like `v6` or `v3`. This number goes
  up every time the canon for that entity is edited. Maya is v6 (edited 5
  times during build). Compass is v3 (edited twice). The rest are v1
  (never edited).
- **Anchor image** (square thumbnail, below the name) — a generated reference
  image. This is what every render of that entity is drawn from. Characters
  get portraits, locations get establishing shots, props get product shots.
  Facts (Lighthouse rule) have NO image — they're text-only canon.
- **Description text** (below the image) — the continuity tokens. This exact
  text gets injected verbatim into render prompts when canon is ON. E.g.,
  Maya's says "mid-30s, dark brown skin, close-cropped black curls, small
  gold hoop earrings, CRIMSON RED bomber jacket..."
- **"edit canon" button** (bottom of card) — click this to edit the
  description. Saving bumps the version and flags stale renders.

**The five entities:**
1. **Maya** (character, v6) — the main character. Anchor = portrait of a
   woman with dark skin, black curls, red jacket, gold earrings.
2. **Biscuit** (character, v1) — the cat. Anchor = orange tabby.
3. **The Perch** (location, v1) — Maya's apartment. Anchor = yellow kitchen.
4. **Compass** (prop, v3) — Maya's compass. Anchor = brass compass. Currently
   says "glass fully shattered, needle missing" (edited during build).
5. **Lighthouse rule** (fact, v1) — "the lighthouse always flashes twice,
   then a pause." No image.

**Below the cards:**
- **"+ add entity"** — collapsed form to add a new entity to the canon.
- **"Publish canon → Verifiable Memory (UAL)" button** — mints the canon on
  the blockchain. Currently shows an error when clicked (testnet faucet is
  dry). The text below it says "canon lives in Shared Working Memory;
  publishing anchors it on-chain."

### Section 2: Storyboard panel (top-right)

Header reads **"STORYBOARD · one scene per line · @mentions pull canon"**.

- **Text box** — six lines, each is one scene of a short story:
  1. `@maya makes coffee at dawn in @the-perch while @biscuit weaves between her feet`
  2. `@maya checks the @compass — the needle spins slowly, wrong`
  3. `From the @the-perch bay window, the lighthouse flashes once. @maya goes still.`
  4. `@maya runs down the @the-perch stairs, @biscuit watching from the landing`
  5. `@At the harbor fence, @maya holds the @compass up against the lighthouse flash`
  6. `@maya turns back toward @the-perch, jaw set; @biscuit waits in the window`

  The `@` tags are how scenes reference canon entities. When you render,
  the app finds every `@name`, pulls that entity's description from the DKG,
  and injects it into the prompt.

- **"Render — canon ON" button** (amber) — generates all six scenes using
  the canon (injects continuity tokens + uses anchor as character cast).
  Costs real money (~$0.50 for 6 scenes). You do NOT need to click this
  during the demo — the results already exist in the Evidence panel.

- **"Control — canon OFF" button** (red-ish) — generates the same scenes
  ignoring the canon (raw text only, no anchors, no continuity tokens).
  Also costs money. Also already done — results are in Evidence.

- **Stale banner** (appears below the buttons when active) — a red-bordered
  bar that says "N scenes flagged stale" with a "Re-render stale scenes"
  button. This only appears AFTER you edit the canon. During the demo,
  you'll see it after editing the Compass.

### Section 3: Evidence panel (bottom, full width)

Header reads **"EVIDENCE · run ledger · drift grades · staleness"**.

This is the most important section. It shows every render that's been done,
grouped by scene. For each scene, you see **two cards side by side**:

**Left card = canon ON (the one that checked the canon):**
- **Image** (top, 16:9) — a real AI-generated image from Livepeer. The
  character should look consistent with the anchor (same Maya across all
  scenes).
- **Score** (green number, like `1.00` or `0.96`) — the critique_shot grade.
  Green = pass (≥0.70). This is Gemini Vision judging how well the render
  matches the canon anchor.
- **"canon ON" tag** (green pill) — indicates this render used the canon.
- **Canon ref chips** (small pills, like `Maya v6`, `Biscuit v1`) — which
  canon entities this render referenced, and which version. This is the
  audit trail: you can see exactly which version of each entity was used.
- **Judge's note** (small text at bottom) — the critique_shot response,
  e.g., "PASS (total 0.96 vs threshold 0.70) Sub-scores: face 1.00,
  marks 1.00, palette 0.90, wardrobe 0.70..."
- **STALE badge** (red, only if canon changed after this render) — shows
  this render was made against an old version. Appears after you edit
  the canon, disappears after you re-render.

**Right card = canon OFF (the control — same scene, no canon):**
- **Image** — a different AI-generated image. The character will look
  different (different person, different clothes, sometimes a different
  species — the judge said "a dog").
- **Score** (red number, like `0.00`) — fail. The same judge, grading
  against the same anchor, but this render didn't use the canon.
- **"canon OFF" tag** (red pill) — indicates this render ignored the canon.
- **Canon ref chips** — same entities listed (for the ledger), but the
  render didn't actually use their descriptions.
- **Judge's note** — e.g., "FAIL (total 0.00) ... completely different
  characters and a dog, none of whom match the anchor."

**Some scenes only have the left card (canon ON)** — the control (canon OFF)
was only rendered for 2 of the 6 scenes (scenes 0 and 1). The right card
shows "no canon-OFF render yet" for the others.

**The side-by-side comparison IS the demo.** Same scene, same AI model, same
judge. Left checked the canon → passes. Right didn't → fails. That's the
Track 2 question ("does the knowledge graph change what the app does")
answered visually.

---

## Narration

### 0:00 — UI walkthrough (explain the screen)

> Okay so, the page has three parts. Top-left is the **canon** — that's the
> memory. Every character, prop, and location in the story lives here as a
> card, and it's on a decentralized knowledge graph, so it's verifiable.
>
> Top-right is the **storyboard** — that's the input. Each line is one scene,
> and the @-tags like @maya reference things in the canon.
>
> And the bottom is the **evidence** — that's where every render lands. For
> each scene you get two cards side by side: left is with the canon, right
> is without. That's where you see the difference.

### 0:25 — chip: `1/6 · THE CANON`

> So — the thing about AI video is, you ask for the same character in scene
> one and scene ten, and you get two completely different people. Every
> single time. There's just no memory between generations.
>
> What we built is basically a memory for that. This panel here is the
> canon — every character, prop, location in the story. And it's not
> sitting in our database, it's on a decentralized knowledge graph, so
> it's verifiable. Anyone can check it.

### 0:42 — chip: `2/6 · ANCHOR SHEETS`

> Each one of these has an anchor sheet. Like, this is Maya — that image
> is generated once, and it becomes the reference. Every time we render
> Maya, she's drawn *from this*, not from the model just kind of guessing.

### 0:55 — chip: `3/6 · A/B EVIDENCE`

> Okay, this is the part I really want you to see. Same scene, same
> model, same judge. The only difference is whether it checked the canon
> first.
>
> Left side — checked. Scores point-nine-six to one-point-oh. Passes
> clean.
>
> Right side — didn't check. Zero point zero zero. The judge literally
> wrote, "completely different characters, and a dog." There's no dog
> in the story. *That's* what no memory looks like.

### 1:15 — chip: `4/6 · LIVE CANON EDIT`

> So now let's change something. Say the prop department breaks the
> compass — the glass shatters, the needle's gone.
>
> *(edit, save)*
>
> That just bumped the canon to version three.

### 1:40 — chip: `5/6 · CORRECTION PROPAGATES`

> And here's the bit I think is genuinely cool. The system knows exactly
> which renders were made against the old compass. Just two scenes. It
> flags *those*, and only those, as stale. I don't re-render the whole
> series — I re-render the two shots that are now wrong.

### 1:55 — chip: `6/6 · RE-RENDER STALE`

> Each one pulls the new canon, uses the new anchor, and gets graded
> again by the vision judge. All of that — the generation, the character
> casting, the critique — is one Livepeer API.

### 2:15 — chip: `✓ VERIFIED`

> And there it is. Both generations are sitting in the ledger on the
> knowledge graph now. Anyone can query which render was made against
> which version, and what changed, when. Total cost to build all of
> this — under a dollar on Livepeer's network.
>
> So — CanonKeeper. It's a script supervisor for AI video, with a
> tamper-evident notebook. Thanks.

## If something breaks

The video file is already captured and on the repo. Worst case, play
`docs/demo/canonkeeper-walkthrough.mp4` and narrate over it in editing —
same beats, same stage chip, zero live risk. The state in the app never
resets itself, so you can also just re-run the live flow; it costs about
fifty cents a take.
