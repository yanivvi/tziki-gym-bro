# Gym Trainer UI

Local preview for the exercise library and workout generator.

## Run

```bash
node ui/server.mjs
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

Optional: `PORT=4000 node ui/server.mjs`

Zero npm dependencies. Uses the shared generator in `generator/lib.mjs`.

## Tabs

- **Library** — browse/filter exercises
- **Generate** — build a session from a profile + template
- **Overview** — quick counts and product framing
