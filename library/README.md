# Exercise Library

Starter catalog for gym-trainer, aligned with knowledge/model/movement-patterns.md and programming-primitives.md.

## Layout

| Path | Purpose |
|---|---|
| schema.md | Field definitions |
| families.json | Progression families (easy to hard) |
| index.json | Flat id to pattern/equipment lookup |
| exercises/ | Exercises grouped by primary pattern |

## Coverage goals

Every canonical pattern has:

- bodyweight (or band) option where sensible
- dumbbell option
- barbell option where sensible
- cable/band option where sensible
- clear regressions / progressions via family_id + level

## How to use

1. Pick a pattern required by the session template.
2. Filter by equipment and level.
3. Prefer lower level in the family for beginners; climb when form is solid.
4. Swap within the same primary_pattern (and ideally same family_id) for same-but-different.

## Current snapshot

- **86** exercises across all 11 patterns
- **13** progression families in `families.json`
- Skill mix: beginner-heavy (57), intermediate (24), advanced (5)
- **82** marked `functional: true` (machines mostly false)

| Pattern | Count |
|---|---|
| push_horizontal | 11 |
| push_vertical | 7 |
| pull_horizontal | 7 |
| pull_vertical | 6 |
| hinge | 11 |
| squat | 7 |
| lunge | 7 |
| carry | 5 |
| rotate | 7 |
| locomotion | 6 |
| corrective | 12 |

## Illustrations

Photorealistic character illustrations for every exercise live in `illustrations/{id}.png`.

Character reference: `character/model-ref.png` (the model used for all poses).

Legacy stick-figure SVGs may still exist; the library `media.image` fields point at PNGs.

To regenerate stick SVGs only (not character photos):

```bash
node library/generate-illustrations.mjs
```
