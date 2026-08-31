#!/usr/bin/env node
/**
 * Workout generator CLI
 *   node generator/generate.mjs --profile generator/profiles/beginner_home.json
 */
import fs from "node:fs";
import path from "node:path";
import {
  readJson,
  loadExercises,
  loadTemplate,
  defaultTemplateForProfile,
  validateProfile,
  generateWorkout,
  createRng,
  hashString,
  sanitizeForLog,
  getErrorMessage,
} from "./lib.mjs";

function parseArgs(argv) {
  const args = { profile: null, template: null, out: null, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--profile") args.profile = argv[++i];
    else if (a === "--template") args.template = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function main() {
  try {
    const args = parseArgs(process.argv);
    if (args.help || !args.profile) {
      console.log(`Usage:
  node generator/generate.mjs --profile <profile.json> [--template <id>] [--out <file.json>]

Templates: full_body_min | full_body_athlete | upper | lower`);
      process.exit(args.help ? 0 : 1);
    }

    const profilePath = path.resolve(args.profile);
    const profile = readJson(profilePath);
    validateProfile(profile);

    const templateId = args.template || defaultTemplateForProfile(profile);
    const template = loadTemplate(templateId);
    const pool = loadExercises();

    const seed =
      typeof profile.seed === "number"
        ? profile.seed
        : hashString(`${profilePath}:${templateId}:${profile.goal}:${profile.level}`);
    const workout = generateWorkout(profile, template, pool, createRng(seed));
    workout.seed = seed;

    const json = JSON.stringify(workout, null, 2);
    if (args.out) {
      const outPath = path.resolve(args.out);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, json + "\n", "utf8");
      console.error("Wrote %s", sanitizeForLog(outPath));
    }
    console.log(json);
  } catch (err) {
    const message = getErrorMessage(err);
    console.error("Error: %s", sanitizeForLog(message));
    process.exit(1);
  }
}

main();
