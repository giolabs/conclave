# A Visual Kanban Board for the Team's `conclave/` State

> **Estado:** DRAFT

## 1. Objetivo

Give a team using Conclave a **visual, branded Kanban board** of their sprint(s) — a Next.js + shadcn/ui application scaffolded once into the *target* repo (the one Conclave is installed into, not this plugin repo) by a new `/conclave-board` command, reading directly from the team's existing `conclave/` markdown (no new source of truth) and rendering one card per story, one column per story status. The board is fully re-brandable per company (name, logo, accent colors) via a new markdown config file, and stays current automatically: a Claude Code hook this plugin ships regenerates the board's data snapshot every time Claude Code writes to `conclave/`, so the board reflects the latest state the next time its dev server refreshes — no CI pipeline, no server, no manual "sync" step.

## 2. Alcance

### Incluido en esta fase

- New command `/conclave-board`, which scaffolds a Next.js (App Router) + shadcn/ui + Tailwind application into a new **`conclave-board/`** directory at the repo root — a sibling of `conclave/`, not inside it, since it is application code and Conclave's markdown-only invariant (`skills/conclave/SKILL.md` §2) applies only to `conclave/` itself.
- A boilerplate source tree shipped inside this plugin (`skills/conclave/board-app/`) that `/conclave-board` copies verbatim into the target repo's `conclave-board/`, plus a small number of files templated at copy time (theme values, font wiring).
- New template `skills/conclave/templates/board.template.md`, rendered by `/conclave-board` (first run only) to `conclave/team/board.md` — the one config surface for "totalmente customizable para la empresa": company name, logo path/URL, primary/accent brand colors. Poppins is the fixed board font (explicit user decision, not a configurable field).
- A deterministic, non-LLM **data-generation script** (`conclave-board/scripts/generate-data.mjs`, part of the boilerplate) that parses every `conclave/sprints/*/stories/US-NNN-*.md` frontmatter, `conclave/team/roster.md`, `conclave/team/board.md`, and each sprint's `meta.md`, and writes one derived, git-ignored snapshot: `conclave-board/data/board-data.generated.json`. Pure markdown/frontmatter parsing — no Claude/Agent call, no network access.
- A new **plugin-level Claude Code hook** (`hooks/hooks.json` + `hooks/regenerate-board-data.sh`) that fires after any `Write`/`Edit` tool call and, when the touched path is under `conclave/` **and** `conclave-board/scripts/generate-data.mjs` exists in the current repo (i.e. the board has been scaffolded), re-runs the generation script. If the board hasn't been scaffolded yet, the hook is a fast no-op.
- The board UI itself: one column per story `status` (`backlog | ready | in-progress | review | verified | done`, matching `skills/conclave/SKILL.md`'s existing state machine exactly — no new status invented), one card per story showing ID, title, `discipline`, assignee (resolved against `roster.md` for a display name/handle), `priority`, `estimate`, and which sprint it belongs to. A sprint switcher for repos with more than one sprint on record.
- Doc updates required by `CLAUDE.md`'s "Release notes and doc updates" rule: `skills/conclave/SKILL.md`, `README.md`, `CHANGELOG.md`, `site/content/{en,es}/commands/board.mdx` (new), `site/content/{en,es}/configuration.mdx` (document `board.md`'s schema), plus nav entries in both locales' `_meta.js` files.

### Fuera de scope

- **Writing back to `conclave/` from the board.** The board is read-only in this phase — no drag-and-drop status changes, no in-browser editing. Reason: explicit scoping decision to avoid a second write path competing with the slash commands (`/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`) that already own story-status transitions; a board that can also mutate state would need the same guardrails those commands already enforce, duplicated in a UI.
- **CI-based rebuild or deploy** (e.g. a GitHub Actions workflow analogous to this repo's own `deploy-docs.yml`). Reason: explicit user decision — "correrlo localmente como post hook en claude code," not a pipeline. The board runs on `npm run dev`/`npm run build` locally; nothing is deployed anywhere by Conclave itself.
- **Real-time multi-machine sync** (WebSockets, polling a shared server). The update mechanism is local: a Claude Code hook regenerates a JSON file on disk, and Next.js's own dev-server file-watching (fast refresh) picks it up for whoever has `npm run dev` running on that machine. Two teammates on two machines each see their own local hook's regenerations, not each other's, unless they pull/push `conclave/` changes through git as usual.
- **Aggregating multiple repos into one board.** One `conclave-board/` app reads one repo's own `conclave/` — no cross-repo/multi-project view.
- **Authentication or access control.** There is no server and nothing is hosted — the board is a local Next.js app a teammate runs on their own machine, same trust boundary as running any other local dev server against their own checkout.
- **A dedicated mobile app or non-web UI.** Web only, viewed in a browser.
- **i18n for the board's own UI strings.** Ships English-only labels in this phase — unlike the docs site (which is bilingual per a separate, already-shipped feature), the board's chrome ("Backlog", "In progress", etc.) is not translated. Reason: no user requirement stated this, and translating a live app's UI strings is a materially different (and larger) effort than translating static docs.
- **Per-field card customization or column reordering.** `board.md` controls branding (name/logo/colors) only, not which fields render on a card or which statuses become columns. Reason: keeps the customization surface small and matches "customizable para la empresa" (branding), not "customizable per team's own board layout."

## 3. Tecnologias y convenciones del proyecto

### Stack

- **This plugin repo**: unchanged — still markdown-only `commands/`+`skills/`, no runtime of its own. This spec adds one new capability class to it: a **hooks/** directory (Claude Code's plugin hook mechanism — `PostToolUse` hooks that shell out to a script) and a **board-app boilerplate** (`skills/conclave/board-app/`, plain files copied verbatim, not executed by this repo).
- **Scaffolded into the target repo** (new, mandated stack — not detected/negotiated, mirroring the QA-UAT feature's precedent of a Conclave-mandated toolchain rather than "detect what's there"): Next.js (App Router, latest major at scaffold time), `shadcn/ui`, Tailwind CSS, `next/font/google`'s Poppins, and `gray-matter` (or an equivalent frontmatter parser) inside `generate-data.mjs`.
- **No LLM involvement in the update loop.** The hook's regeneration step is a deterministic Node script — markdown-frontmatter-in, JSON-out. This is a departure from every other Conclave capability (which are all prose-orchestrated subagents) and is intentional: keeping the board's "does it reflect the latest state" path fast and offline-capable, with no `Agent` call and no API cost.

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave plugin | 0.4.0 → **0.5.0** (this change) | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `conclave_version` (per-install artifact schema) | 0.3.0 → **0.5.0** | `skills/conclave/templates/config.template.md` |
| Next.js (scaffolded into target repo) | latest major at scaffold time — no pin mandated by Conclave itself | Target repo's own `conclave-board/package.json` |
| `shadcn/ui`, Tailwind CSS, `gray-matter` (scaffolded) | latest at scaffold time | Target repo's own `conclave-board/package.json` |
| Claude Code plugin hooks (`hooks/hooks.json`) | current Claude Code hook schema | To be confirmed against Claude Code's own hook documentation at implementation time — this spec describes the required *behavior* (fire on Write/Edit, filter by touched path, shell out to a script), not a hard-coded JSON schema that may drift |

### Patrones existentes a respetar

- **Command scaffolds once, is idempotent, refuses a second run**: same shape as `/conclave-init` (`commands/conclave-init.md:24` — "If `$REPO_ROOT/conclave/config.md` already exists, stop... Do not overwrite"). `/conclave-board` refuses if `conclave-board/` already exists, pointing the user at editing `conclave/team/board.md` and re-running the app instead.
- **Markdown config, frontmatter for structure**: `board.md` follows the same `status: living` / `last_updated_at` shape as `roster.md` and `testing-environments.md` (`skills/conclave/templates/roster.template.md:1-4`).
- **Mandated toolchain over detection**: reuses the QA-UAT-generation spec's precedent (`docs/specs/qa-uat-generation/spec.md` §3, "Patrones existentes a respetar") of Conclave fixing a specific stack rather than detecting the project's existing one — appropriate here too, since `conclave-board/` is a wholly new, Conclave-owned directory with no pre-existing tooling to conflict with.
- **Generated artifacts are derived, never hand-edited, and never the source of truth**: `board-data.generated.json` is exactly this pattern, same posture as `conclave/context/` snapshots (`skills/conclave/SKILL.md` §2, "Snapshot context").
- **Plugin hooks already exist as a mechanism in this ecosystem**: other Claude Code plugins ship `hooks/*.json` plus a hook script invoked by tool name (e.g. a `PostToolUse` hook on `Write`/`Edit`) — this spec's hook follows that same shape, scoped to this plugin only (installed alongside Conclave, not global).

## 4. Dependencias previas

- [ ] `commands/conclave-init.md`, `skills/conclave/templates/roster.template.md`, `skills/conclave/templates/story.template.md`, `skills/conclave/templates/sprint-meta.template.md` exist in their current shipped form (they do) — the data-generation script's parser is written against these exact frontmatter schemas.
- [ ] The story `discipline` enum (`frontend | backend | qa | design | devops | mobile | multi`) and the status enum (`backlog | ready | in-progress | review | verified | done`) are stable (they are, per ADR-001 and the QA-UAT-generation change) — the board's columns and per-discipline card styling key off these exact values.
- [ ] Claude Code's plugin hook mechanism supports a `PostToolUse` hook matching `Write`/`Edit` tool calls, with the hook script able to read which file path was touched (from the tool call's input) — assumed available; exact hook JSON schema to be confirmed against Claude Code's own docs at implementation time (see §3 versions table).
- [ ] Node.js is available in the environment where `/conclave-board` and the regeneration hook run (true for any Claude Code + `npm`-based workflow; not a new assumption Conclave doesn't already make for its QA-UAT `npm`/`newman`/`playwright` bootstrap).

## 5. Arquitectura

### Patron

Two new elements, layered on top of the existing prose-orchestrated-subagent pattern without changing it: (a) a **scaffolding command** (`/conclave-board`, one-shot, idempotent, no subagent involved — it's a file-copy + template-render operation, not a role-charter delegation) and (b) a **deterministic background sync** (a Claude Code hook that shells out to a plain Node script whenever `conclave/` changes — no `Agent` call, no role charter).

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| Commands (`commands/conclave-board.md`) | Yes (new) | Scaffolds `conclave-board/` and `conclave/team/board.md`; refuses on a second run. |
| Hooks (`hooks/hooks.json`, `hooks/regenerate-board-data.sh`) | Yes (new) | Fires on every `Write`/`Edit`; regenerates board data when the touched path is under `conclave/` and the board is scaffolded; no-ops otherwise. |
| Board-app boilerplate (`skills/conclave/board-app/`) | Yes (new) | Source-of-truth for what gets copied into the target repo's `conclave-board/` — Next.js pages/components/scripts, not executed inside this plugin repo. |
| Templates (`skills/conclave/templates/board.template.md`) | Yes (new) | Renders `conclave/team/board.md`. |
| Target repo, outside `conclave/` | Yes | New `conclave-board/` directory: a full Next.js app plus its own `node_modules`/build output (gitignored by the scaffold, same as any Next.js app). |
| Role charters (`skills/conclave/agents/*.md`) | No | No subagent is involved in scaffolding or regenerating the board — this is the one Conclave capability that is *not* prose-orchestrated, by design (§3). |
| `skills/conclave/SKILL.md`, repo docs, site docs | Yes | New directory-layout entry, new command reference, new config-file documentation. |

### Flujo esperado

**`/conclave-board` (first and only normal run):**

1. Resolve `REPO_ROOT` (`git rev-parse --show-toplevel`); confirm `conclave/config.md` exists (suggest `/conclave-init` and stop if not).
2. If `conclave-board/` already exists, refuse: *"conclave-board/ already exists. Edit `conclave/team/board.md` to re-brand it, then re-run its dev server — there's nothing else to scaffold."*
3. Copy `skills/conclave/board-app/**` verbatim into `$REPO_ROOT/conclave-board/`.
4. Render `skills/conclave/templates/board.template.md` → `conclave/team/board.md` (placeholder company name/logo/colors, `TBD`-style, same pattern as `testing-environments.template.md`).
5. Run the data-generation script once (`node conclave-board/scripts/generate-data.mjs`) so the board has real data the very first time someone runs it, instead of an empty shell.
6. Report: where `conclave-board/` was created, that `conclave/team/board.md` needs real branding values, and the two commands to see the board — `cd conclave-board && npm install && npm run dev`.
7. Does **not** commit — same as `/conclave-init` (`commands/conclave-init.md` §"Report", "Do not auto-commit").

**The regeneration hook (fires on every `Write`/`Edit` tool call, for the lifetime of the Claude Code session, once this plugin is installed):**

1. Read the touched file path from the tool call.
2. If the path is not under `$REPO_ROOT/conclave/`, exit immediately (no-op, negligible cost).
3. If `$REPO_ROOT/conclave-board/scripts/generate-data.mjs` does not exist (board never scaffolded, or a repo without a board), exit immediately.
4. Otherwise run `node conclave-board/scripts/generate-data.mjs` in the background/synchronously (implementation detail to confirm — should not visibly block the user's turn) and log a one-line summary (`Regenerated board data: N stories across M sprints`) or a warning if any file failed to parse.

**The board app itself (`npm run dev`, running locally):**

1. On load, reads `conclave-board/data/board-data.generated.json` (server component / build-time read — no client-side fetch of `conclave/` markdown directly).
2. Reads `conclave/team/board.md`'s frontmatter for branding — same read, applied to the Tailwind theme (`primary_color`/`accent_color`) and the header (company name/logo).
3. Renders one shadcn/ui `Card` per story, grouped into one column per `status`, styled by `discipline`, with a sprint switcher when more than one sprint exists in the data.
4. Next.js's own dev-server file-watching picks up changes to `board-data.generated.json` (written by the hook) and hot-reloads — this is the entire "stays current" mechanism; no polling code is written by Conclave.

### Layout de archivos nuevos

```
(this plugin repo)
commands/
  conclave-board.md                     # NUEVO
hooks/
  hooks.json                            # NUEVO — registers the PostToolUse hook
  regenerate-board-data.sh              # NUEVO — the hook script
skills/conclave/
  templates/
    board.template.md                   # NUEVO
  board-app/                            # NUEVO — boilerplate copied verbatim into target repos
    package.json
    next.config.mjs
    app/... (layout, page, globals.css)
    components/... (shadcn/ui-based Kanban column/card components)
    scripts/generate-data.mjs
    lib/theme.ts                        # reads board.md at build/dev time

(in the TARGET repo, written once by /conclave-board)
conclave-board/                         # sibling of conclave/, application code
  ...copied from skills/conclave/board-app/, plus...
  data/
    board-data.generated.json           # git-ignored, regenerated by the hook
conclave/team/
  board.md                              # NUEVO — branding config
```

## 6. Archivos a crear o modificar

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `commands/conclave-board.md` | NUEVO | Scaffold `conclave-board/` + `conclave/team/board.md`, idempotent | `commands/conclave-init.md` (idempotency check, "does not commit" guardrail) |
| `skills/conclave/templates/board.template.md` | NUEVO | Branding config template | `skills/conclave/templates/testing-environments.template.md` (placeholder-with-TBD pattern) |
| `skills/conclave/board-app/**` | NUEVO | Next.js + shadcn/ui boilerplate copied into target repos | n/a — new boilerplate tree, not modeled on an existing Conclave template since it's application code, not a markdown artifact |
| `hooks/hooks.json` | NUEVO | Registers the `PostToolUse` hook | n/a — first hook this plugin ships |
| `hooks/regenerate-board-data.sh` | NUEVO | Path-filters and shells out to the generation script | n/a |
| `skills/conclave/SKILL.md` | MODIFICAR | §2 directory layout note (board.md), §3 role table unaffected, §5 templates list, a short new section on the hook | n/a |
| `README.md` | MODIFICAR | New command in the shipped-commands list | Existing per-command bullet list |
| `CHANGELOG.md` | MODIFICAR | New `[Unreleased]`/version entry | Existing entries' shape |
| `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | MODIFICAR | Version bump to `0.5.0` | Prior bumps |
| `site/content/en/commands/board.mdx`, `site/content/es/commands/board.mdx` | NUEVO | Command reference, both locales | `site/content/{en,es}/commands/qa.mdx` |
| `site/content/en/configuration.mdx`, `site/content/es/configuration.mdx` | MODIFICAR | Document `board.md`'s schema | Existing `testing-environments.md` subsection added for the QA-UAT feature |
| `site/content/en/commands/_meta.js`, `site/content/es/commands/_meta.js` | MODIFICAR | Add `board` nav entry | Existing entries |

### Detalle por archivo

#### `commands/conclave-board.md`

- Frontmatter `allowed-tools`: `Bash(git rev-parse:*)`, `Bash(ls:*)`, `Bash(mkdir:*)`, `Bash(cp:*)`, `Bash(node:*)`, `Read`, `Write`.
- Steps exactly as in §5's "Flujo esperado."
- **No mezclar**: does not touch `conclave/config.md`, `roster.md`, or any story file — its write surface is `conclave-board/` (new directory) and one new file, `conclave/team/board.md`.

#### `skills/conclave/templates/board.template.md`

```markdown
---
status: living
last_updated_at: "{{iso_date}}"
---

# Board branding

Controls how `conclave-board/` (the Kanban board app) presents your company's brand. Edit and save — the board's dev server picks up the change on next reload; no regeneration step needed for these fields (they're read live by `lib/theme.ts`, unlike story data which goes through the generated JSON snapshot).

- **Company name:** TBD
- **Logo:** TBD (path relative to `conclave-board/public/`, or a URL)
- **Primary color:** TBD (hex, e.g. `#4F46E5`)
- **Accent color:** TBD (hex)

## How to update

Edit the values above, save. `npm run dev` inside `conclave-board/` reflects the change on the next hot reload.
```

- **No mezclar**: no font field — Poppins is fixed (§2, explicit user decision), not exposed here.

#### `skills/conclave/board-app/scripts/generate-data.mjs` (representative — the core new logic)

- Walks `conclave/sprints/*/meta.md` (sprint id, title, status), `conclave/sprints/*/stories/US-NNN-*.md` (id, title, status, discipline, assignee, priority, estimate, sprint), and `conclave/team/roster.md` (to resolve `assignee` handles to display names).
- Never throws on a single malformed file — logs a warning with the file path and skips it, so one bad story never blanks the whole board (see §11 Edge cases).
- Writes `conclave-board/data/board-data.generated.json`, shape: `{ generatedAt, sprints: [{ id, title, status, stories: [{ id, title, status, discipline, assignee: { name, handle } | null, priority, estimate }] }] }`.
- **No mezclar**: this script does not read `conclave/product/backlog.md` or `architecture.md` — the board is a sprint/story view, not a backlog or architecture viewer, in this phase.

#### `hooks/hooks.json` + `hooks/regenerate-board-data.sh`

- `hooks.json` registers a `PostToolUse` hook matching `Write` and `Edit` tool calls, invoking `regenerate-board-data.sh` with whatever path/argument Claude Code's hook contract provides for the touched file (to be confirmed against current Claude Code hook documentation — §3, §4).
- `regenerate-board-data.sh`: two guard clauses (touched path under `conclave/`? board scaffolded in this repo?) then `node conclave-board/scripts/generate-data.mjs`. Exits `0` in every no-op case — a hook must never fail the user's actual `Write`/`Edit` call.
- **No mezclar**: this hook does not touch any other plugin behavior — it is inert (no-op) for every repo that hasn't run `/conclave-board`.

## 7. API Contract

Sin API surface — no aplica. The board reads a local, statically-generated JSON file and local markdown; there is no HTTP endpoint of any kind, no server component talking to a remote service.

## 8. Criterios de exito

- [ ] `/conclave-board` on a repo with an existing `conclave/` scaffolds `conclave-board/` and `conclave/team/board.md`, and running `npm install && npm run dev` inside `conclave-board/` shows a working board with real data from the current sprint(s).
- [ ] Running `/conclave-board` a second time refuses with a clear message, makes no changes.
- [ ] Editing any story file's `status` (e.g. via `/conclave-dev`, `/conclave-qa`, or a manual edit) while the board's dev server is running causes the card to move column on the next hot reload, with no manual command run by the user.
- [ ] Editing `conclave/team/board.md`'s company name/logo/colors changes the board's branding on the next hot reload.
- [ ] A single malformed story file (e.g. missing `status`) is skipped with a logged warning; every other story still renders.
- [ ] A repo with two sprints (one `active`, one `archived`) shows a sprint switcher; each sprint's board only shows its own stories.
- [ ] The hook does nothing measurable (no error, no output) on a repo where `/conclave-board` was never run.
- [ ] No secret or credential value is ever read or written by any part of this feature (there are none in scope — board.md is branding only).

### Tests requeridos

No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands"). All scenarios above are verified manually.

### Comandos de verificacion

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave   # restart Claude Code after this

# In a scratch target repo with /conclave-init and /conclave-spec already run:
#   1. /conclave-board -> confirm conclave-board/ and conclave/team/board.md are created
#   2. cd conclave-board && npm install && npm run dev -> confirm the board loads with real stories
#   3. Re-run /conclave-board -> confirm it refuses
#   4. With the dev server still running, hand-edit a story file's `status` field, save ->
#      confirm the hook fires (check its log line) and the card moves column without restarting `npm run dev`
#   5. Edit conclave/team/board.md's company_name -> confirm the header updates on reload
#   6. Corrupt one story file's frontmatter (remove `status:`) -> confirm the board still renders
#      every other story, with a warning printed by the hook/script, not a crash
#   7. Create a second sprint -> confirm the sprint switcher appears and filters correctly
```

## 9. Criterios de UX

### Loading

The board's initial load (before `board-data.generated.json` exists, e.g. a hook race or first-ever `npm run dev` before `/conclave-board`'s Step 5 ran) shows a shadcn/ui skeleton per column, not a blank page or a crash.

### Formularios

No aplica — the board has no forms in this read-only phase.

### Passwords

No aplica.

### Errores

- `board-data.generated.json` missing entirely → empty-state message: *"No board data yet — run `/conclave-board` from Claude Code, or check that `conclave/sprints/` has at least one sprint."*
- A story fails to parse → excluded from the board, not a page-level error; the terminal running the hook/script shows the warning.
- `conclave/team/board.md` missing → board renders with a generic default brand (no company name/logo, a neutral default accent color) rather than failing to load.

### Navegacion

A sprint switcher (a shadcn/ui `Select` or `Tabs`) when more than one sprint exists in the generated data; single-sprint repos show the board directly with no switcher chrome.

### Accesibilidad

Standard shadcn/ui accessibility defaults (Radix-based primitives — keyboard navigation, ARIA roles) apply as-is; no additional a11y work is specified beyond using the library's components as intended.

## 10. Decisiones tomadas

| Decision | Why |
|---|---|
| The board lives in a new **`conclave-board/`** directory, a sibling of `conclave/`, not inside it | `conclave/`'s markdown-only invariant (`SKILL.md` §2) is structural to the rest of Conclave; a Next.js app with `node_modules` cannot live inside it without breaking that invariant for every other command that walks the directory. Explicit user decision — "vive en el proyecto donde está conclave" — interpreted as sibling, not nested, to preserve the existing invariant. |
| Stack is **Next.js + shadcn/ui + Tailwind + Poppins**, mandated, not detected | Explicit user decision, and consistent with the QA-UAT-generation spec's precedent of fixing a toolchain for a wholly new Conclave-owned surface rather than negotiating with whatever the target repo already uses (which, for a brand-new `conclave-board/` directory, is nothing anyway). |
| Update mechanism is a **Claude Code plugin hook**, not CI, not polling, not a server | Explicit user decision — "correrlo localmente como post hook en claude code" — chosen over the CI-based option this session offered, and over any live-server/WebSocket approach that would require Conclave to run infrastructure it has never run anywhere else. |
| The hook regenerates a **derived JSON snapshot**, and the Next.js app reads that snapshot (not `conclave/` markdown directly) at render time | Keeps the expensive part (parsing N markdown files) out of the request/render path, mirrors the existing "snapshot context" pattern (`SKILL.md` §2), and gives the hook a single, testable side effect. |
| Board columns are **one per story `status`**, matching the existing state machine exactly | Explicit user decision (recommended option chosen) — reuses a concept the team already understands from `state-machine.mdx` instead of inventing a second taxonomy. |
| Cards show **full story data** (ID, title, discipline, assignee, priority, estimate, sprint) | Explicit user decision (recommended option chosen) — all of this already exists in `story.template.md`'s frontmatter; no new fields invented. |
| Branding customization lives in **`conclave/team/board.md`**, markdown with frontmatter | Explicit user decision (recommended option chosen) — keeps the one human-editable config surface inside Conclave's existing markdown convention, consistent with `roster.md`/`testing-environments.md`, rather than asking a non-technical stakeholder to edit a `.ts` theme file inside the Next.js app. |
| **Poppins is fixed**, not a `board.md` field | Explicit user instruction ("Font del board Poppins") stated as a given, not something to make configurable. |
| **Read-only in this phase** — no writing back to `conclave/` from the board | Avoids a second, UI-driven write path to story status that would need to duplicate the guardrails `/conclave-dev`/`/conclave-qa`/`/conclave-pr-review` already enforce (see Fuera de scope). |

## 11. Edge cases

### Datos invalidos

- A story file with a missing/invalid `status` (not one of the six known values) is excluded from every column and logged as a warning, not crashed on or defaulted into a column it doesn't belong in.
- An `assignee` handle in a story that has no matching row in `roster.md` renders the card with the raw handle string instead of a resolved display name — never a blank/undefined assignee field.

### API errors

No aplica — no API surface (§7).

### Sin conexion

No aplica — the board and its data pipeline are entirely local; there is no network dependency at runtime (Next.js fonts are the one exception if using `next/font/google`'s remote fetch at *build* time only, which is a one-time, non-interactive concern, not a runtime "offline" state).

### Timeout

The regeneration hook should complete well under any reasonable Claude Code hook timeout for a typical project's story count (tens, not thousands, of markdown files) — no explicit timeout value is mandated here, but the implementer should keep the script's own logic O(number of files), not something that could hang.

### Respuesta vacia o inesperada

- Zero sprints found → the board's empty state (§9 Errores).
- A sprint with zero stories → the sprint renders with all six columns empty, not an error.

### Doble submit

- Rapid successive `Write`/`Edit` calls to `conclave/` in quick succession (e.g. a command writing several story files back-to-back) may fire the hook multiple times in a row — each run is idempotent (same deterministic output for the same input), so redundant runs are wasted work, not a correctness problem. No debouncing is required for this phase.

## 12. Estados de UI requeridos

| Estado | Qué se muestra | Qué puede hacer el usuario |
|---|---|---|
| `idle` | Board with current data, columns populated | Switch sprint (if more than one), scroll, read cards |
| `loading` | Skeleton columns/cards (initial load only — this is a static-data app, not a live-fetching one, so this state is brief) | Wait |
| `success` | Same as `idle` | — |
| `error` | Board still renders with whatever valid data exists; a small inline notice if any file failed to parse | Fix the offending file, save, wait for the next hook-triggered regeneration |
| `empty` | Empty-state message (§9 Errores) when there is no sprint data at all | Run `/conclave-spec`/`/conclave-planning` to get data, or `/conclave-board` if not yet scaffolded |
| `disabled` | No aplica — no interactive controls exist to disable in a read-only board | — |
| `offline` | No aplica (§11 "Sin conexion") | — |

## 13. Validaciones

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| `board.md` primary/accent color | Should be a valid hex color; an invalid value falls back to a default rather than breaking the Tailwind theme | No blocking error shown — the board still renders with the fallback color |
| `board.md` company name/logo | Free text / path; empty or `TBD` renders a generic default header | No blocking error |

### Validaciones de servidor

No aplica — no server, no API (§7).

## 14. Seguridad y permisos

- **Secrets**: none in scope. `board.md` holds only branding values (name, logo path, colors) — never a credential, unlike `testing-environments.md` in the QA-UAT feature.
- **Sensitive payloads**: story titles/descriptions rendered on cards are exactly what's already committed to git in `conclave/sprints/**` — the board exposes nothing that a `git log`/file browse wouldn't already show a teammate with repo access.
- **Permission checks**: none — the board is a local dev server bound to the developer's own machine, same trust model as any other `npm run dev`.
- **Hook safety**: the regeneration hook must never fail or block the underlying `Write`/`Edit` tool call it's attached to — any error in the generation script is caught and logged, never propagated as a hook failure (see §11 Timeout, §8 criteria).

## 15. Observabilidad y logging

- **Log**: the hook prints one line per regeneration (`Regenerated board data: N stories across M sprints`) and one line per skipped/malformed file, to the terminal running Claude Code — the plugin's existing "logging" mechanism (plain stdout, no structured logging system).
- **Never log**: nothing sensitive to withhold in this feature (no secrets in scope, per §14).

## 16. i18n / textos visibles

No aplica para el UI del board en esta fase — ships English-only labels (see Fuera de scope, §2, for the reasoning). This plugin's own command/spec prose stays English per the existing convention (`docs/specs/*/spec.md` are all English).

## 17. Performance

- The data-generation script's cost scales with the number of markdown files under `conclave/sprints/`, expected to be small (tens to low hundreds of files) for any real sprint cadence — no caching/incremental-parsing strategy is mandated in this phase.
- The board app itself is a static-data Next.js app (no live API calls per render) — ordinary Next.js dev/build performance applies, nothing bespoke to specify.
- The hook fires on **every** `Write`/`Edit` tool call in every repo where this plugin is installed, not just repos with a board — its two guard clauses (§5, §6) must both be cheap path checks (a prefix match on `conclave/`, a file-existence check for `generate-data.mjs`) so the negligible-cost claim holds even in repos that never run `/conclave-board` or whose edits are unrelated to `conclave/`.

## 18. Restricciones

The implementer must NOT:

- [ ] Put any part of the Next.js application inside `conclave/` itself — it must live in the sibling `conclave-board/` directory.
- [ ] Make the board write to any file under `conclave/` — read-only in this phase.
- [ ] Add a CI/CD workflow, a hosting/deploy step, or any server component — local dev/build only.
- [ ] Make the regeneration hook call an LLM/`Agent` — it must be a deterministic, non-AI script.
- [ ] Let the hook fail or block the `Write`/`Edit` call it's attached to, under any circumstance.
- [ ] Invent a new story-status value for the board's columns — reuse the existing six exactly.
- [ ] Add a font-family field to `board.md` — Poppins is fixed.
- [ ] Skip the `CHANGELOG.md` entry or the doc updates this change requires per `CLAUDE.md`.

## 19. Entregables

- [ ] `commands/conclave-board.md`, `skills/conclave/templates/board.template.md`, `skills/conclave/board-app/**` (boilerplate).
- [ ] `hooks/hooks.json` and `hooks/regenerate-board-data.sh`.
- [ ] `SKILL.md`, `README.md`, `CHANGELOG.md`, both locales' `commands/board.mdx` and `configuration.mdx` updates, both locales' `commands/_meta.js`.
- [ ] Version bumps (`conclave_version`, `plugin.json`, `marketplace.json`) to `0.5.0`.
- [ ] Manual verification per §8 completed and reported (no automated tests exist to add).

## 20. Checklist final para el agente

Before delivering, verify:

- [ ] Read this spec end-to-end.
- [ ] Confirmed all prerequisites (§4) are satisfied, including checking Claude Code's current hook schema before writing `hooks.json`.
- [ ] Modified/created only files listed in §6 (plus the doc/CHANGELOG updates §19 requires).
- [ ] Every acceptance-criteria checkbox in §8 verified manually via the commands in "Comandos de verificacion."
- [ ] Every edge case in §11 handled in the actual generation script/hook, not just acknowledged here.
- [ ] The board never writes to `conclave/`.
- [ ] The hook never fails the underlying tool call, and no-ops cleanly on repos without a scaffolded board.
- [ ] No secret or credential ever enters `board.md` or the generated JSON.
- [ ] No locked decision from §10 changed without flagging it back to the user first.
- [ ] `CHANGELOG.md` and the named doc pages reflect the new command and config file.
- [ ] No temporary notes, TODOs, or scratch files left in `docs/`, `commands/`, `hooks/`, or `skills/`.
