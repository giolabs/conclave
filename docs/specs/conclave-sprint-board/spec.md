# `/conclave-sprint-board` — Local Self-Contained HTML Roadmap Board

> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.

Architecture decision: `docs/adr/ADR-003-local-self-contained-visual-sprint-board.md` (accepted). This spec implements that ADR.

## 1. Objetivo *(Goal)*

Give Conclave teams a **roadmap / sprint-progress board** they can open with a double-click (`file://`) — no npm, no CDN, no mandatory server — answering “where are we on the timeline?” with three tabs: **Roadmap**, **Tasks**, and **Analytics**.

`/conclave-sprint-board` discovers real sprints and stories from the target repo’s `conclave/` directory, maps Conclave statuses into a coarse board model, and writes a derived snapshot to `docs/sprint-board/index.html` (+ `README.md`). It is **complementary** to `/conclave-board` (the Next.js status Kanban): Kanban = delivery-loop columns; Sprint Board = phases, checklists, and CSS analytics. Neither replaces the other; neither writes story/sprint source-of-truth files.

## 2. Alcance *(Scope)*

### Incluido en esta fase

- **New command** `commands/conclave-sprint-board.md` — no positional args, no flags in v1. Always writes to `$REPO_ROOT/docs/sprint-board/` (locked user decision). Re-runs **overwrite** `index.html` and `README.md`.
- **New skill** `skills/conclave/visual-sprint-board/SKILL.md` — discovery protocol, data model, design rules, HTML skeleton contract (Conclave-tuned from the Visual Sprint Board brief).
- **New template** `skills/conclave/templates/sprint-board.html.template` — full self-contained HTML shell with named `{{project}}`, `{{accent}}`, `{{accent_600}}`, `{{accent_soft}}`, `{{snapshot_iso}}`, and marked regions `<!-- {{KPI_TILES}} -->`, `<!-- {{PHASE_SECTIONS}} -->`, `<!-- {{TASK_BLOCKS}} -->`, `<!-- {{ANALYTICS}} -->` that the orchestrator replaces with concrete HTML (never leave sample `US-NNN` ids in the checked-in template).
- **Target outputs** (in the *target* repo, not this plugin repo): `docs/sprint-board/index.html`, `docs/sprint-board/README.md`.
- **Status mapping** per ADR-003 (locked):
  - Sprint: `done|archived` → `done`; `active` → `active`; `draft` → `planned`
  - Story: `done|verified` → `done`; `in-progress|review` → `active`; `ready|backlog` → `planned`; `retired` → `retired` (excluded from coverage numerators)
- **Phases**: single phase titled **`Delivery`** containing all discovered sprints in chronological ID order (locked user decision). Never invent sprint IDs.
- **Accent cascade** (locked): user prompt override (if the invocation message names a hex) → target `DESIGN.md` / theme tokens if present → `conclave/team/board.md` `primary_color` if valid hex → fallback **`#C45C26`** (documented sober non-cliché accent).
- **Task UI**: mapped status pill **plus** raw Conclave `status` as subtitle/secondary text (locked).
- **Bugs**: **omit** `BUG-NNN` from the board in v1 (ADR default).
- **UI**: three tabs (Roadmap / Tasks / Analytics), theme toggle with `localStorage`, `prefers-color-scheme` + `data-theme`, keyboard tablist, `prefers-reduced-motion`, tabular-nums, system font stack (no CDN webfonts).
- **Cursor twin**: `platforms/cursor/commands/conclave-sprint-board.md` + sync of skill/template assets (extend `scripts/sync-cursor-platform.sh` as needed for `visual-sprint-board/`).
- **Docs**: `SKILL.md`, `README.md`, `CHANGELOG.md`, `site/content/{en,es}/commands/sprint-board.mdx`, clarify vs `board.mdx`, `_meta.js` nav entries both locales.
- **Version bump**: plugin manifests + `conclave_version` **0.11.0 → 0.12.0**; ADR-003 status → `accepted` on ship.

### Fuera de scope

- **Replacing or modifying `/conclave-board`**, `skills/conclave/board-app/`, or the PostToolUse board regenerate hook.
- **Optional `[output-dir]`**, `--force`, `--include-bugs`, or any CLI flags (explicit user decision — always `docs/sprint-board/`).
- **Auto-refresh hooks** for the HTML board (future ADR).
- **Including `BUG-NNN`** in the board (deferred).
- **Multi-phase discovery** from ROADMAP.md / MVP docs (user chose single `Delivery` phase).
- **CDN webfonts, Chart.js, npm, build step**, or writing HTML under `conclave/`.
- **Writing back** to story/sprint frontmatter from the board (read-only derived view).
- **i18n of board chrome** — English tab labels in the HTML (`Roadmap` / `Tasks` / `Analytics`); docs site pages remain bilingual EN/ES.
- **Non-Conclave-only mode as a slash command path** — the skill text may describe generic discovery for other tools, but `/conclave-sprint-board` requires `conclave/config.md` and reads `conclave/sprints/**` first.
- **Drag-and-drop**, auth, multi-repo aggregation.

## 3. Tecnologias y convenciones del proyecto *(Technologies & conventions)*

### Stack

- **Plugin logic**: markdown commands + skill prose + HTML template — no Node runtime inside the plugin for generation (orchestrator fills the template).
- **Deliverable**: single HTML file with inline CSS + vanilla JS IIFE (~tabs + theme).
- **Data**: YAML frontmatter in `conclave/sprints/*/meta.md` and `stories/US-*.md` (same schemas as `/conclave-board`’s generator reads).
- **Dual package**: Claude Code root + Cursor `platforms/cursor/` (ADR-002).

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave Claude Code plugin | 0.11.0 → **0.12.0** | `.claude-plugin/plugin.json`, `marketplace.json` |
| Conclave Cursor plugin | 0.11.0 → **0.12.0** | `platforms/cursor/.cursor-plugin/plugin.json` |
| `conclave_version` | → **0.12.0** | `skills/conclave/templates/config.template.md` |
| ADR-003 | proposed → **accepted** on ship | `docs/adr/ADR-003-…` |
| Existing Kanban board | unchanged (v0.5.0+) | `commands/conclave-board.md` |

### Patrones existentes a respetar

- **Derived, never source of truth** — same posture as `conclave/context/` snapshots and `conclave-board/data/*.generated.json`.
- **Outside `conclave/` for non-markdown apps/views** — sibling to Kanban’s `conclave-board/` precedent; HTML goes under `docs/sprint-board/`.
- **Overwrite refresh** — unlike `/conclave-board`’s refuse-if-exists scaffold; closer to regenerating a snapshot.
- **No LLM required for correctness** — discovery is file read + map + template fill (orchestrator may be an LLM session, but no role-charter Agent call is required).
- **Doc/CHANGELOG parity** per `CLAUDE.md`.

## 4. Dependencias previas *(Prerequisites)*

- [ ] Target repo has `conclave/config.md` (initialized).
- [ ] At least one `conclave/sprints/SPRINT-NNN/meta.md` (command may still run with zero sprints → empty-state board; prefer documenting empty UI).
- [ ] Story frontmatter schema includes `status` / `title` / `id` as in `story.template.md`.
- [ ] ADR-003 accepted decisions remain in force.
- [ ] ADR-002 Cursor packaging in place for the twin command.
- [ ] `scripts/sync-cursor-platform.sh` available to extend for the new skill folder.

## 5. Arquitectura *(Architecture)*

### Patron

**Scaffold-free derived artifact command** (no subagent charter required): orchestrator reads Conclave markdown → normalizes `board` JS data model → fills HTML template → writes files. Complements the existing **scaffold + hook** Kanban pattern without sharing its Next.js stack.

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| `commands/conclave-sprint-board.md` | Yes (NEW) | Generation steps |
| `platforms/cursor/commands/conclave-sprint-board.md` | Yes (NEW) | Cursor port |
| `skills/conclave/visual-sprint-board/SKILL.md` | Yes (NEW) | Discovery + design contract |
| `skills/conclave/templates/sprint-board.html.template` | Yes (NEW) | HTML shell |
| `skills/conclave/SKILL.md` | Yes | Register command + template |
| `scripts/sync-cursor-platform.sh` | Yes | Sync skill folder / template |
| `commands/conclave-board.md` / `board-app/` | No | Untouched |
| Agent charters | No | No new role |

### Flujo esperado

1. User runs `/conclave-sprint-board` in a target repo (Claude Code or Cursor).
2. Resolve `REPO_ROOT`; require `conclave/config.md`; else suggest `/conclave-init` and stop.
3. Glob `conclave/sprints/SPRINT-*/meta.md`; for each sprint glob `stories/US-*.md` (skip `retired` from coverage math but still list as retired tasks).
4. Resolve project name from `conclave/config.md` `project_name` (fallback: basename of `REPO_ROOT`).
5. Resolve accent via cascade (§2); derive soft/dark variants for CSS tokens.
6. Build one phase object: `eyebrow: "Roadmap"`, `title: "Delivery"`, `note:` snapshot ISO date + sprint count, `sprints:` array sorted by sprint id ascending.
7. Compute KPIs and analytics tiles/bars from mapped statuses (`retired` listed in Tasks but excluded from coverage numerators/denominators used for %).
8. Read `sprint-board.html.template`; substitute `{{…}}` tokens; **expand all sprint/task/KPI markup into the HTML DOM during fill** — keep inline JS only for tab switching and theme toggle (no runtime JSON board object required).
9. Write `docs/sprint-board/index.html` and `README.md` (how to open, how to refresh via re-running the command, snapshot date).
10. Print paths + `open docs/sprint-board/index.html` hint. Never commit for the user.

### Layout de archivos nuevos

```
commands/conclave-sprint-board.md
platforms/cursor/commands/conclave-sprint-board.md
skills/conclave/visual-sprint-board/SKILL.md
skills/conclave/templates/sprint-board.html.template
site/content/en/commands/sprint-board.mdx
site/content/es/commands/sprint-board.mdx
# target repo after run:
docs/sprint-board/index.html
docs/sprint-board/README.md
```

## 6. Archivos a crear o modificar *(Files to create / modify)*

| Ruta | Accion | Proposito | Ejemplo a seguir |
|---|---|---|---|
| `commands/conclave-sprint-board.md` | NUEVO | Command steps | `commands/conclave-board.md` (workspace resolve) + generation posture of context snapshots |
| `platforms/cursor/commands/conclave-sprint-board.md` | NUEVO | Cursor twin | other `platforms/cursor/commands/conclave-*.md` |
| `skills/conclave/visual-sprint-board/SKILL.md` | NUEVO | Discovery + UX contract | Visual Sprint Board brief + `SKILL.md` tone |
| `skills/conclave/templates/sprint-board.html.template` | NUEVO | HTML shell | brief appendix skeleton |
| `skills/conclave/templates/sprint-board-readme.template.md` | NUEVO | Target README body | short; or inline in command — prefer template |
| `skills/conclave/SKILL.md` | MODIFICAR | Register command/template; contrast with §7 Kanban | existing §7 board section |
| `scripts/sync-cursor-platform.sh` | MODIFICAR | Sync `visual-sprint-board/` (+ template already covered) | current sync script |
| `scripts/generate-cursor-platform.py` | MODIFICAR if needed | Port new command | existing generator |
| `.claude-plugin/plugin.json`, `marketplace.json` | MODIFICAR | 0.12.0 + mention command | current |
| `platforms/cursor/.cursor-plugin/plugin.json` | MODIFICAR | 0.12.0 | current |
| `skills/conclave/templates/config.template.md` | MODIFICAR | `conclave_version` 0.12.0 | current |
| `README.md`, `CHANGELOG.md` | MODIFICAR | Quick start + release notes | existing |
| `site/content/{en,es}/commands/sprint-board.mdx` | NUEVO | User docs | `board.mdx` contrast |
| `site/content/{en,es}/commands/_meta.js` | MODIFICAR | Nav entry | existing |
| `docs/adr/ADR-003-…` | MODIFICAR | Status accepted on ship | — |

### Detalle por archivo

#### `commands/conclave-sprint-board.md`

- **Responsabilidad**: numbered steps for discovery, mapping, template fill, write, report.
- **Ejemplo a seguir**: `conclave-board.md` Steps 1–2 (workspace); do **not** copy refuse-if-exists.
- **No mezclar**: Agent/Task role delegation; Kanban scaffold; bug inclusion; output-dir args.

#### `skills/conclave/templates/sprint-board.html.template`

- **Responsabilidad**: complete offline HTML; tokens; three panels; a11y; theme JS.
- **No mezclar**: remote `<script src=` / `<link href=http`; Next.js; invented sample US-IDs in the checked-in template (use `{{…}}` only).

#### `skills/conclave/visual-sprint-board/SKILL.md`

- **Responsabilidad**: agent-facing methodology for this generator (also usable if someone attaches the skill without the slash command).
- **No mezclar**: Kanban `/conclave-board` instructions.

## 7. API Contract

Sin API surface -- no aplica.

No HTTP API. No `api-contract.md`.

## 8. Criterios de exito *(Success criteria)*

- [ ] `/conclave-sprint-board` on a repo with active conclave data creates `docs/sprint-board/index.html` + `README.md`.
- [ ] Opening `index.html` via `file://` shows all three tabs without network.
- [ ] KPI/Analytics numbers match the ADR mapping on a fixture with known story statuses.
- [ ] Re-run after changing a story `status` updates the HTML (overwrite).
- [ ] `/conclave-board` / `conclave-board/` unchanged by the command.
- [ ] Invalid/missing `primary_color` falls back to `#C45C26` without crashing.
- [ ] Zero-sprint install produces a clear empty state (not a crash).
- [ ] Cursor twin works after sync/port.
- [ ] Docs site builds; version strings are `0.12.0`.

### Tests requeridos

| Test file | Scenarios |
|---|---|
| *(none automated)* | Manual smoke matrix below |

### Comandos de verificacion

```bash
# In a scratch target repo with conclave/ initialized and ≥1 sprint:
# /conclave-sprint-board
open docs/sprint-board/index.html   # or xdg-open

# Change a story status, re-run command, confirm HTML updated
# Confirm conclave-board/ untouched if present

./scripts/sync-cursor-platform.sh --check
cd site && npm run build
```

## 9. Criterios de UX *(UX criteria)*

### Loading

Print one line while discovering (`Scanning conclave/sprints…`) then write paths. No spinner UI in HTML beyond static content.

### Formularios

No aplica — no interactive forms in the generator command (no AskQuestion required for v1 defaults).

### Passwords

No aplica.

### Errores

- Missing `conclave/config.md`: suggest `/conclave-init`, stop.
- Unreadable story file: skip with a warning line listing the path; continue.
- Template missing in plugin: refuse with explicit path error.

### Navegacion

HTML: tablist with click + ←/→; theme toggle; no router.

### Accesibilidad

`role="tablist|tab|tabpanel"`, `aria-selected`, visible focus, `prefers-reduced-motion` disables pulses.

## 10. Decisiones tomadas *(Decisions made — locked)*

| Decision | Why |
|---|---|
| Coexist with `/conclave-board`; do not replace | ADR-003 — different questions (roadmap vs status columns) |
| Always `docs/sprint-board/`; no CLI args in v1 | Explicit user decision |
| Single phase `"Delivery"` | Explicit user decision — simplest honest fallback |
| Accent cascade ending in `#C45C26` | Explicit user decision |
| Raw Conclave status shown beside mapped pill | Explicit user decision / ADR mitigation of coarse mapping |
| Omit bugs in v1 | ADR-003 default |
| No auto-hook in v1 | ADR-003 — manual re-run |
| Version **0.12.0** | Explicit user decision |
| English chrome in HTML; bilingual docs site | Matches Kanban board i18n posture |
| Expand data into HTML; JS only tabs/theme | Simpler `file://`, fewer moving parts |

## 11. Edge cases

### Datos invalidos

- Unknown story `status`: treat as `planned`, warn once per file.
- Unknown sprint `status`: treat as `planned`, warn once.
- Invalid hex in `board.md`: ignore → next cascade step / fallback.

### API errors

No aplica — no HTTP API.

### Sin conexion

Fully supported — generation and viewing are offline.

### Timeout

No aplica — no network waits.

### Respuesta vacia o inesperada

Zero sprints: render empty Roadmap/Tasks/Analytics with “No sprints found — run `/conclave-spec` / `/conclave-planning`” copy.

### Doble submit

Two concurrent command runs may race on write; last writer wins. Document “don’t run twice in parallel.” No lock file.

## 12. Estados de UI requeridos *(Required UI states)*

| State | What is shown | User can… |
|---|---|---|
| idle | Default Roadmap tab | Switch tabs, toggle theme |
| loading | N/A in HTML (static file) | — |
| success | Populated KPIs/cards | Explore |
| error | N/A in HTML (generator fails in chat) | Re-run after fix |
| empty | Empty-state copy, KPIs at 0 | Init sprints then re-run |
| disabled | N/A | — |
| offline | Same as success/empty (file://) | Use normally |

## 13. Validaciones *(Validations)*

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| `conclave/config.md` | Must exist | Suggest `/conclave-init` |
| `primary_color` | Optional `#RRGGBB` | Silent fallback if invalid |
| Output dir | Fixed `docs/sprint-board/` | — |

### Validaciones de servidor

No aplica.

## 14. Seguridad y permisos *(Security & permissions)*

- **Secrets**: never embed env values from `testing-environments.md`; board shows titles/ids/status only.
- **Sensitive payloads**: none beyond already-committed markdown titles.
- **Permission checks**: none (local derived view).
- **401/403**: no aplica.

## 15. Observabilidad y logging *(Observability & logging)*

- **Log**: sprint count, story count, accent source (`prompt|design|board.md|fallback`), output paths, snapshot ISO time.
- **Never log**: tokens, full file bodies unnecessarily.
- **Mechanism**: terminal/chat lines (existing Conclave posture).

## 16. i18n / textos visibles *(i18n / user-facing copy)*

HTML chrome (English, hardcoded in template — same as Kanban English-only UI):

| Key | Texto |
|---|---|
| tab.roadmap | Roadmap |
| tab.tasks | Tasks |
| tab.analytics | Analytics |
| phase.delivery | Delivery |
| empty.sprints | No sprints found — run `/conclave-spec` / `/conclave-planning` |

Docs site EN/ES pages for the command (not the HTML chrome).

## 17. Performance

- Generation cost is O(sprints × stories) frontmatter reads — fine for typical Conclave sizes.
- HTML should avoid huge inline images; no remote fetches.
- Charts are CSS divs only.

## 18. Restricciones *(Restrictions / hard "do not" rules)*

The implementer must NOT:

- [ ] Modify `/conclave-board` or `board-app/` behavior.
- [ ] Write HTML under `conclave/`.
- [ ] Add CDN/script/link network dependencies.
- [ ] Invent `US-NNN` / `SPRINT-NNN` ids.
- [ ] Include bugs in v1.
- [ ] Add CLI output-dir / `--include-bugs` in v1.
- [ ] Add auto-hooks in v1.
- [ ] Ship mismatched Claude/Cursor versions.
- [ ] Skip CHANGELOG / site docs / SKILL registration.

## 19. Entregables *(Deliverables)*

- [ ] Command + Cursor twin + skill + HTML template + README template.
- [ ] Sync script update; version 0.12.0 everywhere required.
- [ ] Site EN/ES `sprint-board.mdx` + nav; README/CHANGELOG/SKILL updates.
- [ ] ADR-003 marked accepted.
- [ ] Manual smoke per §8.
- [ ] No `api-contract.md`.

## 20. Checklist final para el agente *(Final agent checklist)*

- [ ] Read this spec + ADR-003 end-to-end.
- [ ] Prerequisites present.
- [ ] Only §6 files touched (plus listed docs).
- [ ] Mapping table implemented exactly.
- [ ] `file://` works offline; tabs/theme/a11y ok.
- [ ] Kanban untouched; bugs omitted.
- [ ] Sync `--check` passes; site builds; versions `0.12.0`.
- [ ] No unjustified TODOs; no CDN.
