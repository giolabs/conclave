---
name: visual-sprint-board
description: >
  Generate a local self-contained HTML sprint/roadmap board (Roadmap, Tasks, Analytics tabs)
  from conclave/ state via /conclave-sprint-board. Use when the user asks for a visual sprint
  board, roadmap board, or offline sprint analytics. Complements /conclave-board (Kanban); does
  not replace it. Writes docs/sprint-board/ only.
---

# Visual Sprint Board (Conclave)

Generate a **single offline HTML file** (`docs/sprint-board/index.html`) from the target repo's `conclave/` directory. No CDN, no npm, no server required (`file://` works).

Invoked by `/conclave-sprint-board`. Keep `/conclave-board` (Next.js Kanban) unchanged.

## Discovery order (Conclave-first)

| Data | Sources (in order) |
|---|---|
| Project name | `conclave/config.md` `project_name` → basename of repo root |
| Sprints | `conclave/sprints/SPRINT-*/meta.md` |
| Stories | `conclave/sprints/SPRINT-*/stories/US-*.md` — **omit** `BUG-NNN` |
| Accent | User message hex → `DESIGN.md` / theme tokens → `conclave/team/board.md` `primary_color` → `#C45C26` |
| Phases | Always one phase: **Delivery** (all sprints, id ascending) |

Never invent sprint or story IDs. If a datum is missing, omit it.

## Status mapping

**Sprint** (`meta.status`): `done|archived` → `done`; `active` → `active`; `draft` → `planned`.

**Story**: `done|verified` → `done`; `in-progress|review` → `active`; `ready|backlog` → `planned`; `retired` → `retired`.

Unknown statuses → `planned` + one warning line per file.

`retired` stories appear in Tasks (tenuous) but are **excluded** from coverage numerators/denominators.

## Design rules

- System font stack only (unless embedding a local `@font-face` data URI — not required).
- No cream+serif+terracotta, no purple gradient clichés; strong accent in one place.
- Theme: `:root` tokens + `prefers-color-scheme` + `data-theme` toggle persisted in `localStorage` key `sb-theme`.
- `font-variant-numeric: tabular-nums` on ids and KPIs.
- A11y: `tablist` / `tab` / `tabpanel`, arrow keys, focus rings, `prefers-reduced-motion`.

## Template

Fill `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/sprint-board.html.template`:

- Scalars: `{{project}}`, `{{accent}}`, `{{accent_600}}`, `{{accent_soft}}`, `{{snapshot_iso}}`
- Regions: `<!-- {{KPI_TILES}} -->`, `<!-- {{SPINE}} -->`, `<!-- {{PHASE_SECTIONS}} -->`, `<!-- {{TASK_BLOCKS}} -->`, `<!-- {{ANALYTICS}} -->`

Expand concrete HTML into those regions (do not leave sample `US-NNN` ids in output). Derive `accent_600` (darker) and `accent_soft` (alpha ~12–18% wash) from the chosen accent hex.

Also fill `sprint-board-readme.template.md` → `docs/sprint-board/README.md`.

## Output

Always:

```
docs/sprint-board/index.html
docs/sprint-board/README.md
```

Overwrite on re-run. Never write under `conclave/`. Never mutate story/sprint frontmatter.
