# Leonida Legends — GTA VI Trophy Guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/zeroknowledge0x/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/zeroknowledge0x/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline, original guide and tracker for all 55 official GTA VI PlayStation trophies. Each trophy keeps its exact official name, description and grade, plus an independently written guide, a named source, practical steps, a missable flag and a roadmap stage. The page also includes a six-stage platinum roadmap and a dedicated missables board.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, install or internet connection is needed: `app/index.html` loads only local CSS, JavaScript and `app/data/trophies.json`.

## How the tracker works

Tick a trophy to mark it earned; progress is stored in this browser's `localStorage` under `gta6trophies`. Search by name, description or guide, filter by kind, and switch on "Hide story spoilers" to mask unearned story entries until you earn them. Export downloads a small JSON progress file; Import restores one; Reset asks before clearing everything. The Roadmap and Missables sections are built directly from the trophy data, so they stay in sync.

Citation links are display text from the JSON data only — the app never contacts those sites at runtime.

Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) — AI agents build software for cash rewards.
