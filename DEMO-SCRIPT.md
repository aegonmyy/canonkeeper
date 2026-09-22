# CanonKeeper — demo narration (first person)

Talk like you're walking someone through what you built. You're not
reading a script — you're just showing your work. If you stumble,
keep going. The screen proves it; your voice just guides the eye.

## Pre-flight

The tunnel is live. Open the URL in your browser, make sure the page
loads (dark page, canon panel on the left with five cards). Hit record
on your screen + mic. Then follow the beats below.

**Where do generated images appear?** In the Evidence panel at the
bottom — each scene gets two cards side by side (left = canon ON,
right = canon OFF).

---

## Narration

### 0:00 — What's on screen

> So I'm looking at the app here. It's got three parts. Top-left, these
> cards — that's the canon. That's the memory for the story. Top-right,
> the text box — that's the storyboard, the input. And down at the
> bottom, that's the evidence — that's where every render shows up, and
> that's where you can see the difference.

### 0:20 — The canon

> So I'm scrolling through the canon here. Five cards — Maya, Biscuit,
> The Perch, Compass, Lighthouse rule. Each one is a character or a prop
> or a place in the story. And this isn't just sitting in my database —
> it's on a decentralized knowledge graph, the OriginTrail DKG. So it's
> verifiable. Anyone can check what the canon says.

> I'm looking at Maya here — she's on version six, which means I've
> edited her description five times while building this. And this image,
> this is her anchor sheet. Every time I render Maya, she gets drawn
> from this reference, not from the model just guessing.

### 0:50 — The A/B (the money shot)

> Okay, I'm scrolling down to the evidence panel now. This is the part
> I really want to show. Each scene has two cards side by side. Left is
> with the canon, right is without. Same scene, same model, same judge.

> I'm looking at the left card — score is point-nine-six to one-point-oh.
> Passes clean. The character looks like Maya. The jacket's right. The
> compass is there.

> Now the right card — same scene, but it didn't check the canon. Score
> is zero point zero zero. The judge literally wrote, "completely
> different characters, and a dog." There's no dog in the story. That's
> what happens when there's no memory.

### 1:20 — Live edit

> So now I'm going to change something. I'm scrolling back up to the
> canon. I'm going to click "edit canon" on the Compass here.

> *(click edit, change the text — e.g., "needle stuck at north" →
> "needle gone entirely, only shards remain")*

> I'm changing the description — the glass is fully shattered now, the
> needle's gone. I'm going to save this.

> *(click save)*

> That just bumped the canon to version two. And if I look at the
> compass card — the anchor image is regenerating. The visual reference
> is updating itself to match the new canon.

### 1:50 — Stale propagation

> Now I'm scrolling to the storyboard panel. There's a red banner here —
> it says two scenes are flagged stale. The system knows exactly which
> renders were made against the old compass. Just those two. I don't
> have to re-render the whole series. I just re-render the two shots
> that are now wrong.

### 2:05 — Re-render

> I'm clicking "Re-render stale scenes." Each one is going to pull the
> new canon, use the new anchor, and get graded again by the vision
> judge. All of that — the generation, the character casting, the
> critique — that's one Livepeer API.

> *(wait for it to finish, ~1 minute)*

### 2:30 — Result

> Okay, I'm scrolling back to the evidence. These two scenes now show
> fresh timestamps and they're citing compass version two. Both
> generations are sitting in the ledger on the knowledge graph now.
> Anyone can query which render was made against which version, and
> what changed, when.

> The canon is also published on-chain — there's a UAL, a Universal
> Asset Locator, that anchors it permanently. Total cost to build all
> of this — under a dollar on Livepeer's network.

> So that's CanonKeeper. It's a script supervisor for AI video, with a
> a tamper-evident notebook. Thanks.

## If something breaks

The state never resets itself. If a render fails, the existing evidence
still tells the story — keep talking and scroll on. If the tunnel dies,
tell me and I'll restart it. You can also just play
`docs/demo/canonkeeper-walkthrough.mp4` and narrate over it.
