---
name: conclave-sprint-board
description: Generate a local self-contained HTML sprint/roadmap board (Roadmap / Tasks / Analytics) from conclave/ state. Writes docs/sprint-board/. Offline file://. Complements /conclave-board; does not modify stories.
---

# /conclave-sprint-board


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Generate a **static, offline** roadmap board from this repo's `conclave/` directory and write it to `docs/sprint-board/`.

```
/conclave-sprint-board
```

No arguments and no flags in this version. Always overwrites:

- `docs/sprint-board/index.html`
- `docs/sprint-board/README.md`

This is **complementary** to `/conclave-board` (Next.js status Kanban). Do **not** modify `conclave-board/`, story files, or sprint `meta.md`.

Read and follow `skills/conclave/visual-sprint-board/SKILL.md` for mapping and design rules. Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. Run `git rev-parse --show-toplevel` → `REPO_ROOT`. If it fails, stop.
2. If `$REPO_ROOT/conclave/config.md` is missing, suggest `/conclave-init` and stop.
3. Print: `Scanning conclave/sprints…`

## Step 2 — Discover sprints and stories

1. Glob `$REPO_ROOT/conclave/sprints/SPRINT-*/meta.md`. Sort by sprint id ascending (`SPRINT-001` before `SPRINT-002`).
2. For each sprint directory, glob `stories/US-*.md`. **Do not** include `conclave/product/bugs/` or any `BUG-*` files.
3. Read each file's YAML frontmatter. Collect at least: sprint `id`, `title`, `status`, goal/description prose if present; story `id`, `title`, `status`, optional `discipline`/`priority`.
4. If a story/sprint file is unreadable, warn with the path and continue.
5. Map statuses per the skill (unknown → `planned` + warn once per file).

## Step 3 — Project name and accent

1. `project_name` from `conclave/config.md` frontmatter; else basename of `REPO_ROOT`.
2. Accent cascade (first match wins):
   - Hex color explicitly named in the user's invocation message (`#RRGGBB`)
   - `DESIGN.md` (or similar theme doc) primary/brand token if a clear `#RRGGBB` is present
   - `conclave/team/board.md` `primary_color` if it matches `#RRGGBB` (case-insensitive)
   - Fallback **`#C45C26`**
3. Record `accent_source` as one of: `prompt` | `design` | `board.md` | `fallback`.
4. Derive `accent_600` (≈15% darker) and `accent_soft` (same hue, low-alpha wash usable as `color-mix(in srgb, ACCENT 16%, transparent)` or an equivalent light hex).

## Step 4 — Build the board model

1. One phase only: eyebrow `Roadmap`, title `Delivery`, note = `"{N} sprints · snapshot {ISO}"`.
2. Each sprint card: mapped status, id, title, short description (goal excerpt ≤160 chars), optional tags from disciplines present in its stories.
3. Tasks: per sprint, each story as a checklist row with mapped pill class, `US-NNN` ref, title, and raw Conclave `status` as subtitle.
4. KPIs (exclude `retired` from coverage math): total stories (non-retired), done, active, planned, coveragePct = round(100 * done / max(total, 1)).
5. Spine: width% done + width% active over non-retired total; label active sprint id if any (`active` mapped), else `"no active sprint"`.
6. Analytics: four tiles (coverage %, done count, remaining = active+planned, sprint count); stacked bar per sprint (done/active/planned units); coverage bars for sprints done vs total and stories done vs non-retired total.

Empty sprints list → empty-state HTML copy: `No sprints found — run /conclave-spec / /conclave-planning`.

## Step 5 — Fill templates and write

1. `ISO` = `date -u +%Y-%m-%dT%H:%M:%SZ`.
2. Read `skills/conclave/templates/sprint-board.html.template`.
3. Replace `{{project}}`, `{{accent}}`, `{{accent_600}}`, `{{accent_soft}}`, `{{snapshot_iso}}`.
4. Replace region comments with **concrete HTML** fragments matching the template's CSS classes (`kpis`, `spine`, `sprint-grid`, `sprint-block`, `tk`, charts, etc.). Escape story titles for HTML (`&`, `<`, `>`).
5. `mkdir -p $REPO_ROOT/docs/sprint-board`.
6. Write `$REPO_ROOT/docs/sprint-board/index.html` (overwrite).
7. Read `skills/conclave/templates/sprint-board-readme.template.md`, substitute `{{project}}`, `{{snapshot_iso}}`, `{{accent_source}}`, write `$REPO_ROOT/docs/sprint-board/README.md` (overwrite).

## Step 6 — Report

Print:

- Accent used + `accent_source`
- Sprint count / story count (and retired count if any)
- Paths written
- How to open: `open docs/sprint-board/index.html` (or `xdg-open`)
- Reminder: re-run `/conclave-sprint-board` after ceremony changes; Kanban remains `/conclave-board`
- Do not commit. Suggested:

  ```bash
  git add docs/sprint-board/
  git commit -m "conclave: refresh sprint board snapshot"
  ```

## Guardrails

- **Never** modify files under `conclave/` (including `board.md`).
- **Never** modify `conclave-board/`.
- **Never** invent IDs.
- **Never** include bugs in v1.
- **Never** add CDN `<script src>` / remote fonts.
- **Always** write only under `docs/sprint-board/`.
- **No Agent/Task role subagent** is required for this command — pure discovery + template fill.
