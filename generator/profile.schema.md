# Profile schema

Profile JSON passed to `generate.mjs`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no | Label only |
| `goal` | string | yes | muscle, strength, fat_loss, athleticism, general_health, pain_management_support |
| `level` | string | yes | beginner, intermediate, advanced |
| `session_minutes` | number | yes | 30, 45, 60, or 75 typical |
| `equipment` | string[] | yes | bodyweight always implied; add dbs, barbell, bench, pullup_bar, cables, kettlebell, machines, bands, med_ball, sled, box |
| `constraints` | string[] | yes | Flags matching exercise contraindications, e.g. overhead_limited, axial_spine_sensitive, knee_sensitive, shoulder_irritable, wrist_sensitive |
| `session_type` | string | no | full_body_min, full_body_athlete, upper, lower — overrides goal-based default |
| `seed` | number | no | RNG seed for reproducible picks |
| `prefer_functional` | boolean | no | default true |
| `include_conditioning` | boolean | no | force conditioning on/off when template allows |
| `include_power` | boolean | no | force power block on/off when template allows |

## Goal → default template

| Goal | Default template |
|---|---|
| general_health, pain_management_support | full_body_min |
| muscle, strength, fat_loss | full_body_athlete (power off unless athleticism) |
| athleticism | full_body_athlete (power on) |

`session_type` on the profile always wins when set.
