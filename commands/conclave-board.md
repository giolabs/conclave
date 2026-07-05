---
description: Scaffold a local, branded Kanban board (Next.js + shadcn/ui) that visualizes the current conclave/ sprint state. One-time setup — a Claude Code hook keeps its data current afterward. Read-only; does not modify any story.
allowed-tools: Bash(git rev-parse:*), Bash(ls:*), Bash(mkdir:*), Bash(cp:*), Bash(node:*), Read, Write
---

# /conclave-board

Scaffold a local Kanban board for the current repo's `conclave/` state — a small Next.js + shadcn/ui app, branded per company, that renders one column per story status and one card per story.

```
/conclave-board
```

This command is **one-time setup**. After it runs, the board stays current on its own: a Claude Code hook this plugin ships regenerates the board's data every time `conclave/` changes, and the board's own dev server hot-reloads to show it. There is no CI pipeline, no server Conclave runs, and no LLM involved in keeping the board up to date.

Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.

## Step 2 — Refuse if already scaffolded

If `$REPO_ROOT/conclave-board/` already exists, stop and tell the user:

> `conclave-board/` already exists — there's nothing else to scaffold. To re-brand the board, edit `conclave/team/board.md`. To see it, run `npm install && npm run dev` inside `conclave-board/` (if you haven't already).

Do not overwrite it.

## Step 3 — Copy the board-app boilerplate

Copy `${CLAUDE_PLUGIN_ROOT}/skills/conclave/board-app/` verbatim into `$REPO_ROOT/conclave-board/`. This is a plain file copy — no templating happens on these files; all per-team customization happens through `conclave/team/board.md`, read live by the app itself.

## Step 4 — Render `conclave/team/board.md`

If `$REPO_ROOT/conclave/team/board.md` does not already exist, render `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/board.template.md` (substituting `{{iso_date}}`) to `$REPO_ROOT/conclave/team/board.md`. If it already exists (e.g. a previous `/conclave-board` run was interrupted after this step), leave it untouched — never overwrite a team's branding edits.

## Step 5 — Generate the first data snapshot

Run `node conclave-board/scripts/generate-data.mjs` from `$REPO_ROOT` so the board has real data the first time someone runs it, instead of an empty shell. If this fails (e.g. Node isn't available), don't treat it as fatal — note it in the report (Step 6) and tell the user the first `npm run dev` will trigger a stale-but-present state until the hook or a manual run regenerates it.

## Step 6 — Report to the user

Print:

- `conclave-board/` was created at `$REPO_ROOT/conclave-board/`.
- `conclave/team/board.md` was created (or already existed) — remind the user to fill in `company_name`, `logo_path`, `primary_color`, `accent_color` (currently `TBD` placeholders).
- How to see it: `cd conclave-board && npm install && npm run dev`.
- The board updates automatically afterward — no command to re-run when `conclave/` changes, as long as this plugin's regeneration hook is active in the session.
- This command does not commit. Suggested commands:

  ```bash
  git add conclave-board/ conclave/team/board.md
  git commit -m "conclave: add Kanban board"
  ```

  (`conclave-board/node_modules/`, `conclave-board/.next/`, and `conclave-board/data/board-data.generated.json` are gitignored by the scaffold — only source files are committed.)

## Guardrails

- **Do not modify any file under `conclave/` other than creating `conclave/team/board.md`** (and never overwrite it if it already exists). This command does not touch `roster.md`, `config.md`, or any story or sprint file.
- **Do not touch any story's status or content.** This command — and the board it scaffolds — is read-only with respect to `conclave/`'s Scrum artifacts.
- **Do not commit.** Same as `/conclave-init` — the team reviews the scaffolded app before committing it.
- **Idempotent.** A second run refuses per Step 2 rather than overwriting or duplicating the app.
