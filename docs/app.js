import { buildWorkoutFromProfile, getLibraryMeta, findSwapCandidates, suggestProgression } from "./generator.js";

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

const STORE_KEY = "tziki-gym-bro-v1";
const FEEL_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "mid", label: "Mid" },
  { value: "bad", label: "Bad" },
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

function emptyStore() {
  return {
    version: 1,
    form: null,
    activeSession: null,
    history: [],
    plan: null,
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return emptyStore();
    return {
      version: 1,
      form: data.form || null,
      activeSession: data.activeSession || null,
      history: Array.isArray(data.history) ? data.history : [],
      plan: data.plan || null,
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function sessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function lastLoadForExercise(exerciseId) {
  const store = loadStore();
  for (const session of store.history) {
    const load = session.loads?.[exerciseId];
    if (load) return { load, feel: session.feel || null };
  }
  return null;
}

function lastHistoryEntry(exerciseId) {
  return lastLoadForExercise(exerciseId);
}

function sessionProfile() {
  const w = state.session?.workout;
  return {
    equipment: w?.profile?.equipment || checkedValues($("equipment-checks")),
    level: w?.profile?.level || $("level")?.value || "intermediate",
    constraints: w?.profile?.constraints || checkedValues($("constraint-checks")),
  };
}

function usedExerciseIds(exceptId) {
  const used = new Set();
  for (const block of state.session?.workout?.blocks || []) {
    for (const ex of block.exercises || []) {
      if (ex.exercise_id && ex.exercise_id !== exceptId) used.add(ex.exercise_id);
    }
  }
  return used;
}

function progressionFor(exerciseId) {
  const hist = lastHistoryEntry(exerciseId);
  if (!hist) return null;
  const full = state.exercises.find((e) => e.id === exerciseId);
  return suggestProgression(hist.feel, hist.load, full);
}

function recentExerciseIds(limitSessions = 2) {
  const store = loadStore();
  const ids = new Set();
  for (const session of (store.history || []).slice(0, limitSessions)) {
    for (const block of session.workout?.blocks || []) {
      for (const ex of block.exercises || []) {
        if (ex.exercise_id) ids.add(ex.exercise_id);
      }
    }
  }
  return [...ids];
}

function getPlanById(planId) {
  return state.plans.find((p) => p.id === planId) || null;
}

function activePlanState() {
  return loadStore().plan || null;
}

function currentPlanDay() {
  const enrolled = activePlanState();
  if (!enrolled) return null;
  const plan = getPlanById(enrolled.planId);
  if (!plan?.days?.length) return null;
  const dayIndex = enrolled.dayIndex % plan.days.length;
  return {
    plan,
    enrolled,
    dayIndex,
    day: plan.days[dayIndex],
    cycle: enrolled.cycle || 1,
  };
}

function persistPlan(planState) {
  const store = loadStore();
  store.plan = planState;
  saveStore(store);
}

function enrollPlan(planId) {
  if (!planId) {
    persistPlan(null);
    return;
  }
  const existing = activePlanState();
  if (existing?.planId === planId) return;
  persistPlan({
    planId,
    dayIndex: 0,
    cycle: 1,
    enrolled_at: new Date().toISOString(),
  });
}

function advancePlanAfterFinish(finishedSession) {
  const enrolled = activePlanState();
  if (!enrolled || !finishedSession?.plan) return;
  if (finishedSession.plan.planId !== enrolled.planId) return;
  if (finishedSession.plan.dayIndex !== enrolled.dayIndex) return;

  const plan = getPlanById(enrolled.planId);
  if (!plan?.days?.length) return;

  let dayIndex = enrolled.dayIndex + 1;
  let cycle = enrolled.cycle || 1;
  if (dayIndex >= plan.days.length) {
    dayIndex = 0;
    cycle += 1;
  }
  persistPlan({
    ...enrolled,
    dayIndex,
    cycle,
    updated_at: new Date().toISOString(),
  });
}

function renderPlanCard() {
  const select = $("plan-select");
  const desc = $("plan-desc");
  const today = $("plan-today-label");
  const buildBtn = $("build-today-btn");
  const clearBtn = $("clear-plan-btn");
  if (!select) return;

  const enrolled = activePlanState();
  if (enrolled?.planId) select.value = enrolled.planId;

  const info = currentPlanDay();
  if (!info) {
    desc.textContent = "Pick a plan to unlock Today’s session.";
    today.hidden = true;
    today.textContent = "";
    buildBtn.disabled = true;
    clearBtn.hidden = true;
    return;
  }

  desc.textContent = info.plan.description || "";
  today.hidden = false;
  today.innerHTML = `<strong>${escapeHtml(info.day.label)}</strong> · cycle ${escapeHtml(info.cycle)} · day ${escapeHtml(info.dayIndex + 1)}/${escapeHtml(info.plan.days.length)} · template <code>${escapeHtml(info.day.template)}</code>`;
  buildBtn.disabled = false;
  clearBtn.hidden = false;
}

function hashStringForPlan(planId, dayIndex, cycle) {
  const s = `${planId}:${dayIndex}:${cycle}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildTodaysSession() {
  const info = currentPlanDay();
  if (!info) return;
  const status = $("generate-status");
  $("template-select").value = info.day.template;
  const profile = collectProfile();
  if (profile.equipment.length === 0) profile.equipment = ["bodyweight"];
  profile.session_type = info.day.template;
  profile.avoid_ids = recentExerciseIds(2);
  profile.seed = hashStringForPlan(info.plan.id, info.dayIndex, info.cycle);

  try {
    const workout = buildWorkoutFromProfile(
      profile,
      info.day.template,
      state.exercises,
      state.templates
    );
    startSession(workout);
    state.session.plan = {
      planId: info.plan.id,
      dayIndex: info.dayIndex,
      dayId: info.day.id,
      dayLabel: info.day.label,
      cycle: info.cycle,
    };
    persistActiveSession();
    persistForm();
    renderWorkout();
    renderPlanCard();
    status.textContent = `${info.day.label} · seed ${workout.seed}`;
  } catch (err) {
    status.textContent = err.message || "Failed";
  }
}

function renderHistory() {
  const list = $("history-list");
  if (!list) return;
  const store = loadStore();
  const rows = (store.history || []).slice(0, 12);
  if (rows.length === 0) {
    list.innerHTML = `<p class="move-meta">No finished sessions yet.</p>`;
    return;
  }
  list.innerHTML = rows
    .map((s) => {
      const when = s.finished_at || s.updated_at || s.started_at || "";
      const date = when ? new Date(when).toLocaleString() : "—";
      const title = s.plan?.dayLabel || s.workout?.template?.name || "Session";
      const feel = s.feel || "—";
      const count = (s.workout?.blocks || []).reduce(
        (n, b) => n + (b.exercises || []).length,
        0
      );
      return `
        <article class="history-item">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <p class="move-meta">${escapeHtml(date)} · feel ${escapeHtml(feel)} · ${escapeHtml(count)} moves</p>
          </div>
          <span class="badge ${feel === "good" ? "ok" : feel === "bad" ? "warn" : ""}">${escapeHtml(feel)}</span>
        </article>`;
    })
    .join("");
}

function setBackupStatus(message) {
  const el = $("backup-status");
  if (el) el.textContent = message || "";
}

function exportBackup() {
  const store = loadStore();
  const payload = {
    app: "tziki-gym-bro",
    exported_at: new Date().toISOString(),
    store,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `tziki-gym-bro-backup-${stamp}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setBackupStatus(`Exported ${store.history?.length || 0} session(s) · ${stamp}`);
}

function normalizeImportedStore(raw) {
  const candidate = raw?.store && typeof raw.store === "object" ? raw.store : raw;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Invalid backup file");
  }
  if (candidate.version !== 1) {
    throw new Error("Unsupported backup version");
  }
  return {
    version: 1,
    form: candidate.form || null,
    activeSession: candidate.activeSession || null,
    history: Array.isArray(candidate.history) ? candidate.history : [],
    plan: candidate.plan || null,
  };
}

async function importBackupFile(file) {
  if (!file) return;
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backup is not valid JSON");
  }
  const next = normalizeImportedStore(parsed);
  const current = loadStore();
  const replace = window.confirm(
    `Replace local data with this backup?\n\nBackup: ${next.history.length} session(s)\nCurrent: ${current.history.length} session(s)\n\nThis cannot be undone except by importing another backup.`
  );
  if (!replace) {
    setBackupStatus("Import cancelled");
    return;
  }
  saveStore(next);
  state.session = next.activeSession?.workout && !next.activeSession.completed ? next.activeSession : null;
  state.swapOpenKey = null;
  restoreForm(next.form);
  renderPlanCard();
  renderOverview();
  if (state.session) {
    renderWorkout();
    setTab("generate");
  }
  setBackupStatus(`Restored ${next.history.length} session(s)${next.plan ? " · plan enrolled" : ""}`);
}

function bindBackupControls() {
  $("export-backup-btn")?.addEventListener("click", () => {
    try {
      exportBackup();
    } catch (err) {
      setBackupStatus(err.message || "Export failed");
    }
  });
  $("import-backup-input")?.addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    try {
      await importBackupFile(file);
    } catch (err) {
      setBackupStatus(err.message || "Import failed");
    } finally {
      input.value = "";
    }
  });
}

const state = {
  exercises: [],
  meta: null,
  profiles: [],
  templates: [],
  plans: [],
  selectedId: null,
  session: null,
  swapOpenKey: null,
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
  const last = lastLoadForExercise(id);
  const prog = progressionFor(id);
  let lastHint = "";
  if (last?.load?.type === "bodyweight") lastHint = "Last load: bodyweight";
  else if (last?.load && last.load.kg !== "" && last.load.kg != null) {
    lastHint = `Last load: ${last.load.kg} kg`;
  }
  if (prog?.text) lastHint = [lastHint, prog.text].filter(Boolean).join(" · ");
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
    ${lastHint ? `<p class="progress-hint">${escapeHtml(lastHint)}</p>` : ""}
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

function persistForm() {
  const store = loadStore();
  store.form = {
    goal: $("goal").value,
    level: $("level").value,
    minutes: $("minutes").value,
    template: $("template-select").value,
    include_power: $("include_power").checked,
    include_conditioning: $("include_conditioning").checked,
    equipment: checkedValues($("equipment-checks")),
    constraints: checkedValues($("constraint-checks")),
    profile_id: $("profile-select").value || "",
  };
  saveStore(store);
}

function restoreForm(form) {
  if (!form) return;
  if (form.goal) $("goal").value = form.goal;
  if (form.level) $("level").value = form.level;
  if (form.minutes) $("minutes").value = form.minutes;
  if (form.template) $("template-select").value = form.template;
  $("include_power").checked = Boolean(form.include_power);
  $("include_conditioning").checked = Boolean(form.include_conditioning);
  if (form.profile_id) $("profile-select").value = form.profile_id;
  renderChecks(
    $("equipment-checks"),
    EQUIPMENT_OPTIONS,
    new Set(form.equipment?.length ? form.equipment : ["bodyweight", "dbs", "bands"])
  );
  renderChecks($("constraint-checks"), CONSTRAINT_OPTIONS, new Set(form.constraints || []));
}

function persistActiveSession() {
  if (!state.session) return;
  state.session.updated_at = new Date().toISOString();
  const store = loadStore();
  store.activeSession = state.session;
  saveStore(store);
  const status = $("session-save-status");
  if (status) {
    status.textContent = `Saved locally · ${new Date(state.session.updated_at).toLocaleTimeString()}`;
  }
}

function startSession(workout) {
  const loads = {};
  for (const block of workout.blocks || []) {
    for (const ex of block.exercises || []) {
      const hist = lastLoadForExercise(ex.exercise_id);
      const prog = progressionFor(ex.exercise_id);
      if (prog?.load) {
        loads[ex.exercise_id] = { ...prog.load };
      } else if (hist?.load) {
        loads[ex.exercise_id] = { ...hist.load };
      } else {
        const full = state.exercises.find((e) => e.id === ex.exercise_id);
        const onlyBw = (full?.equipment || []).length === 1 && full.equipment[0] === "bodyweight";
        loads[ex.exercise_id] = onlyBw
          ? { type: "bodyweight" }
          : { type: "kg", kg: "" };
      }
    }
  }
  state.swapOpenKey = null;
  state.session = {
    id: sessionId(),
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed: false,
    feel: null,
    loads,
    workout,
  };
  persistActiveSession();
}

function formatLoadHint(hist) {
  if (!hist?.load) return "";
  if (hist.load.type === "bodyweight") return "Last: BW";
  if (hist.load.kg !== "" && hist.load.kg != null) return `Last: ${hist.load.kg} kg`;
  return "";
}

function swapPanelHtml(exerciseId, blockIdx, exIdx) {
  const key = `${blockIdx}:${exIdx}`;
  if (state.swapOpenKey !== key) return "";
  const current = state.exercises.find((e) => e.id === exerciseId);
  const candidates = findSwapCandidates(
    current,
    state.exercises,
    sessionProfile(),
    usedExerciseIds(exerciseId)
  );
  if (candidates.length === 0) {
    return `<div class="swap-panel"><p class="move-meta">No matching swaps for your equipment/constraints.</p></div>`;
  }
  const items = candidates
    .map((c) => {
      const img = mediaUrl(c);
      return `
        <button type="button" class="swap-option" data-swap-to="${escapeHtml(c.id)}" data-block-idx="${blockIdx}" data-ex-idx="${exIdx}">
          ${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" />` : ""}
          <span>
            <strong>${escapeHtml(c.name)}</strong>
            <em>${escapeHtml(c.primary_pattern)} · ${escapeHtml(c.skill)}</em>
          </span>
        </button>`;
    })
    .join("");
  return `<div class="swap-panel"><p class="swap-panel-label">Swap with</p>${items}</div>`;
}

function loadControlHtml(exerciseId, blockIdx, exIdx) {
  const load = state.session?.loads?.[exerciseId] || { type: "kg", kg: "" };
  const isBw = load.type === "bodyweight";
  const hist = lastLoadForExercise(exerciseId);
  const prog = progressionFor(exerciseId);
  const hint = formatLoadHint(hist);
  const key = `${blockIdx}:${exIdx}`;
  const swapOpen = state.swapOpenKey === key;
  return `
    <div class="load-row" data-exercise-id="${escapeHtml(exerciseId)}">
      <div class="load-toggle" role="group" aria-label="Load type">
        <button type="button" class="load-type${isBw ? "" : " is-active"}" data-load-type="kg">kg</button>
        <button type="button" class="load-type${isBw ? " is-active" : ""}" data-load-type="bodyweight">BW</button>
      </div>
      <label class="load-kg"${isBw ? " hidden" : ""}>
        <span class="sr-only">Weight kg</span>
        <input type="number" inputmode="decimal" min="0" step="0.5" placeholder="kg"
          value="${escapeHtml(isBw ? "" : load.kg ?? "")}" data-load-kg />
      </label>
      <button type="button" class="btn-swap${swapOpen ? " is-active" : ""}" data-swap-toggle="${escapeHtml(key)}">Swap</button>
      ${hint ? `<span class="progress-hint">${escapeHtml(hint)}</span>` : ""}
    </div>
    ${prog ? `<p class="progression-tip progression-${escapeHtml(prog.kind)}">${escapeHtml(prog.text)}</p>` : ""}
    ${swapPanelHtml(exerciseId, blockIdx, exIdx)}
  `;
}

function renderWorkout() {
  const workout = state.session?.workout;
  const out = $("workout-out");
  if (!workout) {
    out.classList.add("empty");
    out.textContent = "Build a session to preview it here.";
    return;
  }

  out.classList.remove("empty");
  const coverageOk = workout.pattern_coverage?.ok;
  const feel = state.session.feel;

  const blocksHtml = (workout.blocks || [])
    .map((block, blockIdx) => {
      const moves = (block.exercises || [])
        .map((ex, exIdx) => {
          const p = ex.prescription || {};
          const full = state.exercises.find((e) => e.id === ex.exercise_id);
          const img = full ? mediaUrl(full) : null;
          return `
            <div class="move" data-block-idx="${blockIdx}" data-ex-idx="${exIdx}">
              ${img ? `<img class="move-art" src="${escapeHtml(img)}" alt="" loading="lazy" />` : ""}
              <div class="move-body">
                <p class="move-title">${escapeHtml(ex.name)}</p>
                <p class="move-meta">${escapeHtml(ex.primary_pattern)} · ${escapeHtml(p.sets ?? "")} × ${escapeHtml(p.reps ?? "")} · rest ${escapeHtml(p.rest_sec ?? "")}s</p>
                <p class="move-meta">${escapeHtml(ex.cue_short || "")}</p>
                ${loadControlHtml(ex.exercise_id, blockIdx, exIdx)}
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

  const feelButtons = FEEL_OPTIONS.map(
    (opt) =>
      `<button type="button" class="feel-btn${feel === opt.value ? " is-active" : ""}" data-feel="${opt.value}">${opt.label}</button>`
  ).join("");

  out.innerHTML = `
    <div class="workout-head">
      <div>
        <h2>${escapeHtml(state.session.plan?.dayLabel || workout.template?.name || "Workout")}</h2>
        <p class="move-meta">${escapeHtml(workout.profile?.goal || "")} · ${escapeHtml(workout.profile?.level || "")} · ~${escapeHtml(workout.estimated_minutes)} min${state.session.plan ? ` · cycle ${escapeHtml(state.session.plan.cycle)}` : ""}</p>
      </div>
      <span class="badge ${coverageOk ? "ok" : "warn"}">${coverageOk ? "coverage ok" : "coverage gaps"}</span>
    </div>
    ${warnings}
    ${blocksHtml || "<p class='move-meta'>No blocks generated.</p>"}
    <section class="session-progress">
      <h3>Session progress</h3>
      <p class="move-meta">Saved on this device only — reopen the app to continue where you left off.</p>
      <div class="feel-row" role="group" aria-label="How was the session?">
        <span class="feel-label">How was the session?</span>
        ${feelButtons}
      </div>
      <div class="session-actions">
        <button type="button" class="btn-secondary" id="save-session-btn">Save progress</button>
        <button type="button" class="btn-primary" id="finish-session-btn">Finish session</button>
      </div>
      <p id="session-save-status" class="status" role="status"></p>
    </section>
  `;

  bindSessionControls(out);
}

function applySwap(blockIdx, exIdx, newExerciseId) {
  const block = state.session?.workout?.blocks?.[blockIdx];
  const current = block?.exercises?.[exIdx];
  const next = state.exercises.find((e) => e.id === newExerciseId);
  if (!current || !next) return;

  const oldId = current.exercise_id;
  const rx = next.default_prescription || current.prescription || {};
  block.exercises[exIdx] = {
    ...current,
    exercise_id: next.id,
    name: next.name,
    primary_pattern: next.primary_pattern,
    family_id: next.family_id,
    stance: next.stance,
    cue_short: next.cue_short,
    prescription: {
      sets: rx.sets,
      reps: rx.reps,
      rest_sec: rx.rest_sec,
      load: rx.load,
      notes: rx.notes,
    },
  };

  if (oldId !== next.id) {
    const oldLoad = state.session.loads[oldId];
    delete state.session.loads[oldId];
    const hist = lastLoadForExercise(next.id);
    const prog = progressionFor(next.id);
    state.session.loads[next.id] = prog?.load
      ? { ...prog.load }
      : hist?.load
        ? { ...hist.load }
        : oldLoad || { type: "kg", kg: "" };
  }

  state.swapOpenKey = null;
  persistActiveSession();
  renderWorkout();
}

function bindSessionControls(root) {
  root.querySelectorAll(".load-row").forEach((row) => {
    const exerciseId = row.dataset.exerciseId;
    row.querySelectorAll("[data-load-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.loadType;
        const prev = state.session.loads[exerciseId] || {};
        state.session.loads[exerciseId] =
          type === "bodyweight"
            ? { type: "bodyweight" }
            : { type: "kg", kg: prev.kg ?? "" };
        persistActiveSession();
        renderWorkout();
      });
    });
    const kgInput = row.querySelector("[data-load-kg]");
    kgInput?.addEventListener("input", () => {
      const raw = kgInput.value;
      state.session.loads[exerciseId] = {
        type: "kg",
        kg: raw === "" ? "" : Number(raw),
      };
      persistActiveSession();
    });
  });

  root.querySelectorAll("[data-swap-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.swapToggle;
      state.swapOpenKey = state.swapOpenKey === key ? null : key;
      renderWorkout();
    });
  });

  root.querySelectorAll("[data-swap-to]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applySwap(Number(btn.dataset.blockIdx), Number(btn.dataset.exIdx), btn.dataset.swapTo);
    });
  });

  root.querySelectorAll("[data-feel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.session.feel = btn.dataset.feel;
      persistActiveSession();
      renderWorkout();
    });
  });

  $("save-session-btn")?.addEventListener("click", () => {
    persistActiveSession();
    persistForm();
  });

  $("finish-session-btn")?.addEventListener("click", () => {
    if (!state.session.feel) {
      const status = $("session-save-status");
      if (status) status.textContent = "Pick good / mid / bad before finishing.";
      return;
    }
    const finished = {
      ...state.session,
      completed: true,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const store = loadStore();
    store.history = [finished, ...(store.history || [])].slice(0, 50);
    store.activeSession = null;
    saveStore(store);
    advancePlanAfterFinish(finished);
    state.session = null;
    state.swapOpenKey = null;
    const out = $("workout-out");
    out.classList.remove("empty");
    const next = currentPlanDay();
    const nextLine = next
      ? `Next up: ${escapeHtml(next.day.label)} (cycle ${escapeHtml(next.cycle)}).`
      : "Build another workout when you’re ready.";
    out.innerHTML = `
      <div class="workout-head">
        <div>
          <h2>Session saved</h2>
          <p class="move-meta">Feel: ${escapeHtml(finished.feel)} · stored on this device</p>
        </div>
      </div>
      <p class="move-meta">${nextLine}</p>
    `;
    $("generate-status").textContent = `Finished · ${store.history.length} session(s) in history`;
    renderPlanCard();
    renderOverview();
  });
}

function renderOverview() {
  const grid = $("overview-stats");
  grid.replaceChildren();
  const store = loadStore();
  const planInfo = currentPlanDay();
  const stats = [
    { label: "Exercises", value: state.meta?.count ?? 0 },
    { label: "Templates", value: state.templates.length },
    { label: "Logged sessions", value: store.history.length },
    {
      label: "Plan day",
      value: planInfo ? `${planInfo.dayIndex + 1}/${planInfo.plan.days.length}` : "—",
    },
  ];
  for (const s of stats) {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = `<strong>${escapeHtml(s.value)}</strong><span>${escapeHtml(s.label)}</span>`;
    grid.appendChild(el);
  }
  renderHistory();
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

  const [exercises, templates, profiles, plans] = await Promise.all([
    loadJson("./data/exercises.json"),
    loadJson("./data/templates.json"),
    loadJson("./data/profiles.json"),
    loadJson("./data/plans.json"),
  ]);

  state.exercises = Array.isArray(exercises) ? exercises : exercises.exercises || [];
  state.templates = Array.isArray(templates) ? templates : templates.templates || [];
  state.profiles = Array.isArray(profiles) ? profiles : profiles.profiles || [];
  state.plans = Array.isArray(plans) ? plans : plans.plans || [];
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
  fillSelect(
    $("plan-select"),
    state.plans.map((p) => ({ value: p.id, label: p.name })),
    { blankLabel: "No plan — one-off" }
  );

  renderChecks($("equipment-checks"), EQUIPMENT_OPTIONS, new Set(["bodyweight", "dbs", "bands"]));
  renderChecks($("constraint-checks"), CONSTRAINT_OPTIONS, new Set());

  const store = loadStore();
  restoreForm(store.form);
  renderPlanCard();

  renderExerciseList();
  renderOverview();

  $("plan-select")?.addEventListener("change", () => {
    enrollPlan($("plan-select").value || "");
    renderPlanCard();
    renderOverview();
  });
  $("build-today-btn")?.addEventListener("click", () => buildTodaysSession());
  $("clear-plan-btn")?.addEventListener("click", () => {
    enrollPlan("");
    $("plan-select").value = "";
    renderPlanCard();
    renderOverview();
  });

  bindBackupControls();

  $("profile-select").addEventListener("change", () => {
    const id = $("profile-select").value;
    if (!id) return;
    const profile = state.profiles.find((p) => p.id === id);
    if (profile) applyProfileToForm(profile);
    persistForm();
  });

  ["goal", "level", "minutes", "template-select", "include_power", "include_conditioning"].forEach(
    (id) => {
      $(id)?.addEventListener("change", persistForm);
    }
  );
  $("equipment-checks")?.addEventListener("change", persistForm);
  $("constraint-checks")?.addEventListener("change", persistForm);

  $("generate-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const status = $("generate-status");
    const btn = event.submitter || $("generate-form").querySelector('button[type="submit"]');
    status.textContent = "Generating…";
    btn.disabled = true;
    try {
      const profile = collectProfile();
      if (profile.equipment.length === 0) profile.equipment = ["bodyweight"];
      profile.avoid_ids = recentExerciseIds(2);
      const workout = buildWorkoutFromProfile(
        profile,
        $("template-select").value || null,
        state.exercises,
        state.templates
      );
      startSession(workout);
      persistForm();
      renderWorkout();
      status.textContent = `Seed ${workout.seed} · progress autosaves`;
    } catch (err) {
      status.textContent = err.message || "Failed";
    } finally {
      btn.disabled = false;
    }
  });

  if (store.activeSession?.workout && !store.activeSession.completed) {
    state.session = store.activeSession;
    renderWorkout();
    setTab("generate");
    $("generate-status").textContent = "Restored your last open session";
  }
}

init().catch((err) => {
  $("library-count").textContent = err.message || "Failed to load";
});
