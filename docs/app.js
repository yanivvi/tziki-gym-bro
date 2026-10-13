import {
  buildWorkoutFromProfile,
  findSwapCandidates,
  hashString,
} from "./generator.js";
import { applyI18n, getLang, setLang, t } from "./i18n.js";
import { initSwim, refreshSwimLanguage } from "./swim.js";

const STORE_KEY = "tziki-gym-bro-v2";
const EQUIPMENT = ["bodyweight", "dbs", "barbell", "bench", "pullup_bar", "cables", "kettlebell", "machines", "bands"];
const CONSTRAINTS = ["knee_sensitive", "shoulder_irritable", "overhead_limited", "axial_spine_sensitive", "wrist_sensitive"];
const GOALS = ["general_health", "strength", "muscle", "fat_loss", "athleticism"];
const LEVELS = ["beginner", "intermediate", "advanced"];

const state = {
  exercises: [],
  templates: [],
  plans: [],
  videos: {},
  prepared: null,
  route: "gym",
  libraryPattern: "all",
  onboarding: {
    step: 0,
    goal: "general_health",
    level: "intermediate",
    days: 3,
    equipment: ["bodyweight", "dbs", "bands"],
    constraints: [],
  },
};

const $ = (id) => document.getElementById(id);

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
  return { version: 2, profile: null, plan: null, active: null, history: [] };
}

function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!parsed || parsed.version !== 2) return emptyStore();
    return {
      version: 2,
      profile: parsed.profile || null,
      plan: parsed.plan || null,
      active: parsed.active || null,
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 30) : [],
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

async function loadJson(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function planForDays(days) {
  if (Number(days) <= 2) return "minimal_2day";
  if (Number(days) >= 4) return "upper_lower_4day";
  return "full_body_3day";
}

function getPlan(id) {
  return state.plans.find((plan) => plan.id === id) || null;
}

function currentPlanDay(store = loadStore()) {
  const plan = getPlan(store.plan?.planId);
  if (!plan?.days?.length) return null;
  const dayIndex = (store.plan.dayIndex || 0) % plan.days.length;
  return {
    plan,
    day: plan.days[dayIndex],
    dayIndex,
    cycle: store.plan.cycle || 1,
  };
}

function mediaUrl(exercise) {
  const image = exercise?.media?.image;
  if (!image) return "";
  const name = String(image).split("/").pop();
  return /^[a-z0-9_]+\.(svg|png|jpe?g|webp)$/i.test(name)
    ? `./illustrations/${name}`
    : "";
}

function demoUrl(exercise) {
  const mapped = state.videos?.[exercise?.id];
  if (typeof mapped === "string" && /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(mapped)) return mapped;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise?.name || "exercise"} form`)}`;
}

function formatDate() {
  return new Intl.DateTimeFormat(getLang() === "he" ? "he-IL" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function workoutEntries(workout) {
  const entries = [];
  (workout?.blocks || []).forEach((block, blockIdx) => {
    (block.exercises || []).forEach((exercise, exIdx) => {
      entries.push({ block, exercise, blockIdx, exIdx });
    });
  });
  return entries;
}

function fullExercise(id) {
  return state.exercises.find((exercise) => exercise.id === id) || null;
}

function recentLog(exerciseId) {
  const history = loadStore().history;
  for (const session of history) {
    const log = session.logs?.find((item) => item.exerciseId === exerciseId);
    if (log) return log;
  }
  return null;
}

function makeSetRows(exercise) {
  const count = Math.min(8, Math.max(1, Number(exercise.prescription?.sets) || 3));
  const recent = recentLog(exercise.exercise_id);
  return Array.from({ length: count }, (_, index) => ({
    weight: recent?.sets?.[index]?.weight ?? "",
    reps: recent?.sets?.[index]?.reps ?? "",
  }));
}

function profileForGenerator(profile) {
  return {
    name: "Personal plan",
    goal: profile.goal,
    level: profile.level,
    session_minutes: profile.sessionMinutes || 60,
    equipment: profile.equipment?.length ? profile.equipment : ["bodyweight"],
    constraints: profile.constraints || [],
  };
}

function prepareToday(force = false) {
  const store = loadStore();
  const info = currentPlanDay(store);
  if (!store.profile || !info) return null;
  const key = `${info.plan.id}:${info.dayIndex}:${info.cycle}`;
  if (!force && state.prepared?.key === key) return state.prepared;
  const profile = profileForGenerator(store.profile);
  profile.session_type = info.day.template;
  profile.seed = hashString(key);
  const workout = buildWorkoutFromProfile(profile, info.day.template, state.exercises, state.templates);
  state.prepared = { key, workout, info };
  return state.prepared;
}

function haptic(value = 12) {
  try {
    navigator.vibrate?.(value);
  } catch {
    // Optional feedback.
  }
}

function showScreen(route) {
  state.route = route;
  ["gym", "library", "swim", "settings"].forEach((name) => {
    const screen = $(`screen-${name}`);
    if (screen) screen.hidden = name !== route;
  });
  closeMenu();
  if (route === "gym") renderGym();
  if (route === "library") renderLibrary();
  if (route === "settings") renderSettings();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openMenu() {
  $("app-menu").hidden = false;
  $("menu-toggle").setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
}

function closeMenu() {
  $("app-menu").hidden = true;
  $("menu-toggle").setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

function renderChoiceButtons(items, selected, attribute, multiple = false) {
  const chosen = new Set(Array.isArray(selected) ? selected : [selected]);
  return items.map((item) => {
    const value = typeof item === "string" ? item : item.value;
    const label = typeof item === "string" ? t(item) : item.label;
    return `<button type="button" class="choice-card${chosen.has(value) ? " is-selected" : ""}" ${attribute}="${escapeHtml(value)}" aria-pressed="${chosen.has(value)}">
      <span class="choice-check">${chosen.has(value) ? "✓" : ""}</span>
      <strong>${escapeHtml(label)}</strong>
      ${multiple ? `<small>${escapeHtml(t(`desc_${value}`) || "")}</small>` : ""}
    </button>`;
  }).join("");
}

function onboardingSteps() {
  return [
    {
      eyebrow: t("onboarding_goal_eyebrow"),
      title: t("onboarding_goal_title"),
      copy: t("onboarding_goal_copy"),
      body: `<div class="choice-grid">${renderChoiceButtons(GOALS, state.onboarding.goal, "data-onboard-goal")}</div>`,
    },
    {
      eyebrow: t("onboarding_level_eyebrow"),
      title: t("onboarding_level_title"),
      copy: t("onboarding_level_copy"),
      body: `<div class="choice-grid three">${renderChoiceButtons(LEVELS, state.onboarding.level, "data-onboard-level")}</div>`,
    },
    {
      eyebrow: t("onboarding_days_eyebrow"),
      title: t("onboarding_days_title"),
      copy: t("onboarding_days_copy"),
      body: `<div class="choice-grid three">${renderChoiceButtons([2, 3, 4].map((value) => ({ value: String(value), label: t("days_count").replace("{n}", value) })), String(state.onboarding.days), "data-onboard-days")}</div>`,
    },
    {
      eyebrow: t("onboarding_equipment_eyebrow"),
      title: t("onboarding_equipment_title"),
      copy: t("onboarding_equipment_copy"),
      body: `<div class="choice-grid equipment-grid">${renderChoiceButtons(EQUIPMENT, state.onboarding.equipment, "data-onboard-equipment", true)}</div>`,
    },
    {
      eyebrow: t("onboarding_limits_eyebrow"),
      title: t("onboarding_limits_title"),
      copy: t("onboarding_limits_copy"),
      body: `<div class="choice-grid">${renderChoiceButtons(["none", ...CONSTRAINTS], state.onboarding.constraints.length ? state.onboarding.constraints : ["none"], "data-onboard-constraint")}</div>`,
    },
  ];
}

function renderOnboarding() {
  const steps = onboardingSteps();
  const step = state.onboarding.step;
  const isRecommendation = step >= steps.length;
  $("screen-onboarding").hidden = false;
  $("app-main").classList.add("onboarding-active");
  document.querySelector(".app-header").hidden = true;
  $("onboarding-step-label").textContent = isRecommendation
    ? t("recommendation")
    : t("step_of").replace("{step}", step + 1).replace("{total}", steps.length);
  $("onboarding-progress").style.width = `${((Math.min(step, steps.length - 1) + 1) / steps.length) * 100}%`;

  if (isRecommendation) {
    const plan = getPlan(planForDays(state.onboarding.days));
    $("onboarding-content").innerHTML = `
      <div class="onboarding-copy">
        <p class="eyebrow">${escapeHtml(t("your_plan"))}</p>
        <h1>${escapeHtml(t("plan_ready"))}</h1>
        <p class="lede">${escapeHtml(t("plan_ready_copy"))}</p>
      </div>
      <article class="recommendation-card">
        <span class="recommendation-mark">✓</span>
        <p class="eyebrow">${escapeHtml(t("recommended"))}</p>
        <h2>${escapeHtml(plan?.name || "")}</h2>
        <p>${escapeHtml(plan?.description || "")}</p>
        <div class="recommendation-meta">
          <span>${escapeHtml(t("days_count").replace("{n}", plan?.days?.length || state.onboarding.days))}</span>
          <span>${escapeHtml(t(state.onboarding.goal))}</span>
          <span>${escapeHtml(t(state.onboarding.level))}</span>
        </div>
      </article>
      <div class="onboarding-actions">
        <button type="button" class="text-button" id="onboarding-back">${escapeHtml(t("back"))}</button>
        <button type="button" class="primary-action" id="confirm-plan"><span>${escapeHtml(t("use_this_plan"))}</span><span>→</span></button>
      </div>`;
  } else {
    const current = steps[step];
    $("onboarding-content").innerHTML = `
      <div class="onboarding-copy">
        <p class="eyebrow">${escapeHtml(current.eyebrow)}</p>
        <h1>${escapeHtml(current.title)}</h1>
        <p class="lede">${escapeHtml(current.copy)}</p>
      </div>
      ${current.body}
      <div class="onboarding-actions">
        ${step ? `<button type="button" class="text-button" id="onboarding-back">${escapeHtml(t("back"))}</button>` : "<span></span>"}
        <button type="button" class="primary-action" id="onboarding-next"><span>${escapeHtml(step === steps.length - 1 ? t("see_plan") : t("continue"))}</span><span>→</span></button>
      </div>`;
  }
  bindOnboarding();
}

function toggleListValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function bindOnboarding() {
  document.querySelectorAll("[data-onboard-goal]").forEach((button) => button.addEventListener("click", () => {
    state.onboarding.goal = button.dataset.onboardGoal;
    renderOnboarding();
  }));
  document.querySelectorAll("[data-onboard-level]").forEach((button) => button.addEventListener("click", () => {
    state.onboarding.level = button.dataset.onboardLevel;
    renderOnboarding();
  }));
  document.querySelectorAll("[data-onboard-days]").forEach((button) => button.addEventListener("click", () => {
    state.onboarding.days = Number(button.dataset.onboardDays);
    renderOnboarding();
  }));
  document.querySelectorAll("[data-onboard-equipment]").forEach((button) => button.addEventListener("click", () => {
    state.onboarding.equipment = toggleListValue(state.onboarding.equipment, button.dataset.onboardEquipment);
    renderOnboarding();
  }));
  document.querySelectorAll("[data-onboard-constraint]").forEach((button) => button.addEventListener("click", () => {
    const value = button.dataset.onboardConstraint;
    state.onboarding.constraints = value === "none" ? [] : toggleListValue(state.onboarding.constraints, value);
    renderOnboarding();
  }));
  $("onboarding-back")?.addEventListener("click", () => {
    state.onboarding.step = Math.max(0, state.onboarding.step - 1);
    renderOnboarding();
  });
  $("onboarding-next")?.addEventListener("click", () => {
    if (state.onboarding.step === 3 && !state.onboarding.equipment.length) state.onboarding.equipment = ["bodyweight"];
    state.onboarding.step += 1;
    renderOnboarding();
  });
  $("confirm-plan")?.addEventListener("click", finishOnboarding);
}

function finishOnboarding() {
  const store = emptyStore();
  store.profile = {
    goal: state.onboarding.goal,
    level: state.onboarding.level,
    days: state.onboarding.days,
    equipment: state.onboarding.equipment.length ? state.onboarding.equipment : ["bodyweight"],
    constraints: state.onboarding.constraints,
    sessionMinutes: 60,
  };
  store.plan = { planId: planForDays(store.profile.days), dayIndex: 0, cycle: 1 };
  saveStore(store);
  state.prepared = null;
  $("screen-onboarding").hidden = true;
  $("app-main").classList.remove("onboarding-active");
  document.querySelector(".app-header").hidden = false;
  showScreen("gym");
}

function renderGym() {
  const store = loadStore();
  if (!store.profile) {
    renderOnboarding();
    return;
  }
  $("screen-onboarding").hidden = true;
  document.querySelector(".app-header").hidden = false;
  $("home-date").textContent = formatDate();
  if (store.active) {
    $("gym-home").hidden = true;
    $("summary-view").hidden = true;
    $("workout-view").hidden = false;
    renderWorkout(store.active);
    return;
  }
  $("workout-view").hidden = true;
  $("summary-view").hidden = true;
  $("gym-home").hidden = false;
  renderToday();
}

function renderToday() {
  const store = loadStore();
  const active = store.active;
  const prepared = active
    ? {
        workout: active.workout,
        info: {
          plan: getPlan(active.plan?.planId) || { name: t("workout") },
          day: { label: active.plan?.label || active.workout.template?.name || t("workout") },
          cycle: active.plan?.cycle || 1,
          dayIndex: active.plan?.dayIndex || 0,
        },
      }
    : prepareToday();
  if (!prepared) return;
  const entries = workoutEntries(prepared.workout);
  const minutes = prepared.workout.estimated_minutes || 60;
  $("today-card-content").innerHTML = `
    <p class="eyebrow">${escapeHtml(prepared.info.plan.name)}</p>
    <h2>${escapeHtml(prepared.info.day.label)}</h2>
    <div class="today-meta">
      <span>${escapeHtml(t("about_minutes").replace("{n}", minutes))}</span>
      <span>${escapeHtml(t("exercise_count").replace("{n}", entries.length))}</span>
      <span>${escapeHtml(t("cycle_day").replace("{cycle}", prepared.info.cycle).replace("{day}", prepared.info.dayIndex + 1))}</span>
    </div>`;
  $("start-workout").disabled = false;
  $("start-workout").querySelector("span").textContent = t(active ? "resume_workout" : "start_workout");
  $("preview-count").textContent = t("exercise_count").replace("{n}", entries.length);
  $("home-preview").innerHTML = entries.map(({ block, exercise }, index) => {
    const full = fullExercise(exercise.exercise_id);
    const image = mediaUrl(full);
    return `<article class="preview-row">
      <span class="preview-number">${String(index + 1).padStart(2, "0")}</span>
      ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />` : ""}
      <div><strong>${escapeHtml(exercise.name)}</strong><span>${escapeHtml(block.label || block.type)} · ${escapeHtml(exercise.prescription?.sets || 3)} × ${escapeHtml(exercise.prescription?.reps || "—")}</span></div>
    </article>`;
  }).join("");
}

function startWorkout() {
  if (loadStore().active) {
    renderGym();
    return;
  }
  const prepared = prepareToday();
  if (!prepared) return;
  const logs = workoutEntries(prepared.workout).map(({ exercise }) => ({
    exerciseId: exercise.exercise_id,
    sets: makeSetRows(exercise),
    complete: false,
  }));
  const store = loadStore();
  store.active = {
    id: `workout_${Date.now().toString(36)}`,
    startedAt: new Date().toISOString(),
    currentIndex: 0,
    workout: prepared.workout,
    plan: {
      planId: prepared.info.plan.id,
      dayIndex: prepared.info.dayIndex,
      cycle: prepared.info.cycle,
      label: prepared.info.day.label,
    },
    logs,
  };
  saveStore(store);
  haptic(20);
  renderGym();
}

function persistActive(active) {
  const store = loadStore();
  store.active = active;
  saveStore(store);
}

function usedExerciseIds(active, except) {
  return new Set(workoutEntries(active.workout).map(({ exercise }) => exercise.exercise_id).filter((id) => id !== except));
}

function renderWorkout(active) {
  const entries = workoutEntries(active.workout);
  if (!entries.length) return;
  active.currentIndex = Math.min(active.currentIndex || 0, entries.length - 1);
  const entry = entries[active.currentIndex];
  const exercise = entry.exercise;
  const full = fullExercise(exercise.exercise_id);
  const log = active.logs[active.currentIndex];
  const completeCount = active.logs.filter((item) => item.complete).length;
  const image = mediaUrl(full);
  const isBodyweight = (full?.equipment || []).length === 1 && full.equipment[0] === "bodyweight";

  $("workout-title").textContent = active.plan?.label || active.workout.template?.name || t("workout");
  $("workout-progress-label").textContent = `${completeCount}/${entries.length}`;
  $("workout-progress-bar").style.width = `${(completeCount / entries.length) * 100}%`;
  $("current-exercise").innerHTML = `
    <article class="exercise-focus">
      <div class="focus-art">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(exercise.name)}" />` : ""}
        <span class="focus-index">${String(active.currentIndex + 1).padStart(2, "0")}</span>
      </div>
      <div class="focus-body">
        <div class="focus-heading">
          <div>
            <p class="eyebrow">${escapeHtml(entry.block.label || entry.block.type)}</p>
            <h1>${escapeHtml(exercise.name)}</h1>
          </div>
          <button type="button" class="soft-button" id="swap-toggle">${escapeHtml(t("swap"))}</button>
        </div>
        <p class="exercise-cue">${escapeHtml(exercise.cue_short || full?.cue_short || "")}</p>
        <a class="demo-link" href="${escapeHtml(demoUrl(full))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("watch_form"))} ↗</a>
        <div class="set-table">
          <div class="set-table-head"><span>${escapeHtml(t("set"))}</span><span>${escapeHtml(t("weight"))}</span><span>${escapeHtml(t("reps"))}</span></div>
          ${log.sets.map((set, index) => `
            <div class="set-row">
              <span>${index + 1}</span>
              <label><span class="sr-only">${escapeHtml(t("weight"))}</span><input type="${isBodyweight ? "text" : "number"}" inputmode="decimal" data-set-weight="${index}" value="${escapeHtml(isBodyweight && set.weight === "" ? "BW" : set.weight)}" ${isBodyweight ? "readonly" : ""} placeholder="—" /></label>
              <label><span class="sr-only">${escapeHtml(t("reps"))}</span><input type="number" inputmode="numeric" min="0" data-set-reps="${index}" value="${escapeHtml(set.reps)}" placeholder="${escapeHtml(String(exercise.prescription?.reps || "—"))}" /></label>
            </div>`).join("")}
        </div>
        <div id="swap-panel" class="swap-panel" hidden></div>
        <button type="button" class="primary-action finish-exercise" id="finish-exercise">
          <span>${escapeHtml(log.complete ? t("mark_incomplete") : t("finish_exercise"))}</span><span>→</span>
        </button>
      </div>
    </article>`;

  $("exercise-queue").innerHTML = entries.map(({ exercise: item, block }, index) => {
    const done = active.logs[index]?.complete;
    return `<button type="button" class="queue-row${index === active.currentIndex ? " is-current" : ""}${done ? " is-complete" : ""}" data-queue-index="${index}">
      <span class="queue-status">${done ? "✓" : String(index + 1).padStart(2, "0")}</span>
      <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(block.label || block.type)}</small></span>
      <span aria-hidden="true">→</span>
    </button>`;
  }).join("");
  bindWorkout(active);
}

function bindWorkout(active) {
  document.querySelectorAll("[data-set-weight]").forEach((input) => input.addEventListener("input", () => {
    active.logs[active.currentIndex].sets[Number(input.dataset.setWeight)].weight = input.value;
    persistActive(active);
  }));
  document.querySelectorAll("[data-set-reps]").forEach((input) => input.addEventListener("input", () => {
    active.logs[active.currentIndex].sets[Number(input.dataset.setReps)].reps = input.value;
    persistActive(active);
  }));
  document.querySelectorAll("[data-queue-index]").forEach((button) => button.addEventListener("click", () => {
    active.currentIndex = Number(button.dataset.queueIndex);
    persistActive(active);
    renderWorkout(active);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  $("finish-exercise").addEventListener("click", () => {
    const current = active.logs[active.currentIndex];
    current.complete = !current.complete;
    haptic(18);
    if (active.logs.every((log) => log.complete)) {
      finishWorkout(active);
      return;
    }
    if (current.complete) {
      const next = active.logs.findIndex((log, index) => index > active.currentIndex && !log.complete);
      active.currentIndex = next >= 0 ? next : active.logs.findIndex((log) => !log.complete);
    }
    persistActive(active);
    renderWorkout(active);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("swap-toggle").addEventListener("click", () => renderSwapPanel(active));
}

function renderSwapPanel(active) {
  const entries = workoutEntries(active.workout);
  const entry = entries[active.currentIndex];
  const current = fullExercise(entry.exercise.exercise_id);
  const store = loadStore();
  const candidates = findSwapCandidates(
    current,
    state.exercises,
    profileForGenerator(store.profile),
    usedExerciseIds(active, current?.id)
  ).slice(0, 5);
  const panel = $("swap-panel");
  panel.hidden = false;
  panel.innerHTML = candidates.length
    ? `<p class="eyebrow">${escapeHtml(t("choose_replacement"))}</p>${candidates.map((candidate) => {
      const image = mediaUrl(candidate);
      return `<button type="button" class="swap-option" data-swap-id="${escapeHtml(candidate.id)}">
        ${image ? `<img src="${escapeHtml(image)}" alt="" />` : ""}
        <span><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(t(candidate.primary_pattern))}</small></span><span>→</span>
      </button>`;
    }).join("")}`
    : `<p>${escapeHtml(t("no_swaps"))}</p>`;
  panel.querySelectorAll("[data-swap-id]").forEach((button) => button.addEventListener("click", () => {
    applySwap(active, button.dataset.swapId);
  }));
}

function applySwap(active, id) {
  const entries = workoutEntries(active.workout);
  const entry = entries[active.currentIndex];
  const next = fullExercise(id);
  if (!entry || !next) return;
  const previousPrescription = entry.exercise.prescription || {};
  entry.block.exercises[entry.exIdx] = {
    ...entry.exercise,
    exercise_id: next.id,
    name: next.name,
    primary_pattern: next.primary_pattern,
    family_id: next.family_id,
    stance: next.stance,
    cue_short: next.cue_short,
    prescription: { ...(next.default_prescription || previousPrescription) },
  };
  const updated = entry.block.exercises[entry.exIdx];
  active.logs[active.currentIndex] = {
    exerciseId: next.id,
    sets: makeSetRows(updated),
    complete: false,
  };
  persistActive(active);
  renderWorkout(active);
}

function advancePlan(store, active) {
  if (!store.plan || store.plan.planId !== active.plan?.planId || store.plan.dayIndex !== active.plan?.dayIndex) return;
  const plan = getPlan(store.plan.planId);
  let dayIndex = (store.plan.dayIndex || 0) + 1;
  let cycle = store.plan.cycle || 1;
  if (dayIndex >= plan.days.length) {
    dayIndex = 0;
    cycle += 1;
  }
  store.plan = { ...store.plan, dayIndex, cycle };
}

function finishWorkout(active) {
  const finishedAt = new Date().toISOString();
  const durationMinutes = Math.max(1, Math.round((Date.parse(finishedAt) - Date.parse(active.startedAt)) / 60000));
  const store = loadStore();
  const finished = {
    id: active.id,
    finishedAt,
    workoutName: active.plan?.label || active.workout.template?.name,
    durationMinutes,
    exerciseCount: active.logs.filter((log) => log.complete).length,
    setCount: active.logs.reduce((sum, log) => sum + (log.complete ? log.sets.length : 0), 0),
    logs: active.logs,
  };
  store.history = [finished, ...store.history].slice(0, 30);
  store.active = null;
  advancePlan(store, active);
  saveStore(store);
  state.prepared = null;
  haptic([30, 40, 30]);
  renderSummary(finished);
}

function renderSummary(summary) {
  $("workout-view").hidden = true;
  $("gym-home").hidden = true;
  const view = $("summary-view");
  view.hidden = false;
  view.innerHTML = `
    <div class="summary-card">
      <span class="summary-mark">✓</span>
      <p class="eyebrow">${escapeHtml(t("session_complete"))}</p>
      <h1>${escapeHtml(t("well_done"))}</h1>
      <p class="lede">${escapeHtml(t("summary_copy"))}</p>
      <div class="summary-stats">
        <div><strong>${summary.durationMinutes}</strong><span>${escapeHtml(t("minutes"))}</span></div>
        <div><strong>${summary.exerciseCount}</strong><span>${escapeHtml(t("exercises"))}</span></div>
        <div><strong>${summary.setCount}</strong><span>${escapeHtml(t("sets"))}</span></div>
      </div>
      <button type="button" class="primary-action" id="summary-home"><span>${escapeHtml(t("back_to_today"))}</span><span>→</span></button>
    </div>`;
  $("summary-home").addEventListener("click", renderGym);
}

function renderLibrary() {
  const patterns = [...new Set(state.exercises.map((exercise) => exercise.primary_pattern))].sort();
  $("library-categories").innerHTML = ["all", ...patterns].map((pattern) =>
    `<button type="button" class="category-chip${state.libraryPattern === pattern ? " is-active" : ""}" data-library-pattern="${escapeHtml(pattern)}">${escapeHtml(pattern === "all" ? t("all_movements") : t(pattern))}</button>`
  ).join("");
  const query = $("library-search").value.trim().toLowerCase();
  const visible = state.exercises.filter((exercise) => {
    const matchesPattern = state.libraryPattern === "all" || exercise.primary_pattern === state.libraryPattern;
    const matchesQuery = !query || [exercise.name, exercise.cue_short, exercise.primary_pattern].join(" ").toLowerCase().includes(query);
    return matchesPattern && matchesQuery;
  });
  $("library-grid").innerHTML = visible.map((exercise) => {
    const image = mediaUrl(exercise);
    return `<button type="button" class="library-card" data-library-id="${escapeHtml(exercise.id)}">
      <div class="library-art">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />` : ""}</div>
      <span class="eyebrow">${escapeHtml(t(exercise.primary_pattern))}</span>
      <strong>${escapeHtml(exercise.name)}</strong>
      <small>${escapeHtml(exercise.cue_short || "")}</small>
    </button>`;
  }).join("") || `<p class="empty-state">${escapeHtml(t("no_exercises"))}</p>`;
  document.querySelectorAll("[data-library-pattern]").forEach((button) => button.addEventListener("click", () => {
    state.libraryPattern = button.dataset.libraryPattern;
    renderLibrary();
  }));
  document.querySelectorAll("[data-library-id]").forEach((button) => button.addEventListener("click", () => {
    renderLibraryDetail(button.dataset.libraryId);
  }));
}

function renderLibraryDetail(id) {
  const exercise = fullExercise(id);
  if (!exercise) return;
  const image = mediaUrl(exercise);
  const sheet = $("library-detail");
  sheet.hidden = false;
  sheet.innerHTML = `
    <button type="button" class="detail-backdrop" data-detail-close aria-label="Close"></button>
    <article class="detail-card">
      <button type="button" class="close-button icon-button" data-detail-close>×</button>
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(exercise.name)}" />` : ""}
      <p class="eyebrow">${escapeHtml(t(exercise.primary_pattern))}</p>
      <h2>${escapeHtml(exercise.name)}</h2>
      <p class="exercise-cue">${escapeHtml(exercise.cue_long || exercise.cue_short || "")}</p>
      <div class="detail-meta">
        <span>${escapeHtml(t(exercise.skill))}</span>
        <span>${escapeHtml((exercise.equipment || []).map((item) => t(item)).join(" · "))}</span>
      </div>
      <a class="primary-action link-action" href="${escapeHtml(demoUrl(exercise))}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(t("watch_form"))}</span><span>↗</span></a>
    </article>`;
  sheet.querySelectorAll("[data-detail-close]").forEach((button) => button.addEventListener("click", () => {
    sheet.hidden = true;
  }));
}

function optionHtml(values, selected) {
  return values.map((value) => `<option value="${escapeHtml(String(value))}"${String(value) === String(selected) ? " selected" : ""}>${escapeHtml(typeof value === "number" ? t("days_count").replace("{n}", value) : t(value))}</option>`).join("");
}

function settingsChoices(items, selected, attr) {
  const chosen = new Set(selected || []);
  return items.map((item) => `<label class="check-choice"><input type="checkbox" ${attr} value="${escapeHtml(item)}"${chosen.has(item) ? " checked" : ""} /><span>${escapeHtml(t(item))}</span></label>`).join("");
}

function renderSettings() {
  const profile = loadStore().profile;
  if (!profile) return;
  $("settings-goal").innerHTML = optionHtml(GOALS, profile.goal);
  $("settings-level").innerHTML = optionHtml(LEVELS, profile.level);
  $("settings-days").innerHTML = optionHtml([2, 3, 4], profile.days);
  $("settings-equipment").innerHTML = settingsChoices(EQUIPMENT, profile.equipment, "data-settings-equipment");
  $("settings-constraints").innerHTML = settingsChoices(CONSTRAINTS, profile.constraints, "data-settings-constraint");
  document.querySelectorAll("[data-language]").forEach((button) => button.classList.toggle("is-active", button.dataset.language === getLang()));
}

function saveSettings(event) {
  event.preventDefault();
  const store = loadStore();
  const nextDays = Number($("settings-days").value);
  const nextPlanId = planForDays(nextDays);
  store.profile = {
    ...store.profile,
    goal: $("settings-goal").value,
    level: $("settings-level").value,
    days: nextDays,
    equipment: [...document.querySelectorAll("[data-settings-equipment]:checked")].map((input) => input.value),
    constraints: [...document.querySelectorAll("[data-settings-constraint]:checked")].map((input) => input.value),
  };
  if (!store.profile.equipment.length) store.profile.equipment = ["bodyweight"];
  if (store.plan?.planId !== nextPlanId) store.plan = { planId: nextPlanId, dayIndex: 0, cycle: 1 };
  saveStore(store);
  state.prepared = null;
  showScreen("gym");
}

function changeLanguage(lang) {
  setLang(lang);
  applyI18n(lang);
  refreshSwimLanguage();
  if (loadStore().profile) {
    renderSettings();
    showScreen(state.route);
  } else {
    renderOnboarding();
  }
}

function bindShell() {
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.route)));
  $("menu-toggle").addEventListener("click", () => $("app-menu").hidden ? openMenu() : closeMenu());
  document.querySelectorAll("[data-menu-close]").forEach((element) => element.addEventListener("click", closeMenu));
  $("start-workout").addEventListener("click", startWorkout);
  $("workout-home").addEventListener("click", () => {
    $("workout-view").hidden = true;
    $("gym-home").hidden = false;
    renderToday();
  });
  $("library-search").addEventListener("input", renderLibrary);
  $("settings-form").addEventListener("submit", saveSettings);
  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => changeLanguage(button.dataset.language)));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

async function init() {
  applyI18n(getLang());
  bindShell();
  registerServiceWorker();
  const [exercises, templates, plans, videos] = await Promise.all([
    loadJson("./data/exercises.json"),
    loadJson("./data/templates.json"),
    loadJson("./data/plans.json"),
    loadJson("./data/videos.json").catch(() => ({})),
  ]);
  state.exercises = Array.isArray(exercises) ? exercises : exercises.exercises || [];
  state.templates = Array.isArray(templates) ? templates : templates.templates || [];
  state.plans = Array.isArray(plans) ? plans : plans.plans || [];
  state.videos = videos && typeof videos === "object" && !Array.isArray(videos) ? videos : {};
  await initSwim();
  if (loadStore().profile) showScreen("gym");
  else renderOnboarding();
}

init().catch((error) => {
  document.body.innerHTML = `<main class="fatal-error"><h1>Something went wrong.</h1><p>${escapeHtml(error.message || "Failed to load")}</p></main>`;
});
