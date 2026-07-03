# Discipline-Based Roster and Solo/Team Setup

> **Estado:** DRAFT

## 1. Objetivo

Implement ADR-001 (`docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md`): replace Conclave's fixed five-Scrum-role roster (Product Manager, Tech Lead, Scrum Master, Developer, QA) with a **discipline-first** roster — Tech Lead, Frontend, Backend, QA, Designer, DevOps always present, Product Manager and Scrum Master reduced to optional secondary "process role(s)" any member can additionally hold — and give `/conclave-init` an explicit **solo vs. team** branch that collects real names/GitHub handles per discipline instead of leaving placeholder rows. Stories gain a `discipline` field that routes `/conclave-dev` to the right execution charter (`developer.md`, or two new charters `designer.md` / `devops.md`), so a solo developer gets an honest, lightweight setup and a real team's roster reflects who actually does the work, without introducing any server, lock protocol, or change to Conclave's git-only, PR-mediated coordination model.

## 2. Alcance

### Incluido en esta fase

- Discipline-first roster schema (`Discipline` + `Process role(s)` columns) in `roster.template.md`, with a single-row solo-mode variant.
- `team_mode: solo | team` field in `config.md`, set by a new `/conclave-init` question.
- Solo-mode flow: one `AskUserQuestion`, `team_profile` forced to `lean`, single-row roster written with no further questions.
- Team-mode flow: one `AskUserQuestion` per discipline (name + GitHub handle or `TBD`) plus one question for optional PM/SM process-role holders — roster written fully populated, no placeholders.
- `discipline` frontmatter field on `story.template.md` (`frontend | backend | qa | design | devops | multi`), left empty at story creation and assigned by the Tech Lead during `/conclave-planning`'s existing per-story feasibility pass.
- Restructuring `/conclave-planning`'s Step 4 from one three-way-parallel agent round into two waves (PM + TL in parallel, then SM sequentially) so story assignment can respect the discipline the TL just assigned.
- A coverage-gap fallback: when a story's discipline has no matching roster member, `/conclave-planning` surfaces an `AskUserQuestion` to the human instead of guessing or silently blocking.
- Two new agent charters: `skills/conclave/agents/designer.md` (design artifacts only, no code) and `skills/conclave/agents/devops.md` (CI/CD and infrastructure-as-code, same operating pattern as `developer.md`).
- `/conclave-dev` routing: `discipline: design` → `designer.md`, `discipline: devops` → `devops.md`, everything else → `developer.md` (unchanged).
- Backward-compatibility handling for `conclave/` installs with the pre-existing five-role roster schema: treat every member as `multi`-discipline, print a one-line warning, keep working.
- Doc updates: `skills/conclave/SKILL.md`, `README.md`, and the four site docs (`site/src/content/docs/{en,es}/{roles,methodology}.md`).
- `conclave_version` bump (`config.template.md`) and plugin version bump (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`) to `0.2.0`.

### Fuera de scope

- Role-based permission enforcement (checking "does this git user actually hold role X" before letting them run a command) — Conclave has never had this; out of scope per ADR-001 Technical Gaps. Reason: separate, larger design problem; not needed for the discipline-vocabulary change itself.
- Automated migration tooling for existing `conclave/` installs — reason: pre-1.0, no known external installs yet; graceful degradation (see Alcance incluido) is sufficient per the user's explicit decision.
- A dedicated command/flow for adding team members after a solo `/conclave-init` (e.g. `/conclave-roster`) — reason: explicitly deferred by the user; team growth is a manual `roster.md` edit + `team_mode` flip for now.
- Splitting `developer.md` into separate `frontend.md`/`backend.md` charters — reason: ADR-001 Alternatives Considered rejected this; both disciplines share 100% of process, only the target differs.
- Removing or merging Product Manager / Scrum Master charters — reason: ADR-001 keeps them as optional process-role hats, not discipline replacements.
- Any change to `/conclave-qa` or `/conclave-pr-review` behavior — QA verification and the optional TL PR gate are discipline-agnostic and unaffected.
- Real-time cross-session notifications or any per-story lock file — reason: ADR-001 explicitly rejected both to preserve the git-only, no-server coordination model.

## 3. Tecnologias y convenciones del proyecto

### Stack

- **Plugin logic**: markdown only — no runtime, no application code. Slash commands are `commands/*.md` (YAML frontmatter + numbered-step prose); role charters are `skills/conclave/agents/*.md` (pure prose, no frontmatter); generated-artifact templates are `skills/conclave/templates/*.md` (`{{placeholder}}` substitution).
- **Orchestration pattern**: prose-orchestrated subagents — a command step says "spawn a subagent loaded with `<charter>.md`," Claude dispatches an `Agent` tool call with that file's full content as the system-prompt prefix. No DSL.
- **Docs site** (`site/`): Astro 5 + Tailwind 4, static build, EN/ES content collections under `site/src/content/docs/{en,es}/`. Unaffected architecturally by this feature — only prose content changes.

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| astro | ^5.0.0 | `site/package.json` |
| tailwindcss | ^4.0.0 | `site/package.json` |
| Conclave plugin | 0.1.0 → **0.2.0** (this change) | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `conclave_version` (per-install artifact schema) | `0.1.0` → **0.2.0** (this change) | `skills/conclave/templates/config.template.md` |

### Patrones existentes a respetar

- **Markdown-only, frontmatter-for-structure**: every structured field (`team_profile`, `status`, `assignee`, etc.) lives in YAML frontmatter; body prose is for humans. New fields (`team_mode`, `discipline`) must follow this — `skills/conclave/SKILL.md` §2.
- **Append, don't clobber**: a second `/conclave-spec` run creates `SPRINT-002/`, never overwrites `SPRINT-001/` — `skills/conclave/SKILL.md` §2, `commands/conclave-spec.md:100`.
- **Parallel `Agent` calls in a single message** when subagents are independent, e.g. PM + TL in `/conclave-spec` Step 5 (`commands/conclave-spec.md:58-76`), SM + PM + TL in `/conclave-planning` Step 4 (`commands/conclave-planning.md:66-95`, being restructured by this change into two waves — see §5).
- **Orchestrator writes, subagent proposes**: subagents return markdown/text; the calling command file (not the subagent) performs all `Write`/`Edit` calls and all `AskUserQuestion` prompts to the human — see `commands/conclave-planning.md:101-104` (PM swap surfaced by the orchestrator, not by the PM subagent itself). The new discipline coverage-gap fallback (§5) follows this same pattern.
- **Profile-awareness via `conclave/config.md`**: commands read `team_profile` / `ceremonies.*.required` and branch behavior — see `commands/conclave-dev.md:40`, `commands/conclave-planning.md:29-35`. `team_mode` is a new field of the same kind, read the same way.

## 4. Dependencias previas

- [ ] `docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md` exists and its `Status` is moved from `proposed` to `accepted` before/at the start of implementation (decision record, not a blocker to writing code, but should not stay `proposed` once implemented).
- [ ] `commands/conclave-init.md`, `commands/conclave-spec.md`, `commands/conclave-planning.md`, `commands/conclave-dev.md` exist in their current shipped form (they do — this is a modification, not a new build).
- [ ] `skills/conclave/agents/{product-manager,tech-lead,scrum-master,developer,qa}.md` exist in their current shipped form (they do).
- [ ] No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands") — verification is manual throughout (see §8).

## 5. Arquitectura

### Patron

Prose-orchestrated subagents (see §3). No new pattern introduced — this feature extends the existing one: (a) a new command-level branch (solo/team) in `/conclave-init`, (b) a new field threaded through the existing `story` artifact and read by two existing commands, (c) two new charters slotted into the existing `developer.md`-style execution pattern, (d) a restructuring of `/conclave-planning`'s agent-dispatch order from one parallel round to two waves.

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| Commands (`commands/*.md`) | Yes | `conclave-init.md` (solo/team branch), `conclave-planning.md` (two-wave dispatch, discipline assignment, coverage-gap fallback, DoR check), `conclave-dev.md` (charter routing by discipline) |
| Agent charters (`skills/conclave/agents/*.md`) | Yes | New: `designer.md`, `devops.md`. Modified: `scrum-master.md` (discipline-match assignment rule), `tech-lead.md` (discipline assignment added to the `/conclave-planning` feasibility pass) |
| Templates (`skills/conclave/templates/*.md`) | Yes | `config.template.md` (`team_mode` field), `roster.template.md` (Discipline/Process role(s) columns + solo variant), `story.template.md` (`discipline` field), `definition-of-ready.template.md` (new DoR item), `planning.template.md` (new findings subsection) |
| Methodology doc (`skills/conclave/SKILL.md`) | Yes | §1 Scrum model table, §3 role-to-subagent mapping, §2 roster description, backward-compat note |
| Repo docs (`README.md`) | Yes | Role table |
| Docs site (`site/src/content/docs/{en,es}/*.md`) | Yes | `roles.md`, `methodology.md` in both languages |
| Plugin manifest (`.claude-plugin/*.json`) | Yes | Version bump only |
| Docs site code (Astro components, `content/config.ts`) | No | Only prose content changes; no schema/frontmatter shape change to site docs |
| `conclave-spec.md`, `conclave-qa.md`, `conclave-pr-review.md` | No | See §10 for why discipline assignment is deliberately kept out of `/conclave-spec` (parallelism) and QA/TL-review stay discipline-agnostic |

### Flujo esperado

**`/conclave-init` (new branch):**
1. User runs `/conclave-init`.
2. New Step 3a: `AskUserQuestion` — *"Is this just you, or a team?"* (`Solo` / `Team`).
3. **Solo** → `team_mode: solo`, `team_profile: lean` (forced, no override question), skip per-discipline questions, go to template rendering with a single roster row.
4. **Team** → for each of the six disciplines (Tech Lead, Frontend, Backend, QA, Designer, DevOps): `AskUserQuestion` *"Who covers `<discipline>`?"* → name + GitHub handle, or `TBD`. Then one more `AskUserQuestion`: *"Who (if anyone) also holds Product Manager / Scrum Master?"* → name(s) or `None yet`.
5. Render `roster.template.md` (solo variant or team table) with the collected answers — fully populated, no `{{name_N}}` placeholders left.
6. Continue existing Step 4–6 (directory tree, remaining templates, report) unchanged.

**`/conclave-planning` (restructured Step 4 + new discipline logic):**
1. Steps 1–3 unchanged (resolve draft sprint, load config, ask team for planning inputs).
2. **Wave 1 (parallel)**: dispatch PM (scope review, unchanged) and TL (feasibility review, *now also assigns/confirms a `discipline` value per story*) in a single message, as today.
3. Wait for both. TL's output now includes, per story, both the feasibility verdict and a `discipline` value.
4. **Wave 2 (sequential, after Wave 1 returns)**: dispatch SM (facilitator/assignment) alone, passing it TL's per-story `discipline` values and PM's scope findings as additional input. SM assigns each story to a roster member whose `Discipline` column matches (or who holds `Tech Lead`, for cross-cutting stories).
5. If SM cannot find a discipline-matching roster member for a story: SM's output flags it as an **unresolved coverage gap** (does not guess an assignee) — the orchestrator (not the SM subagent) then surfaces `AskUserQuestion` to the human: *"No one on the roster covers `<discipline>` for `<story>`. Assign to Tech Lead as a temporary fallback, or pick someone else?"*
6. Step 5.3 (DoR validation) now also checks: **discipline is set** for every story entering the sprint (TL-owned item, new). A story with no discipline cannot enter the sprint — same enforcement pattern as the existing "has a T-shirt estimate" item.
7. Step 6.3 (write story frontmatter) now also writes the `discipline` field, alongside the existing `assignee` and `status` writes.
8. Steps 6.1, 6.2, 6.4, 6.5, and Step 7 (report) unchanged in shape, with the report gaining one line: coverage gaps raised and how they were resolved.

**`/conclave-dev US-NNN` (new routing step):**
1. Steps 1–5 unchanged (resolve workspace, resolve story, load context, create branch, mark in-progress).
2. Step 6 (delegate to execution subagent) now reads the story's `discipline` field and picks the charter:
   - `frontend`, `backend`, `multi`, or unset (backward-compat) → `skills/conclave/agents/developer.md` (today's only path — unchanged behavior)
   - `design` → `skills/conclave/agents/designer.md` (new)
   - `devops` → `skills/conclave/agents/devops.md` (new)
3. Steps 7–9 (push, open PR, report) unchanged, except the Step 9 report now names which charter/discipline was used.

**Roster backward-compatibility (read anywhere `roster.md` is parsed — `conclave-planning.md` Step 2, `conclave-dev.md` Step 3, `scrum-master.md`'s operating section):**
- If the `Discipline` column is absent (pre-0.2.0 schema), treat every row's discipline as `multi` and print once per command run: *"Roster is using the pre-0.2.0 schema (no Discipline column) — treating all members as multi-discipline. Run `/conclave-init` again or add a Discipline column by hand to opt into discipline-based assignment."* Do not refuse to run.

### Layout de archivos nuevos

```
skills/conclave/agents/
  designer.md     # NUEVO — mindset/inputs/outputs/checklist, same shape as developer.md
  devops.md       # NUEVO — same shape, CI/CD + infra-as-code focus

docs/adr/
  ADR-001-discipline-based-roles-and-solo-team-setup.md   # already exists — status flips to accepted

.project-structure   # NUEVO — records docs/specs/<slug>/spec.md as this repo's spec convention
```

No new directories under `commands/` or `skills/conclave/templates/` — only field/section additions to existing files.

## 6. Archivos a crear o modificar

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `skills/conclave/agents/designer.md` | NUEVO | Design-discipline charter: design artifacts only, no code, hands off to Frontend | `skills/conclave/agents/developer.md` (structure: Mindset / Inputs / Outputs / Quality checklist / What you must NOT do / How you operate inside `/conclave-dev`) |
| `skills/conclave/agents/devops.md` | NUEVO | DevOps-discipline charter: CI/CD + infrastructure-as-code, same operating pattern as Developer | `skills/conclave/agents/developer.md` |
| `.project-structure` | NUEVO | Records the spec-location convention (`docs/specs/<slug>/spec.md`) for future `/generate-spec` runs | n/a — first one in this repo |
| `skills/conclave/templates/config.template.md` | MODIFICAR | Add `team_mode: solo \| team` field; bump `conclave_version` to `0.2.0` | n/a (in-place field addition) |
| `skills/conclave/templates/roster.template.md` | MODIFICAR | Replace fixed 5-role table with Discipline / Process role(s) columns; add solo-mode single-row variant; rewrite "Role rules" prose | n/a |
| `skills/conclave/templates/story.template.md` | MODIFICAR | Add `discipline: ""` frontmatter field (empty at creation) | n/a |
| `skills/conclave/templates/definition-of-ready.template.md` | MODIFICAR | Add "Discipline is assigned" to the TL-owned checklist | n/a |
| `skills/conclave/templates/planning.template.md` | MODIFICAR | Add a "Discipline assignments & coverage gaps" subsection near the existing findings sections | Existing `## Technical feasibility findings` / `## Scope findings` subsections (lines 43–49) |
| `commands/conclave-init.md` | MODIFICAR | New Step 3a (solo/team question); team-mode per-discipline `AskUserQuestion` loop; roster-rendering branch; report update | Existing Step 3 question set (lines 27–58) |
| `commands/conclave-planning.md` | MODIFICAR | Split Step 4 into two waves; extend TL Agent C task; add coverage-gap fallback step; extend DoR check (5.3); extend frontmatter write (6.3) | Existing Step 4/5 structure (lines 66–124) |
| `commands/conclave-dev.md` | MODIFICAR | Step 6 charter-selection by `discipline`; Step 9 report line; roster backward-compat read note in Step 3 | Existing Step 6 (lines 59–75) |
| `skills/conclave/agents/scrum-master.md` | MODIFICAR | Line 79 assignment rule → discipline match (or Tech Lead fallback); note it now runs after PM/TL, not fully parallel; instruct it to flag (not guess) coverage gaps | n/a (in-place rule edit) |
| `skills/conclave/agents/tech-lead.md` | MODIFICAR | Extend the `/conclave-planning` operating section: per-story feasibility output also includes a `discipline` value | Existing "How you operate inside `/conclave-pr-review`" section (lines 107+) as the pattern for an "operates inside X command" subsection |
| `skills/conclave/SKILL.md` | MODIFICAR | §1 Scrum model table, §2 roster description + backward-compat note, §3 role-to-subagent mapping (add Designer/DevOps rows) | n/a |
| `README.md` | MODIFICAR | Role table (lines 93–99) updated to Discipline / Process-role model | n/a |
| `site/src/content/docs/en/roles.md` | MODIFICAR | Role table + two new charter sections (Designer, DevOps) + Discipline vs Process-role explanation | Existing per-role sections (lines 21–62) |
| `site/src/content/docs/en/methodology.md` | MODIFICAR | Scrum mapping table (lines 15–22) updated | n/a |
| `site/src/content/docs/es/roles.md` | MODIFICAR | Mirrored Spanish translation of the same edits | `site/src/content/docs/en/roles.md` (post-edit) |
| `site/src/content/docs/es/methodology.md` | MODIFICAR | Mirrored Spanish translation of the same edits | `site/src/content/docs/en/methodology.md` (post-edit) |
| `.claude-plugin/plugin.json` | MODIFICAR | `version`: `0.1.0` → `0.2.0` | n/a |
| `.claude-plugin/marketplace.json` | MODIFICAR | `version`: `0.1.0` → `0.2.0` (both top-level and the `conclave` plugin entry) | n/a |

### Detalle por archivo

#### `skills/conclave/agents/designer.md`

- **Responsabilidad**: owns UI/UX design decisions for a story tagged `discipline: design` — produces design specs, design-system decisions, and Frontend handoff notes as markdown committed under `conclave/` (e.g. appended to the story file or a design-notes file the story links to). Never touches application code.
- **Ejemplo a seguir**: `skills/conclave/agents/developer.md` for section shape (Mindset / Inputs you receive / Output you produce / Quality checklist / What you must NOT do / "How you operate inside `/conclave-dev US-NNN`"), but replace "code changes + tests + PR" with "design notes + handoff spec," since there is no code diff to open a PR for by default.
- **No mezclar**: do not write frontend implementation code (that is Frontend's job once the design handoff lands); do not redefine acceptance criteria (PM's domain); do not skip a written handoff note — "the design lives in my head" is not an output.
- Must still produce *something* PR-able so the existing `/conclave-dev` → `status: review` → `/conclave-qa` flow keeps working: the design notes/spec file itself becomes the PR content (e.g. `conclave/sprints/SPRINT-NNN/stories/US-NNN-design-notes.md` or an update to the story file's body), opened the same way `developer.md` opens a code PR.

#### `skills/conclave/agents/devops.md`

- **Responsabilidad**: owns CI/CD pipeline and infrastructure-as-code changes for a story tagged `discipline: devops` — implements and tests changes to files like `.github/workflows/*.yml`, Dockerfiles, Terraform/CDK, deploy scripts — and opens a PR, following the same implement → test → PR loop as `developer.md`.
- **Ejemplo a seguir**: `skills/conclave/agents/developer.md` almost verbatim in structure; the only difference is the domain of files touched (infra/pipeline configs instead of application code) and that "tests" may mean a pipeline dry-run or `terraform plan` instead of unit tests, depending on the project's stack (read `conclave/product/architecture.md` for the infra stack, same as `developer.md` reads it for the app stack).
- **No mezclar**: do not modify application business logic; do not change secrets/credentials directly in the repo (flag if a secret needs rotating, do not hardcode it); do not merge own PR (same hard rule as `developer.md`).

#### `skills/conclave/templates/config.template.md`

- Add, near the existing `team_profile` field: `team_mode: "{{team_mode}}"   # solo | team`.
- Bump `conclave_version: "0.1.0"` → `conclave_version: "0.2.0"`.
- **No mezclar**: do not remove or rename `team_profile` — it stays independent of `team_mode` (a solo project is always `lean`, but a team project can still choose any of `lean | full-scrum | custom`).

#### `skills/conclave/templates/roster.template.md`

- New team-mode table header: `| Member | GitHub handle | Discipline | Process role(s) | Notes |`. `Discipline` cell holds one or more of `Tech Lead, Frontend, Backend, QA, Designer, DevOps` (comma-separated if a person covers more than one). `Process role(s)` cell holds `PM`, `SM`, both, or blank.
- New solo-mode variant (single row): `Discipline` cell lists all six values, `Process role(s)` cell lists `PM, SM` (a solo developer holds every process role by default), `Notes` cell says *"Solo project — one person covers every discipline."*
- Rewrite "Role rules in this team" prose: keep "one person can hold multiple roles," update final-say lines to "Tech Lead has final say on architecture," "whoever holds Product Manager (if anyone) has final say on priority," "whoever holds Scrum Master (if anyone) facilitates process," and add: *"If no one holds the Product Manager or Scrum Master process role, the Tech Lead and the team decide priority and process by consensus."*
- **No mezclar**: do not drop the existing "How to update" section (PR-based roster edits) — unchanged.

#### `skills/conclave/templates/story.template.md`

- Add one frontmatter line directly under `assignee: ""`: `discipline: ""   # frontend | backend | qa | design | devops | multi — set by the Tech Lead during /conclave-planning`.
- **No mezclar**: do not confuse this with the existing body placeholder `**As a** {{role}}` (line 17) — that is the end-user persona in the INVEST story, unrelated to team discipline.

#### `commands/conclave-init.md`

- Insert a new **Step 3a — Solo or team?** immediately before the existing Step 3 (or as its first sub-step): `AskUserQuestion` — *"Is this just you, or a team?"* with options `Solo` and `Team`.
- `Solo` branch: set `team_mode: solo`, force `team_profile: lean` (skip the existing profile question), skip the per-discipline questions, proceed straight to template rendering (Step 5) with the roster's solo variant.
- `Team` branch: set `team_mode: team`, then run the existing team-size/profile questions (unchanged), then a new loop: for each of `[Tech Lead, Frontend, Backend, QA, Designer, DevOps]`, `AskUserQuestion` *"Who covers `<discipline>`?"* → free-text name + GitHub handle, or the literal answer `TBD`. Follow with one more `AskUserQuestion`: *"Who (if anyone) also holds Product Manager / Scrum Master?"* → free text (name(s) or `None yet`).
- Step 5 (render templates): roster rendering branches on `team_mode` — solo variant vs. fully-populated team table from the collected answers. No placeholder rows are left in either branch.
- Step 6 (report): add one line stating `team_mode` and, if `team`, which disciplines came back `TBD`.
- **No mezclar**: do not touch the existing stack-detection question set (that stays `/conclave-spec`'s job, unchanged per the command's existing note at line ~44).

#### `commands/conclave-planning.md`

- Step 4 becomes two waves. **Wave 1** (unchanged parallelism): Agent B (Product Manager, scope reviewer) and Agent C (Tech Lead, feasibility reviewer) dispatched together as today. Agent C's task gains one line: *"For each story, also assign a `discipline` value (`frontend|backend|qa|design|devops|multi`) based on the nature of the work, and include it in your per-story findings alongside the feasibility verdict."*
- **Wave 2** (new, sequential — dispatched only after Wave 1 returns): Agent A (Scrum Master, facilitator) is dispatched alone. Its task gains the TL's per-story `discipline` values and the PM's scope findings as additional inputs, and its assignment rule changes (see `scrum-master.md` detail below).
- Step 5.3 (DoR validation): add a new check — every selected story must have a non-empty `discipline` (from Wave 1's TL output, held in memory; not yet written to disk). Missing discipline is treated the same as any other failed DoR item (surface to user in `lean`, refuse to lock in `full-scrum`).
- New **Step 5.6 — Resolve discipline coverage gaps**: if the SM's Wave 2 output flags a story whose discipline has no matching roster member, the orchestrator (not the SM subagent) surfaces `AskUserQuestion`: *"No one on the roster covers `<discipline>` for `<story>`. Assign to Tech Lead as a temporary fallback, or pick someone else?"* Record the resolution in the story's `Notes` (planning template) so it is visible in the PR.
- Step 6.3 (update each story's frontmatter): add `discipline` to the fields written, alongside the existing `assignee` and `status`.
- Step 2 (load roster): if `roster.md` has no `Discipline` column, apply the backward-compat rule (§5) before Wave 1/2 run.
- **No mezclar**: do not change the existing swap/split reconciliation logic (5.1/5.2) — those still run after both waves complete, unchanged.

#### `commands/conclave-dev.md`

- Step 3 (load context): when reading `roster.md`, apply the same backward-compat rule as `conclave-planning.md` (missing `Discipline` column → treat as `multi`, print the one-line warning once).
- Step 6 (delegate to execution subagent): before dispatching, read the story's `discipline` field and select the charter path: `design` → `skills/conclave/agents/designer.md`; `devops` → `skills/conclave/agents/devops.md`; anything else (`frontend`, `backend`, `multi`, or empty/legacy) → `skills/conclave/agents/developer.md` (today's only path, unchanged). Everything else in Step 6 (inputs embedded, expected output shape) stays the same regardless of which charter is loaded.
- Step 9 (report): add one line naming which discipline/charter handled the story.
- **No mezclar**: do not change the peer-reviewer-tagging logic in Step 7.3 — reviewer selection from the roster is unrelated to the assignee's discipline.

#### `skills/conclave/agents/scrum-master.md`

- Line 79: replace *"Use the roster (only people with the `Developer` role are assignable as primary)"* with *"Use the roster and the Tech Lead's per-story `discipline` values (from Wave 1) — only roster members whose `Discipline` column matches the story's discipline, or who hold `Tech Lead` (for cross-cutting stories), are assignable. If no match exists, do not guess — list the story as an unresolved coverage gap in your output for the orchestrator to raise with the human."*
- Add a short note near "How you operate inside `/conclave-planning`" clarifying it now runs **after** the PM and TL agents return (Wave 2), receiving their findings as additional input, rather than fully in parallel with them.
- **No mezclar**: the "What you must NOT do" list (do not assign stories outside this rule, do not estimate, do not commit code) is unchanged.

#### `skills/conclave/agents/tech-lead.md`

- Extend the existing "How you operate inside `/conclave-planning`" implicit responsibilities (today only "technical feasibility findings" — the file does not yet have a dedicated `/conclave-planning` subsection the way it has one for `/conclave-pr-review`; add one, mirroring the pr-review subsection's shape) to state: for each story, in addition to the feasibility verdict, output a `discipline` field.
- **No mezclar**: do not change the `/conclave-pr-review` operating section (lines 107–174) — unrelated to this feature.

## 7. API Contract

Sin API surface — no aplica. This is a markdown-only Claude Code plugin; there is no HTTP layer, no database, no external service calls beyond `git`/`gh` CLI invocations already used by existing commands.

## 8. Criterios de exito

- [ ] `/conclave-init` run as solo produces `config.md` with `team_mode: solo`, `team_profile: lean`, and a fully-rendered single-row `roster.md` — no `{{placeholder}}` tokens remain in either file.
- [ ] `/conclave-init` run as team asks one `AskUserQuestion` per discipline (6 total) plus one PM/SM question, and produces a fully-rendered multi-row `roster.md` with a `Discipline` and `Process role(s)` column — no placeholders remain.
- [ ] `/conclave-planning` on a draft sprint assigns every selected story's `discipline` field via the Tech Lead (Wave 1) before Scrum Master assignment (Wave 2) runs.
- [ ] `/conclave-planning` refuses to lock a story with an empty `discipline` in `full-scrum`/`custom` profiles, and surfaces it for a drop decision in `lean`, exactly as any other failed DoR item does today.
- [ ] `/conclave-planning` raises an `AskUserQuestion` coverage-gap prompt when a story's discipline has no matching roster member, instead of silently assigning or blocking outright.
- [ ] `/conclave-dev US-NNN` spawns `designer.md` for a `discipline: design` story and `devops.md` for a `discipline: devops` story; all other disciplines keep spawning `developer.md` exactly as today.
- [ ] A `conclave/` install with the pre-0.2.0 roster schema (no `Discipline` column) does not crash any command — it prints the one-line compatibility warning once and treats every member as `multi`.
- [ ] `skills/conclave/SKILL.md`, `README.md`, and all four site docs (`en`/`es` × `roles`/`methodology`) reflect the Discipline / Process-role model consistently — no file still shows the old fixed five-row Scrum-role table as the current model.

### Tests requeridos

No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands": *"There is no build/lint/test step for the plugin itself"*). All scenarios above are verified manually per §"Comandos de verificacion" below — there are no `test/*.spec` files to add.

### Comandos de verificacion

```bash
# Install the plugin locally
ln -s "$(pwd)" ~/.claude/plugins/conclave   # restart Claude Code after this

# In a scratch target repo, exercise the full loop manually:
#   /conclave-init          -> once as "Solo", once as "Team" (two separate scratch repos)
#   /conclave-spec "<idea>" -> confirm story.template.md discipline field is present and empty
#   /conclave-planning      -> confirm Wave 1 (PM+TL) -> Wave 2 (SM) ordering, discipline written, DoR gate enforced, coverage-gap prompt appears when forced (remove a discipline from roster.md and retry)
#   /conclave-dev US-NNN    -> once with discipline: design, once with discipline: devops, once with discipline: frontend -> confirm correct charter spawned each time

# Docs site build must still succeed after the roles.md/methodology.md edits:
cd site && npm run build
```

## 9. Criterios de UX

### Loading

No aplica — these are synchronous CLI slash commands with no separate loading UI; the existing pattern of printing a short status/report at the end of each command step is unchanged.

### Formularios

No aplica — no forms; all input is via `AskUserQuestion` prompts, following the exact prompt text specified in §5/§6 (e.g. *"Is this just you, or a team?"*, *"Who covers `<discipline>`?"*).

### Passwords

No aplica.

### Errores

Errors are surfaced as plain refusal messages with the exact wording pattern already used throughout the plugin (e.g. `commands/conclave-dev.md`'s *"Working tree is dirty. Stash or commit your local changes, then re-run."*). New error/warning strings introduced by this spec:
- Backward-compat warning (see §5): printed once, non-blocking.
- Coverage-gap prompt (see §6, `conclave-planning.md` detail): interactive `AskUserQuestion`, not a hard error.
- DoR failure for missing `discipline`: same phrasing pattern as existing DoR failures (`commands/conclave-planning.md` Step 5.3).

### Navegacion

No aplica — no navigation graph; command sequencing is documented in each command's "Next step" report line (unchanged pattern, extended with one new line per command as noted in §6).

### Accesibilidad

No aplica — text-only CLI interaction via Claude Code's own `AskUserQuestion` UI, which is out of this plugin's control.

## 10. Decisiones tomadas

> **Reconciliation note (post-validation):** ADR-001's Decision section says the `discipline` field is "populated by whichever subagent creates the story (`conclave-spec.md` for founding stories, `conclave-planning.md`/`scrum-master.md` when stories are reassigned during planning)." The row below **refines** that into a single, simpler rule — Tech Lead assigns it during `/conclave-planning` only, never in `/conclave-spec` — for the parallelism reason given. This is a deliberate narrowing discovered while writing this spec, not a silent scope drop; `ADR-001` itself is left as written (Status still applies to its broader Decision paragraph) and this spec's row is the binding, more specific implementation rule. Relatedly, ADR-001's own (`[to be validated]`) Acceptance Criteria ties discipline-match assignment to `full-scrum`/`custom` + `peer_pr_review.required: true`; this spec applies the Wave 2 discipline-match rule unconditionally regardless of profile, since nothing in the ADR's actual Decision prose gates it — the ADR's AC wording is superseded by this row.

| Decision | Why |
|---|---|
| Discipline is assigned by the **Tech Lead during `/conclave-planning`**, not by whoever creates the story in `/conclave-spec` | `/conclave-spec` runs PM and TL fully in parallel with no shared story list at dispatch time (TL never sees the PM's drafted stories mid-flight) — see `commands/conclave-spec.md:58-76`. Forcing discipline assignment there would break that parallelism. `/conclave-planning` already runs a per-story TL feasibility pass, so extending it is the lowest-disruption path, and it aligns discipline enforcement with when DoR is actually checked. |
| `story.template.md`'s `discipline` field is **created empty** by `/conclave-spec` and only becomes required at `/conclave-planning` time | Mirrors how `assignee` already works — set at planning, not at draft-creation. Backlog items not yet pulled into any sprint are not required to have a discipline forever, only once they enter planning — same leniency the existing DoR gate already gives every other field. |
| `/conclave-planning`'s Step 4 changes from **one three-way-parallel round to two waves** (PM + TL parallel, then SM sequential) | Story assignment (SM's job) needs to know the discipline (TL's job) to respect the discipline-match rule. Today's fully-parallel design already produces some rework (Step 5.1/5.2 reconcile PM swaps and TL splits against SM's provisional assignment) — moving SM to a second wave removes that rework's biggest source rather than adding a new one. |
| Coverage-gap resolution happens via the **orchestrator's `AskUserQuestion`**, never via the SM subagent guessing | Matches the existing pattern where subagents only propose/flag and the calling command file is the only thing that prompts the human (see `commands/conclave-planning.md:101-104` for the PM-swap precedent). |
| Old (`pre-0.2.0`) `roster.md` schema **degrades gracefully** (`multi` fallback + one-time warning) instead of blocking commands | Explicit user decision — avoids breaking any already-initialized `conclave/` directory the moment this ships, at the cost of not fully enforcing the new model until a team manually migrates. |
| `Discipline` roster cells may hold **multiple comma-separated values** | Small/solo teams routinely have one person covering several disciplines; a single-value-only schema would force artificial duplicate rows. |
| Product Manager / Scrum Master remain **optional "Process role(s)"**, not discipline replacements | Confirmed in ADR-001 — preserves the two-perspective (business vs. technical) parallel review `/conclave-spec` and `/conclave-planning` are built around, without forcing every team to staff dedicated PM/SM rows. |
| `designer.md` produces **design artifacts only, never code** | Explicit user decision — keeps the Designer/Frontend boundary clean, matching the existing QA/Developer separation-of-concerns pattern (QA verifies, never implements; Designer specifies, never implements). |
| `devops.md` scope is **CI/CD + infrastructure-as-code only** (no secrets/runbook ownership) | Explicit user decision — keeps the charter narrow and reuses `developer.md`'s exact operating shape (implement → test → PR) rather than inventing a broader, vaguer mandate. |
| Team-growth-after-solo-init is **out of scope** for this change | Explicit user decision — a team edits `roster.md` by hand and flips `team_mode` manually for now; a dedicated command is future work. |
| `conclave_version` and the plugin version both bump to **`0.2.0`** | Signals the schema change (new `team_mode`/`discipline` fields, restructured roster) to anyone diffing an install against the plugin source; no strict semver commitment is implied pre-1.0. |

## 11. Edge cases

### Datos invalidos

- User answers a discipline question with something other than a name/handle/`TBD` (e.g. leaves it blank, or types a sentence): the `AskUserQuestion` prompt's free-text field accepts it as-is — `/conclave-init` does not validate name/handle format beyond trimming whitespace. Malformed GitHub handles surface later, harmlessly, only if `/conclave-dev` tries to `gh pr edit --add-reviewer @<handle>` and `gh` rejects it (already a "best effort; failure is non-fatal" path per `commands/conclave-dev.md:81`).
- A story's `discipline` frontmatter is set to a value outside the six-item enum (hand-edited by a user): `/conclave-planning`'s DoR check treats any non-empty-but-invalid value as equivalent to "unresolved coverage gap" (§6) rather than silently accepting it.

### API errors

No aplica — no HTTP API surface (see §7). The only external-process calls (`git`, `gh`) already have documented failure handling in the existing commands (e.g. `commands/conclave-dev.md:105`: *"If any of `git push`, `gh pr create`, or `gh pr edit` fails, do NOT roll back local commits."*), unchanged by this spec.

### Sin conexion

No aplica beyond the existing `git`/`gh` network-failure handling already documented in `conclave-dev.md` (unchanged).

### Timeout

No aplica — subagent `Agent` calls either return or error; there is no separate timeout behavior introduced by this feature beyond what `commands/conclave-spec.md:76` and `commands/conclave-planning.md:95` already specify ("If any errors, surface and stop").

### Respuesta vacia o inesperada

- If the Tech Lead's Wave 1 output is missing a `discipline` value for one or more stories (malformed subagent output), the orchestrator treats those stories the same as a DoR failure (§6) rather than defaulting them silently.
- If the Scrum Master's Wave 2 output does not clearly flag a coverage gap but also does not provide a valid assignee, the orchestrator treats it as a coverage gap by default (fail closed, not open).

### Doble submit

- Running `/conclave-init` twice on the same repo: unchanged existing guard — Step 2 already refuses if `conclave/config.md` exists.
- Running `/conclave-planning` twice on the same draft sprint: unchanged existing guard (`skills/conclave/SKILL.md` idempotency note, `commands/conclave-planning.md:168`) — the sprint's `status` becomes `active` after the first run, so the second run is refused at Step 1.
- Two team members independently running `/conclave-dev` on two *different* stories with the *same* discipline at the same time: no new conflict — each operates on its own branch/story file, identical to today's behavior for two devs picking up two different stories.

## 12. Estados de UI requeridos

No aplica — no graphical UI. The closest equivalent (per-command guardrail/refusal states) is already documented in each command's existing "Guardrails" section (e.g. `commands/conclave-dev.md`'s dirty-tree refusal, `commands/conclave-planning.md`'s already-active refusal) and is unchanged by this feature except for the two new refusal/prompt cases called out in §9 "Errores."

## 13. Validaciones

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| `team_mode` (config.md) | Must be `solo` or `team` | n/a — set only by `/conclave-init`'s own logic, never hand-typed by the user through a form |
| `discipline` (story frontmatter) | Must be one of `frontend \| backend \| qa \| design \| devops \| multi`, or empty at creation | Invalid/unknown value is treated as an unresolved coverage gap (§11), not silently coerced |
| Discipline `AskUserQuestion` answer (`/conclave-init`, team mode) | Free text: a name + GitHub handle, or the literal `TBD` | No format validation beyond trimming whitespace (see §11 Datos invalidos) |

### Validaciones de servidor

No aplica — no server, no API (§7). All validation described above happens locally, inside the command's own orchestration logic.

## 14. Seguridad y permisos

- **Secrets**: no new secrets introduced. `devops.md` is explicitly restricted from hardcoding credentials (§6 "No mezclar") — same posture as `developer.md` already has implicitly.
- **Sensitive payloads**: GitHub handles collected during `/conclave-init` are committed to `roster.md` in git, exactly as they already are today (pre-existing behavior, not a new exposure introduced by this change).
- **Permission checks**: none introduced — Conclave has no role-based access control today and this change does not add any (ADR-001 Technical Gaps, explicitly out of scope — §2).
- **401/403 flow**: no aplica — no API.

## 15. Observabilidad y logging

- **Log**: which discipline/charter `/conclave-dev` routed to (new report line, §6); coverage-gap resolutions recorded in the story's planning notes (§6 `conclave-planning.md` detail); the backward-compat warning (§5), printed once per command invocation that hits it.
- **Never log**: no new sensitive data introduced (GitHub handles are already committed to `roster.md` in plain sight, not a "log").
- **Mechanism**: same as every existing command — plain `print`-style status/report text at the end of each command run (e.g. `commands/conclave-init.md`'s Step 6 "Report," `commands/conclave-dev.md`'s Step 9 "Report"). No structured logging system exists or is introduced.

## 16. i18n / textos visibles

No aplica in the traditional sense — there is no translation-key system in this plugin. All `AskUserQuestion` prompt text introduced by this spec stays in English, matching every existing command's prompt text (all currently English-only, per `commands/conclave-init.md`, `conclave-dev.md`, etc.). The project's only bilingual content is hand-translated markdown under `site/src/content/docs/{en,es}/` — those edits are tracked as ordinary file modifications in §6, not as i18n keys.

## 17. Performance

No aplica — markdown template rendering and `AskUserQuestion` prompts are the only operations involved; no loops, no large-data processing, no network calls beyond the existing `git`/`gh` invocations already present in the commands being modified.

## 18. Restricciones

The implementer must NOT:

- [ ] Change the discipline enum (`frontend | backend | qa | design | devops | multi`) without updating every file in §6 that references it (`story.template.md`, `scrum-master.md`, `tech-lead.md`, `conclave-dev.md`, `SKILL.md`).
- [ ] Add role-based permission enforcement — explicitly out of scope (§2).
- [ ] Build an auto-migration tool for old `conclave/` installs — explicitly out of scope (§2); only the graceful-degradation fallback (§5) is in scope.
- [ ] Build a team-growth/add-member command — explicitly out of scope (§2).
- [ ] Split `developer.md` into `frontend.md`/`backend.md` — explicitly rejected in ADR-001.
- [ ] Change `/conclave-qa` or `/conclave-pr-review` behavior — both are discipline-agnostic and untouched by this change.
- [ ] Change the Astro site's component code, routing, or content-collection schema (`site/src/content/config.ts`) — only prose inside existing `.md` content files changes.
- [ ] Add new dependencies to `site/package.json` or introduce any new tooling — this is a pure content/prose change on the docs side.
- [ ] Refactor unrelated sections of any modified file (e.g. do not touch `conclave-planning.md`'s capacity-check math in §5.4, or `developer.md`'s "What you must NOT do" list) beyond what §6 specifies.
- [ ] Let `designer.md` or `devops.md` charters diverge structurally from `developer.md`'s section shape (Mindset / Inputs / Outputs / Quality checklist / What you must NOT do / "How you operate inside...") without a documented reason.

## 19. Entregables

- [ ] Two new agent charters (`designer.md`, `devops.md`) matching `developer.md`'s structural shape.
- [ ] `.project-structure` recording the new spec convention.
- [ ] All template edits from §6 (config, roster, story, definition-of-ready, planning).
- [ ] All command edits from §6 (`conclave-init.md`, `conclave-planning.md`, `conclave-dev.md`).
- [ ] Both charter edits from §6 (`scrum-master.md`, `tech-lead.md`).
- [ ] All doc updates from §6 (`SKILL.md`, `README.md`, four site docs).
- [ ] Version bumps (`config.template.md`'s `conclave_version`, `plugin.json`, `marketplace.json`) to `0.2.0`.
- [ ] `docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md`'s `Status` flipped from `proposed` to `accepted`.
- [ ] Manual verification per §8 completed and reported (no automated tests exist to add).

## 20. Checklist final para el agente

Before delivering, verify:

- [ ] Read this spec end-to-end.
- [ ] Reviewed `docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md` for decision context.
- [ ] Confirmed all prerequisites (§4) are satisfied.
- [ ] Modified only files listed in §6 (no unrelated refactors — see §18).
- [ ] Followed `developer.md`'s structure exactly for the two new charters.
- [ ] Every acceptance-criteria checkbox in §8 verified manually via the commands listed in "Comandos de verificacion."
- [ ] Every edge case in §11 considered in the actual command/charter prose (not just acknowledged here).
- [ ] No new dependencies added anywhere (plugin or site).
- [ ] No locked decision from §10 changed without flagging it back to the user first.
- [ ] `cd site && npm run build` still succeeds after the site-doc edits.
- [ ] No temporary notes, TODOs, or scratch files left in `docs/`, `commands/`, or `skills/`.
- [ ] `ADR-001`'s `Status` field updated to `accepted`.
