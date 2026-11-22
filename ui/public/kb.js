import { getLang, t } from "./i18n.js";

const STORE_KEY = "tziki-gym-bro-kb-v1";
const BELLS = ["boxing", "bowl", "buzzer", "beep"];

export const READY_SECONDS = 10;

export const CHIPPER_RECIPES = [
  { stations: 10, work: 90, rest: 30 },
  { stations: 10, work: 90, rest: 20 },
  { stations: 12, work: 75, rest: 20 },
  { stations: 12, work: 60, rest: 40 },
  { stations: 14, work: 60, rest: 20 },
  { stations: 9, work: 90, rest: 45 },
  { stations: 8, work: 90, rest: 55 },
  { stations: 11, work: 75, rest: 30 },
];

export const CYCLE_RECIPES = [
  { drills: 2, rounds: 10, work: 45, rest: 15 },
  { drills: 2, rounds: 8, work: 50, rest: 20 },
  { drills: 2, rounds: 8, work: 60, rest: 20 },
  { drills: 3, rounds: 6, work: 45, rest: 20 },
  { drills: 3, rounds: 5, work: 60, rest: 20 },
  { drills: 2, rounds: 6, work: 75, rest: 30 },
  { drills: 2, rounds: 7, work: 60, rest: 30 },
  { drills: 3, rounds: 4, work: 75, rest: 25 },
];

const COVERAGE = ["hinge", "squat", "push", "pull"];

let catalog = [];
let memory = null;
let audioCtx = null;
let wakeLock = null;
let timerId = null;
let announcedKey = "";
let bound = false;

export function sessionSeconds(work, rest, stations) {
  if (stations <= 0) return 0;
  return stations * work + Math.max(0, stations - 1) * rest;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let tMix = Math.imul(value ^ (value >>> 15), 1 | value);
    tMix = (tMix + Math.imul(tMix ^ (tMix >>> 7), 61 | tMix)) ^ tMix;
    return ((tMix ^ (tMix >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function take(pool, predicate, rand) {
  const options = pool.filter(predicate);
  if (!options.length) return null;
  return options[Math.floor(rand() * options.length)];
}

function orderByPattern(chosen, rand) {
  const buckets = new Map();
  shuffle(chosen, rand).forEach((exercise) => {
    if (!buckets.has(exercise.pattern)) buckets.set(exercise.pattern, []);
    buckets.get(exercise.pattern).push(exercise);
  });
  const keys = shuffle([...buckets.keys()], rand);
  const ordered = [];
  let spins = 0;
  while (ordered.length < chosen.length && spins < chosen.length + 2) {
    spins += 1;
    let placed = false;
    keys.forEach((key) => {
      const bucket = buckets.get(key);
      if (!bucket?.length || ordered[ordered.length - 1]?.pattern === key) return;
      ordered.push(bucket.shift());
      placed = true;
    });
    if (placed) continue;
    keys.forEach((key) => {
      const bucket = buckets.get(key);
      while (bucket?.length) ordered.push(bucket.shift());
    });
  }
  return ordered;
}

function pickChipper(exercises, stations, rand) {
  const chosen = [];
  let high = 0;
  const pull = (predicate) => {
    const pick = take(exercises, (exercise) => !chosen.includes(exercise) && predicate(exercise), rand);
    if (!pick) return false;
    chosen.push(pick);
    if (pick.skill === "high") high += 1;
    return true;
  };
  COVERAGE.forEach((pattern) => pull((exercise) => exercise.pattern === pattern && exercise.skill !== "high"));
  while (chosen.length < stations) {
    if (!pull((exercise) => exercise.skill !== "high" || high < 1)) break;
  }
  return orderByPattern(chosen, rand);
}

function pickCycle(exercises, drills, rand) {
  const pool = exercises.filter((exercise) => exercise.skill !== "high");
  const anchors = pool.filter((exercise) => exercise.pattern === "hinge" || exercise.pattern === "squat");
  const first = take(anchors.length ? anchors : pool, () => true, rand);
  const chosen = [first];
  while (chosen.length < drills) {
    const unused = pool.filter((exercise) => !chosen.includes(exercise));
    const different = unused.filter((exercise) => !chosen.some((item) => item.pattern === exercise.pattern));
    const pick = take(different.length ? different : unused, () => true, rand);
    if (!pick) break;
    chosen.push(pick);
  }
  return chosen;
}

export function buildSession(exercises, seed) {
  const rand = mulberry32(seed);
  const format = rand() < 0.55 ? "chipper" : "cycles";
  const recipe = format === "chipper"
    ? CHIPPER_RECIPES[Math.floor(rand() * CHIPPER_RECIPES.length)]
    : CYCLE_RECIPES[Math.floor(rand() * CYCLE_RECIPES.length)];
  const chosen = format === "chipper"
    ? pickChipper(exercises, recipe.stations, rand)
    : pickCycle(exercises, recipe.drills, rand);
  const stations = format === "chipper" ? chosen.length : chosen.length * recipe.rounds;
  return {
    id: `kb-${seed}`,
    format,
    work: recipe.work,
    rest: recipe.rest,
    rounds: format === "cycles" ? recipe.rounds : 1,
    exerciseIds: chosen.map((exercise) => exercise.id),
    seconds: sessionSeconds(recipe.work, recipe.rest, stations),
  };
}

export function buildTimeline(session, exercises) {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const drills = session.exerciseIds.map((id) => byId.get(id)).filter(Boolean);
  const stations = [];
  const rounds = session.format === "cycles" ? session.rounds : 1;
  for (let round = 1; round <= rounds; round += 1) {
    drills.forEach((drill) => stations.push({ drill, round }));
  }
  const firstId = drills[0]?.id || "";
  const segments = [{
    phase: "ready",
    seconds: READY_SECONDS,
    start: 0,
    end: READY_SECONDS,
    exerciseId: firstId,
    round: 1,
    unilateral: false,
    station: 0,
    stations: stations.length,
    rounds,
    nextExerciseId: firstId,
  }];
  let cursor = READY_SECONDS;
  stations.forEach((station, index) => {
    const next = stations[index + 1];
    segments.push({
      phase: "work",
      seconds: session.work,
      start: cursor,
      end: cursor + session.work,
      exerciseId: station.drill.id,
      round: station.round,
      unilateral: Boolean(station.drill.unilateral),
      station: index,
      stations: stations.length,
      rounds,
      nextExerciseId: next?.drill.id || "",
      nextRound: next?.round || 0,
    });
    cursor += session.work;
    if (!next) return;
    segments.push({
      phase: "rest",
      seconds: session.rest,
      start: cursor,
      end: cursor + session.rest,
      exerciseId: next.drill.id,
      round: next.round,
      unilateral: false,
      station: index,
      stations: stations.length,
      rounds,
      nextExerciseId: next.drill.id,
      nextRound: next.round,
    });
    cursor += session.rest;
  });
  return segments;
}

export function phaseAt(timeline, elapsedSeconds) {
  const total = timeline.length ? timeline[timeline.length - 1].end : 0;
  const elapsed = Math.max(0, elapsedSeconds);
  if (!timeline.length || elapsed >= total) {
    const segment = timeline[timeline.length - 1] || null;
    return { done: true, segment, remaining: 0, into: segment?.seconds || 0, switched: false, total, elapsed };
  }
  const segment = timeline.find((item) => elapsed < item.end);
  const into = elapsed - segment.start;
  const remaining = segment.seconds - into;
  const switched = segment.phase === "work" && segment.unilateral && into >= segment.seconds / 2;
  return { done: false, segment, remaining, into, switched, total, elapsed };
}

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
  return { version: 1, bell: "boxing", plan: null, active: null, completedId: null, history: [] };
}

function loadStore() {
  if (memory) return memory;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (parsed && parsed.version === 1) {
      memory = {
        ...emptyStore(),
        ...parsed,
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, 20) : [],
      };
      if (!BELLS.includes(memory.bell)) memory.bell = "boxing";
      return memory;
    }
  } catch {
    // Storage may be unavailable.
  }
  memory = emptyStore();
  return memory;
}

function saveStore(store) {
  memory = store;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage may be unavailable.
  }
}

function exerciseById(id) {
  return catalog.find((exercise) => exercise.id === id) || null;
}

function localized(exercise, field) {
  const value = exercise?.[field];
  if (!value) return "";
  const lang = getLang();
  return value[lang] || value.en || "";
}

function clockLabel(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

function displayRemaining(remaining) {
  return Math.max(0, Math.floor(remaining));
}

function validPlan(plan) {
  if (!plan || (plan.format !== "chipper" && plan.format !== "cycles")) return false;
  if (!Array.isArray(plan.exerciseIds) || plan.exerciseIds.length < 2) return false;
  if (!plan.exerciseIds.every((id) => exerciseById(id))) return false;
  const stations = plan.format === "cycles" ? plan.exerciseIds.length * plan.rounds : plan.exerciseIds.length;
  return plan.seconds === sessionSeconds(plan.work, plan.rest, stations);
}

function randomSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

function plannedRows(plan) {
  const drills = plan.exerciseIds.map((id) => exerciseById(id)).filter(Boolean);
  if (plan.format !== "cycles") return drills.map((drill) => ({ drill, round: null }));
  const rows = [];
  for (let round = 1; round <= plan.rounds; round += 1) {
    drills.forEach((drill) => rows.push({ drill, round }));
  }
  return rows;
}

function ensureAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(ctx, { type = "sine", freq, freqEnd, start, duration, gain }) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playBell(kind) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime;
  if (kind === "bowl") {
    tone(ctx, { freq: 528, start, duration: 1.5, gain: 0.18 });
    tone(ctx, { freq: 792, start, duration: 1.3, gain: 0.07 });
    return;
  }
  if (kind === "buzzer") {
    tone(ctx, { type: "square", freq: 196, start, duration: 0.32, gain: 0.06 });
    tone(ctx, { type: "square", freq: 247, start: start + 0.06, duration: 0.26, gain: 0.04 });
    return;
  }
  if (kind === "beep") {
    tone(ctx, { freq: 880, start, duration: 0.16, gain: 0.16 });
    return;
  }
  tone(ctx, { freq: 740, freqEnd: 360, start, duration: 0.85, gain: 0.22 });
  tone(ctx, { freq: 1480, freqEnd: 720, start, duration: 0.45, gain: 0.07 });
}

function playTick() {
  const ctx = ensureAudio();
  if (!ctx) return;
  tone(ctx, { freq: 660, start: ctx.currentTime, duration: 0.07, gain: 0.07 });
}

function speak(text) {
  try {
    if (!window.speechSynthesis || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLang() === "he" ? "he-IL" : "en-US";
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech is optional. The name stays on screen.
  }
}

function haptic(ms) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Optional feedback.
  }
}

async function lockWake() {
  try {
    wakeLock = await navigator.wakeLock?.request("screen");
  } catch {
    wakeLock = null;
  }
}

function releaseWake() {
  const current = wakeLock;
  wakeLock = null;
  current?.release?.().catch(() => {});
}

function announce(snapshot, bell) {
  const segment = snapshot.segment;
  const key = snapshot.done
    ? "done"
    : `${segment.phase}:${segment.start}:${snapshot.switched ? "1" : "0"}`;
  if (key === announcedKey) return;
  const prior = announcedKey;
  announcedKey = key;
  if (snapshot.done) {
    if (!prior) return;
    playBell(bell);
    speak(t("kb_done"));
    haptic(30);
    return;
  }
  if (!prior) {
    if (segment.phase === "ready" && snapshot.into < 1.5) speak(t("kb_ready"));
    else if (segment.phase === "work") {
      playBell(bell);
      speak(localized(exerciseById(segment.exerciseId), "name"));
    } else if (segment.phase === "rest") playBell(bell);
    return;
  }
  if (snapshot.switched && prior.startsWith(`work:${segment.start}:`)) {
    playTick();
    speak(t("kb_switch"));
    return;
  }
  if (segment.phase === "work") {
    playBell(bell);
    speak(localized(exerciseById(segment.exerciseId), "name"));
    haptic(20);
    return;
  }
  if (segment.phase === "rest") {
    playBell(bell);
    haptic(12);
  }
}

function stopTicking() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function startTicking() {
  stopTicking();
  timerId = setInterval(tick, 200);
}

function finalize(store) {
  stopTicking();
  releaseWake();
  const plan = store.plan;
  if (plan) {
    store.history.unshift({
      id: `${plan.id}-${Date.now()}`,
      format: plan.format,
      seconds: plan.seconds,
      stations: plan.format === "cycles" ? plan.exerciseIds.length * plan.rounds : plan.exerciseIds.length,
      finishedAt: new Date().toISOString(),
    });
    store.history = store.history.slice(0, 20);
    store.completedId = plan.id;
  }
  store.active = null;
  saveStore(store);
  announcedKey = "";
  render();
}

function tick() {
  const store = loadStore();
  if (!store.active || !store.plan) return;
  const timeline = buildTimeline(store.plan, catalog);
  const snapshot = phaseAt(timeline, (Date.now() - store.active.startedAt) / 1000);
  announce(snapshot, store.bell);
  if (snapshot.done) {
    finalize(store);
    return;
  }
  const screen = document.getElementById("screen-kettlebell");
  const root = document.getElementById("kb-root");
  if (!root || !screen || screen.hidden) return;
  const clock = root.querySelector("[data-kb-clock]");
  const samePhase = clock
    && clock.dataset.phase === snapshot.segment.phase
    && Number(clock.dataset.start) === snapshot.segment.start
    && clock.dataset.switched === (snapshot.switched ? "1" : "0");
  if (!samePhase) {
    root.innerHTML = timerHtml(snapshot, store);
    return;
  }
  clock.textContent = clockText(snapshot);
  const bar = root.querySelector("[data-kb-bar]");
  if (bar) bar.style.width = `${Math.min(100, (snapshot.elapsed / snapshot.total) * 100)}%`;
}

function clockText(snapshot) {
  if (snapshot.segment.phase === "ready") return String(displayRemaining(snapshot.remaining));
  return clockLabel(displayRemaining(snapshot.remaining));
}

function progressLabel(segment, format) {
  if (format === "cycles") return t("kb_round_of").replace("{n}", segment.round).replace("{total}", segment.rounds);
  if (segment.phase === "ready") return t("kb_station_of").replace("{n}", "1").replace("{total}", segment.stations);
  return t("kb_station_of").replace("{n}", segment.station + 1).replace("{total}", segment.stations);
}

function timerHtml(snapshot, store) {
  const segment = snapshot.segment;
  const current = exerciseById(segment.phase === "rest" ? segment.nextExerciseId : segment.exerciseId);
  const upcoming = exerciseById(segment.nextExerciseId);
  const phaseName = segment.phase === "work" ? "work" : segment.phase;
  const title = segment.phase === "work"
    ? localized(current, "name")
    : segment.phase === "rest"
      ? t("kb_rest")
      : t("kb_ready");
  const detail = segment.phase === "work"
    ? localized(current, "cue")
    : `${t("kb_next")}: ${localized(segment.phase === "ready" ? current : upcoming, "name")}`;
  const switchLine = snapshot.switched ? `<p class="kb-switch">${escapeHtml(t("kb_switch"))}</p>` : "";
  const nextLine = segment.phase === "work" && segment.nextExerciseId
    ? `<p class="kb-next">${escapeHtml(t("kb_next"))}: ${escapeHtml(localized(exerciseById(segment.nextExerciseId), "name"))}</p>`
    : "";
  const width = Math.min(100, (snapshot.elapsed / snapshot.total) * 100);
  return `
    <div class="kb-timer is-${escapeHtml(phaseName)}" data-kb-phase="${escapeHtml(phaseName)}">
      <div>
        <p class="kb-phase">${escapeHtml(progressLabel(segment, store.plan.format))}</p>
        <p class="kb-clock" data-kb-clock data-phase="${escapeHtml(phaseName)}" data-start="${escapeHtml(String(segment.start))}" data-switched="${snapshot.switched ? "1" : "0"}">${escapeHtml(clockText(snapshot))}</p>
        <h2 class="kb-title">${escapeHtml(title)}</h2>
        <p class="kb-cue">${escapeHtml(detail)}</p>
        ${switchLine}
        ${nextLine}
      </div>
      <div>
        <div class="kb-progress" aria-hidden="true"><span data-kb-bar style="width:${width}%"></span></div>
        <button type="button" class="btn-secondary kb-stop" data-kb-action="stop">${escapeHtml(t("kb_stop"))}</button>
      </div>
    </div>`;
}

function planHtml(store) {
  const plan = store.plan;
  const rows = plannedRows(plan).map((row, index) => {
    const side = row.drill.unilateral ? `<span class="chip">${escapeHtml(t("kb_switch_note"))}</span>` : "";
    const round = row.round ? `<span class="chip">${escapeHtml(t("kb_round_of").replace("{n}", row.round).replace("{total}", plan.rounds))}</span>` : "";
    return `
      <article class="kb-row">
        <span class="kb-index">${index + 1}</span>
        <div>
          <strong>${escapeHtml(localized(row.drill, "name"))}</strong>
          <p>${escapeHtml(localized(row.drill, "cue"))}</p>
          <div class="meta-row">
            <span class="chip">${escapeHtml(t(`kb_pattern_${row.drill.pattern}`))}</span>
            ${round}
            ${side}
          </div>
        </div>
      </article>`;
  }).join("");
  const bells = BELLS.map((bell) => `
    <button type="button" class="chip-btn${store.bell === bell ? " is-active" : ""}" data-kb-bell="${bell}" aria-pressed="${store.bell === bell ? "true" : "false"}">${escapeHtml(t(`kb_${bell}`))}</button>
  `).join("");
  const history = store.history.length
    ? store.history.slice(0, 6).map((item) => {
      const when = Number.isFinite(Date.parse(item.finishedAt || "")) ? new Date(item.finishedAt).toLocaleString() : "";
      return `<div class="history-item"><div><strong>${escapeHtml(t(item.format === "cycles" ? "kb_cycles" : "kb_chipper"))}</strong><p>${escapeHtml(when)}</p></div><span class="badge">${escapeHtml(clockLabel(item.seconds))}</span></div>`;
    }).join("")
    : `<p class="move-meta">${escapeHtml(t("kb_no_history"))}</p>`;
  const countLabel = plan.format === "cycles"
    ? t("kb_rounds").replace("{n}", plan.rounds)
    : t("kb_drills").replace("{n}", plan.exerciseIds.length);
  return `
    <article class="kb-plan" data-kb-format="${escapeHtml(plan.format)}" data-kb-seconds="${plan.seconds}">
      <p class="eyebrow">${escapeHtml(t(plan.format === "cycles" ? "kb_cycles" : "kb_chipper"))}</p>
      <h2>${escapeHtml(t(plan.format === "cycles" ? "kb_cycles_copy" : "kb_chipper_copy"))}</h2>
      <p class="kb-callout">${escapeHtml(t("kb_one_bell"))}</p>
      <div class="kb-stats">
        <div class="kb-stat"><span>${escapeHtml(t("kb_work"))}</span><strong>${escapeHtml(clockLabel(plan.work))}</strong></div>
        <div class="kb-stat"><span>${escapeHtml(t("kb_rest"))}</span><strong>${escapeHtml(clockLabel(plan.rest))}</strong></div>
        <div class="kb-stat"><span>${escapeHtml(t("kb_total"))}</span><strong>${escapeHtml(clockLabel(plan.seconds))}</strong></div>
        <div class="kb-stat"><span>${escapeHtml(plan.format === "cycles" ? t("kb_cycles") : t("kb_chipper"))}</span><strong>${escapeHtml(countLabel)}</strong></div>
      </div>
      <div class="kb-list">${rows}</div>
      <div class="field">
        <span>${escapeHtml(t("kb_bell"))}</span>
        <div class="kb-bell-row">${bells}<button type="button" class="btn-secondary" data-kb-action="preview">${escapeHtml(t("kb_preview"))}</button></div>
      </div>
      <div class="kb-actions">
        <button type="button" class="primary-action" data-kb-action="start"><span>${escapeHtml(t("kb_start"))}</span><span aria-hidden="true">→</span></button>
        <button type="button" class="text-button" data-kb-action="new">${escapeHtml(t("kb_new"))}</button>
      </div>
    </article>
    <section class="ti-progress-section">
      <div class="section-heading"><div><p class="eyebrow">${escapeHtml(t("kettlebell"))}</p><h2>${escapeHtml(t("kb_history"))}</h2></div></div>
      <div class="history-list">${history}</div>
    </section>`;
}

function doneHtml(store) {
  const plan = store.plan;
  return `
    <article class="kb-done">
      <p class="eyebrow">${escapeHtml(t("kb_done"))}</p>
      <h2 class="kb-title">${escapeHtml(t("kb_done_copy"))}</h2>
      <p class="kb-cue">${escapeHtml(clockLabel(plan.seconds))} · ${escapeHtml(t(plan.format === "cycles" ? "kb_cycles" : "kb_chipper"))}</p>
      <div class="kb-actions">
        <button type="button" class="primary-action" data-kb-action="again"><span>${escapeHtml(t("kb_again"))}</span><span aria-hidden="true">→</span></button>
        <button type="button" class="text-button" data-kb-action="new">${escapeHtml(t("kb_new"))}</button>
      </div>
    </article>`;
}

function render() {
  const root = document.getElementById("kb-root");
  const heading = document.getElementById("kb-heading");
  if (!root || !catalog.length) return;
  const store = loadStore();
  if (store.active && store.plan) {
    if (heading) heading.hidden = true;
    const snapshot = phaseAt(buildTimeline(store.plan, catalog), (Date.now() - store.active.startedAt) / 1000);
    if (snapshot.done) {
      finalize(store);
      return;
    }
    root.innerHTML = timerHtml(snapshot, store);
    return;
  }
  if (heading) heading.hidden = false;
  if (!store.plan) return;
  root.innerHTML = store.completedId === store.plan.id ? doneHtml(store) : planHtml(store);
}

function startSession() {
  ensureAudio();
  const store = loadStore();
  if (!store.plan) return;
  store.active = { startedAt: Date.now() };
  store.completedId = null;
  saveStore(store);
  announcedKey = "";
  lockWake();
  startTicking();
  tick();
}

function stopSession() {
  stopTicking();
  releaseWake();
  announcedKey = "";
  const store = loadStore();
  store.active = null;
  store.completedId = null;
  saveStore(store);
  render();
}

function newSession() {
  stopTicking();
  releaseWake();
  announcedKey = "";
  const store = loadStore();
  store.plan = buildSession(catalog, randomSeed());
  store.active = null;
  store.completedId = null;
  saveStore(store);
  render();
}

function onClick(event) {
  const bell = event.target.closest("[data-kb-bell]");
  if (bell && BELLS.includes(bell.dataset.kbBell)) {
    ensureAudio();
    const store = loadStore();
    store.bell = bell.dataset.kbBell;
    saveStore(store);
    playBell(store.bell);
    render();
    return;
  }
  const action = event.target.closest("[data-kb-action]")?.dataset.kbAction;
  if (!action) return;
  if (action === "preview") {
    ensureAudio();
    playBell(loadStore().bell);
    return;
  }
  if (action === "start" || action === "again") startSession();
  if (action === "new") newSession();
  if (action === "stop") stopSession();
}

function onVisible() {
  if (document.visibilityState !== "visible") return;
  const store = loadStore();
  if (!store.active) return;
  lockWake();
  tick();
}

export async function initKettlebell() {
  const response = await fetch("./data/kb-exercises.json", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Failed to load kettlebell exercises");
  const data = await response.json();
  catalog = Array.isArray(data.exercises) ? data.exercises : [];
  const store = loadStore();
  if (!validPlan(store.plan)) {
    store.plan = buildSession(catalog, randomSeed());
    store.active = null;
    store.completedId = null;
    saveStore(store);
  }
  if (!bound) {
    bound = true;
    document.getElementById("kb-root")?.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisible);
  }
  render();
  if (store.active) startTicking();
}

export function refreshKettlebellLanguage() {
  if (catalog.length) render();
}
