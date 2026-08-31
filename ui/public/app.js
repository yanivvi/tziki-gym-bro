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

async function api(method, url, body) {
  if (!/^\/[^/]/.test(url)) throw new Error("Invalid request path");
  const opts = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function emptyStore() {
  return {
    version: 1,
    form: null,
    activeSession: null,
    history: [],
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
    if (load) return load;
  }
  return null;
}

const state = {
  exercises: [],
  meta: null,
  profiles: [],
  templates: [],
  selectedId: null,
  session: null,
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
  return `/illustrations/${name}`;
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
  const lastHint = last
    ? last.type === "bodyweight"
      ? "Last load: bodyweight"
      : `Last load: ${last.kg} kg`
    : "";
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
      const prev = lastLoadForExercise(ex.exercise_id);
      if (prev) loads[ex.exercise_id] = { ...prev };
      else {
        const full = state.exercises.find((e) => e.id === ex.exercise_id);
        const onlyBw = (full?.equipment || []).length === 1 && full.equipment[0] === "bodyweight";
        loads[ex.exercise_id] = onlyBw
          ? { type: "bodyweight" }
          : { type: "kg", kg: "" };
      }
    }
  }
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

function formatLoadHint(load) {
  if (!load) return "";
  if (load.type === "bodyweight") return "Last: BW";
  if (load.kg !== "" && load.kg != null) return `Last: ${load.kg} kg`;
  return "";
}

function loadControlHtml(exerciseId) {
  const load = state.session?.loads?.[exerciseId] || { type: "kg", kg: "" };
  const isBw = load.type === "bodyweight";
  const hist = lastLoadForExercise(exerciseId);
  const hint = formatLoadHint(hist);
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
      ${hint ? `<span class="progress-hint">${escapeHtml(hint)}</span>` : ""}
    </div>
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
    .map((block) => {
      const moves = (block.exercises || [])
        .map((ex) => {
          const p = ex.prescription || {};
          const full = state.exercises.find((e) => e.id === ex.exercise_id);
          const img = full ? mediaUrl(full) : null;
          return `
            <div class="move">
              ${img ? `<img class="move-art" src="${escapeHtml(img)}" alt="" loading="lazy" />` : ""}
              <div class="move-body">
                <p class="move-title">${escapeHtml(ex.name)}</p>
                <p class="move-meta">${escapeHtml(ex.primary_pattern)} · ${escapeHtml(p.sets ?? "")} × ${escapeHtml(p.reps ?? "")} · rest ${escapeHtml(p.rest_sec ?? "")}s</p>
                <p class="move-meta">${escapeHtml(ex.cue_short || "")}</p>
                ${loadControlHtml(ex.exercise_id)}
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
        <h2>${escapeHtml(workout.template?.name || "Workout")}</h2>
        <p class="move-meta">${escapeHtml(workout.profile?.goal || "")} · ${escapeHtml(workout.profile?.level || "")} · ~${escapeHtml(workout.estimated_minutes)} min</p>
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
    state.session = null;
    const out = $("workout-out");
    out.classList.remove("empty");
    out.innerHTML = `
      <div class="workout-head">
        <div>
          <h2>Session saved</h2>
          <p class="move-meta">Feel: ${escapeHtml(finished.feel)} · stored on this device</p>
        </div>
      </div>
      <p class="move-meta">Build another workout when you’re ready — last loads will prefill.</p>
    `;
    $("generate-status").textContent = `Finished · ${store.history.length} session(s) in history`;
  });
}

function renderOverview() {
  const grid = $("overview-stats");
  grid.replaceChildren();
  const store = loadStore();
  const stats = [
    { label: "Exercises", value: state.meta?.count ?? 0 },
    { label: "Patterns", value: Object.keys(state.meta?.by_pattern || {}).length },
    { label: "Templates", value: state.templates.length },
    { label: "Logged sessions", value: store.history.length },
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

  const [meta, exercisesPayload, templatesPayload, profilesPayload] = await Promise.all([
    api("GET", "/api/meta"),
    api("GET", "/api/exercises"),
    api("GET", "/api/templates"),
    api("GET", "/api/profiles"),
  ]);

  state.meta = meta;
  state.exercises = exercisesPayload.exercises || [];
  state.templates = templatesPayload.templates || [];
  state.profiles = profilesPayload.profiles || [];

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

  const store = loadStore();
  restoreForm(store.form);

  renderExerciseList();
  renderOverview();

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

  $("generate-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("generate-status");
    const btn = event.submitter || $("generate-form").querySelector('button[type="submit"]');
    status.textContent = "Generating…";
    btn.disabled = true;
    try {
      const profile = collectProfile();
      if (profile.equipment.length === 0) profile.equipment = ["bodyweight"];
      const { workout } = await api("POST", "/api/generate", {
        profile,
        template: $("template-select").value || null,
      });
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
