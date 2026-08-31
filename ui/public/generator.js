/**
 * Browser workout generator (static GitHub Pages).
 */
const SKILL_RANK = { beginner: 1, intermediate: 2, advanced: 3 };
const SUPPORT_EQUIPMENT = new Set(["bench", "box", "pullup_bar", "sled"]);

export function createRng(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function matchesEquipment(exercise, userEquipment) {
  const owned = new Set(userEquipment);
  owned.add("bodyweight");

  const need = exercise.equipment || [];
  if (need.length === 0) return true;

  const supports = need.filter((e) => SUPPORT_EQUIPMENT.has(e));
  const others = need.filter((e) => !SUPPORT_EQUIPMENT.has(e));

  if (supports.length > 0) {
    if (!supports.every((s) => owned.has(s))) return false;
    if (others.length === 0) return true;
    return others.some((o) => owned.has(o));
  }

  return others.some((o) => owned.has(o));
}

function skillOk(exerciseSkill, userLevel) {
  return (SKILL_RANK[exerciseSkill] || 99) <= (SKILL_RANK[userLevel] || 1);
}

function constraintsOk(exercise, constraints) {
  const blocked = new Set(constraints || []);
  return !(exercise.contraindications || []).some((c) => blocked.has(c));
}

function softGateOk(exercise, constraints) {
  const blocked = new Set(constraints || []);
  if (!blocked.has("overhead_limited")) return true;
  if (
    exercise.primary_pattern === "push_vertical" &&
    (exercise.contraindications || []).includes("overhead_limited")
  ) {
    return false;
  }
  return true;
}

function intentScore(exercise, wantedIntents) {
  if (!wantedIntents || wantedIntents.length === 0) return 0;
  const set = new Set(exercise.intents || []);
  return wantedIntents.reduce((n, i) => n + (set.has(i) ? 1 : 0), 0);
}

function coreRoleScore(exercise, coreRoles) {
  if (!coreRoles || coreRoles.length === 0) return 0;
  if (!exercise.core_role) return 0;
  return coreRoles.includes(exercise.core_role) ? 2 : 0;
}

function levelTarget(userLevel) {
  if (userLevel === "beginner") return 2;
  if (userLevel === "intermediate") return 3;
  return 4;
}

function scoreCandidate(ex, slot, profile) {
  let score = 0;
  if (profile.prefer_functional !== false && ex.functional) score += 3;
  score += intentScore(ex, slot.intents) * 2;
  score += coreRoleScore(ex, slot.core_roles) * 3;

  const patterns = slot.patterns || [];
  if (patterns.includes(ex.primary_pattern)) score += 5;

  if (slot.prefer_family && ex.family_id === slot.prefer_family) score += 4;
  if (slot.prefer_patterns) {
    for (const p of slot.prefer_patterns) {
      if (ex.primary_pattern === p || (ex.patterns || []).includes(p)) score += 3;
    }
  }

  if (slot.prefer_unilateral_if_level && profile.level === slot.prefer_unilateral_if_level) {
    if (ex.stance === "unilateral" || ex.stance === "split" || ex.primary_pattern === "lunge") {
      score += 3;
    }
  }

  const target = levelTarget(profile.level);
  const level = typeof ex.level === "number" ? ex.level : 1;
  score += Math.max(0, 4 - Math.abs(level - target));

  const avoid = profile.avoid_ids;
  if (Array.isArray(avoid) && avoid.includes(ex.id)) score -= 5;

  return score;
}

function pickExercise(pool, slot, profile, usedIds, rng) {
  const patterns = new Set(slot.patterns || []);
  const requireIntents = slot.require_intents || [];
  const candidates = pool.filter((ex) => {
    if (usedIds.has(ex.id)) return false;
    if (!matchesEquipment(ex, profile.equipment)) return false;
    if (!skillOk(ex.skill, profile.level)) return false;
    if (!constraintsOk(ex, profile.constraints)) return false;
    if (!softGateOk(ex, profile.constraints)) return false;

    if (requireIntents.length > 0) {
      const intents = new Set(ex.intents || []);
      if (!requireIntents.every((i) => intents.has(i))) return false;
    }

    return (
      patterns.has(ex.primary_pattern) || (ex.patterns || []).some((p) => patterns.has(p))
    );
  });

  if (candidates.length === 0) return null;

  const scored = candidates.map((ex) => ({
    ex,
    score: scoreCandidate(ex, slot, profile),
  }));
  scored.sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name));

  const topScore = scored[0].score;
  const top = scored.filter((s) => s.score >= topScore - 1);
  return top[Math.floor(rng() * top.length)].ex;
}

function resolveFlags(profile) {
  const flags = {
    include_power: false,
    include_conditioning: false,
  };

  if (profile.goal === "athleticism") flags.include_power = true;
  if (profile.goal === "fat_loss") flags.include_conditioning = true;
  if (
    profile.session_minutes >= 60 &&
    ["athleticism", "fat_loss"].includes(profile.goal)
  ) {
    flags.include_conditioning = true;
  }

  if (typeof profile.include_power === "boolean") flags.include_power = profile.include_power;
  if (typeof profile.include_conditioning === "boolean") {
    flags.include_conditioning = profile.include_conditioning;
  }

  if (profile.session_minutes < 45) flags.include_power = profile.include_power === true;
  if (profile.session_minutes < 60) {
    flags.include_conditioning = profile.include_conditioning === true;
  }

  return flags;
}

export function defaultTemplateForProfile(profile) {
  if (profile.session_type) return profile.session_type;
  if (profile.goal === "athleticism") return "full_body_athlete";
  if (profile.goal === "general_health" || profile.goal === "pain_management_support") {
    return "full_body_min";
  }
  return "full_body_athlete";
}

function blockEnabled(block, flags, profile) {
  if (!block.optional) return true;
  if (block.min_minutes && profile.session_minutes < block.min_minutes) {
    const flag = block.requires_flag;
    if (flag && profile[flag] === true) return true;
    return false;
  }
  if (block.requires_flag) return Boolean(flags[block.requires_flag]);
  return true;
}

function prescriptionFor(ex, profile) {
  const base = { ...(ex.default_prescription || {}) };
  if (profile.goal === "strength" && typeof base.reps === "string" && base.reps.includes("-")) {
    if ((ex.intents || []).includes("strength")) {
      base.load = base.load || "RPE 7-8";
      base.notes = [base.notes, "Bias toward the lower rep end."].filter(Boolean).join(" ");
    }
  }
  if (profile.goal === "hypertrophy" || profile.goal === "muscle") {
    if ((ex.intents || []).includes("hypertrophy")) {
      base.notes = [base.notes, "Bias toward the higher rep end."].filter(Boolean).join(" ");
    }
  }
  return base;
}

function estimateMinutes(blocks, profile) {
  let minutes = 0;
  for (const block of blocks) {
    if (block.minutes) {
      minutes += block.minutes;
      continue;
    }
    for (const item of block.exercises) {
      const sets = item.prescription?.sets || 3;
      const rest = item.prescription?.rest_sec || 60;
      minutes += sets * 0.75 + (sets * rest) / 60;
    }
  }
  return Math.round(Math.min(Math.max(minutes, 20), profile.session_minutes + 15));
}

function coverageReport(selectedPatterns, coverage) {
  if (!coverage?.require_any) return { ok: true, missing: [] };
  const have = new Set(selectedPatterns);
  const missing = [];
  for (const group of coverage.require_any) {
    if (!group.some((p) => have.has(p))) missing.push(group);
  }
  return { ok: missing.length === 0, missing };
}

export function generateWorkout(profile, template, pool, rng) {
  const flags = resolveFlags(profile);
  const usedIds = new Set();
  const blocksOut = [];
  const warnings = [];
  const selectedPatterns = [];

  for (const block of template.blocks) {
    if (!blockEnabled(block, flags, profile)) continue;

    const exercises = [];
    for (const slot of block.slots) {
      const count = slot.count || 1;
      for (let i = 0; i < count; i++) {
        const ex = pickExercise(pool, slot, profile, usedIds, rng);
        if (!ex) {
          warnings.push(`No match for slot "${slot.id}" in block "${block.label || block.type}"`);
          continue;
        }
        usedIds.add(ex.id);
        selectedPatterns.push(ex.primary_pattern);
        exercises.push({
          slot_id: slot.id,
          exercise_id: ex.id,
          name: ex.name,
          primary_pattern: ex.primary_pattern,
          family_id: ex.family_id,
          stance: ex.stance,
          cue_short: ex.cue_short,
          prescription: prescriptionFor(ex, profile),
        });
      }
    }

    if (exercises.length === 0) continue;
    blocksOut.push({
      type: block.type,
      label: block.label || block.type,
      exercises,
    });
  }

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    profile: {
      name: profile.name || null,
      goal: profile.goal,
      level: profile.level,
      session_minutes: profile.session_minutes,
      equipment: profile.equipment,
      constraints: profile.constraints || [],
    },
    template: {
      id: template.id,
      name: template.name,
    },
    flags,
    estimated_minutes: estimateMinutes(blocksOut, profile),
    pattern_coverage: coverageReport(selectedPatterns, template.coverage),
    warnings,
    blocks: blocksOut,
  };
}

export function validateProfile(profile) {
  const required = ["goal", "level", "session_minutes", "equipment"];
  for (const key of required) {
    if (profile[key] === undefined || profile[key] === null) {
      throw new Error(`Profile missing required field: ${key}`);
    }
  }
  if (!Array.isArray(profile.equipment)) throw new Error("profile.equipment must be an array");
  if (!profile.constraints) profile.constraints = [];
  if (!SKILL_RANK[profile.level]) throw new Error(`Invalid level: ${profile.level}`);
}

export function buildWorkoutFromProfile(profile, templateId, pool, templates) {
  validateProfile(profile);
  const resolvedTemplateId = templateId || defaultTemplateForProfile(profile);
  const template = (templates || []).find((t) => t.id === resolvedTemplateId);
  if (!template) throw new Error("Unknown template: " + resolvedTemplateId);
  const seed =
    typeof profile.seed === "number"
      ? profile.seed
      : hashString(resolvedTemplateId + ":" + profile.goal + ":" + profile.level + ":" + Date.now());
  const rng = createRng(seed);
  let workout = generateWorkout(profile, template, pool, rng);
  workout.seed = seed;
  workout = augmentWarmupCooldown(workout, pool, profile, rng);
  return workout;
}

export function getLibraryMeta(exercises, templates, profiles) {
  const byPattern = {};
  for (const ex of exercises) {
    byPattern[ex.primary_pattern] = (byPattern[ex.primary_pattern] || 0) + 1;
  }
  return {
    count: exercises.length,
    by_pattern: byPattern,
    templates: (templates || []).map((t) => t.id),
    profiles: (profiles || []).map((p) => ({
      id: p.id,
      name: p.name,
      goal: p.goal,
      level: p.level,
    })),
  };
}

/**
 * Same-pattern / same-family alternatives that fit equipment, skill, and constraints.
 */
export function findSwapCandidates(current, pool, profile, usedIds = new Set()) {
  if (!current) return [];
  const equipment = profile?.equipment || ["bodyweight"];
  const level = profile?.level || "intermediate";
  const constraints = profile?.constraints || [];

  const scored = [];
  for (const ex of pool) {
    if (ex.id === current.id) continue;
    if (usedIds.has(ex.id)) continue;
    if (!matchesEquipment(ex, equipment)) continue;
    if (!skillOk(ex.skill, level)) continue;
    if (!constraintsOk(ex, constraints)) continue;
    if (!softGateOk(ex, constraints)) continue;

    let score = 0;
    if (ex.primary_pattern === current.primary_pattern) score += 8;
    else if ((ex.patterns || []).includes(current.primary_pattern)) score += 4;
    else continue;

    if (current.family_id && ex.family_id === current.family_id) score += 6;
    if (ex.stance === current.stance) score += 1;
    if (ex.functional === current.functional) score += 1;

    const curLevel = typeof current.level === "number" ? current.level : 1;
    const nextLevel = typeof ex.level === "number" ? ex.level : 1;
    score += Math.max(0, 3 - Math.abs(nextLevel - curLevel));

    scored.push({ ex, score });
  }

  scored.sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name));
  return scored.slice(0, 8).map((s) => s.ex);
}

/**
 * Suggest next load from last completed session feel + load for an exercise.
 * @returns {{ kind: string, text: string, load?: object } | null}
 */
export function suggestProgression(lastFeel, lastLoad, exercise) {
  if (!lastFeel || !lastLoad) return null;

  const isBw = lastLoad.type === "bodyweight";
  const kg = typeof lastLoad.kg === "number" ? lastLoad.kg : Number(lastLoad.kg);
  const hasKg = !isBw && Number.isFinite(kg) && kg > 0;

  if (lastFeel === "good") {
    if (hasKg) {
      const next = Math.round((kg + 2.5) * 2) / 2;
      return {
        kind: "progress",
        text: `Last was Good → try ${next} kg (+2.5)`,
        load: { type: "kg", kg: next },
      };
    }
    if (isBw) {
      return {
        kind: "progress",
        text: "Last was Good → add a rep or swap to a harder variation",
        load: { type: "bodyweight" },
        preferHarder: true,
      };
    }
  }

  if (lastFeel === "mid") {
    if (hasKg) {
      return {
        kind: "hold",
        text: `Last was Mid → repeat ${kg} kg`,
        load: { type: "kg", kg },
      };
    }
    if (isBw) {
      return {
        kind: "hold",
        text: "Last was Mid → repeat bodyweight",
        load: { type: "bodyweight" },
      };
    }
  }

  if (lastFeel === "bad") {
    if (hasKg) {
      const next = Math.max(0, Math.round(kg * 0.9 * 2) / 2);
      return {
        kind: "deload",
        text: `Last was Bad → deload to ${next} kg (−10%) or swap`,
        load: { type: "kg", kg: next },
        preferSwap: true,
      };
    }
    return {
      kind: "deload",
      text: "Last was Bad → easier variation or fewer reps",
      load: isBw ? { type: "bodyweight" } : lastLoad,
      preferSwap: true,
    };
  }

  return null;
}


const CONSTRAINT_WARMUP_PREFER = {
  overhead_limited: ["face_pull", "open_book", "band_face_pull_to_external_rotation", "worlds_greatest_stretch"],
  shoulder_irritable: ["face_pull", "open_book", "band_face_pull_to_external_rotation", "cat_cow"],
  knee_sensitive: ["hip_90_90_switches", "glute_bridge", "cat_cow", "worlds_greatest_stretch"],
  axial_spine_sensitive: ["bird_dog", "dead_bug", "curl_up_mcgill", "cat_cow"],
  wrist_sensitive: ["open_book", "cat_cow", "hip_90_90_switches", "dead_bug"],
};

const DEFAULT_WARMUP = ["worlds_greatest_stretch", "cat_cow", "hip_90_90_switches", "open_book", "march_in_place"];
const DEFAULT_COOLDOWN = ["cat_cow", "open_book", "dead_bug", "bird_dog", "curl_up_mcgill"];

function workoutItemFromExercise(ex, slotId, kind) {
  const base = { ...(ex.default_prescription || {}) };
  if (kind === "warmup") {
    base.sets = 1;
    base.reps = base.reps || "6-10";
    base.rest_sec = 20;
    base.load = base.load || "bodyweight";
    base.notes = [base.notes, "Warm-up quality — easy range."].filter(Boolean).join(" ");
  } else {
    base.sets = 1;
    base.reps = base.reps || "5-8 easy";
    base.rest_sec = 15;
    base.load = "bodyweight";
    base.notes = [base.notes, "Cooldown — breathe and ease down."].filter(Boolean).join(" ");
  }
  return {
    slot_id: slotId,
    exercise_id: ex.id,
    name: ex.name,
    primary_pattern: ex.primary_pattern,
    family_id: ex.family_id,
    stance: ex.stance,
    cue_short: ex.cue_short,
    prescription: base,
  };
}

function pickByPreference(preferIds, pool, profile, used, count, rng) {
  const byId = new Map(pool.map((e) => [e.id, e]));
  const picked = [];
  for (const id of preferIds) {
    if (picked.length >= count) break;
    const ex = byId.get(id);
    if (!ex || used.has(ex.id)) continue;
    if (!matchesEquipment(ex, profile.equipment || [])) continue;
    if (!skillOk(ex.skill, profile.level || "beginner")) continue;
    if (!constraintsOk(ex, profile.constraints || [])) continue;
    picked.push(ex);
    used.add(ex.id);
  }
  if (picked.length < count) {
    const fillers = pool.filter(
      (ex) =>
        !used.has(ex.id) &&
        (ex.primary_pattern === "corrective" || (ex.intents || []).includes("mobility")) &&
        matchesEquipment(ex, profile.equipment || []) &&
        skillOk(ex.skill, profile.level || "beginner") &&
        constraintsOk(ex, profile.constraints || [])
    );
    while (picked.length < count && fillers.length) {
      const i = Math.floor(rng() * fillers.length);
      const ex = fillers.splice(i, 1)[0];
      picked.push(ex);
      used.add(ex.id);
    }
  }
  return picked;
}

/**
 * Prepend constraint-aware warm-up and append a short cooldown.
 */
export function augmentWarmupCooldown(workout, pool, profile, rng = Math.random) {
  const used = new Set();
  for (const block of workout.blocks || []) {
    for (const ex of block.exercises || []) used.add(ex.exercise_id);
  }

  const preferWarm = [];
  for (const c of profile.constraints || []) {
    for (const id of CONSTRAINT_WARMUP_PREFER[c] || []) {
      if (!preferWarm.includes(id)) preferWarm.push(id);
    }
  }
  for (const id of DEFAULT_WARMUP) {
    if (!preferWarm.includes(id)) preferWarm.push(id);
  }

  const warmCount = (profile.constraints || []).length > 0 ? 3 : 2;
  const warmExercises = pickByPreference(preferWarm, pool, profile, used, warmCount, rng).map(
    (ex, i) => workoutItemFromExercise(ex, `auto_warm_${i}`, "warmup")
  );

  const coolExercises = pickByPreference(DEFAULT_COOLDOWN, pool, profile, used, 2, rng).map(
    (ex, i) => workoutItemFromExercise(ex, `auto_cool_${i}`, "cooldown")
  );

  const blocks = [...(workout.blocks || [])];
  if (warmExercises.length) {
    const first = blocks[0];
    if (first && (first.type === "prep" || /prep|warm/i.test(first.label || ""))) {
      first.exercises = [...warmExercises, ...(first.exercises || [])];
      first.label = first.label || "Prep";
    } else {
      blocks.unshift({
        type: "warmup",
        label: "Warm-up",
        exercises: warmExercises,
      });
    }
  }
  if (coolExercises.length) {
    blocks.push({
      type: "cooldown",
      label: "Cooldown",
      exercises: coolExercises,
    });
  }

  return { ...workout, blocks };
}
