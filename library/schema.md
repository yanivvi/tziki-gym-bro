# Exercise schema

Each exercise object in `exercises/*.json` uses these fields.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable slug, e.g. `goblet_squat` |
| `name` | string | yes | Display name |
| `primary_pattern` | string | yes | One of the canonical pattern IDs |
| `patterns` | string[] | yes | Includes primary_pattern; may add secondary |
| `intents` | string[] | yes | strength, hypertrophy, power, endurance, mobility, stability, conditioning |
| `equipment` | string[] | yes | bodyweight, dbs, barbell, bench, pullup_bar, cables, kettlebell, machines, bands, med_ball, sled, box |
| `stance` | string | yes | bilateral, unilateral, split, alternating |
| `plane` | string | yes | sagittal, frontal, transverse, multi |
| `family_id` | string or null | yes | Links to families.json; null if standalone |
| `level` | number | yes | 1 = easiest in family; higher = harder |
| `skill` | string | yes | beginner, intermediate, advanced |
| `core_role` | string or null | no | anti_extension, anti_rotation, anti_lateral_flexion, flexion, produce_rotation, or null |
| `contraindications` | string[] | yes | e.g. overhead_limited, axial_spine_sensitive, wrist_sensitive, knee_sensitive, shoulder_irritable |
| `functional` | boolean | yes | true if pattern-quality priority; machines often false |
| `cue_short` | string | yes | One-line coaching cue |
| `cue_long` | string | yes | Short setup / execution |
| `default_prescription` | object | yes | sets, reps, rest_sec, load, notes |
| `media` | object | no | video and image placeholders |

## default_prescription shape

```json
{
  "sets": 3,
  "reps": "8-12",
  "rest_sec": 90,
  "load": "RPE 7-8",
  "notes": "optional"
}
```

For carries or holds, reps may be time like "30-45s" or distance like "20-40m".

## Canonical primary_pattern values

push_horizontal, push_vertical, pull_horizontal, pull_vertical, hinge, squat, lunge, carry, rotate, locomotion, corrective

## Substitution rules

Swap A to B only if:

1. Same primary_pattern
2. B equipment is available to the user
3. B skill is at or below user level
4. No overlap between B contraindications and user constraint flags
5. Prefer same family_id when available
