# Conclave Board

A local Kanban board of this repo's `conclave/` sprint state, scaffolded by `/conclave-board`. Read-only — it never writes back to `conclave/`.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL. Columns are the six story statuses (`backlog | ready | in-progress | review | verified | done`); cards show each story's ID, title, discipline, assignee, priority, and estimate.

## Staying current

While `npm run dev` is running, the board updates automatically whenever Claude Code writes to `conclave/` in this repo — a plugin hook regenerates `data/board-data.generated.json`, and Next.js's dev server hot-reloads to reflect it. No command to re-run manually.

If the data ever looks stale (e.g. the hook didn't fire, or you edited a story file outside Claude Code), regenerate it by hand:

```bash
npm run generate-data
```

## Branding

Edit `../conclave/team/board.md` — `company_name`, `logo_path`, `primary_color`, `accent_color`. Changes there apply on the board's next reload; no regeneration step needed for those fields.

## What this is not

- Not a write path for story status — use `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review` for that.
- Not deployed anywhere — this is a local dev server on your own machine.
- Not synced in real time across machines — each teammate's board reflects their own local `conclave/` checkout.
