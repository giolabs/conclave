---
status: living
last_updated_at: "{{iso_date}}"
company_name: "TBD"
logo_path: "TBD"
primary_color: "TBD"
accent_color: "TBD"
---

# Board branding

Controls how `conclave-board/` (the Kanban board app) presents your company's brand. Edit the frontmatter above and save — the board's dev server picks these fields up live via `lib/theme.ts`, no regeneration step needed (unlike story data, which flows through the generated JSON snapshot in `conclave-board/data/`).

## Fields

- **`company_name`** — shown in the board's header. `TBD` renders a generic default header.
- **`logo_path`** — a path relative to `conclave-board/public/`, or a full URL. `TBD` shows no logo.
- **`primary_color`** — hex color (e.g. `#4F46E5`), drives the board's primary Tailwind theme color. `TBD` or an invalid hex falls back to a neutral default.
- **`accent_color`** — hex color, drives highlights (e.g. the active sprint tab). Same fallback behavior as `primary_color`.

The board's font is fixed to Poppins and is not configurable here.

## How to update

Edit the frontmatter values above, save, commit. If `conclave-board/`'s dev server (`npm run dev`) is running, it reflects the change on the next hot reload — no need to restart it or run any Conclave command.
