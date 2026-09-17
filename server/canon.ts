import { Entity, listEntities, createEntity } from "./dkg.js";

/**
 * Canon domain logic: mention parsing, prompt construction, demo seed.
 *
 * Scenes reference entities with @mentions ("@maya checks the @compass").
 * With canon ON, each entity's description is injected VERBATIM into the
 * prompt — the continuity-token discipline the Livepeer creative surface
 * itself recommends ("repeat continuity tokens verbatim in every scene's
 * prompt"). With canon OFF (the A/B control), the raw scene text goes alone:
 * same models, no memory — drift is what you get.
 */

export async function seedIfEmpty() {
  if ((await listEntities()).length > 0) return;
  await createEntity({
    kind: "character",
    name: "Maya",
    description:
      "Maya Okafor: mid-30s, dark brown skin, close-cropped black curls, small gold hoop earrings, faded red bomber jacket, worn white sneakers, carries a brass pocket compass on a chain",
  });
  await createEntity({
    kind: "character",
    name: "Biscuit",
    description:
      "Biscuit the cat: plump orange tabby, white front paws, notched left ear, blinks slowly when calm",
  });
  await createEntity({
    kind: "location",
    name: "The Perch",
    description:
      "The Perch, Maya's rooftop flat: mustard-yellow kitchen wall, hanging pothos plants, bay window facing the harbor cranes, mismatched mugs on a driftwood shelf",
  });
  await createEntity({
    kind: "prop",
    name: "Compass",
    description:
      "Maya's brass pocket compass: engraving of two flashes on the case, glass cracked over north, warm patina, hangs from a chain",
  });
  await createEntity({
    kind: "fact",
    name: "Lighthouse rule",
    description:
      "The harbor lighthouse always flashes twice, then a long pause — two flashes, never one",
  });
}

/** Find entities mentioned as @tokens. Matches slug or name, case-insensitive. */
export async function mentionedEntities(sceneText: string): Promise<Entity[]> {
  const tokens = sceneText.match(/@[a-z0-9-]+/gi) ?? [];
  const wanted = tokens.map((t) => t.slice(1).toLowerCase());
  return (await listEntities()).filter((e) => {
    const idSlug = e.id.replace(/^[a-z]+-/, "");
    return wanted.some((w) => w === idSlug || w === e.name.toLowerCase());
  });
}

export function buildPrompt(sceneText: string, entities: Entity[], useCanon: boolean): string {
  if (!useCanon || entities.length === 0) return sceneText;
  const lines = entities.map((e) => `- ${e.name} (canon v${e.version}): ${e.description}`);
  return `${sceneText}\n\nContinuity — render exactly as specified, verbatim:\n${lines.join("\n")}`;
}

export const SEED_SCENES = [
  "@maya makes coffee at dawn in @the-perch while @biscuit weaves between her feet",
  "@maya checks the @compass — the needle spins slowly, wrong",
  "From the @the-perch bay window, the lighthouse flashes once. @maya goes still.",
  "@maya runs down the @the-perch stairs, @biscuit watching from the landing",
  "At the harbor fence, @maya holds the @compass up against the lighthouse flash",
  "@maya turns back toward @the-perch, jaw set; @biscuit waits in the window",
];
