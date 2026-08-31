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
  const workout = generateWorkout(profile, template, pool, createRng(seed));
  workout.seed = seed;
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
