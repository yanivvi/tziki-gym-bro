# Tziki Gym Bro

Functional-training library and session generator: knowledge base → exercise library → workout builder → web UI.

**Live site:** [https://yanivvi.github.io/tziki-gym-bro/](https://yanivvi.github.io/tziki-gym-bro/)

## What's in the repo

| Path | Purpose |
|------|---------|
| `knowledge/` | Research notes, shared principles, movement patterns |
| `library/` | 86 exercises (JSON) + character illustrations |
| `generator/` | CLI workout generator (`node generator/generate.mjs`) |
| `ui/` | Local Node preview server |
| `docs/` | Static site for GitHub Pages |

## Run locally (API UI)

```bash
node ui/server.mjs
```

Open http://127.0.0.1:3847

## Generate from the CLI

```bash
node generator/generate.mjs --profile generator/profiles/beginner_home.json
```

## GitHub Pages

The site under `docs/` is static (JSON data + in-browser generator). Source is set to `/docs` on `main`.
