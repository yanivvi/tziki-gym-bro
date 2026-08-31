# Unified movement pattern taxonomy

Canonical pattern set for this project. Merges Dan John (5) + Athlean-X (7) + common athletic needs (rotate / locomotion).

## Canonical patterns

| ID | Pattern | Definition (short) | Example exercises |
|---|---|---|---|
| `push_horizontal` | Horizontal push | Press away in roughly horizontal plane | Push-up, bench press, DB press |
| `push_vertical` | Vertical push | Press overhead or incline steep | OHP, landmine press, pike push-up |
| `pull_horizontal` | Horizontal pull | Row torso toward implement / implement to torso | DB row, cable row, inverted row |
| `pull_vertical` | Vertical pull | Pull from overhead toward body | Pull-up, lat pulldown |
| `hinge` | Hip hinge | Hip-dominant flexion/extension with neutral spine intent | Deadlift, RDL, kettlebell swing, good-morning alternatives |
| `squat` | Squat | Knee+hip dominant bilateral sit/stand pattern | Back squat, goblet squat, leg press (limited transfer) |
| `lunge` | Lunge / split | Single-leg or split-stance lower body | Split squat, walking lunge, step-up, RFESS |
| `carry` | Loaded carry | Locomotion under load with posture | Farmer carry, suitcase carry, front rack carry |
| `rotate` | Rotate / anti-rotate | Produce or resist rotation through trunk | Cable chop/lift, pallof press, med-ball throw |
| `locomotion` | Gait / loco skill | Walk, skip, sprint, crawl patterns | March, sled walk, sprint drills, bear crawl |
| `corrective` | Corrective / prep | Mobility, stability, activation, posture | Face pull, dead bug, hip 90/90, bird dog |

### Compact mode (minimum viable)

For simplest programs, collapse to Dan John’s five:

`push`, `pull`, `hinge`, `squat`, `carry`

Map `lunge` → squat family (unilateral), `rotate` → corrective/core, vertical/horizontal as push/pull variants.

## Pattern coverage rules (workout validation)

**Full-body session (default):** at least one of:

- hinge
- squat **or** lunge
- push (any)
- pull (any)
- carry **or** rotate/corrective core

**Upper session:** push + pull (+ optional carry/corrective)

**Lower session:** hinge + (squat or lunge) (+ optional carry/corrective)

## Equipment-agnostic mapping

Every pattern must have at least one variation for:

- bodyweight only
- dumbbells
- barbell
- cables/bands
- machines (allowed but deprioritized for “functional” badge)

## Intent tags (orthogonal to pattern)

Attach separately from pattern:

- `strength`
- `hypertrophy`
- `power`
- `endurance`
- `mobility`
- `stability`
- `conditioning`

Example: kettlebell swing = `hinge` + `power` (or conditioning).
