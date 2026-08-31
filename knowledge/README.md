# Functional Training Knowledge Base

Working reference for gym-trainer product decisions: programming logic, assessments, movement patterns, and safety defaults.

## What's here

| Path | Purpose |
|---|---|
| [materials-index.md](materials-index.md) | Master list of researched URLs/books |
| [sources/ranking.md](sources/ranking.md) | Sources ranked for a gym-trainer app |
| [sources/](sources/) | Per-system summaries and key takeaways |
| [model/shared-principles.md](model/shared-principles.md) | Overlap map across systems |
| [model/movement-patterns.md](model/movement-patterns.md) | Unified pattern taxonomy |
| [model/training-hierarchy.md](model/training-hierarchy.md) | Screen to correct to load to perform |
| [model/programming-primitives.md](model/programming-primitives.md) | App-ready building blocks |
| [glossary.md](glossary.md) | Shared vocabulary |
| [../library/](../library/) | Exercise library (schema, families, exercises, index) |
| [../generator/](../generator/) | Workout generator (templates + profile → session JSON) |
| [../ui/](../ui/) | Local preview UI (`node ui/server.mjs`) |

## How to use later

1. **Product / UX** — use `programming-primitives.md` and `movement-patterns.md` for workout structure, tags, and user flows.
2. **Exercise selection** — use `../library/` (filter `index.json`, resolve full records in `exercises/`).
3. **Session generation** — use `../generator/generate.mjs` with a profile JSON.
4. **Content / coaching copy** — pull explanations from `sources/` and principles from `shared-principles.md`.
5. **Safety defaults** — follow `training-hierarchy.md` (quality before load; pain means assess or refer).
6. **Prioritize learning** — start with tier-1 items in `sources/ranking.md`.

## Scope note

This KB synthesizes publicly documented ideas from Athlean-X, FMS/Gray Cook, Mike Boyle, Dan John, Stuart McGill, Vern Gambetta, EXOS, DNS, and Juan Carlos Santana. It is not a substitute for clinical care or licensed coaching credentials.
