import { t } from "./i18n.js";

const SWIM_STORE_KEY = "tziki-gym-bro-ti-v1";
const PHASES = ["Balance", "Streamline", "Propulsion", "Recovery", "Breathing", "Integration"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function emptyStore() {
  return { version: 1, active: null, history: [] };
}

function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SWIM_STORE_KEY) || "null");
    if (!parsed || parsed.version !== 1) return emptyStore();
    return {
      version: 1,
      active: parsed.active && typeof parsed.active === "object" ? parsed.active : null,
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 50) : [],
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store) {
  localStorage.setItem(SWIM_STORE_KEY, JSON.stringify(store));
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatDate(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "—";
}

function sessionDistance(session) {
  const poolLength = safeNumber(session.poolLength, 25);
  return (session.items || []).reduce(
    (total, item) => total + safeNumber(item.lengths) * poolLength,
    0
  );
}

const state = {
  drills: [],
  presets: [],
  selected: [],
  active: null,
  phase: "All",
};

function drillById(id) {
  return state.drills.find((drill) => drill.id === id) || null;
}

function drillImageUrl(drill) {
  const id = String(drill?.id || "");
  if (!/^[a-z0-9-]+$/.test(id)) return "";
  return `./illustrations/ti_${id.replaceAll("-", "_")}.png`;
}

function renderBuilder() {
  const root = document.getElementById("ti-builder");
  if (!root) return;
  const presetOptions = state.presets.map((preset) =>
    `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`
  ).join("");
  const phaseButtons = ["All", ...PHASES].map((phase) =>
    `<button type="button" class="chip-btn${phase === state.phase ? " is-active" : ""}" data-ti-phase="${escapeHtml(phase)}">${escapeHtml(phase === "All" ? t("all_phases") : t(phase))}</button>`
  ).join("");
  const selectedRows = state.selected.length
    ? state.selected.map((item, index) => {
      const drill = drillById(item.drillId);
      if (!drill) return "";
      return `
        <div class="ti-selected-row">
          <span class="ti-order">${escapeHtml(String(index + 1))}</span>
          <div>
            <strong>${escapeHtml(drill.name)}</strong>
            <span class="move-meta">${escapeHtml(drill.phase)}</span>
          </div>
          <label class="field ti-length-field">
            <span>${escapeHtml(t("lengths"))}</span>
            <input type="number" min="1" max="100" value="${escapeHtml(String(item.lengths))}" data-ti-length-index="${escapeHtml(String(index))}" />
          </label>
          <div class="ti-row-actions">
            <button type="button" class="btn-secondary ti-icon-btn" data-ti-move-up="${escapeHtml(String(index))}" aria-label="${escapeHtml(t("move_up"))}">↑</button>
            <button type="button" class="btn-secondary ti-icon-btn" data-ti-move-down="${escapeHtml(String(index))}" aria-label="${escapeHtml(t("move_down"))}">↓</button>
            <button type="button" class="btn-secondary ti-icon-btn" data-ti-remove="${escapeHtml(String(index))}" aria-label="${escapeHtml(t("remove"))}">×</button>
          </div>
        </div>`;
    }).join("")
    : `<p class="move-meta">${escapeHtml(t("choose_drills"))}</p>`;

  root.innerHTML = `
    <div class="ti-builder-grid">
      <section class="plan-card ti-build-card">
        <div class="plan-card-head">
          <h2>${escapeHtml(t("swim_build_title"))}</h2>
          <p class="move-meta">${escapeHtml(t("swim_build_copy"))}</p>
        </div>
        <label class="field">
          <span>${escapeHtml(t("swim_preset"))}</span>
          <select id="ti-preset">
            <option value="">${escapeHtml(t("custom_session"))}</option>
            ${presetOptions}
          </select>
        </label>
        <div class="ti-session-settings">
          <label class="field">
            <span>${escapeHtml(t("session_name"))}</span>
            <input id="ti-session-name" maxlength="80" value="${escapeHtml(t("default_swim_name"))}" />
          </label>
          <label class="field">
            <span>${escapeHtml(t("pool_length"))}</span>
            <select id="ti-pool-length">
              <option value="25">25 m</option>
              <option value="50">50 m</option>
            </select>
          </label>
        </div>
        <div id="ti-selected-list" class="ti-selected-list">${selectedRows}</div>
        <div class="ti-build-summary">
          <strong>${escapeHtml(String(state.selected.reduce((sum, item) => sum + safeNumber(item.lengths), 0)))} lengths</strong>
          <span>${escapeHtml(t("selected_drills"))}</span>
        </div>
        <button type="button" class="btn-primary" id="ti-start-session"${state.selected.length ? "" : " disabled"}>${escapeHtml(t("start_swim"))}</button>
        <p class="status" id="ti-builder-status" role="status"></p>
      </section>
      <section class="ti-catalog">
        <div class="ti-section-head">
          <div>
            <h2>${escapeHtml(t("drill_catalog"))}</h2>
            <p class="move-meta">${escapeHtml(t("swim_build_copy"))}</p>
          </div>
        </div>
        <div class="ti-phase-filters">${phaseButtons}</div>
        <div id="ti-drill-grid" class="ti-drill-grid"></div>
      </section>
    </div>`;

  renderCatalog();
  bindBuilder();
}

function renderCatalog() {
  const grid = document.getElementById("ti-drill-grid");
  if (!grid) return;
  const visible = state.phase === "All"
    ? state.drills
    : state.drills.filter((drill) => drill.phase === state.phase);
  grid.innerHTML = visible.map((drill) => {
    const selected = state.selected.some((item) => item.drillId === drill.id);
    return `
      <article class="ti-drill-card${selected ? " is-selected" : ""}">
        <img class="ti-drill-image" src="${escapeHtml(drillImageUrl(drill))}" alt="${escapeHtml(t("demonstrating").replace("{name}", drill.name))}" loading="lazy" />
        <div class="meta-row">
          <span class="chip">${escapeHtml(t(drill.phase))}</span>
          <span class="chip">${escapeHtml(drill.level)}</span>
        </div>
        <h3>${escapeHtml(drill.name)}</h3>
        <p>${escapeHtml(drill.cue)}</p>
        <p class="progress-hint">Progress: ${escapeHtml(drill.progression)}</p>
        <button type="button" class="${selected ? "btn-secondary" : "btn-primary"}" data-ti-add="${escapeHtml(drill.id)}"${selected ? " disabled" : ""}>${escapeHtml(selected ? t("added") : t("add"))}</button>
      </article>`;
  }).join("");

  grid.querySelectorAll("[data-ti-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const drill = drillById(button.dataset.tiAdd);
      if (!drill || state.selected.some((item) => item.drillId === drill.id)) return;
      state.selected.push({ drillId: drill.id, lengths: drill.default_lengths });
      renderBuilder();
    });
  });
}

function loadPreset(id) {
  const preset = state.presets.find((item) => item.id === id);
  if (!preset) return;
  state.selected = preset.drills.map((drillId) => {
    const drill = drillById(drillId);
    return { drillId, lengths: drill?.default_lengths || 4 };
  });
  renderBuilder();
  const select = document.getElementById("ti-preset");
  const name = document.getElementById("ti-session-name");
  if (select) select.value = preset.id;
  if (name) name.value = preset.name;
}

function moveSelected(index, direction) {
  const target = index + direction;
  if (index < 0 || target < 0 || index >= state.selected.length || target >= state.selected.length) return;
  const next = [...state.selected];
  [next[index], next[target]] = [next[target], next[index]];
  state.selected = next;
  renderBuilder();
}

function bindBuilder() {
  document.querySelectorAll("[data-ti-phase]").forEach((button) => {
    button.addEventListener("click", () => {
      state.phase = PHASES.includes(button.dataset.tiPhase) ? button.dataset.tiPhase : "All";
      renderBuilder();
    });
  });
  document.getElementById("ti-preset")?.addEventListener("change", (event) => {
    if (event.target.value) loadPreset(event.target.value);
  });
  document.querySelectorAll("[data-ti-length-index]").forEach((input) => {
    input.addEventListener("change", () => {
      const index = safeNumber(input.dataset.tiLengthIndex, -1);
      if (!Number.isInteger(index) || !state.selected[index]) return;
      state.selected[index].lengths = Math.min(100, Math.max(1, safeNumber(input.value, 1)));
      renderBuilder();
    });
  });
  document.querySelectorAll("[data-ti-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = safeNumber(button.dataset.tiRemove, -1);
      if (!Number.isInteger(index) || !state.selected[index]) return;
      state.selected.splice(index, 1);
      renderBuilder();
    });
  });
  document.querySelectorAll("[data-ti-move-up]").forEach((button) => {
    button.addEventListener("click", () => moveSelected(safeNumber(button.dataset.tiMoveUp, -1), -1));
  });
  document.querySelectorAll("[data-ti-move-down]").forEach((button) => {
    button.addEventListener("click", () => moveSelected(safeNumber(button.dataset.tiMoveDown, -1), 1));
  });
  document.getElementById("ti-start-session")?.addEventListener("click", startSession);
}

function startSession() {
  if (!state.selected.length) return;
  const name = document.getElementById("ti-session-name")?.value.trim() || t("default_swim_name");
  const poolLength = safeNumber(document.getElementById("ti-pool-length")?.value, 25);
  state.active = {
    startedAt: new Date().toISOString(),
    name: name.slice(0, 80),
    poolLength: poolLength === 50 ? 50 : 25,
    feeling: "",
    items: state.selected.map((item) => ({
      drillId: item.drillId,
      lengths: Math.min(100, Math.max(1, safeNumber(item.lengths, 1))),
      completed: false,
      spl: "",
      rpe: "",
      notes: "",
    })),
  };
  const store = loadStore();
  store.active = state.active;
  saveStore(store);
  renderAll();
}

function persistActive() {
  const store = loadStore();
  store.active = state.active;
  saveStore(store);
}

function completedCount() {
  return (state.active?.items || []).filter((item) => item.completed).length;
}

function renderActiveSession() {
  const root = document.getElementById("ti-active");
  if (!root) return;
  if (!state.active) {
    root.hidden = true;
    root.replaceChildren();
    return;
  }
  root.hidden = false;
  const count = completedCount();
  const total = state.active.items.length;
  const percent = total ? Math.round((count / total) * 100) : 0;
  const items = state.active.items.map((item, index) => {
    const drill = drillById(item.drillId);
    if (!drill) return "";
    return `
      <article class="ti-active-drill${item.completed ? " is-complete" : ""}">
        <button type="button" class="ti-complete-btn" data-ti-complete="${escapeHtml(String(index))}" aria-pressed="${escapeHtml(String(Boolean(item.completed)))}">
          <span>${item.completed ? "✓" : escapeHtml(String(index + 1))}</span>
        </button>
        <img class="ti-active-image" src="${escapeHtml(drillImageUrl(drill))}" alt="${escapeHtml(t("demonstrating").replace("{name}", drill.name))}" />
        <div class="ti-active-body">
          <div class="ti-active-title">
            <div>
              <span class="chip">${escapeHtml(t(drill.phase))}</span>
              <h3>${escapeHtml(drill.name)}</h3>
            </div>
            <strong>${escapeHtml(String(item.lengths))} × ${escapeHtml(String(state.active.poolLength))} m</strong>
          </div>
          <p class="move-cue">${escapeHtml(drill.cue)}</p>
          <div class="ti-metrics">
            <label class="field">
              <span>${escapeHtml(t("average_spl"))}</span>
              <input type="number" min="1" max="100" inputmode="numeric" value="${escapeHtml(String(item.spl))}" data-ti-metric="spl" data-ti-index="${escapeHtml(String(index))}" placeholder="e.g. 16" />
            </label>
            <label class="field">
              <span>${escapeHtml(t("rpe"))}</span>
              <input type="number" min="1" max="10" inputmode="numeric" value="${escapeHtml(String(item.rpe))}" data-ti-metric="rpe" data-ti-index="${escapeHtml(String(index))}" placeholder="e.g. 6" />
            </label>
            <label class="field ti-notes-field">
              <span>${escapeHtml(t("technique_note"))}</span>
              <input maxlength="160" value="${escapeHtml(item.notes)}" data-ti-metric="notes" data-ti-index="${escapeHtml(String(index))}" placeholder="What changed or clicked?" />
            </label>
          </div>
          <p class="progress-hint">Next: ${escapeHtml(drill.progression)} · rest ${escapeHtml(String(drill.rest_seconds))} sec</p>
        </div>
      </article>`;
  }).join("");
  root.innerHTML = `
    <div class="workout-head ti-session-head">
      <div>
        <p class="eyebrow">${escapeHtml(t("active_swim"))}</p>
        <h2>${escapeHtml(state.active.name)}</h2>
        <p class="move-meta">${escapeHtml(t("planned_distance").replace("{n}", sessionDistance(state.active)))} · ${escapeHtml(String(state.active.poolLength))} m</p>
      </div>
      <button type="button" class="btn-secondary" id="ti-cancel-session">${escapeHtml(t("back_to_builder"))}</button>
    </div>
    <div class="ti-progress-track"><span style="width:${escapeHtml(String(percent))}%"></span></div>
    <p class="move-meta">${escapeHtml(t("drills_complete").replace("{done}", count).replace("{total}", total))}</p>
    <div class="ti-active-list">${items}</div>
    <div class="session-progress">
      <div class="feel-row">
        ${["good", "mid", "bad"].map((feel) =>
          `<button type="button" class="feel-btn${state.active.feeling === feel ? " is-active" : ""}" data-ti-feel="${escapeHtml(feel)}">${escapeHtml(t(feel))}</button>`
        ).join("")}
      </div>
      <div class="session-actions">
        <button type="button" class="btn-primary" id="ti-finish-session">${escapeHtml(t("finish_swim"))}</button>
      </div>
      <p class="status" id="ti-session-status" role="status"></p>
    </div>`;
  bindActive();
}

function bindActive() {
  document.querySelectorAll("[data-ti-complete]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = safeNumber(button.dataset.tiComplete, -1);
      if (!Number.isInteger(index) || !state.active?.items[index]) return;
      state.active.items[index].completed = !state.active.items[index].completed;
      persistActive();
      renderActiveSession();
    });
  });
  document.querySelectorAll("[data-ti-metric]").forEach((input) => {
    input.addEventListener("change", () => {
      const index = safeNumber(input.dataset.tiIndex, -1);
      const item = state.active?.items[index];
      if (!Number.isInteger(index) || !item) return;
      const metric = input.dataset.tiMetric;
      if (!["spl", "rpe", "notes"].includes(metric)) return;
      if (metric === "spl") item.spl = input.value ? Math.min(100, Math.max(1, safeNumber(input.value, 1))) : "";
      if (metric === "rpe") item.rpe = input.value ? Math.min(10, Math.max(1, safeNumber(input.value, 1))) : "";
      if (metric === "notes") item.notes = input.value.slice(0, 160);
      persistActive();
    });
  });
  document.querySelectorAll("[data-ti-feel]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.active) return;
      state.active.feeling = ["good", "mid", "bad"].includes(button.dataset.tiFeel)
        ? button.dataset.tiFeel
        : "";
      persistActive();
      renderActiveSession();
    });
  });
  document.getElementById("ti-cancel-session")?.addEventListener("click", () => {
    if (!state.active) return;
    state.selected = state.active.items.map((item) => ({
      drillId: item.drillId,
      lengths: item.lengths,
    }));
    const store = loadStore();
    store.active = null;
    saveStore(store);
    state.active = null;
    renderAll();
  });
  document.getElementById("ti-finish-session")?.addEventListener("click", finishSession);
}

function finishSession() {
  if (!state.active) return;
  const status = document.getElementById("ti-session-status");
  if (!state.active.feeling) {
    if (status) status.textContent = t("choose_swim_feel");
    return;
  }
  const finished = {
    ...state.active,
    finishedAt: new Date().toISOString(),
    completedCount: completedCount(),
  };
  const store = loadStore();
  store.history = [finished, ...store.history].slice(0, 50);
  store.active = null;
  saveStore(store);
  state.active = null;
  state.selected = [];
  renderAll();
}

function renderCurriculum() {
  const root = document.getElementById("ti-curriculum");
  if (!root) return;
  root.innerHTML = PHASES.map((phase, index) => {
    const count = state.drills.filter((drill) => drill.phase === phase).length;
    return `
      <div class="ti-phase-step">
        <span>${escapeHtml(String(index + 1))}</span>
        <strong>${escapeHtml(t(phase))}</strong>
        <small>${escapeHtml(String(count))} drills</small>
      </div>`;
  }).join("");
}

function renderProgress() {
  const root = document.getElementById("ti-progress");
  if (!root) return;
  const history = loadStore().history;
  if (!history.length) {
    root.innerHTML = `<p class="move-meta">${escapeHtml(t("no_swims"))}</p>`;
    return;
  }
  const totalDistance = history.reduce((sum, session) => sum + sessionDistance(session), 0);
  const completed = history.reduce((sum, session) => sum + safeNumber(session.completedCount), 0);
  const splValues = history.flatMap((session) =>
    (session.items || []).map((item) => safeNumber(item.spl, 0)).filter((value) => value > 0)
  );
  const averageSpl = splValues.length
    ? (splValues.reduce((sum, value) => sum + value, 0) / splValues.length).toFixed(1)
    : "—";
  const rows = history.slice(0, 8).map((session) => {
    const measured = (session.items || []).filter((item) => safeNumber(item.spl) > 0);
    const sessionSpl = measured.length
      ? (measured.reduce((sum, item) => sum + safeNumber(item.spl), 0) / measured.length).toFixed(1)
      : "—";
    return `
      <article class="history-item">
        <div>
          <strong>${escapeHtml(session.name || t("ti_swim"))}</strong>
          <p class="move-meta">${escapeHtml(formatDate(session.finishedAt))} · ${escapeHtml(String(sessionDistance(session)))} m · SPL ${escapeHtml(String(sessionSpl))}</p>
        </div>
        <span class="badge ${session.feeling === "good" ? "ok" : session.feeling === "bad" ? "warn" : ""}">${escapeHtml(session.feeling || "—")}</span>
      </article>`;
  }).join("");
  root.innerHTML = `
    <div class="stat-grid ti-stat-grid">
      <div class="stat"><strong>${escapeHtml(String(history.length))}</strong><span>${escapeHtml(t("swims"))}</span></div>
      <div class="stat"><strong>${escapeHtml(String(totalDistance))} m</strong><span>${escapeHtml(t("planned_total"))}</span></div>
      <div class="stat"><strong>${escapeHtml(String(completed))}</strong><span>${escapeHtml(t("drills"))}</span></div>
      <div class="stat"><strong>${escapeHtml(String(averageSpl))}</strong><span>${escapeHtml(t("average_logged_spl"))}</span></div>
    </div>
    <div class="history-list">${rows}</div>`;
}

function renderAll() {
  const builder = document.getElementById("ti-builder");
  if (builder) builder.hidden = Boolean(state.active);
  renderActiveSession();
  if (!state.active) renderBuilder();
  renderCurriculum();
  renderProgress();
}

export async function initSwim() {
  const response = await fetch("./data/ti-drills.json", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Failed to load Total Immersion drills");
  const data = await response.json();
  state.drills = Array.isArray(data.drills) ? data.drills : [];
  state.presets = Array.isArray(data.presets) ? data.presets : [];
  state.active = loadStore().active;
  renderAll();
}

export function refreshSwimLanguage() {
  if (state.drills.length) renderAll();
}
