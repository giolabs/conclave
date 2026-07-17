# ADR-003: Local Self-Contained Visual Sprint Board (HTML)

- **Status**: accepted
- **Date**: 2026-07-17
- **Deciders**: lucasgio, Iosvany Alvarez, Giolabs, <author>
- **Tags**: sprint-board, roadmap, visualization, html, offline, conclave-board, analytics, local-first
- **Stack**: Conclave Claude Code / Cursor plugin (markdown commands + prose-orchestrated subagents); existing Kanban capability is Next.js + shadcn scaffolded into target repos (`skills/conclave/board-app/`, `/conclave-board`). Docs site: Next.js 16 + Nextra 4 (`site/`). No plugin application runtime beyond hooks + scaffolded artifacts.
- **Spec input**: Visual Sprint Board skill brief (local, self-contained HTML; tabs Roadmap / Tareas / Analíticas; project-agnostic discovery)

## Context

Teams using Conclave already have a **status Kanban** via `/conclave-board` (v0.5.0+): a Next.js app under `conclave-board/` that columns stories by the story state machine (`backlog → ready → in-progress → review → verified → done`, plus `retired`). That board requires `npm install` / `npm run dev`, ships a generated JSON snapshot, and answers “where is each story in the delivery loop?”

A separate need has surfaced: a **roadmap / sprint-progress board** that answers “where are we on the MVP timeline?”, with phases, per-sprint task checklists, and simple analytics — openable with a double-click (`file://`), **no CDN, no npm, no mandatory server**. The attached skill brief defines a fixed HTML/CSS/JS template and a discovery protocol that is **project-agnostic**: the agent finds sprints/stories/design tokens in the *target* repo and injects them into the template.

In *this* repository (the Conclave plugin), that raises a concrete architectural choice:

1. **How** to ship the capability (plugin slash command + skill vs. standalone Cursor/Claude skill only).
2. **How** it relates to the existing Next.js Kanban (replace vs. coexist).
3. **Where** generated HTML may live without violating `skills/conclave/SKILL.md` §2 (**markdown-only inside `conclave/`**).
4. **How** Conclave’s rich story status enum maps into the board’s coarser `done | active | planned` (+ `retired` for tasks).

Codebase facts:

- Sprint source of truth: `conclave/sprints/SPRINT-NNN/meta.md` (`status: draft | active | done | archived`) + `stories/US-NNN-*.md` frontmatter.
- Bugs live under `conclave/product/bugs/` and are out of sprint planning by design (v0.10.0 / ADR-adjacent bug work).
- Branding tokens already exist for the Kanban in `conclave/team/board.md` (`primary_color`, etc.) — useful fallback for accent discovery.
- No automated test suite for plugin markdown commands (manual smoke only), matching prior Conclave ADRs.
- No `.rules/` / `.cursor/rules/` architecture-encoding files — conventions come from `CLAUDE.md` + `SKILL.md` (same as ADR-001/002).

## Decision

**Ship a complementary “Visual Sprint Board” capability inside Conclave that generates a single self-contained HTML file (plus README) in the target repo, and keep `/conclave-board` Kanban unchanged.**

Concretely:

1. **Coexistence, not replacement.**  
   - `/conclave-board` → workflow Kanban (Next.js, status columns, hook-synced JSON).  
   - **Visual Sprint Board** → roadmap / phases / checklists / CSS analytics (one `index.html`, offline).  
   Different questions; both may exist in the same target repo.

2. **Delivery shape in this plugin.**  
   - New Agent Skill documenting the discovery protocol + HTML template contract (the attached brief, Conclave-tuned): e.g. `skills/conclave/visual-sprint-board/SKILL.md` (and synced into `platforms/cursor/` per ADR-002).  
   - New slash command **`/conclave-sprint-board`** (name locked for discoverability next to `/conclave-board`) whose steps: discover from `conclave/` (+ optional `DESIGN.md` / `CLAUDE.md` in the target), normalize to the board data model, write:
     - `docs/sprint-board/index.html` (or user-overridden path)  
     - `docs/sprint-board/README.md`  
   - Re-runs **overwrite** the generated HTML/README in that folder (derived view), never mutate story/sprint sources. Idempotent refresh, not “refuse if exists” (unlike `/conclave-board` scaffold).

3. **Output location.** Prefer **`docs/sprint-board/`** in the *target* repo (outside `conclave/`), so the markdown-only invariant for `conclave/` stays intact — same sibling-outside-`conclave/` posture as `conclave-board/`. Do **not** commit HTML into `conclave/`.

4. **Data mapping (locked).** When the target uses Conclave:

| Conclave source | Board model |
|---|---|
| Sprint `meta.status: done` (or `archived`) | sprint `status: done` |
| Sprint `meta.status: active` | sprint `status: active` |
| Sprint `meta.status: draft` | sprint `status: planned` |
| Story `done` \| `verified` | task `done` |
| Story `in-progress` \| `review` | task `active` |
| Story `ready` \| `backlog` | task `planned` |
| Story `retired` | task `retired` (tenuous; excluded from coverage numerators) |
| `BUG-NNN` | optional section or omitted in v1 — default **omit** unless user asks (bugs are not sprint-planned) |

Phases: if the target has no explicit phase doc, group by sprint chronology (one phase “Delivery” or one phase per major milestone found in roadmap docs — never invent sprint IDs).

5. **Design tokens.** Precedence: user prompt → target `DESIGN.md` / theme files → `conclave/team/board.md` `primary_color` → sober non-cliché fallback from the skill brief. System font stack only unless a local `@font-face` data URI is available; no CDN webfonts.

6. **Dual-runtime.** Claude Code and Cursor commands both get the capability (Cursor via ADR-002 parallel tree + sync of skill assets). Generation is orchestrator file I/O + template fill — **no** Next.js scaffold, **no** new hook required for v1 (user re-runs `/conclave-sprint-board` to refresh). A future hook may be proposed later; out of this ADR’s must-ship set.

## Alternatives Considered

| Option | Pros | Cons | Fit with detected stack |
|--------|------|------|------------------------|
| **A. Complementary HTML board + command/skill (chosen)** | Offline, zero npm; roadmap/analytics UX; preserves Kanban; respects `conclave/` markdown-only | Two board concepts to document; manual refresh unless later hooked | Matches plugin pattern (command + skill + target artifact outside `conclave/`) |
| **B. Replace `/conclave-board` with HTML-only** | One board story | Loses live hook sync, shadcn Kanban, status-column UX already shipped | Breaks v0.5.0+ users and ADR/spec for Kanban |
| **C. Extend Next.js board-app with Roadmap/Analytics tabs** | Single app | Requires npm/dev server; conflicts with “double-click `file://`” goal; larger board-app surface | Works technically but fails the skill’s offline constraint |
| **D. Standalone skill only (not in Conclave plugin)** | Portable to any repo | Conclave users miss slash-command discovery; dual packaging (Claude/Cursor) duplicated outside ADR-002 | Weaker product cohesion |
| **E. Generate into `conclave/sprint-board/`** | Next to data | Violates markdown-only invariant (`SKILL.md` §2) unless we carve another exception like board-app | Rejected — prefer `docs/sprint-board/` |

## Trade-offs

- **Completeness vs. freshness**: HTML is a **static snapshot**; Kanban stays auto-refreshed via hooks. Users must re-run `/conclave-sprint-board` after ceremony changes unless a later ADR adds a hook. Acceptable for roadmap reviews; call out clearly in README.
- **Coarse status vs. Conclave fidelity**: collapsing seven story states into three board statuses loses nuance (`review` vs `in-progress`). Mitigated by showing `US-NNN` refs and optional subtitle with raw Conclave status in task text.
- **Project-agnostic skill vs. Conclave-first defaults**: the skill remains usable on non-Conclave repos (ROADMAP.md, issues), but *this plugin’s* command optimizes discovery paths for `conclave/sprints/**` first.
- **Docs weight**: two board pages in the site (`board` vs `sprint-board`) — necessary to prevent user confusion.

## Technical Gaps

- [ ] **Exact command UX**: confirm whether `/conclave-sprint-board` takes an optional output path / `--force` — Owner: implementer (default `docs/sprint-board/`, always regenerate).
- [ ] **Phase discovery heuristics**: no standard `phases.md` in Conclave today — document fallback (single phase or sprint-ordered sections) — Owner: implementer + docs.
- [ ] **Accent extraction**: robust parse of `board.md` / `DESIGN.md` / CSS tokens without inventing brand colors — Owner: implementer.
- [ ] **Cursor port**: add `platforms/cursor/commands/conclave-sprint-board.md` + sync skill folder per ADR-002 — Owner: implementer.
- [ ] **Optional later**: PostToolUse/afterFileEdit regeneration for HTML board — **out of v1** — Owner: TBD future ADR/spec.
- [ ] **Bug inclusion**: default omit; flag for “include bugs as a synthetic lane” deferred — Owner: TBD.

## Coding Proposal

Conventions consulted: `CLAUDE.md` (“Adding a new slash command”), `skills/conclave/SKILL.md` §§2–5, sibling command `commands/conclave-board.md`, ADR-002 sync rules.  
`[inferred from CLAUDE.md / SKILL.md only — no .rules/ or architecture skill found]`

### Command (entry)

New `commands/conclave-sprint-board.md`:

```markdown
---
description: Generate a local self-contained HTML sprint/roadmap board (Roadmap / Tasks / Analytics) from conclave/ state. Writes docs/sprint-board/. Offline file://. Does not modify stories.
allowed-tools: Bash(git rev-parse:*), Bash(ls:*), Bash(mkdir:*), Bash(date:*), Read, Write, Glob, Grep
---
# /conclave-sprint-board [output-dir]
# Steps: resolve REPO_ROOT → require conclave/config.md → discover sprints/stories/branding
# → map statuses → fill template → write index.html + README.md → print open instructions
```

### Skill / discovery protocol

New `skills/conclave/visual-sprint-board/SKILL.md` — embed the discovery table, data model, design rules, and HTML skeleton from the input brief; Conclave-specific path order first (`conclave/sprints/**`, `conclave/team/board.md`).

### Template / artifact contract

- `skills/conclave/templates/sprint-board.html.template` — full HTML shell with `{{project}}`, `{{ACCENT*}}`, and marked injection regions **or** generate entirely in-command from the skill skeleton (prefer a template file for reviewability).
- Target outputs (not templates): `docs/sprint-board/index.html`, `docs/sprint-board/README.md`.

### Status mapper (shared prose in command + skill)

```text
mapSprint(meta.status): done|archived → done; active → active; draft → planned
mapStory(status): done|verified → done; in-progress|review → active;
                  ready|backlog → planned; retired → retired
```

### Module wiring

- Register command in `SKILL.md` §3 table + §5 templates list.
- Port twin under `platforms/cursor/commands/` + sync skill assets via `scripts/sync-cursor-platform.sh` (extend sync to include `visual-sprint-board/` if not under `templates/` alone).
- Docs: `site/content/{en,es}/commands/sprint-board.mdx`; clarify vs `board.mdx`.
- `CHANGELOG.md` + version bump when shipped.

### Repository / interface contract

Not applicable as Nest-style repository. The “contract” is:

- **Read-only** inputs: `conclave/**` markdown frontmatter + optional target design docs.  
- **Write-only** derived outputs: `docs/sprint-board/*`.  
- **Never** write story `status` or sprint `meta.status` from this command.

### Rules Fit-Check

| Convention source | Requirement | How the proposal complies |
|---|---|---|
| `SKILL.md` §2 | Markdown only inside `conclave/` | HTML lands in `docs/sprint-board/`, not under `conclave/` |
| `CLAUDE.md` new command | Command + template + SKILL wiring | New command, template, skill folder, docs/CHANGELOG |
| `/conclave-board` sibling | Board UX without competing write path | Read-only derived view; Kanban untouched |
| ADR-002 | Dual Claude/Cursor packaging | Cursor command port + skill sync |
| Input skill brief | No CDN / no npm / three tabs | Template constraints copied into skill + template file |

## Acceptance Criteria

- [ ] GIVEN a target repo with `conclave/config.md` and at least one `SPRINT-NNN` WHEN the user runs `/conclave-sprint-board` THEN `docs/sprint-board/index.html` and `README.md` exist and open via `file://` without network `[to be validated]`
- [ ] GIVEN stories in `done`/`verified` and `ready` WHEN the board is generated THEN KPIs and Analytics counts match mapped statuses (no invented IDs) `[to be validated]`
- [ ] GIVEN `conclave/team/board.md` with a valid `primary_color` WHEN no DESIGN.md override exists THEN the HTML accent uses that hex `[to be validated]`
- [ ] GIVEN `conclave-board/` already scaffolded WHEN `/conclave-sprint-board` runs THEN the Kanban app is unmodified `[to be validated]`
- [ ] GIVEN `prefers-reduced-motion: reduce` WHEN viewing the board THEN pulse animations are disabled `[to be validated]`
- [ ] GIVEN keyboard focus on the tablist WHEN the user presses ←/→ THEN the correct tabpanel is shown and `aria-selected` updates `[to be validated]`
- [ ] GIVEN a second `/conclave-sprint-board` run WHEN sprint data changed THEN HTML reflects the new snapshot (overwrite) `[to be validated]`

## Consequences

### Positive

- Offline roadmap/analytics view without npm.
- Clear separation from Kanban workflow board.
- Reuses Conclave as source of truth; no second status store.
- Aligns with local-first / no-server product philosophy.

### Negative

- Users must learn two board entry points (`/conclave-board` vs `/conclave-sprint-board`).
- HTML can go stale until re-run (no v1 hook).
- Coarse status mapping loses some workflow nuance.

### Neutral

- Bugs remain out of the default board until a follow-up decides otherwise.
- Non-Conclave repos can still use the skill text as a portable generator; the slash command stays Conclave-optimized.

## PR / Branch Conflicts

No open PRs or develop commits conflict with this decision. (`gh pr list --state open` returned none at ADR authoring time on `giolabs/conclave`.)

Local feature branches related to boards historically (`feat/conclave-board`) are already merged via prior releases; no active HIGH overlap detected with “HTML roadmap board” wording.

## Links

- Related: ADR-001 Discipline-Based Team Roles (`docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md`) — story `discipline` / roster context for optional tags
- Related: ADR-002 Dual-Platform Conclave (`docs/adr/ADR-002-cursor-platform-adaptation.md`) — Cursor port + skill sync obligations
- Related spec: Kanban board (`docs/specs/conclave-board/spec.md`) — existing Next.js capability this ADR deliberately does not replace
- Input brief: Visual Sprint Board skill (local, self-contained HTML; Roadmap / Tareas / Analíticas)
