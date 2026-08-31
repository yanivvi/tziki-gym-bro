# Workout generator

Builds a session JSON from `library/` + a user profile + a session template.

Zero dependencies. Node 18+.

## Quick start

```bash
node generator/generate.mjs --profile generator/profiles/beginner_home.json
node generator/generate.mjs --profile generator/profiles/intermediate_gym.json --template full_body_athlete
node generator/generate.mjs --profile generator/profiles/intermediate_gym.json --template upper --out generator/out/upper.json
```

Prints workout JSON to stdout (and optionally writes `--out`).

## Inputs

| Input | Path |
|---|---|
| Exercise library | `library/exercises/*.json` |
| Families | `library/families.json` |
| Templates | `generator/templates/*.json` |
| Profile | JSON file (see `profile.schema.md`) |

## Selection rules

1. Equipment must match (see `generate.mjs` → `matchesEquipment`)
2. Skill ≤ user level (`beginner` < `intermediate` < `advanced`)
3. No overlap between exercise `contraindications` and profile `constraints`
4. Prefer `functional: true`
5. Prefer intents overlapping the slot’s requested intents
6. Prefer family level suited to user level
7. Do not reuse an exercise id in the same session
8. Soft gate: `overhead_limited` skips strict overhead presses (landmine / incline still ok if not contraindicated)

## Templates

| id | Use |
|---|---|
| `full_body_min` | Dan John minimum: hinge, squat/lunge, push, pull, carry, corrective |
| `full_body_athlete` | EXOS-lite: prep → power → strength → unilateral → carry/corrective → optional conditioning |
| `upper` | Push + pull + corrective/carry |
| `lower` | Hinge + squat/lunge + carry/corrective |

Minutes trim optional blocks (power / conditioning) when `session_minutes` is short.
