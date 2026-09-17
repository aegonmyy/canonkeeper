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
      const editing = e._editing ? "editing" : "";
      return `<div class="entity ${editing}" data-id="${esc(e.id)}">
        <div class="entity-head">
          <span class="chip kind-${esc(e.kind)}">${esc(e.kind)}</span>
          <strong>${esc(e.name)}</strong>
          <span class="version">v${e.version}</span>
        </div>
        <div class="entity-body">${esc(e.description)}</div>
        <div class="entity-actions">
          <button class="link edit">edit canon</button>
        </div>
      </div>`;
    })
    .join("");
}

function renderRuns() {
  if (!state.runs.length) return;
  // latest run per scene, newest last — SPARQL order is arbitrary, sort by time
  const latest = new Map();
  for (const r of [...state.runs].sort((a, b) => a.at.localeCompare(b.at)))
    latest.set(r.sceneId, r);
  $("#run-list").innerHTML = [...latest.values()]
    .map((r) => {
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
      return `<div class="run ${stale ? "is-stale" : ""}">
        <img src="${r.resultUrl}" alt="scene render" loading="lazy">
        <div class="run-meta">
          <div class="run-top">
            <span class="score ${scoreClass}">${score}</span>
            <span class="mode-tag ${r.useCanon ? "on" : "off"}">${r.useCanon ? "canon ON" : "canon OFF"}</span>
            ${stale ? '<span class="chip chip-stale">STALE — canon changed</span>' : ""}
          </div>
          <div class="chips">${chips || '<span class="muted">no canon refs</span>'}</div>
          <p class="note">${esc(r.critique.note)}</p>
        </div>
      </div>`;
    })
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

  // Entity editing: prompt-based for v0 UI (inline editor if time allows)
  $("#entity-list").addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".edit");
    if (!btn) return;
    const card = btn.closest(".entity");
    const ent = state.entities.find((e) => e.id === card.dataset.id);
    const next = prompt(`Edit canon for ${ent.name} (this bumps v${ent.version} → v${ent.version + 1} and stales scenes rendered against it):`, ent.description);
    if (next === null || next === ent.description) return;
    await fetch(`/api/canon/${encodeURIComponent(ent.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: next }),
    });
    await refresh();
  });

  await refresh();
});
