#!/usr/bin/env node
/**
 * Generate instructional SVG illustrations for every exercise.
 *   node library/generate-illustrations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "illustrations");
const EX_DIR = path.join(__dirname, "exercises");

const INK = "#171512";
const ACCENT = "#d64b14";
const MUTED = "#8a8478";
const BG = "#f7f4ee";

function loadExercises() {
  return fs
    .readdirSync(EX_DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(EX_DIR, f), "utf8")));
}

/** Simple stick figure with optional props */
function figure({
  cx = 200,
  cy = 210,
  scale = 1,
  // angles in degrees, 0 = rightward for arms; legs from vertical
  torsoLean = 0,
  head = true,
  // arms: shoulder angles from torso (deg), elbow bend
  leftArm = { shoulder: 200, elbow: 25, hand: null },
  rightArm = { shoulder: -20, elbow: 25, hand: null },
  leftLeg = { hip: 12, knee: 10 },
  rightLeg = { hip: -12, knee: 10 },
  fill = "none",
} = {}) {
  const s = scale;
  const rad = (d) => (d * Math.PI) / 180;
  const hipY = cy;
  const shoulderY = cy - 55 * s;
  const headR = 14 * s;
  const torsoLen = 55 * s;
  const upperArm = 32 * s;
  const lowerArm = 28 * s;
  const thigh = 40 * s;
  const shin = 38 * s;

  const lean = rad(torsoLean);
  const sx = cx + Math.sin(lean) * torsoLen * 0.15;
  const sy = shoulderY;
  const hx = cx;
  const hy = hipY;

  function limb(x0, y0, angDeg, len) {
    const a = rad(angDeg);
    return { x: x0 + Math.sin(a) * len, y: y0 + Math.cos(a) * len };
  }

  // Legs: hip angle from downward vertical (positive = out to right of figure's left? )
  // Use: 0 = straight down, positive rotates clockwise on screen for right leg outward
  const lKnee = limb(hx - 4 * s, hy, leftLeg.hip, thigh);
  const lFoot = limb(lKnee.x, lKnee.y, leftLeg.hip + leftLeg.knee, shin);
  const rKnee = limb(hx + 4 * s, hy, rightLeg.hip, thigh);
  const rFoot = limb(rKnee.x, rKnee.y, rightLeg.hip + rightLeg.knee, shin);

  const lElbow = limb(sx - 3 * s, sy, leftArm.shoulder, upperArm);
  const lHand = limb(lElbow.x, lElbow.y, leftArm.shoulder + leftArm.elbow, lowerArm);
  const rElbow = limb(sx + 3 * s, sy, rightArm.shoulder, upperArm);
  const rHand = limb(rElbow.x, rElbow.y, rightArm.shoulder + rightArm.elbow, lowerArm);

  const headCx = sx + Math.sin(lean) * 8 * s;
  const headCy = sy - headR - 4 * s;

  const parts = [];
  if (head) {
    parts.push(`<circle cx="${headCx.toFixed(1)}" cy="${headCy.toFixed(1)}" r="${headR}" fill="${fill}" stroke="${INK}" stroke-width="3"/>`);
  }
  parts.push(`<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`);
  // legs
  parts.push(`<line x1="${hx.toFixed(1)}" y1="${hy.toFixed(1)}" x2="${lKnee.x.toFixed(1)}" y2="${lKnee.y.toFixed(1)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);
  parts.push(`<line x1="${lKnee.x.toFixed(1)}" y1="${lKnee.y.toFixed(1)}" x2="${lFoot.x.toFixed(1)}" y2="${lFoot.y.toFixed(1)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);
  parts.push(`<line x1="${hx.toFixed(1)}" y1="${hy.toFixed(1)}" x2="${rKnee.x.toFixed(1)}" y2="${rKnee.y.toFixed(1)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);
  parts.push(`<line x1="${rKnee.x.toFixed(1)}" y1="${rKnee.y.toFixed(1)}" x2="${rFoot.x.toFixed(1)}" y2="${rFoot.y.toFixed(1)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);
  // arms
  parts.push(`<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${lElbow.x.toFixed(1)}" y2="${lElbow.y.toFixed(1)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);
  parts.push(`<line x1="${lElbow.x.toFixed(1)}" y1="${lElbow.y.toFixed(1)}" x2="${lHand.x.toFixed(1)}" y2="${lHand.y.toFixed(1)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);
  parts.push(`<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${rElbow.x.toFixed(1)}" y2="${rElbow.y.toFixed(1)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);
  parts.push(`<line x1="${rElbow.x.toFixed(1)}" y1="${rElbow.y.toFixed(1)}" x2="${rHand.x.toFixed(1)}" y2="${rHand.y.toFixed(1)}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);

  return {
    svg: parts.join("\n"),
    points: { head: { x: headCx, y: headCy }, shoulder: { x: sx, y: sy }, hip: { x: hx, y: hy }, lHand, rHand, lFoot, rFoot, lKnee, rKnee },
  };
}

function barbell(x, y, w = 90) {
  return `
    <line x1="${x - w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y}" stroke="${ACCENT}" stroke-width="4" stroke-linecap="round"/>
    <rect x="${x - w / 2 - 8}" y="${y - 10}" width="10" height="20" rx="2" fill="${ACCENT}"/>
    <rect x="${x + w / 2 - 2}" y="${y - 10}" width="10" height="20" rx="2" fill="${ACCENT}"/>
  `;
}

function dumbbell(x, y, size = 10) {
  return `
    <rect x="${x - size * 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="2" fill="${ACCENT}"/>
    <line x1="${x - size}" y1="${y}" x2="${x + size}" y2="${y}" stroke="${ACCENT}" stroke-width="3"/>
    <rect x="${x + size}" y="${y - size / 2}" width="${size}" height="${size}" rx="2" fill="${ACCENT}"/>
  `;
}

function kettlebell(x, y) {
  return `
    <path d="M ${x - 8} ${y - 8} Q ${x} ${y - 18} ${x + 8} ${y - 8}" fill="none" stroke="${ACCENT}" stroke-width="3"/>
    <circle cx="${x}" cy="${y + 4}" r="12" fill="${ACCENT}"/>
  `;
}

function band(x1, y1, x2, y2) {
  return `<path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 20} ${x2} ${y2}" fill="none" stroke="${ACCENT}" stroke-width="3" stroke-dasharray="6 4"/>`;
}

function bench(x, y, w = 110) {
  return `
    <rect x="${x - w / 2}" y="${y}" width="${w}" height="14" rx="3" fill="${MUTED}" opacity="0.35"/>
    <line x1="${x - w / 2 + 10}" y1="${y + 14}" x2="${x - w / 2 + 10}" y2="${y + 36}" stroke="${MUTED}" stroke-width="3"/>
    <line x1="${x + w / 2 - 10}" y1="${y + 14}" x2="${x + w / 2 - 10}" y2="${y + 36}" stroke="${MUTED}" stroke-width="3"/>
  `;
}

function boxProp(x, y, w = 50, h = 40) {
  return `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="4" fill="none" stroke="${MUTED}" stroke-width="3"/>`;
}

function floorLine(y = 320) {
  return `<line x1="40" y1="${y}" x2="360" y2="${y}" stroke="${MUTED}" stroke-width="2" opacity="0.5"/>`;
}

function arrow(x1, y1, x2, y2) {
  return `
    <defs>
      <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="${ACCENT}"/>
      </marker>
    </defs>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ACCENT}" stroke-width="2.5" marker-end="url(#arr)" opacity="0.85"/>
  `;
}

function wrap(title, body, pattern) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360" role="img" aria-label="${escapeXml(title)}">
  <rect width="400" height="360" fill="${BG}"/>
  <text x="24" y="36" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif" font-size="13" font-weight="600" fill="${MUTED}" letter-spacing="0.06em">${escapeXml(pattern.replaceAll("_", " ").toUpperCase())}</text>
  <text x="24" y="58" font-family="Syne, Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="${INK}">${escapeXml(title)}</text>
  ${floorLine()}
  ${body}
</svg>
`;
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

/** Pose presets by exercise id — fallback by primary_pattern */
const POSES = {
  // pushes
  wall_push_up: () => {
    const f = figure({
      cx: 210,
      torsoLean: 70,
      leftArm: { shoulder: 90, elbow: 40 },
      rightArm: { shoulder: 90, elbow: 40 },
      leftLeg: { hip: 80, knee: 0 },
      rightLeg: { hip: 100, knee: 0 },
    });
    return f.svg + `<line x1="310" y1="80" x2="310" y2="300" stroke="${MUTED}" stroke-width="6"/>` + arrow(250, 150, 280, 150);
  },
  incline_push_up: () => {
    const f = figure({
      cx: 180,
      torsoLean: 35,
      leftArm: { shoulder: 100, elbow: 50 },
      rightArm: { shoulder: 100, elbow: 50 },
      leftLeg: { hip: 25, knee: 5 },
      rightLeg: { hip: -5, knee: 5 },
    });
    return boxProp(250, 250, 70, 50) + f.svg;
  },
  push_up: () => {
    const f = figure({
      cx: 200,
      cy: 200,
      torsoLean: 90,
      leftArm: { shoulder: 100, elbow: 55 },
      rightArm: { shoulder: 100, elbow: 55 },
      leftLeg: { hip: 90, knee: 0 },
      rightLeg: { hip: 90, knee: 0 },
    });
    return f.svg + arrow(200, 130, 200, 160);
  },
  decline_push_up: () => {
    const f = figure({
      cx: 200,
      torsoLean: 100,
      leftArm: { shoulder: 100, elbow: 50 },
      rightArm: { shoulder: 100, elbow: 50 },
      leftLeg: { hip: 90, knee: 0 },
      rightLeg: { hip: 90, knee: 0 },
    });
    return boxProp(290, 260, 55, 45) + f.svg;
  },
  feet_elevated_push_up: () => POSES.decline_push_up(),
  db_floor_press: () => {
    const f = figure({
      cx: 200,
      cy: 250,
      torsoLean: 0,
      leftArm: { shoulder: -90, elbow: -40 },
      rightArm: { shoulder: 90, elbow: 40 },
      leftLeg: { hip: 40, knee: 50 },
      rightLeg: { hip: -40, knee: 50 },
    });
    return f.svg + dumbbell(f.points.lHand.x, f.points.lHand.y) + dumbbell(f.points.rHand.x, f.points.rHand.y);
  },
  db_bench_press: () => {
    const f = figure({
      cx: 200,
      cy: 210,
      leftArm: { shoulder: -80, elbow: -35 },
      rightArm: { shoulder: 80, elbow: 35 },
      leftLeg: { hip: 35, knee: 40 },
      rightLeg: { hip: -35, knee: 40 },
    });
    return bench(200, 220) + f.svg + dumbbell(f.points.lHand.x, f.points.lHand.y) + dumbbell(f.points.rHand.x, f.points.rHand.y);
  },
  barbell_bench_press: () => {
    const f = figure({
      cx: 200,
      cy: 210,
      leftArm: { shoulder: -70, elbow: -20 },
      rightArm: { shoulder: 70, elbow: 20 },
      leftLeg: { hip: 30, knee: 35 },
      rightLeg: { hip: -30, knee: 35 },
    });
    return bench(200, 220) + f.svg + barbell(200, f.points.lHand.y);
  },
  close_grip_bench_press: () => POSES.barbell_bench_press(),
  band_chest_press: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 100, elbow: 10 },
      rightArm: { shoulder: -100, elbow: -10 },
    });
    return f.svg + band(120, 160, f.points.lHand.x, f.points.lHand.y) + band(280, 160, f.points.rHand.x, f.points.rHand.y);
  },
  machine_chest_press: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 110, elbow: 15 },
      rightArm: { shoulder: -110, elbow: -15 },
      leftLeg: { hip: 20, knee: 50 },
      rightLeg: { hip: -20, knee: 50 },
    });
    return `<rect x="120" y="120" width="160" height="160" rx="8" fill="none" stroke="${MUTED}" stroke-width="3"/>` + f.svg;
  },
  pike_push_up: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      torsoLean: 45,
      leftArm: { shoulder: 150, elbow: 20 },
      rightArm: { shoulder: 150, elbow: 20 },
      leftLeg: { hip: -40, knee: 0 },
      rightLeg: { hip: -20, knee: 0 },
    });
    return f.svg;
  },
  landmine_press: () => {
    const f = figure({
      cx: 180,
      leftArm: { shoulder: -40, elbow: -10 },
      rightArm: { shoulder: -50, elbow: -15 },
      leftLeg: { hip: 35, knee: 25 },
      rightLeg: { hip: -25, knee: 15 },
    });
    return f.svg + `<line x1="${f.points.rHand.x}" y1="${f.points.rHand.y}" x2="300" y2="300" stroke="${ACCENT}" stroke-width="4"/>` + arrow(230, 140, 250, 110);
  },
  db_shoulder_press: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: -10, elbow: -150 },
      rightArm: { shoulder: 10, elbow: 150 },
    });
    return f.svg + dumbbell(f.points.lHand.x, f.points.lHand.y) + dumbbell(f.points.rHand.x, f.points.rHand.y);
  },
  seated_db_shoulder_press: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      leftArm: { shoulder: -10, elbow: -150 },
      rightArm: { shoulder: 10, elbow: 150 },
      leftLeg: { hip: 25, knee: 70 },
      rightLeg: { hip: -25, knee: 70 },
    });
    return bench(200, 250, 90) + f.svg + dumbbell(f.points.lHand.x, f.points.lHand.y) + dumbbell(f.points.rHand.x, f.points.rHand.y);
  },
  barbell_overhead_press: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: -5, elbow: -160 },
      rightArm: { shoulder: 5, elbow: 160 },
    });
    return f.svg + barbell(200, f.points.lHand.y, 100);
  },
  band_overhead_press: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: -5, elbow: -160 },
      rightArm: { shoulder: 5, elbow: 160 },
    });
    return f.svg + band(170, 320, f.points.lHand.x, f.points.lHand.y) + band(230, 320, f.points.rHand.x, f.points.rHand.y);
  },
  machine_shoulder_press: () => POSES.machine_chest_press(),

  // pulls
  inverted_row: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      torsoLean: -90,
      leftArm: { shoulder: -100, elbow: -40 },
      rightArm: { shoulder: 100, elbow: 40 },
      leftLeg: { hip: -90, knee: 0 },
      rightLeg: { hip: -90, knee: 0 },
    });
    return `<line x1="80" y1="120" x2="320" y2="120" stroke="${ACCENT}" stroke-width="5"/>` + f.svg;
  },
  band_row: () => {
    const f = figure({
      cx: 220,
      torsoLean: 15,
      leftArm: { shoulder: 140, elbow: 40 },
      rightArm: { shoulder: 140, elbow: 40 },
    });
    return f.svg + band(80, 170, f.points.lHand.x, f.points.lHand.y);
  },
  db_row: () => {
    const f = figure({
      cx: 210,
      torsoLean: 70,
      leftArm: { shoulder: 160, elbow: 10 },
      rightArm: { shoulder: 20, elbow: 70 },
      leftLeg: { hip: 50, knee: 40 },
      rightLeg: { hip: 10, knee: 20 },
    });
    return bench(140, 240, 80) + f.svg + dumbbell(f.points.rHand.x, f.points.rHand.y);
  },
  cable_row: () => {
    const f = figure({
      cx: 220,
      cy: 240,
      leftArm: { shoulder: 140, elbow: 35 },
      rightArm: { shoulder: 140, elbow: 35 },
      leftLeg: { hip: 20, knee: 60 },
      rightLeg: { hip: -20, knee: 60 },
    });
    return f.svg + band(70, 180, f.points.lHand.x, f.points.lHand.y);
  },
  barbell_row: () => {
    const f = figure({
      cx: 200,
      torsoLean: 55,
      leftArm: { shoulder: 150, elbow: 30 },
      rightArm: { shoulder: 150, elbow: 30 },
      leftLeg: { hip: 25, knee: 25 },
      rightLeg: { hip: -10, knee: 25 },
    });
    return f.svg + barbell(200, f.points.lHand.y + 5, 100);
  },
  chest_supported_row: () => {
    const f = figure({
      cx: 200,
      torsoLean: 40,
      leftArm: { shoulder: 160, elbow: 25 },
      rightArm: { shoulder: 160, elbow: 25 },
    });
    return bench(200, 200, 100) + f.svg + dumbbell(f.points.lHand.x, f.points.lHand.y) + dumbbell(f.points.rHand.x, f.points.rHand.y);
  },
  machine_row: () => POSES.cable_row(),
  band_lat_pulldown: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: -40, elbow: -50 },
      rightArm: { shoulder: 40, elbow: 50 },
    });
    return f.svg + band(140, 70, f.points.lHand.x, f.points.lHand.y) + band(260, 70, f.points.rHand.x, f.points.rHand.y);
  },
  lat_pulldown: () => POSES.band_lat_pulldown(),
  assisted_pull_up: () => POSES.pull_up(),
  pull_up: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      leftArm: { shoulder: -20, elbow: -150 },
      rightArm: { shoulder: 20, elbow: 150 },
      leftLeg: { hip: 15, knee: 40 },
      rightLeg: { hip: -15, knee: 40 },
    });
    return `<line x1="100" y1="90" x2="300" y2="90" stroke="${ACCENT}" stroke-width="5"/>` + f.svg + arrow(200, 140, 200, 110);
  },
  weighted_pull_up: () => POSES.pull_up() + dumbbell(200, 280),
  chin_up: () => POSES.pull_up(),

  // hinge
  glute_bridge: () => {
    const f = figure({
      cx: 200,
      cy: 250,
      torsoLean: -70,
      leftArm: { shoulder: 180, elbow: 0 },
      rightArm: { shoulder: 180, elbow: 0 },
      leftLeg: { hip: -40, knee: 70 },
      rightLeg: { hip: 40, knee: 70 },
    });
    return f.svg + arrow(200, 200, 200, 170);
  },
  hip_hinge_drill: () => {
    const f = figure({
      cx: 200,
      torsoLean: 45,
      leftArm: { shoulder: -160, elbow: 0 },
      rightArm: { shoulder: 160, elbow: 0 },
      leftLeg: { hip: 15, knee: 15 },
      rightLeg: { hip: -15, knee: 15 },
    });
    return f.svg + `<line x1="195" y1="120" x2="230" y2="260" stroke="${ACCENT}" stroke-width="3" stroke-dasharray="4 3"/>`;
  },
  db_rdl: () => {
    const f = figure({
      cx: 200,
      torsoLean: 50,
      leftArm: { shoulder: 170, elbow: 10 },
      rightArm: { shoulder: 170, elbow: 10 },
      leftLeg: { hip: 12, knee: 12 },
      rightLeg: { hip: -12, knee: 12 },
    });
    return f.svg + dumbbell(f.points.lHand.x, f.points.lHand.y) + dumbbell(f.points.rHand.x, f.points.rHand.y);
  },
  trap_bar_deadlift: () => {
    const f = figure({
      cx: 200,
      torsoLean: 25,
      leftArm: { shoulder: 160, elbow: 20 },
      rightArm: { shoulder: 160, elbow: 20 },
      leftLeg: { hip: 25, knee: 35 },
      rightLeg: { hip: -25, knee: 35 },
    });
    return f.svg + `<rect x="150" y="${f.points.lHand.y}" width="100" height="8" rx="2" fill="${ACCENT}"/>`;
  },
  barbell_rdl: () => {
    const f = figure({
      cx: 200,
      torsoLean: 50,
      leftArm: { shoulder: 165, elbow: 15 },
      rightArm: { shoulder: 165, elbow: 15 },
      leftLeg: { hip: 12, knee: 12 },
      rightLeg: { hip: -12, knee: 12 },
    });
    return f.svg + barbell(200, f.points.lHand.y);
  },
  conventional_deadlift: () => {
    const f = figure({
      cx: 200,
      torsoLean: 35,
      leftArm: { shoulder: 160, elbow: 20 },
      rightArm: { shoulder: 160, elbow: 20 },
      leftLeg: { hip: 30, knee: 40 },
      rightLeg: { hip: -30, knee: 40 },
    });
    return f.svg + barbell(200, f.points.lHand.y + 8) + arrow(200, 160, 200, 130);
  },
  kb_deadlift: () => {
    const f = figure({
      cx: 200,
      torsoLean: 35,
      leftArm: { shoulder: 150, elbow: 25 },
      rightArm: { shoulder: 150, elbow: 25 },
      leftLeg: { hip: 25, knee: 35 },
      rightLeg: { hip: -25, knee: 35 },
    });
    return f.svg + kettlebell(200, f.points.lHand.y + 15);
  },
  kb_swing: () => {
    const f = figure({
      cx: 200,
      torsoLean: 20,
      leftArm: { shoulder: -40, elbow: -20 },
      rightArm: { shoulder: 40, elbow: 20 },
      leftLeg: { hip: 15, knee: 20 },
      rightLeg: { hip: -15, knee: 20 },
    });
    return f.svg + kettlebell((f.points.lHand.x + f.points.rHand.x) / 2, (f.points.lHand.y + f.points.rHand.y) / 2) + arrow(250, 140, 280, 100);
  },
  db_swing: () => POSES.kb_swing(),
  single_leg_rdl: () => {
    const f = figure({
      cx: 200,
      torsoLean: 55,
      leftArm: { shoulder: 170, elbow: 0 },
      rightArm: { shoulder: -40, elbow: 0 },
      leftLeg: { hip: 10, knee: 10 },
      rightLeg: { hip: -110, knee: 10 },
    });
    return f.svg + kettlebell(f.points.lHand.x, f.points.lHand.y);
  },
  cable_pull_through: () => {
    const f = figure({
      cx: 200,
      torsoLean: 40,
      leftArm: { shoulder: 150, elbow: 20 },
      rightArm: { shoulder: 150, elbow: 20 },
    });
    return f.svg + band(200, 300, 200, f.points.lHand.y);
  },

  // squat
  sit_to_stand: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      torsoLean: 15,
      leftArm: { shoulder: 40, elbow: 20 },
      rightArm: { shoulder: -40, elbow: -20 },
      leftLeg: { hip: 35, knee: 70 },
      rightLeg: { hip: -35, knee: 70 },
    });
    return boxProp(200, 300, 70, 55) + f.svg;
  },
  box_squat: () => POSES.sit_to_stand(),
  goblet_squat: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      torsoLean: 10,
      leftArm: { shoulder: 30, elbow: 80 },
      rightArm: { shoulder: -30, elbow: -80 },
      leftLeg: { hip: 35, knee: 75 },
      rightLeg: { hip: -35, knee: 75 },
    });
    return f.svg + kettlebell(200, f.points.lHand.y);
  },
  front_squat: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      leftArm: { shoulder: 20, elbow: 100 },
      rightArm: { shoulder: -20, elbow: -100 },
      leftLeg: { hip: 35, knee: 75 },
      rightLeg: { hip: -35, knee: 75 },
    });
    return f.svg + barbell(200, f.points.shoulder.y - 5, 100);
  },
  back_squat: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      torsoLean: 15,
      leftArm: { shoulder: 100, elbow: 40 },
      rightArm: { shoulder: -100, elbow: -40 },
      leftLeg: { hip: 35, knee: 75 },
      rightLeg: { hip: -35, knee: 75 },
    });
    return f.svg + barbell(200, f.points.shoulder.y - 8, 100);
  },
  leg_press: () => {
    return `<rect x="90" y="100" width="220" height="180" rx="10" fill="none" stroke="${MUTED}" stroke-width="3"/>` +
      figure({
        cx: 200,
        cy: 240,
        leftArm: { shoulder: 120, elbow: 20 },
        rightArm: { shoulder: -120, elbow: -20 },
        leftLeg: { hip: -50, knee: 40 },
        rightLeg: { hip: 50, knee: 40 },
      }).svg;
  },
  band_squat: () => POSES.goblet_squat(),

  // lunge
  split_squat: () => {
    const f = figure({
      cx: 200,
      cy: 220,
      leftArm: { shoulder: 40, elbow: 10 },
      rightArm: { shoulder: -40, elbow: -10 },
      leftLeg: { hip: 40, knee: 55 },
      rightLeg: { hip: -50, knee: 70 },
    });
    return f.svg;
  },
  reverse_lunge: () => POSES.split_squat() + arrow(260, 250, 300, 280),
  walking_lunge: () => POSES.split_squat() + arrow(280, 220, 330, 220),
  rear_foot_elevated_split_squat: () => {
    const f = figure({
      cx: 180,
      cy: 220,
      leftLeg: { hip: 35, knee: 55 },
      rightLeg: { hip: -70, knee: 40 },
    });
    return boxProp(280, 280, 55, 50) + f.svg;
  },
  db_rfess: () => {
    const base = POSES.rear_foot_elevated_split_squat();
    const f = figure({
      cx: 180,
      cy: 220,
      leftArm: { shoulder: 170, elbow: 0 },
      rightArm: { shoulder: 170, elbow: 0 },
      leftLeg: { hip: 35, knee: 55 },
      rightLeg: { hip: -70, knee: 40 },
    });
    return boxProp(280, 280, 55, 50) + f.svg + dumbbell(f.points.lHand.x, f.points.lHand.y) + dumbbell(f.points.rHand.x, f.points.rHand.y);
  },
  step_up: () => {
    const f = figure({
      cx: 180,
      leftArm: { shoulder: 30, elbow: 10 },
      rightArm: { shoulder: -30, elbow: -10 },
      leftLeg: { hip: 40, knee: 60 },
      rightLeg: { hip: -10, knee: 10 },
    });
    return boxProp(250, 300, 70, 70) + f.svg + arrow(200, 160, 230, 140);
  },
  lateral_lunge: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      torsoLean: 15,
      leftArm: { shoulder: 50, elbow: 20 },
      rightArm: { shoulder: -20, elbow: -10 },
      leftLeg: { hip: 55, knee: 70 },
      rightLeg: { hip: -70, knee: 5 },
    });
    return f.svg + arrow(250, 240, 300, 240);
  },

  // carry
  farmer_carry: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 170, elbow: 5 },
      rightArm: { shoulder: 170, elbow: 5 },
    });
    return f.svg + dumbbell(f.points.lHand.x, f.points.lHand.y + 8) + dumbbell(f.points.rHand.x, f.points.rHand.y + 8) + arrow(260, 200, 320, 200);
  },
  suitcase_carry: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 40, elbow: 10 },
      rightArm: { shoulder: 170, elbow: 5 },
    });
    return f.svg + kettlebell(f.points.rHand.x, f.points.rHand.y + 10) + arrow(260, 200, 320, 200);
  },
  front_rack_carry: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 40, elbow: 90 },
      rightArm: { shoulder: -40, elbow: -90 },
    });
    return f.svg + kettlebell(180, f.points.shoulder.y) + kettlebell(220, f.points.shoulder.y) + arrow(260, 200, 320, 200);
  },
  overhead_carry: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 30, elbow: 10 },
      rightArm: { shoulder: 5, elbow: 160 },
    });
    return f.svg + kettlebell(f.points.rHand.x, f.points.rHand.y) + arrow(260, 200, 320, 200);
  },
  plate_hug_carry: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 50, elbow: 70 },
      rightArm: { shoulder: -50, elbow: -70 },
    });
    return f.svg + `<circle cx="200" cy="${f.points.lHand.y}" r="22" fill="none" stroke="${ACCENT}" stroke-width="5"/>` + arrow(260, 200, 320, 200);
  },

  // rotate / core / corrective
  pallof_press: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 100, elbow: 10 },
      rightArm: { shoulder: 100, elbow: 10 },
    });
    return f.svg + band(70, 170, f.points.lHand.x, f.points.lHand.y);
  },
  half_kneeling_pallof: () => {
    const f = figure({
      cx: 200,
      cy: 240,
      leftArm: { shoulder: 100, elbow: 10 },
      rightArm: { shoulder: 100, elbow: 10 },
      leftLeg: { hip: 20, knee: 90 },
      rightLeg: { hip: -40, knee: 40 },
    });
    return f.svg + band(70, 180, f.points.lHand.x, f.points.lHand.y);
  },
  cable_anti_rotation_hold: () => POSES.pallof_press(),
  cable_chop: () => {
    const f = figure({
      cx: 200,
      torsoLean: -15,
      leftArm: { shoulder: 130, elbow: 20 },
      rightArm: { shoulder: 40, elbow: 30 },
      leftLeg: { hip: 30, knee: 25 },
      rightLeg: { hip: -30, knee: 25 },
    });
    return f.svg + band(300, 90, f.points.rHand.x, f.points.rHand.y) + arrow(240, 140, 180, 220);
  },
  cable_lift: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: -40, elbow: -30 },
      rightArm: { shoulder: 30, elbow: 20 },
    });
    return f.svg + band(100, 280, f.points.lHand.x, f.points.lHand.y) + arrow(160, 220, 220, 140);
  },
  med_ball_rotational_throw: () => {
    const f = figure({
      cx: 180,
      torsoLean: -25,
      leftArm: { shoulder: 120, elbow: 20 },
      rightArm: { shoulder: -20, elbow: -40 },
    });
    return f.svg + `<circle cx="260" cy="150" r="16" fill="${ACCENT}"/>` + arrow(230, 160, 280, 140);
  },
  band_face_pull_to_external_rotation: () => {
    const f = figure({
      cx: 220,
      leftArm: { shoulder: -50, elbow: -70 },
      rightArm: { shoulder: 50, elbow: 70 },
    });
    return f.svg + band(100, 140, f.points.lHand.x, f.points.lHand.y) + band(100, 140, f.points.rHand.x, f.points.rHand.y);
  },

  march_in_place: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: -30, elbow: -20 },
      rightArm: { shoulder: 40, elbow: 20 },
      leftLeg: { hip: 45, knee: 50 },
      rightLeg: { hip: -10, knee: 5 },
    });
    return f.svg;
  },
  bear_crawl: () => {
    const f = figure({
      cx: 200,
      cy: 250,
      torsoLean: 90,
      leftArm: { shoulder: 140, elbow: 20 },
      rightArm: { shoulder: 40, elbow: 20 },
      leftLeg: { hip: 50, knee: 60 },
      rightLeg: { hip: 120, knee: 40 },
    });
    return f.svg + arrow(260, 240, 320, 240);
  },
  sled_push: () => {
    const f = figure({
      cx: 160,
      torsoLean: 50,
      leftArm: { shoulder: 90, elbow: 10 },
      rightArm: { shoulder: 90, elbow: 10 },
      leftLeg: { hip: 40, knee: 40 },
      rightLeg: { hip: -10, knee: 20 },
    });
    return f.svg + `<rect x="230" y="180" width="90" height="100" rx="6" fill="none" stroke="${ACCENT}" stroke-width="4"/>` + arrow(300, 200, 340, 200);
  },
  sled_drag: () => {
    const f = figure({
      cx: 220,
      leftArm: { shoulder: 160, elbow: 10 },
      rightArm: { shoulder: 160, elbow: 10 },
    });
    return `<rect x="70" y="240" width="70" height="50" rx="4" fill="none" stroke="${ACCENT}" stroke-width="4"/>` + f.svg + band(140, 250, 200, 250) + arrow(260, 200, 310, 200);
  },
  a_skip: () => POSES.march_in_place() + arrow(260, 180, 310, 180),
  box_jump: () => {
    const f = figure({
      cx: 150,
      leftArm: { shoulder: -40, elbow: -20 },
      rightArm: { shoulder: 40, elbow: 20 },
      leftLeg: { hip: 30, knee: 50 },
      rightLeg: { hip: -30, knee: 50 },
    });
    return f.svg + boxProp(280, 300, 80, 90) + arrow(200, 160, 250, 130);
  },

  dead_bug: () => {
    const f = figure({
      cx: 200,
      cy: 240,
      torsoLean: 0,
      leftArm: { shoulder: -20, elbow: -160 },
      rightArm: { shoulder: 100, elbow: 20 },
      leftLeg: { hip: 40, knee: 70 },
      rightLeg: { hip: -100, knee: 20 },
    });
    return f.svg;
  },
  front_plank: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      torsoLean: 90,
      leftArm: { shoulder: 140, elbow: 70 },
      rightArm: { shoulder: 140, elbow: 70 },
      leftLeg: { hip: 90, knee: 0 },
      rightLeg: { hip: 90, knee: 0 },
    });
    return f.svg;
  },
  ab_wheel_rollout: () => {
    const f = figure({
      cx: 180,
      cy: 240,
      torsoLean: 70,
      leftArm: { shoulder: 110, elbow: 10 },
      rightArm: { shoulder: 110, elbow: 10 },
      leftLeg: { hip: 50, knee: 80 },
      rightLeg: { hip: 70, knee: 80 },
    });
    return f.svg + `<circle cx="${f.points.lHand.x + 20}" cy="${f.points.lHand.y}" r="12" fill="none" stroke="${ACCENT}" stroke-width="4"/>` + arrow(240, 200, 290, 200);
  },
  side_plank: () => {
    const f = figure({
      cx: 200,
      cy: 230,
      torsoLean: 0,
      leftArm: { shoulder: 170, elbow: 90 },
      rightArm: { shoulder: -90, elbow: 0 },
      leftLeg: { hip: 90, knee: 0 },
      rightLeg: { hip: 90, knee: 0 },
      scale: 0.95,
    });
    // rotate-ish via lean - approximate with horizontal torso using extreme lean
    const g = figure({
      cx: 200,
      cy: 220,
      torsoLean: 90,
      leftArm: { shoulder: 180, elbow: 90 },
      rightArm: { shoulder: 0, elbow: 0 },
      leftLeg: { hip: 90, knee: 0 },
      rightLeg: { hip: 90, knee: 0 },
    });
    return g.svg;
  },
  suitcase_hold: () => {
    const f = figure({
      cx: 200,
      leftArm: { shoulder: 30, elbow: 10 },
      rightArm: { shoulder: 170, elbow: 5 },
    });
    return f.svg + kettlebell(f.points.rHand.x, f.points.rHand.y + 10);
  },
  bird_dog: () => {
    const f = figure({
      cx: 200,
      cy: 240,
      torsoLean: 90,
      leftArm: { shoulder: -20, elbow: 0 },
      rightArm: { shoulder: 140, elbow: 20 },
      leftLeg: { hip: 50, knee: 70 },
      rightLeg: { hip: -20, knee: 0 },
    });
    return f.svg;
  },
  face_pull: () => POSES.band_face_pull_to_external_rotation(),
  hip_90_90_switches: () => {
    const f = figure({
      cx: 200,
      cy: 250,
      leftArm: { shoulder: 40, elbow: 20 },
      rightArm: { shoulder: -40, elbow: -20 },
      leftLeg: { hip: 70, knee: 90 },
      rightLeg: { hip: -70, knee: 90 },
    });
    return f.svg + arrow(250, 250, 290, 250);
  },
  worlds_greatest_stretch: () => {
    const f = figure({
      cx: 180,
      cy: 230,
      torsoLean: 40,
      leftArm: { shoulder: 160, elbow: 20 },
      rightArm: { shoulder: -30, elbow: -100 },
      leftLeg: { hip: 50, knee: 70 },
      rightLeg: { hip: -60, knee: 20 },
    });
    return f.svg;
  },
  cat_cow: () => {
    const f = figure({
      cx: 200,
      cy: 240,
      torsoLean: 90,
      leftArm: { shoulder: 140, elbow: 30 },
      rightArm: { shoulder: 140, elbow: 30 },
      leftLeg: { hip: 50, knee: 80 },
      rightLeg: { hip: 50, knee: 80 },
    });
    return f.svg + arrow(200, 160, 200, 190);
  },
  open_book: () => {
    const f = figure({
      cx: 200,
      cy: 250,
      leftArm: { shoulder: 170, elbow: 0 },
      rightArm: { shoulder: -40, elbow: -120 },
      leftLeg: { hip: 60, knee: 80 },
      rightLeg: { hip: 60, knee: 80 },
    });
    return f.svg + arrow(230, 150, 280, 120);
  },
  curl_up_mcgill: () => {
    const f = figure({
      cx: 200,
      cy: 250,
      torsoLean: -10,
      leftArm: { shoulder: 160, elbow: 40 },
      rightArm: { shoulder: 160, elbow: 40 },
      leftLeg: { hip: 40, knee: 70 },
      rightLeg: { hip: -5, knee: 5 },
    });
    return f.svg;
  },
};

const PATTERN_FALLBACK = {
  push_horizontal: () => POSES.push_up(),
  push_vertical: () => POSES.db_shoulder_press(),
  pull_horizontal: () => POSES.band_row(),
  pull_vertical: () => POSES.pull_up(),
  hinge: () => POSES.db_rdl(),
  squat: () => POSES.goblet_squat(),
  lunge: () => POSES.split_squat(),
  carry: () => POSES.farmer_carry(),
  rotate: () => POSES.pallof_press(),
  locomotion: () => POSES.march_in_place(),
  corrective: () => POSES.dead_bug(),
};

function illustrationFor(ex) {
  const builder = POSES[ex.id] || PATTERN_FALLBACK[ex.primary_pattern] || (() => figure().svg);
  const body = builder();
  return wrap(ex.name, body, ex.primary_pattern);
}

function updateMediaPaths(exercisesByFile) {
  for (const [file, rows] of Object.entries(exercisesByFile)) {
    const updated = rows.map((ex) => ({
      ...ex,
      media: {
        ...(ex.media || {}),
        image: `illustrations/${ex.id}.svg`,
        video: ex.media?.video ?? null,
      },
    }));
    fs.writeFileSync(file, JSON.stringify(updated, null, 2) + "\n", "utf8");
  }
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(EX_DIR).filter((f) => f.endsWith(".json"));
  const byFile = {};
  let count = 0;
  for (const file of files) {
    const full = path.join(EX_DIR, file);
    const rows = JSON.parse(fs.readFileSync(full, "utf8"));
    byFile[full] = rows;
    for (const ex of rows) {
      const svg = illustrationFor(ex);
      fs.writeFileSync(path.join(OUT_DIR, `${ex.id}.svg`), svg, "utf8");
      count += 1;
    }
  }
  updateMediaPaths(byFile);
  // clean catalog helper if present
  const catalog = path.join(OUT_DIR, "_catalog.json");
  if (fs.existsSync(catalog)) fs.unlinkSync(catalog);
  console.log(`Wrote ${count} illustrations to library/illustrations/`);
}

main();
