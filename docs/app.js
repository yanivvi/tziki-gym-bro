import { buildWorkoutFromProfile, getLibraryMeta } from "./generator.js";

const EQUIPMENT_OPTIONS = [
  "bodyweight",
  "dbs",
  "barbell",
  "bench",
  "pullup_bar",
  "cables",
  "kettlebell",
  "machines",
  "bands",
  "med_ball",
  "sled",
  "box",
];

const CONSTRAINT_OPTIONS = [
  "overhead_limited",
  "axial_spine_sensitive",
  "knee_sensitive",
  "shoulder_irritable",
  "wrist_sensitive",
];

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c])
  );
}

async function loadJson(path) {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

const state = {
  exercises: [],
  meta: null,
  profiles: [],
  templates: [],
  selectedId: null,
};

function $(id) {
  return document.getElementById(id);
}

function setTab(name) {
  document.querySelectorAll(".tab").forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    const active = panel.id === `panel-${name}`;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

const THEME_KEY = "gym-trainer-theme";

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem(THEME_KEY, next);
  const btn = $("theme-toggle");
  if (btn) {
    btn.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
    btn.textContent = next === "dark" ? "Light" : "Dark";
    btn.title = next === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
    return;
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  applyTheme(prefersDark ? "dark" : "light");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function fillSelect(select, options, { blankLabel } = {}) {
  select.replaceChildren();
  if (blankLabel != null) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = blankLabel;
    select.appendChild(opt);
  }
  for (const value of options) {
    const opt = document.createElement("option");
    if (typeof value === "string") {
      opt.value = value;
      opt.textContent = value;
    } else {
      opt.value = value.value;
      opt.textContent = value.label;
    }
    select.appendChild(opt);
  }
}

function renderChecks(container, options, checkedSet) {
  container.replaceChildren();
  for (const value of options) {
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.checked = checkedSet.has(value);
    label.appendChild(input);
    label.appendChild(document.createTextNode(value.replaceAll("_", " ")));
    container.appendChild(label);
  }
}

function checkedValues(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
}

function filteredExercises() {
  const q = $("filter-q").value.trim().toLowerCase();
  const pattern = $("filter-pattern").value;
  const skill = $("filter-skill").value;
  const equipment = $("filter-equipment").value;

  return state.exercises.filter((ex) => {
    if (pattern && ex.primary_pattern !== pattern) return false;
    if (skill && ex.skill !== skill) return false;
    if (equipment && !(ex.equipment || []).includes(equipment)) return false;
    if (q) {
      const hay = `${ex.name} ${ex.cue_short || ""} ${ex.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function mediaUrl(ex) {
  const image = ex.media?.image;
  if (!image) return null;
  const name = String(image).split("/").pop();
  if (!/^[a-z0-9_]+\.(svg|png|jpe?g|webp)$/i.test(name)) return null;
  return `./illustrations/${name}`;
}

function renderExerciseList() {
  const list = $("exercise-list");
  const rows = filteredExercises().sort((a, b) => a.name.localeCompare(b.name));
  $("library-count").textContent = `${rows.length} shown · ${state.exercises.length} total`;

  list.replaceChildren();
  for (const ex of rows) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ex-card" + (state.selectedId === ex.id ? " is-selected" : "");
    const img = mediaUrl(ex);
    btn.innerHTML = `
      ${img ? `<img class="ex-thumb" src="${escapeHtml(img)}" alt="" loading="lazy" />` : ""}
      <h3>${escapeHtml(ex.name)}</h3>
      <p>${escapeHtml(ex.cue_short || "")}</p>
      <div class="meta-row">
        <span class="chip accent">${escapeHtml(ex.primary_pattern)}</span>
        <span class="chip">${escapeHtml(ex.skill)}</span>
        ${(ex.equipment || [])
          .slice(0, 3)
          .map((e) => `<span class="chip">${escapeHtml(e)}</span>`)
          .join("")}
      </div>
    `;
    btn.addEventListener("click", () => showExercise(ex.id));
    list.appendChild(btn);
  }
}

function showExercise(id) {
  state.selectedId = id;
  const ex = state.exercises.find((e) => e.id === id);
  const detail = $("exercise-detail");
  if (!ex) {
    detail.hidden = true;
    return;
  }
  detail.hidden = false;
  const rx = ex.default_prescription || {};
  const img = mediaUrl(ex);
  detail.innerHTML = `
    ${img ? `<img class="detail-art" src="${escapeHtml(img)}" alt="${escapeHtml(ex.name)} illustration" />` : ""}
    <h2>${escapeHtml(ex.name)}</h2>
    <p class="cue">${escapeHtml(ex.cue_long || ex.cue_short || "")}</p>
    <div class="meta-row">
      <span class="chip accent">${escapeHtml(ex.primary_pattern)}</span>
      <span class="chip">${escapeHtml(ex.skill)}</span>
      <span class="chip">${escapeHtml(ex.stance)}</span>
      <span class="chip">${ex.functional ? "functional" : "machine-ok"}</span>
      ${ex.family_id ? `<span class="chip">family ${escapeHtml(ex.family_id)} · L${escapeHtml(ex.level)}</span>` : ""}
    </div>
    <p><strong>Equipment:</strong> ${escapeHtml((ex.equipment || []).join(", ") || "—")}</p>
    <p><strong>Intents:</strong> ${escapeHtml((ex.intents || []).join(", ") || "—")}</p>
    <p><strong>Contraindications:</strong> ${escapeHtml((ex.contraindications || []).join(", ") || "none")}</p>
    <p><strong>Default:</strong> ${escapeHtml(rx.sets ?? "—")} × ${escapeHtml(rx.reps ?? "—")} · rest ${escapeHtml(rx.rest_sec ?? "—")}s · ${escapeHtml(rx.load ?? "")}</p>
  `;
  renderExerciseList();
  detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function applyProfileToForm(profile) {
  $("goal").value = profile.goal || "general_health";
  $("level").value = profile.level || "beginner";
  $("minutes").value = String(profile.session_minutes || 45);
  if (profile.session_type) $("template-select").value = profile.session_type;
  $("include_power").checked = Boolean(profile.include_power);
  $("include_conditioning").checked = Boolean(profile.include_conditioning);
  renderChecks($("equipment-checks"), EQUIPMENT_OPTIONS, new Set(profile.equipment || ["bodyweight"]));
  renderChecks($("constraint-checks"), CONSTRAINT_OPTIONS, new Set(profile.constraints || []));
}

function collectProfile() {
  return {
    name: "UI session",
    goal: $("goal").value,
    level: $("level").value,
    session_minutes: Number($("minutes").value),
    equipment: checkedValues($("equipment-checks")),
    constraints: checkedValues($("constraint-checks")),
    session_type: $("template-select").value || undefined,
    include_power: $("include_power").checked ? true : undefined,
    include_conditioning: $("include_conditioning").checked ? true : undefined,
    seed: Math.floor(Math.random() * 1e9),
  };
}

function renderWorkout(workout) {
  const out = $("workout-out");
  out.classList.remove("empty");
  const coverageOk = workout.pattern_coverage?.ok;
  const blocksHtml = (workout.blocks || [])
    .map((block) => {
      const moves = (block.exercises || [])
        .map((ex) => {
          const p = ex.prescription || {};
          const full = state.exercises.find((e) => e.id === ex.exercise_id);
          const img = full ? mediaUrl(full) : null;
          return `
            <div class="move">
              ${img ? `<img class="move-art" src="${escapeHtml(img)}" alt="" loading="lazy" />` : ""}
              <div>
                <p class="move-title">${escapeHtml(ex.name)}</p>
                <p class="move-meta">${escapeHtml(ex.primary_pattern)} · ${escapeHtml(p.sets ?? "")} × ${escapeHtml(p.reps ?? "")} · rest ${escapeHtml(p.rest_sec ?? "")}s</p>
                <p class="move-meta">${escapeHtml(ex.cue_short || "")}</p>
              </div>
            </div>
          `;
        })
        .join("");
      return `<section class="block"><h3>${escapeHtml(block.label || block.type)}</h3>${moves}</section>`;
    })
    .join("");

  const warnings = (workout.warnings || [])
    .map((w) => `<p class="move-meta">${escapeHtml(w)}</p>`)
    .join("");

  out.innerHTML = `
    <div class="workout-head">
      <div>
        <h2>${escapeHtml(workout.template?.name || "Workout")}</h2>
        <p class="move-meta">${escapeHtml(workout.profile?.goal || "")} · ${escapeHtml(workout.profile?.level || "")} · ~${escapeHtml(workout.estimated_minutes)} min</p>
      </div>
      <span class="badge ${coverageOk ? "ok" : "warn"}">${coverageOk ? "coverage ok" : "coverage gaps"}</span>
    </div>
    ${warnings}
    ${blocksHtml || "<p class='move-meta'>No blocks generated.</p>"}
  `;
}

function renderOverview() {
  const grid = $("overview-stats");
  grid.replaceChildren();
  const stats = [
    { label: "Exercises", value: state.meta?.count ?? 0 },
    { label: "Patterns", value: Object.keys(state.meta?.by_pattern || {}).length },
    { label: "Templates", value: state.templates.length },
    { label: "Sample profiles", value: state.profiles.length },
  ];
  for (const s of stats) {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = `<strong>${escapeHtml(s.value)}</strong><span>${escapeHtml(s.label)}</span>`;
    grid.appendChild(el);
  }
}

async function init() {
  initTheme();
  $("theme-toggle")?.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  ["filter-q", "filter-pattern", "filter-skill", "filter-equipment"].forEach((id) => {
    $(id).addEventListener("input", renderExerciseList);
    $(id).addEventListener("change", renderExerciseList);
  });

  $("workout-out").classList.add("empty");
  $("workout-out").textContent = "Build a session to preview it here.";

  const [exercises, templates, profiles] = await Promise.all([
    loadJson("./data/exercises.json"),
    loadJson("./data/templates.json"),
    loadJson("./data/profiles.json"),
  ]);

  state.exercises = Array.isArray(exercises) ? exercises : exercises.exercises || [];
  state.templates = Array.isArray(templates) ? templates : templates.templates || [];
  state.profiles = Array.isArray(profiles) ? profiles : profiles.profiles || [];
  state.meta = getLibraryMeta(state.exercises, state.templates, state.profiles);

  fillSelect($("filter-pattern"), uniqueSorted(state.exercises.map((e) => e.primary_pattern)), {
    blankLabel: "All patterns",
  });
  fillSelect(
    $("filter-equipment"),
    uniqueSorted(state.exercises.flatMap((e) => e.equipment || [])),
    { blankLabel: "Any" }
  );
  fillSelect(
    $("template-select"),
    state.templates.map((t) => ({ value: t.id, label: t.name }))
  );
  fillSelect(
    $("profile-select"),
    state.profiles.map((p) => ({ value: p.id, label: `${p.name} (${p.level})` })),
    { blankLabel: "Custom" }
  );

  renderChecks($("equipment-checks"), EQUIPMENT_OPTIONS, new Set(["bodyweight", "dbs", "bands"]));
  renderChecks($("constraint-checks"), CONSTRAINT_OPTIONS, new Set());
  renderExerciseList();
  renderOverview();

  $("profile-select").addEventListener("change", () => {
    const id = $("profile-select").value;
    if (!id) return;
    const profile = state.profiles.find((p) => p.id === id);
    if (profile) applyProfileToForm(profile);
  });

  $("generate-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const status = $("generate-status");
    const btn = event.submitter || $("generate-form").querySelector('button[type="submit"]');
    status.textContent = "Generating…";
    btn.disabled = true;
    try {
      const profile = collectProfile();
      if (profile.equipment.length === 0) profile.equipment = ["bodyweight"];
      const workout = buildWorkoutFromProfile(
        profile,
        $("template-select").value || null,
        state.exercises,
        state.templates
      );
      renderWorkout(workout);
      status.textContent = `Seed ${workout.seed}`;
    } catch (err) {
      status.textContent = err.message || "Failed";
    } finally {
      btn.disabled = false;
    }
  });
}

init().catch((err) => {
  $("library-count").textContent = err.message || "Failed to load";
});
