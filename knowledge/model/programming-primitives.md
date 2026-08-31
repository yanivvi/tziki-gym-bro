# Programming primitives

App-ready building blocks derived from the knowledge base. Use these as schema seeds later.

## Entities

### UserProfile

- goal: `muscle` | `strength` | `fat_loss` | `athleticism` | `general_health` | `pain_management_support`
- level: `beginner` | `intermediate` | `advanced`
- days_per_week: 2–6
- session_minutes: 30 | 45 | 60 | 75
- equipment: set of `bodyweight` | `dbs` | `barbell` | `bench` | `pullup_bar` | `cables` | `kettlebell` | `machines` | `bands`
- constraints: pain regions, avoided patterns, pregnancy, etc. (store as flags; no diagnosis)
- preferences: split type preference optional

### Exercise

- id, name
- patterns: list from `movement-patterns.md`
- intents: strength, hypertrophy, power, …
- equipment_required
- bilateral | unilateral
- plane: sagittal | frontal | transverse | multi
- progression_group (family id)
- regression_of / progression_of
- contraindication_tags (e.g. `overhead_limited`, `axial_spine_sensitive`)
- cue_short, cue_long
- media refs

### WorkoutBlock

- type: `prep` | `power` | `strength` | `accessory` | `corrective` | `conditioning` | `carry`
- exercises: ordered prescriptions (sets, reps, load_scheme, rest, RPE/RIR optional)

### WorkoutSession

- blocks: ordered WorkoutBlocks
- pattern_coverage: computed checklist
- estimated_minutes

### ProgramPhase

- weeks: 2–6
- emphasis: e.g. pattern practice | strength | hypertrophy | power mix
- sessions_per_week template

## Default split templates

| Days | Template | Notes |
|---|---|---|
| 2 | Full body A/B | Pattern complete each day |
| 3 | Full body or Upper/Lower/Full | Beginner default: full body |
| 4 | Upper/Lower | Boyle-friendly |
| 5–6 | PPL or Upper/Lower + optional athletic day | Intermediate+ |

## Minimum effective session (Dan John–inspired)

1. Hinge
2. Squat or lunge
3. Push
4. Pull
5. Carry
6. Optional short corrective

## Athlete-leaning session (EXOS-lite + Athlean)

1. Prep (5–10 min)
2. Power (2–4 total working sets)
3. Strength primary (2 patterns)
4. Strength secondary / unilateral
5. Corrective or carry
6. Optional conditioning

## Core prescription defaults (McGill + Boyle)

Prefer rotating:

- anti-extension (dead bug, plank variations)
- anti-rotation (pallof)
- anti-lateral flexion (suitcase hold/carry, side plank)

Treat crunch-style flexion as optional hypertrophy accessory when asymptomatic.

## Progression rules

- Prefer adding load or reps inside the same pattern before adding exotic exercises.
- Every 2 weeks: same-but-different variation swap within pattern (Dan John).
- If form fails or pain appears: regress variation or reduce load; do not “push through” sharp pain.
- Track at least one anchor lift per major pattern for progress visibility.

## Substitution engine inputs

When swapping exercise X → Y, require:

- same primary pattern
- equal or lower skill demand if user level is beginner
- equipment available
- contraindications respected

## Content sources allowed in product

- Original coaching copy inspired by public principles
- Public educational links as citations
- Not: verbatim paid program calendars, FMS official score sheets as branded features without license
