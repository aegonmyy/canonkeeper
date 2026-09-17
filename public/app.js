const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let state = { modes: {}, entities: [], runs: [] };

async function refresh() {
  state = await (await fetch("/api/state")).json();
  renderModes();
  renderEntities();
  renderRuns();
  renderStaleBanner();
}

function renderModes() {
  $("#modes").innerHTML =
    `<span class="badge">livepeer: ${esc(state.modes.livepeer)}</span>` +
    `<span class="badge">dkg: ${esc(state.modes.dkg)}</span>`;
}

function renderEntities() {
  $("#entity-list").innerHTML = state.entities
    .map((e) => {
      const body = e._editing
        ? `<textarea class="edit-desc" rows="4">${esc(e.description)}</textarea>
           <div class="entity-actions">
             <button class="link save">save (v${e.version} → v${e.version + 1})</button>
             <button class="link cancel">cancel</button>
           </div>`
        : `<div class="entity-body">${esc(e.description)}</div>
           <div class="entity-actions">
             <button class="link edit">edit canon</button>
           </div>`;
      return `<div class="entity ${e._editing ? "editing" : ""}" data-id="${esc(e.id)}">
        <div class="entity-head">
          <span class="chip kind-${esc(e.kind)}">${esc(e.kind)}</span>
          <strong>${esc(e.name)}</strong>
          <span class="version">v${e.version}</span>
        </div>
        ${e.anchorUrl ? `<img class="entity-anchor" src="${e.anchorUrl}" alt="canon anchor" loading="lazy">` : ""}
        ${body}
      </div>`;
    })
    .join("");
}

function runCard(r, label) {
  if (!r)
    return `<div class="run arm empty-arm"><div class="run-meta"><span class="muted">no ${label} render yet</span></div></div>`;
  const score = r.critique.score < 0 ? "—" : r.critique.score.toFixed(2);
  const scoreClass = r.critique.score < 0 ? "" : r.critique.score >= 0.7 ? "good" : "bad";
  const stale = (r.stale ?? []).length > 0;
  const chips = r.canonRefs
    .map((ref) => {
      const ent = state.entities.find((e) => e.id === ref.entityId);
      const staleChip = stale && (r.stale ?? []).some((s) => s.entityId === ref.entityId);
      return `<span class="chip ${staleChip ? "chip-stale" : ""}">${esc(ent?.name ?? ref.entityId)} v${ref.version}${staleChip ? " ⚠" : ""}</span>`;
    })
    .join(" ");
  return `<div class="run arm ${stale ? "is-stale" : ""}">
    <img src="${r.resultUrl}" alt="scene render" loading="lazy">
    <div class="run-meta">
      <div class="run-top">
        <span class="score ${scoreClass}">${score}</span>
        <span class="mode-tag ${r.useCanon ? "on" : "off"}">${r.useCanon ? "canon ON" : "canon OFF"}</span>
        ${stale ? '<span class="chip chip-stale">STALE</span>' : ""}
      </div>
      <div class="chips">${chips || '<span class="muted">no canon refs</span>'}</div>
      <p class="note">${esc(r.critique.note)}</p>
    </div>
  </div>`;
}

function renderRuns() {
  if (!state.runs.length) return;
  // A/B per scene: latest canon-ON arm next to latest canon-OFF arm.
  const runs = [...state.runs].sort((a, b) => a.at.localeCompare(b.at));
  const scenes = new Map();
  for (const r of runs) {
    const s = scenes.get(r.sceneId) ?? { on: null, off: null };
    s[r.useCanon ? "on" : "off"] = r;
    scenes.set(r.sceneId, s);
  }
  $("#run-list").innerHTML = [...scenes.entries()]
    .map(
      ([sceneId, arms]) => `<div class="scene-group">
        <div class="scene-label">${esc(arms.on ? arms.on.sceneText : arms.off.sceneText)}</div>
        <div class="run-pair">${runCard(arms.on, "canon-ON")}${runCard(arms.off, "canon-OFF")}</div>
      </div>`,
    )
    .join("");
}

function renderStaleBanner() {
  const latest = new Map();
  for (const r of state.runs) latest.set(r.sceneId, r);
  const staleCount = [...latest.values()].filter((r) => (r.stale ?? []).length > 0).length;
  const banner = $("#stale-banner");
  banner.hidden = staleCount === 0;
  $("#stale-text").textContent =
    staleCount > 0 ? `${staleCount} scene${staleCount > 1 ? "s" : ""} render against outdated canon.` : "";
}

function scenesFromTextarea() {
  return $("#scenes").value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

async function render(useCanon) {
  const btns = document.querySelectorAll("button");
  btns.forEach((b) => (b.disabled = true));
  try {
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenes: scenesFromTextarea(), useCanon }),
    });
    if (!res.ok) alert((await res.json()).error ?? "render failed");
    await refresh();
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const seed = await (await fetch("/api/scenes")).json();
  $("#scenes").value = seed.scenes.join("\n");

  $("#render-canon").onclick = () => render(true);
  $("#render-control").onclick = () => render(false);
  $("#rerender-stale").onclick = async () => {
    const res = await fetch("/api/rerender-stale", { method: "POST" });
    if (!res.ok) alert((await res.json()).error ?? "re-render failed");
    await refresh();
  };

  $("#add-entity-form").onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const body = {
      kind: f.kind.value,
      name: f.name.value,
      description: f.description.value,
    };
    const res = await fetch("/api/canon", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      f.reset();
      await refresh();
    }
  };

  // Entity editing: inline editor — a canon edit bumps the version and
  // stales every canon-ON render that cites the old one.
  $("#entity-list").addEventListener("click", async (ev) => {
    const card = ev.target.closest(".entity");
    if (!card) return;
    const ent = state.entities.find((e) => e.id === card.dataset.id);
    if (!ent) return;

    if (ev.target.closest(".edit")) {
      ent._editing = true;
      renderEntities();
      card.querySelector(".edit-desc")?.focus();
      return;
    }
    if (ev.target.closest(".cancel")) {
      ent._editing = false;
      renderEntities();
      return;
    }
    if (ev.target.closest(".save")) {
      const next = card.querySelector(".edit-desc")?.value ?? ent.description;
      ent._editing = false;
      if (next === ent.description) {
        renderEntities();
        return;
      }
      card.querySelector(".save").disabled = true;
      await fetch(`/api/canon/${encodeURIComponent(ent.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: next }),
      });
      await refresh();
      return;
    }
  });

  $("#publish-ual").onclick = async (ev) => {
    ev.target.disabled = true;
    ev.target.textContent = "publishing…";
    const res = await fetch("/api/publish", { method: "POST" });
    const body = await res.json();
    ev.target.disabled = false;
    ev.target.textContent = "Publish canon → Verifiable Memory (UAL)";
    $("#ual-line").textContent = body.ual
      ? `UAL: ${body.ual} (tx ${String(body.txHash ?? "").slice(0, 18)}…)`
      : `publish failed: ${body.error ?? "unknown"}`;
  };

  await refresh();
});
