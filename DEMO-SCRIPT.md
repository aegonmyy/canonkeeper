# CanonKeeper — narration track for canonkeeper-walkthrough.mp4 (2:21)

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

## Narration — synced to the stage chip

### 0:00 — chip: `1/6 · THE CANON`

> So — the thing about AI video is, you ask for the same character in scene
> one and scene ten, and you get two completely different people. Every
> single time. There's just no memory between generations.

> What we built is basically a memory for that. This panel here is the
> canon — every character, prop, location in the story. And it's not
> sitting in our database, it's on a decentralized knowledge graph, so
> it's verifiable. Anyone can check it.

### 0:17 — chip: `2/6 · ANCHOR SHEETS`

> Each one of these has an anchor sheet. Like, this is Maya — that image
> is generated once, and it becomes the reference. Every time we render
> Maya, she's drawn *from this*, not from the model just kind of guessing.

### 0:30 — chip: `3/6 · A/B EVIDENCE`

> Okay, this is the part I really want you to see. Same scene, same
> model, same judge. The only difference is whether it checked the canon
> first.

> Left side — checked. Scores point-nine-six to one-point-oh. Passes
> clean.

> Right side — didn't check. Zero point zero zero. The judge literally
> wrote, "completely different characters, and a dog." There's no dog
> in the story. *That's* what no memory looks like.

### 0:50 — chip: `4/6 · LIVE CANON EDIT`

> So now let's change something. Say the prop department breaks the
> compass — the glass shatters, the needle's gone.

> *(edit, save)*

> That just bumped the canon to version three.

### 1:15 — chip: `5/6 · CORRECTION PROPAGATES`

> And here's the bit I think is genuinely cool. The system knows exactly
> which renders were made against the old compass. Just two scenes. It
> flags *those*, and only those, as stale. I don't re-render the whole
> series — I re-render the two shots that are now wrong.

### 1:30 — chip: `6/6 · RE-RENDER STALE`

> Each one pulls the new canon, uses the new anchor, and gets graded
> again by the vision judge. All of that — the generation, the character
> casting, the critique — is one Livepeer API.

### 1:50 — chip: `✓ VERIFIED`

> And there it is. Both generations are sitting in the ledger on the
> knowledge graph now. Anyone can query which render was made against
> which version, and what changed, when. Total cost to build all of
> this — under a dollar on Livepeer's network.

> So — CanonKeeper. It's a script supervisor for AI video, with a
> tamper-evident notebook. Thanks.

## If something breaks

The video file is already captured and on the repo. Worst case, play
`docs/demo/canonkeeper-walkthrough.mp4` and narrate over it in editing —
same beats, same stage chip, zero live risk. The state in the app never
resets itself, so you can also just re-run the live flow; it costs about
fifty cents a take.
