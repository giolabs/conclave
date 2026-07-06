# PM Story Authoring & TL ADR Authoring

> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.

## 1. Objetivo *(Goal)*

Give the two most-invoked roles — **Product Manager** and **Tech Lead** — commands they can run **at any point in a sprint** (not only at `/conclave-spec` time) to keep the founding artifacts alive as reality shifts:

1. **`/conclave-story`** — the PM can **create a new story**, **edit an existing one**, **split a story into smaller ones**, or **retire** a story that no longer makes sense, without having to hand-edit markdown or re-run `/conclave-spec`.

2. **`/conclave-adr`** — the TL can **author a standalone ADR file** in the target repo's `conclave/product/adr/` directory, either from a specific decision topic the user passes (`/conclave-adr "Redis vs Postgres for caching"`) or in **discovery mode** (`/conclave-adr` with no args) where the TL scans the sprint and the architecture and proposes ADR candidates for the user to pick from.

Both commands are available in every team mode (`solo`, `lean` team, `full-scrum` team) — the underlying need to refine scope and record technical decisions applies regardless of team size.

The combined outcome: teams stop treating `conclave/product/backlog.md` and `conclave/product/architecture.md` as write-once artifacts. The PM can groom mid-sprint. The TL can capture architectural decisions the moment they are made, with the ADR file becoming part of the audit trail every subsequent command reads.

## 2. Alcance *(Scope)*

### Incluido en esta fase

- **New command `commands/conclave-story.md`** with four sub-actions dispatched by the first argument:
  - `new` — PM subagent gathers the story idea via `AskUserQuestion`, produces a story file + acceptance file. User picks whether the story lands in `conclave/product/backlog.md` only, or is also pulled into the active sprint.
  - `edit US-NNN` — PM subagent reads the current story + acceptance, gathers what should change from the user, rewrites both files. Preserves the original story ID and history via git.
  - `split US-NNN` — PM subagent proposes 2–4 smaller stories that together cover the original scope. User confirms the split. Original story is set to `status: retired` with a `superseded_by: [US-NNN+1, ...]` frontmatter field; new stories reference the parent via `split_from: US-NNN`.
  - `retire US-NNN` — Story is moved to `status: retired`. A `retirement_reason` frontmatter field is added. Story stays in place under `stories/` (git history preserved); `backlog.md` marks it as `retired`.
- **New terminal story state `retired`** — added to the state machine documented in `SKILL.md` §6 and to `story.template.md`'s enum comment. `retired` is a terminal state (like `done`). It never advances to another state.
- **New command `commands/conclave-adr.md`** with two modes:
  - Topic-directed: `/conclave-adr "<decision topic>"` — TL subagent researches the decision (read-only exploration of the codebase, the architecture, and existing ADRs), then writes a full ADR file.
  - Discovery: `/conclave-adr` (no args) — TL subagent scans recent story-file activity in the active sprint, `architecture.md`, and existing ADRs; proposes 1–3 candidate decisions that would benefit from an ADR. The user picks one (or none) via `AskUserQuestion`; the command continues as if the picked topic had been passed as an argument.
- **New standalone-ADR file convention in target repos**: `conclave/product/adr/ADR-NNN-<slug>.md`. Numbering is monotonic — the command globs the directory to find the highest existing number and increments. IDs are never reused. The directory is created lazily on the first `/conclave-adr` invocation.
- **Update `conclave/product/architecture.md`**: replace the current inline ADR sections with a **`## 4. Architectural Decision Records`** section that now contains a *table of referenced ADRs* (columns: ID, title, status, date). Every entry links to a standalone file under `adr/`. Existing inline ADRs from prior `/conclave-spec` runs are migrated: extracted to `adr/ADR-NNN-<slug>.md` files, replaced in `architecture.md` with the referenced-ADR row. Migration happens the first time `/conclave-adr` runs against a repo that has inline ADRs. Details in §5.
- **New template `skills/conclave/templates/adr.template.md`** — the ADR file format the TL renders. Modelled on this repo's own `docs/adr/ADR-001-...md` but simplified for target-repo use.
- **Update `skills/conclave/templates/architecture.template.md`** — section 4 becomes the *table of referenced ADRs* rather than inline ADR text; new `## 7. How ADRs are added` prose section explaining `/conclave-adr`.
- **Update `skills/conclave/agents/product-manager.md`** — new operating-mode section: "How you operate inside `/conclave-story`". Covers the four sub-actions, the input/output contract per sub-action, and hard rules (e.g. never mutate a story's ID; never delete the file on `retire`).
- **Update `skills/conclave/agents/tech-lead.md`** — new operating-mode section: "How you operate inside `/conclave-adr`". Covers both topic-directed and discovery modes, the ADR file structure, and hard rules (e.g. never mark an ADR `accepted` — the TL only produces `proposed` ADRs; acceptance is a team decision on PR merge).
- **Model resolution** for both new commands, using the same pattern shipped in v0.7.0 (`models.overrides.product_manager` for `/conclave-story`, `models.overrides.tech_lead` for `/conclave-adr`, with fallback to `models.default`, then to session default).
- **`skills/conclave/SKILL.md` updates**: §3 role-to-subagent table gains `/conclave-story` and `/conclave-adr` rows; §5 templates list gains `adr.template.md`; §6 state machine gains the `retired` terminal state and its narration.
- **Docs**: `README.md` Quick start extended; new `site/content/{en,es}/commands/story.mdx` and `site/content/{en,es}/commands/adr.mdx`; `site/content/{en,es}/state-machine.mdx` updated for the `retired` state.
- **`CHANGELOG.md`** entry under `[Unreleased]` (staged for v0.8.0).
- **Version bump**: `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` `0.7.0` → `0.8.0`.

### Fuera de scope

- **A UI to browse ADRs** — the board (`/conclave-board`) does not gain an ADRs column or panel in this iteration. ADRs live in git and are read as markdown; the board stays story-centric.
- **ADR status transitions beyond `proposed`** — the TL only ever produces `proposed` ADRs; moving to `accepted` or `superseded` is a manual edit on PR merge (or the sequel of a follow-up ADR that supersedes an old one). No `/conclave-adr-accept` command in this phase.
- **Automatic ADR-to-story linking** — the ADR file may reference story IDs in prose, but there is no formal `related_stories` field, and stories do not gain an `informed_by_adrs` field. Reason: keeps the artifact schemas minimal; git grep across `conclave/` is enough for cross-referencing at this stage.
- **PM story-authoring in prose-only mode** — the PM does not produce plans, summaries, or non-artifact text output. Every `/conclave-story` invocation ends with a story file created / edited / split / retired, or the command refuses. Same pattern as every existing command.
- **A `merge` sub-action for `/conclave-story`** — merging two stories back into one is out of scope; teams do it by hand or via `edit` + `retire`. Reason: merges are rare and error-prone under acceptance-criteria interactions; not worth the surface area in v0.8.0.
- **Batch multi-story authoring** — no `/conclave-story new US-001 US-002` — this command dispatches one action per invocation. Multi-story dev/QA is covered by v0.6.0's batching in `/conclave-dev` and `/conclave-qa`.
- **Cross-sprint story movement** — moving a story from SPRINT-001 to SPRINT-002 is not a `/conclave-story` action. Teams do this by hand or via a future `/conclave-move` command.
- **Auto-ADR-generation from every architectural decision detected in a diff** — the discovery mode is opt-in and user-driven. There is no hook that watches `git diff` and offers ADRs unprompted.
- **Changing the story state machine beyond adding `retired`** — no new states other than `retired`. Every existing state and transition stays exactly as documented in `SKILL.md` §6.
- **Any change to `/conclave-spec`, `/conclave-planning`, `/conclave-dev`, `/conclave-qa`, or `/conclave-pr-review`** — those commands are unchanged. `/conclave-story` and `/conclave-adr` are new entry points on top of the same artifact model.

## 3. Tecnologias y convenciones del proyecto *(Technologies & conventions)*

### Stack

- **Plugin logic**: markdown only — commands, charters, and templates. No runtime, no build step, no application code.
- **Model parameter**: `Agent` tool `model` parameter — same as v0.7.0.
- **Storage**: plain markdown under the target repo's `conclave/` directory. New sub-directory `conclave/product/adr/` created lazily on first `/conclave-adr` run.

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave plugin | 0.7.0 → **0.8.0** (this change) | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| Story state enum | gains `retired` terminal state | `skills/conclave/templates/story.template.md`, `skills/conclave/SKILL.md` §6 |
| Architecture template | section 4 restructured to reference-only | `skills/conclave/templates/architecture.template.md` |
| ADR file format | new template | `skills/conclave/templates/adr.template.md` (NEW) |

### Patrones existentes a respetar

- **Commands are prose-orchestrated markdown**, matching the pattern shipped since v0.1.0. The two new commands follow the same numbered-step structure as existing commands (workspace resolve → load context → delegate → write outputs → report).
- **`AskUserQuestion` for every user decision**: what to name a new story, which stories to keep after a split, which candidate decision to author into an ADR. No CLI flags beyond the sub-action.
- **Model resolution matches v0.7.0**: the same `RESOLVE_MODEL(role_key)` logic — override → default → session — with `WARNING:` on invalid IDs. Absent `models:` block → silent no-op.
- **Charter operating modes**: extending existing charters (`product-manager.md`, `tech-lead.md`) with a "How you operate inside `<command>`" section is the same pattern used for `/conclave-pr-review` extending `tech-lead.md` in v0.1.
- **Never commits, never merges**: `/conclave-story` and `/conclave-adr` produce PR-ready state on the current branch. The user runs `git commit` and `gh pr create` afterwards — same as every existing command.
- **Snapshot context on artifact-generating runs**: both commands write a snapshot of the inputs they used (story files touched, architecture snapshot, existing ADR list) to `conclave/context/` under a time-stamped directory. Same auditability invariant `SKILL.md` §2 has documented since v0.1.0.
- **Frontmatter-only structured data**: every new field on story files (`retirement_reason`, `split_from`, `superseded_by`) is YAML frontmatter, not body prose. Matches `SKILL.md` §2 invariants.

## 4. Dependencias previas *(Prerequisites)*

- [ ] `skills/conclave/agents/product-manager.md` exists (v0.1+).
- [ ] `skills/conclave/agents/tech-lead.md` exists (v0.1+, extended by v0.7.0 with model resolution).
- [ ] `skills/conclave/templates/story.template.md`, `acceptance.template.md`, `product-backlog.template.md`, `architecture.template.md` all present.
- [ ] `skills/conclave/SKILL.md` §6 state-machine section (from the v0.1 QA/TL split) present so the `retired` state can be inserted alongside `done`.
- [ ] `conclave/config.md` per-install schema is at least v0.7.0 (contains `models:` block — required for model resolution in the two new commands).
- [ ] Model resolution helper pattern from v0.7.0's `/conclave-sprint` implementation lives in the docs as a canonical example (used by both new commands verbatim).
- [ ] `site/content/{en,es}/state-machine.mdx` exists (present since v0.4.0 EN/ES site split).
- [ ] `docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md` exists — used as the *style* reference (not the format contract; the format contract is the new `adr.template.md`).

## 5. Arquitectura *(Architecture)*

### Patron

Prose-orchestrated subagents (unchanged). Two additions:

- **`/conclave-story`** — one command file that dispatches on the first positional argument (`new | edit | split | retire`) to one of four sub-flows. Each sub-flow ends with a call to the PM subagent (identical charter, different task prompt per sub-action), which produces the story/acceptance markdown.
- **`/conclave-adr`** — one command file with two modes (topic vs discovery). Both modes end with a call to the TL subagent that produces the ADR file. Discovery adds a preceding read-only step where the TL reads recent sprint activity and existing ADRs to propose candidates.

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| Commands (`commands/`) | Yes | 2 new files: `conclave-story.md`, `conclave-adr.md`. No modifications to any existing command. |
| Agent charters (`skills/conclave/agents/`) | Yes | `product-manager.md` gains one operating-mode section; `tech-lead.md` gains one. No other charter changes. |
| Templates (`skills/conclave/templates/`) | Yes | 1 new: `adr.template.md`. 2 modified: `architecture.template.md` (section 4 → referenced-ADR table + section 7 prose), `story.template.md` (add `retired` to status enum, add `retirement_reason`, `superseded_by`, `split_from` optional frontmatter fields). |
| Story state machine | Yes | New terminal state `retired` documented in `SKILL.md` §6 and story template. |
| `conclave/product/architecture.md` schema (per-install, when regenerated) | Yes | Section 4 is now a table referencing standalone ADR files. Existing installs are migrated on first `/conclave-adr` run (see Migration below). |
| `conclave/product/adr/` directory (per-install) | Yes (NEW) | Created lazily. Numbered files `ADR-NNN-<slug>.md`. |
| `conclave/context/` snapshots | Yes | Both commands write a timestamped snapshot of the inputs they read, matching v0.1.0 invariant. |
| `skills/conclave/SKILL.md` | Yes | §3 catalog + §5 templates list + §6 state machine. |
| `README.md`, `CHANGELOG.md` | Yes | Quick start + entry. |
| `.claude-plugin/plugin.json`, `marketplace.json` | Yes | Version bump. |
| `site/content/{en,es}/commands/` | Yes | 2 new pairs of MDX pages. |
| `site/content/{en,es}/state-machine.mdx` | Yes | Add `retired` state row. |
| Every other command, template, charter | No | Unchanged. |

### `/conclave-story <action>` flow

```
/conclave-story new
/conclave-story edit US-NNN
/conclave-story split US-NNN
/conclave-story retire US-NNN
```

**Common preamble (all four sub-actions):**
1. **Workspace resolve** — `git rev-parse --show-toplevel`; require `conclave/config.md`; require clean working tree (`git status --porcelain` empty; else refuse per existing `/conclave-dev` pattern).
2. **Parse action** — first positional arg is one of `new | edit | split | retire`. Missing → refuse with usage. Unknown → refuse with usage.
3. **Load config** — read `conclave/config.md`: `team_profile`, `team_mode`, `models.*`. Resolve `MODEL_FOR_PM` = `RESOLVE_MODEL('product_manager')`. Print `Models: pm=<id or 'session'>`.
4. **Locate active sprint** — required for `edit`, `split`, `retire` to resolve `US-NNN`; optional for `new` (see §5.1).
5. **Snapshot context** — write inputs to `conclave/context/<timestamp>/` (existing files touched, `backlog.md`, active sprint's `spec.md`).

Then dispatch:

#### 5.1 `new`

- If `US-NNN` was passed positionally after `new`, refuse: `new` takes no ID. It always allocates the next monotonic ID.
- Compute `NEW_ID = max(US-NNN globbed from all sprints/*/stories/ + backlog references) + 1`, zero-padded to 3 digits.
- Ask (`AskUserQuestion`):
  - **Story title** (free text).
  - **Where should it land?** — `Backlog only` (default) / `Backlog + pull into active sprint` (only when a sprint is `active` or `draft`).
  - **Discipline** — `frontend | backend | mobile | qa | design | devops | multi` (default `multi`).
  - **Priority** — MoSCoW (default `should`).
  - **Estimate** — T-shirt (default `M`).
- Delegate to PM subagent with the task "author a new story from the seed inputs" (see §5.5).
- Write the story file to either `conclave/sprints/SPRINT-NNN/stories/US-NEW_ID-<slug>.md` (when the user chose "pull into sprint") or `conclave/product/stories-backlog/US-NEW_ID-<slug>.md` (backlog-only).
  - **New backlog-only directory** `conclave/product/stories-backlog/` — introduced to store stories that exist in `backlog.md` but are not yet pulled into any sprint. Created lazily. Reason: today, stories are only ever written under a sprint directory; `/conclave-spec` only pulls the top N into `SPRINT-001/stories/`. This spec adds a home for the rest so that "backlog-only" stories are first-class file artifacts, not just rows in `backlog.md`.
- Write the acceptance file next to the story: `.../acceptance/AC-US-NEW_ID.md`.
- Append the row to `conclave/product/backlog.md`, respecting the existing table structure. If the story was pulled into a sprint, its `Status` column reads `ready` and `In sprint` reads `SPRINT-NNN`; otherwise `backlog` / `—`.
- Report path + suggested `git add conclave/ && git commit && gh pr create` flow.

#### 5.2 `edit US-NNN`

- Locate the story file. It can be in the active sprint's `stories/` OR in `conclave/product/stories-backlog/`. If not found in either, refuse. `edit` never crosses sprints (a story in `SPRINT-001` cannot be edited into `SPRINT-002` — that's cross-sprint movement, out of scope).
- If the story's current `status` is `in-progress`, `review`, `verified`, or `done`, refuse: *"Story is past the ready gate. Editing acceptance criteria mid-implementation would invalidate the QA verification — surface the issue via a PR comment on the story file instead."*
- If `status` is `retired`, refuse: *"Story is retired. Un-retire it by editing its frontmatter `status:` field by hand (git will preserve the audit trail), then re-run this command."*
- Ask (`AskUserQuestion`): **What should change?** — free-form paragraph describing the edit. Optionally, the PM subagent asks follow-up questions (title / description / acceptance criteria / priority / estimate — the PM decides based on the user's stated change).
- Delegate to PM subagent with the task "edit the story per the user's stated change". The subagent's operating-mode contract limits what it can touch (see §5.5).
- Overwrite the story file and, if criteria changed, the acceptance file. Never renumber; never rename the file's slug (git tracks the history via the same path).
- Update the row in `backlog.md` if any surface fields (title, priority, estimate, discipline) changed.
- Report + suggested git flow.

#### 5.3 `split US-NNN`

- Locate the story file, same rules as `edit`. Same status guard: refuse if past `ready`.
- Ask (`AskUserQuestion`): **How many splits?** — 2 / 3 / 4. Then **What is the split axis?** — free-form paragraph (e.g. "by user flow", "by data layer vs UI").
- Delegate to PM subagent with the task "produce N child stories that together cover the parent's scope" (see §5.5).
- The PM returns N story markdown blocks + N acceptance markdown blocks. Each child is written to a new file with `US-NEW_ID` (monotonic per new story).
- Each child's frontmatter gains: `split_from: US-NNN` and `discipline: <inherited from parent>` (child may override — see charter).
- Parent story:
  - Frontmatter `status: retired`.
  - Frontmatter `superseded_by: [US-CHILD_1, US-CHILD_2, ...]`.
  - Frontmatter `retirement_reason: "Split into <children> — see split_from field on children"`.
  - File is NOT deleted (git-history invariant).
- `backlog.md`: parent row's Status → `retired`; add rows for each child in the same table position (immediately after parent). If parent was in a sprint (`In sprint: SPRINT-NNN`), each child inherits the same `In sprint` value; if it was backlog-only, children inherit backlog-only.
- Report the child IDs + suggested git flow.

#### 5.4 `retire US-NNN`

- Locate the story file, same rules as `edit`.
- Status guard: refuse if `in-progress`, `review`, `verified`, or `done` — retiring active or shipped work is either dishonest (it shipped) or requires reverting code first (`in-progress` should abort via `git branch -D` and reset before retiring). If `status: retired`, refuse: already retired.
- If status is `ready` or `backlog`, allow.
- Ask (`AskUserQuestion`): **Why is it being retired?** — free-form paragraph (required, non-empty). This becomes the `retirement_reason` frontmatter field.
- Update the story file's frontmatter: `status: retired`, `retirement_reason: <text>`, `retired_at: <ISO date>`. Body is unchanged.
- `backlog.md`: row's Status column → `retired`.
- **No PM subagent call** — this is a mechanical status change; no LLM needed. `retire` is the only sub-action that skips the PM delegate step. This is intentional: retirement is a policy decision the human already made; the PM has no research or authorship to add.
- Report + suggested git flow.

### 5.5 PM subagent contract (for `new`, `edit`, `split`)

The PM charter gains a "How you operate inside `/conclave-story`" section with three sub-contracts, one per LLM-driven sub-action:

- **`new`**: input = seed answers (title, discipline, priority, estimate) + optional context from the active sprint's `spec.md` (goal alignment). Output = one `## Story` markdown block (matching `story.template.md`) + one `## Acceptance` block (matching `acceptance.template.md`, 2–4 Gherkin scenarios).
- **`edit`**: input = current story markdown + current acceptance markdown + user's stated change. Output = edited story markdown + (if criteria changed) edited acceptance markdown. Hard rule: **preserve the story ID** and any frontmatter fields not covered by the user's change (`assignee`, `sprint`, etc.).
- **`split`**: input = parent story markdown + parent acceptance markdown + user's stated split axis + N (2/3/4). Output = N child story markdown blocks + N child acceptance markdown blocks. Hard rule: **children's combined Gherkin scenarios must together cover every scenario in the parent's acceptance**. The PM subagent enforces this **during proposal generation**, not post-hoc — it plans the parent→child scenario map first, refuses to emit any child blocks if a parent scenario cannot be assigned, and surfaces the offending scenario name in its refusal message. The orchestrator only validates that the returned child count equals N and that the child scenarios' union covers the parent's — it does NOT do the safety planning itself.

Common hard rules:

- Never mutate a story's ID.
- Never delete a story file. `retire` and `split` change frontmatter; the file stays.
- Never touch files outside `conclave/product/{backlog.md,stories-backlog/}` and (when applicable) the active sprint's `stories/` and `acceptance/` directories.
- Never modify a story whose `status` is past `ready` (that gate is enforced by the orchestrator; the charter is defense-in-depth).
- Never invent story IDs — the orchestrator computes them.

### `/conclave-adr [topic]` flow

```
/conclave-adr "Redis vs Postgres for caching"
/conclave-adr
```

**Common preamble:**
1. **Workspace resolve** — same as `/conclave-story`.
2. **Load config** — resolve `MODEL_FOR_TL` = `RESOLVE_MODEL('tech_lead')`. Print `Models: tl=<id or 'session'>`.
3. **Load architecture context** — read `conclave/product/architecture.md`, all files under `conclave/product/adr/` (if the dir exists), and the active sprint's `spec.md` (for sprint-level context).
4. **Compute next ADR number** — glob `conclave/product/adr/ADR-*.md`. If the directory doesn't exist, `NEXT_ID = 1`. Otherwise, `NEXT_ID = max(existing IDs) + 1`. Zero-padded to 3 digits.
5. **Snapshot context** — same as `/conclave-story`.

Then dispatch:

#### 5.6 Topic-directed mode

- The topic is the string passed as the first argument (or all args joined). Must be non-empty. If empty, treat as discovery mode.
- Delegate to TL subagent with:
  - Task: research and write a `proposed` ADR for the given topic.
  - Inputs: topic, `architecture.md` content, list of existing ADRs (ID + title + status + one-line summary each), the active sprint's `spec.md`, the codebase (TL is expected to Read/Grep/Glob as needed — see charter).
  - Output: full ADR markdown, matching `adr.template.md`.
- Write `conclave/product/adr/ADR-NEXT_ID-<slug>.md` from the returned markdown, filling in frontmatter (`id`, `status: proposed`, `date`, `deciders` = TL roster members if `team_mode: team`, else the single roster member for `solo`).
- Migrate any inline ADRs in `architecture.md` on first run (see 5.9).
- Update `architecture.md` section 4 (referenced-ADR table): append the new ADR's row.
- Report path + suggested git flow.

#### 5.7 Discovery mode

- Delegate to TL subagent with:
  - Task: propose 1–3 architectural decisions that would benefit from an ADR, based on recent sprint activity + gaps in `architecture.md` + open questions in existing ADRs.
  - Inputs: same as topic-directed, minus the topic.
  - Output: a structured list of `{ title, one_line_context, why_it_needs_an_adr }` triples (JSON-like YAML block).
- Present the candidates to the user via `AskUserQuestion` with options `Author <title 1>` / `Author <title 2>` / `Author <title 3>` / `None — cancel`.
- If a candidate is chosen, its title becomes the topic and the flow continues from 5.6 (delegate again — this time in topic-directed mode).
- If `None`, print `No ADR authored.` and exit cleanly (no files written).

#### 5.8 TL subagent contract (for `/conclave-adr`)

The TL charter gains a "How you operate inside `/conclave-adr`" section:

- **Read before writing**: TL is expected to Read the codebase, Grep for related patterns, Glob for existing usage. Read-only. No Edits or Writes from the subagent — the orchestrator is the only writer.
- **Structure the ADR per template**: Context → Decision → Alternatives Considered → Trade-offs → Consequences (Positive/Negative/Neutral) → Links. Each section has a hard rule about what belongs in it (see the template §6).
- **Status always `proposed`**: the TL never marks an ADR `accepted` — that is a team decision made when the PR that introduces the ADR is approved and merged. Hard rule.
- **Cite evidence**: every Decision claim cites a file path or existing ADR ID. Every Alternative row cites at least one piece of evidence for its Cons column (e.g., "would require a new $X dependency — see package.json:14").
- **Never invent a stack**: the TL grounds the ADR in `architecture.md`'s Confirmed stack. If a decision requires a new dependency not in the stack, the ADR must call that out explicitly as a "New dependency introduced" line in Consequences.
- **Discovery mode is scoped**: the TL proposes candidates from what is *actually* missing or ambiguous in `architecture.md` — not speculative "you might want to think about" ideas. If the TL cannot find at least one candidate, it returns an empty list; the orchestrator prints `No ADR candidates surfaced — architecture appears complete relative to sprint scope.` and exits.
- **Discovery titles must be distinct**: if the TL proposes ≥ 2 candidates, their `title` fields must be maximally distinguishable — no two candidates may differ only by adjectives ("Caching layer" vs "Caching approach") or by the same decision framed two ways ("Redis vs Postgres" vs "Postgres vs Redis"). If the TL cannot produce distinct titles, it merges the near-duplicates into a single candidate whose title spans them (e.g., "Cache backend choice: Redis vs Postgres vs Memcached"). Rationale: the `AskUserQuestion` step that follows presents titles as bare options — indistinct titles make the user's pick ambiguous.

#### 5.9 Inline-ADR migration (first `/conclave-adr` run per repo)

Before writing the new ADR, the orchestrator checks whether `architecture.md` contains inline ADR sections (matching the pattern `### ADR-NNN: <title>` from the current v0.7.0 `architecture.template.md`).

- If **no inline ADRs** — nothing to migrate. Proceed.
- If **inline ADRs found**:
  1. Parse each inline ADR **one at a time**: extract ID (`NNN`), title, and body (Context/Decision/Consequences from the current inline format).
  2. For each inline ADR, **before writing anything**, check whether `conclave/product/adr/ADR-NNN-<slug>.md` already exists — if it does, this ADR was already extracted by an earlier (interrupted) run; skip it and continue with the next inline ADR. Otherwise, write the standalone file. Fill missing fields: `status: accepted`; `date` = the literal string `"unknown"` when the original inline decision date is not derivable from git-blame (the migration is mechanical — TL is not called; git-blame lookup is best-effort only, e.g. `git log --diff-filter=A --format=%aI -- conclave/product/architecture.md | tail -1`); `deciders` = the current roster's TL from `roster.md` at time of run; `alternatives_considered` and `trade_offs` = empty with a stub note *"Migrated from inline `architecture.md` — not populated at the time of the original decision"*.
  3. After each successful per-ADR write, **remove that specific inline section from `architecture.md`** (do not wait until all ADRs are extracted to touch `architecture.md`). This keeps state consistent: at any point mid-migration, an inline section still present in `architecture.md` corresponds to an ADR whose standalone file has NOT yet been written; an inline section that has been removed corresponds to an extracted ADR file that already exists on disk.
  4. Once all inline ADRs are extracted, replace what remains of section 4 in `architecture.md` with the new referenced-ADR table format, containing one row per migrated ADR plus the new one being authored.
  5. Commit this migration as part of the same `git commit` the user runs after `/conclave-adr` — the migration is not auto-committed.

**Resumability**: because per-ADR extraction is atomic (write the standalone file, then remove the inline section), an interrupted migration leaves `architecture.md` in a consistent partial state — some inline sections removed, some still present, and the standalone-file directory containing exactly the extracted ones. A re-run of `/conclave-adr` picks up where the previous run left off, extracting only the remaining inline sections.

**Idempotency**: a second `/conclave-adr` run after a fully successful migration finds no inline ADRs left in `architecture.md` and skips migration entirely. The state is inspectable in `architecture.md`: presence of an inline ADR heading == this ADR not yet extracted; absence of all inline headings == migration complete.

### Model-resolution logic

Reused from v0.7.0 verbatim. Both commands add one line in their Load-config step: `MODEL_FOR_<PM|TL> = RESOLVE_MODEL(<role_key>)`. Both commands print `Models: <role>=<id or 'session'>` before dispatching.

### Layout de archivos

```
commands/
  conclave-story.md               # NUEVO
  conclave-adr.md                 # NUEVO
skills/conclave/
  agents/
    product-manager.md            # MODIFICAR — add operating mode for /conclave-story
    tech-lead.md                  # MODIFICAR — add operating mode for /conclave-adr
  templates/
    adr.template.md               # NUEVO
    architecture.template.md      # MODIFICAR — section 4 becomes reference-table; new section 7
    story.template.md             # MODIFICAR — add `retired` to status enum; new optional frontmatter fields
    product-backlog.template.md   # MODIFICAR — allow `retired` in the Status column enum note
  SKILL.md                        # MODIFICAR — §3 catalog, §5 templates list, §6 state machine
README.md                         # MODIFICAR — quick start
CHANGELOG.md                      # MODIFICAR — [Unreleased] / v0.8.0 entry
.claude-plugin/plugin.json        # MODIFICAR — version bump
.claude-plugin/marketplace.json   # MODIFICAR — version bump
site/content/en/commands/
  story.mdx                       # NUEVO
  adr.mdx                         # NUEVO
site/content/es/commands/
  story.mdx                       # NUEVO
  adr.mdx                         # NUEVO
site/content/en/
  state-machine.mdx               # MODIFICAR — add `retired` row
site/content/es/
  state-machine.mdx               # MODIFICAR — add `retired` row
```

## 6. Archivos a crear o modificar *(Files to create / modify)*

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `commands/conclave-story.md` | NUEVO | Command orchestrator for `new`/`edit`/`split`/`retire` sub-actions | `commands/conclave-dev.md` (multi-branch dispatch pattern for sub-actions), `commands/conclave-spec.md` (workspace-resolve → load-config → delegate pattern) |
| `commands/conclave-adr.md` | NUEVO | Command orchestrator for topic-directed and discovery modes | `commands/conclave-pr-review.md` (single-role delegate pattern), `commands/conclave-planning.md` (multi-mode-per-flag pattern) |
| `skills/conclave/agents/product-manager.md` | MODIFICAR | New operating-mode section covering the four sub-actions | Existing `## How you operate inside /conclave-spec` section (v0.1.0 pattern) |
| `skills/conclave/agents/tech-lead.md` | MODIFICAR | New operating-mode section covering topic-directed + discovery ADR authoring | Existing `## How you operate inside /conclave-pr-review` section (v0.1.0 pattern) |
| `skills/conclave/templates/adr.template.md` | NUEVO | ADR file format the TL renders | `docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md` (style reference — simplified for target-repo use) |
| `skills/conclave/templates/architecture.template.md` | MODIFICAR | Section 4 → referenced-ADR table; new section 7 "How ADRs are added" | Existing section 4 structure — replace ADR-NNN inline entries with a table |
| `skills/conclave/templates/story.template.md` | MODIFICAR | Add `retired` to status enum comment; three new optional frontmatter fields (`retirement_reason`, `retired_at`, `superseded_by`, `split_from`) | Existing frontmatter block; no restructure |
| `skills/conclave/templates/product-backlog.template.md` | MODIFICAR | Update Legend/enum note to include `retired` value in the Status column | Existing Legend section |
| `skills/conclave/SKILL.md` | MODIFICAR | §3 role-to-subagent rows for `/conclave-story` (PM) and `/conclave-adr` (TL); §5 templates list gains `adr.template.md`; §6 state machine gains `retired` narration | Existing §3 table + §6 state-machine section |
| `README.md` | MODIFICAR | Quick start adds `/conclave-story` and `/conclave-adr` examples | Existing Quick start section (`/conclave-spec`, `/conclave-planning`, ..., `/conclave-sprint` list) |
| `CHANGELOG.md` | MODIFICAR | `[Unreleased]` / v0.8.0 entry with Added / Changed subsections | `[0.7.0]` entry format |
| `.claude-plugin/plugin.json` | MODIFICAR | Version `0.7.0` → `0.8.0` | Existing version field |
| `.claude-plugin/marketplace.json` | MODIFICAR | Version `0.7.0` → `0.8.0`; description text updated to mention the two new commands | Existing description + version |
| `site/content/en/commands/story.mdx` | NUEVO | English docs for `/conclave-story` | `site/content/en/commands/sprint.mdx` (or nearest per-command doc) |
| `site/content/es/commands/story.mdx` | NUEVO | Spanish translation of same | ES sibling |
| `site/content/en/commands/adr.mdx` | NUEVO | English docs for `/conclave-adr` | Same as story.mdx |
| `site/content/es/commands/adr.mdx` | NUEVO | Spanish translation | ES sibling |
| `site/content/en/state-machine.mdx` | MODIFICAR | Add `retired` state row + transitions note | Existing state table |
| `site/content/es/state-machine.mdx` | MODIFICAR | Same, Spanish | ES sibling |

### Detalle por archivo

#### `commands/conclave-story.md` (NEW)

Standard command structure (frontmatter with `description`, `allowed-tools`). Steps 1–5 as described in §5 preamble; Step 6 dispatches by sub-action to §5.1–5.4.

`allowed-tools` at minimum: `Bash(git rev-parse:*), Bash(git status:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Read, Write, Edit, Agent, AskUserQuestion`. Does NOT need `git commit`, `git push`, or `gh pr create` — the user runs those manually.

**No mezclar**: no changes to `/conclave-spec`'s backlog-authoring logic; no changes to `/conclave-planning`'s story-assignment logic.

#### `commands/conclave-adr.md` (NEW)

Standard command structure. Steps 1–5 as described in §5 preamble; Step 6 dispatches to §5.6 or §5.7 based on presence of a topic argument.

`allowed-tools` at minimum: `Bash(git rev-parse:*), Bash(git status:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(find:*), Read, Write, Edit, Agent, AskUserQuestion`. The `find` permission is for globbing `conclave/product/adr/ADR-*.md` to compute the next ID.

**No mezclar**: does not modify `architecture.md` beyond its section 4 table and section 7; does not touch any story file.

#### `skills/conclave/agents/product-manager.md` (MODIFY)

Add a new top-level `## How you operate inside /conclave-story` section after the existing `## How you operate inside /conclave-spec` (or wherever the pattern lives). Structure:

```markdown
### For `/conclave-story new`
- Inputs: seed answers, active sprint spec (for goal alignment when the story enters the sprint)
- Output: story markdown block + acceptance markdown block
- Hard rules: ... (per §5.5)

### For `/conclave-story edit`
- Inputs: current story markdown, current acceptance markdown, user's stated change
- Output: edited story markdown (and edited acceptance if criteria changed)
- Hard rules: preserve ID, preserve non-touched frontmatter fields

### For `/conclave-story split`
- Inputs: parent story markdown, parent acceptance markdown, user's split axis, N
- Output: N child story markdown blocks + N child acceptance markdown blocks
- Hard rules: children's combined scenarios must cover parent's scenarios; refuse if scope leaks
```

**No mezclar**: do not touch the existing `## How you operate inside /conclave-spec` section (backlog generation).

#### `skills/conclave/agents/tech-lead.md` (MODIFY)

Add a `## How you operate inside /conclave-adr` section after the existing `## How you operate inside /conclave-pr-review`. Cover topic-directed and discovery modes per §5.6/5.7/5.8. Emphasize the "status always proposed" hard rule.

**No mezclar**: do not touch `/conclave-spec` (architecture authoring) or `/conclave-planning` (feasibility review) or `/conclave-pr-review` sections.

#### `skills/conclave/templates/adr.template.md` (NEW)

```markdown
---
id: "ADR-{{id}}"
title: "{{title}}"
status: proposed          # proposed | accepted | superseded
date: "{{iso_date}}"
deciders: {{deciders_yaml_list}}
tags: {{tags_yaml_list}}
supersedes: null          # optional list of prior ADR IDs this one replaces; set MANUALLY when the team decides to supersede
superseded_by: null       # optional list of newer ADR IDs that replace this one; set MANUALLY (or by a future /conclave-adr-supersede — out of scope in v0.8.0)
generated_by: conclave
---

# ADR-{{id}}: {{title}}

## Context

{{context}}

## Decision

{{decision}}

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| {{option_1}} | {{pros_1}} | {{cons_1}} |
| {{option_2}} | {{pros_2}} | {{cons_2}} |

## Trade-offs

{{trade_offs_prose}}

## Consequences

### Positive
- {{positive_bullet}}

### Negative
- {{negative_bullet}}

### Neutral
- {{neutral_bullet}}

## Links

- Related sprint stories: {{story_ids_or_none}}
- Related ADRs: {{adr_ids_or_none}}
- References: {{external_links_or_none}}
```

Prose note at the bottom of the template file (out of the rendered markdown): "The TL agent produces `status: proposed`. Moving to `accepted` is done by hand on PR merge; `superseded` is set automatically by a follow-up ADR that names this one in its `supersedes:` field."

#### `skills/conclave/templates/architecture.template.md` (MODIFY)

Replace section 4 body:

```markdown
## 4. Architectural Decision Records

Each row references a standalone ADR file under `conclave/product/adr/`. To author a new one, run `/conclave-adr "<decision topic>"` (or `/conclave-adr` for discovery mode).

| ID | Title | Status | Date |
|---|---|---|---|
| — | — | — | — |
```

(Table starts empty; `/conclave-spec` and `/conclave-adr` populate it.)

Add a new section:

```markdown
## 7. How ADRs are added

New ADRs are authored via `/conclave-adr`. See [the command reference](../../../site/content/en/commands/adr.mdx) or run `/conclave-adr` (discovery mode) to have the Tech Lead propose candidates.

ADR files live at `conclave/product/adr/ADR-NNN-<slug>.md`. Numbering is monotonic and never reused; retired ADRs stay in place with `status: superseded`.
```

**No mezclar**: do not touch sections 1, 2, 3, 5, 6, or the trailing "How this document changes" section.

#### `skills/conclave/templates/story.template.md` (MODIFY)

Update the `status` comment to include `retired`:

```yaml
status: backlog                 # backlog | ready | in-progress | review | verified | done | retired
```

Add optional frontmatter fields (documented as optional in the prose block below the frontmatter):

```yaml
retirement_reason: ""           # optional — filled by /conclave-story retire
retired_at: ""                  # optional — ISO date filled by /conclave-story retire
superseded_by: []               # optional — list of story IDs, filled by /conclave-story split (on the parent)
split_from: ""                  # optional — parent story ID, filled by /conclave-story split (on the children)
```

Add a section to the prose block:

```markdown
## `retired`

A story with `status: retired` is a terminal state — it is not scheduled, not implemented, not reviewed. Filled by `/conclave-story retire` (with `retirement_reason` and `retired_at`) or `/conclave-story split` (on the parent, with `superseded_by` also set).
```

**No mezclar**: do not touch the existing state transitions section (state machine still ends in `done`; `retired` is a parallel terminal state).

#### `skills/conclave/templates/product-backlog.template.md` (MODIFY)

Legend section: extend the `Status` bullet to list `retired` as an additional terminal value. No structural change to the table.

#### `skills/conclave/SKILL.md` (MODIFY)

- §3 role-to-subagent table gains two rows:

  | `/conclave-story` | Product Manager | Solo, lean, full-scrum |
  | `/conclave-adr` | Tech Lead | Solo, lean, full-scrum |

- §5 templates list gains `adr.template.md`.
- §6 state machine section: update the state list to `backlog | ready | in-progress | review | verified | done | retired` and add a paragraph:

  > `retired` is a parallel terminal state to `done`. A story enters it via `/conclave-story retire` (explicit retirement, with `retirement_reason` and `retired_at` frontmatter fields) or `/conclave-story split` (on the parent, when the story is decomposed into children). `retired` stories are excluded from every command's collection (`/conclave-planning`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, `/conclave-sprint`) — they are historical records only.

**No mezclar**: do not touch other §6 transitions or the profile-aware branching text.

#### `README.md` (MODIFY)

Quick-start section: append two lines to the existing command sequence:

```bash
# Groom or refine stories at any time
/conclave-story new            # or edit / split / retire

# Author a Tech Lead ADR
/conclave-adr "<decision topic>"
```

#### `CHANGELOG.md` (MODIFY)

Add under `[Unreleased]`:

```markdown
### Added
- **`/conclave-story` (PM story authoring)**: four sub-actions — `new`, `edit US-NNN`, `split US-NNN`, `retire US-NNN` — that let the PM keep the backlog alive without hand-editing markdown or re-running `/conclave-spec`. Every action is profile- and mode-agnostic (works in solo, lean, and full-scrum). Story IDs are monotonic and never reused; splits mark the parent `retired` with a `superseded_by:` list.
- **`/conclave-adr` (TL ADR authoring)**: two modes — topic-directed (`/conclave-adr "<decision>"`) and discovery (`/conclave-adr` with no args, TL proposes 1–3 candidates from sprint activity + architecture gaps). ADRs are written as standalone files at `conclave/product/adr/ADR-NNN-<slug>.md`. `architecture.md` section 4 becomes a referenced-ADR table; inline ADRs from prior installs are migrated on first `/conclave-adr` run.
- **New terminal story state `retired`** — excluded from every command's story-collection query. Documented in `SKILL.md` §6.
- **New optional story-frontmatter fields**: `retirement_reason`, `retired_at`, `superseded_by`, `split_from`. All optional; existing installs are unaffected.
- **New template `skills/conclave/templates/adr.template.md`** — ADR file format, modelled on this repo's own `docs/adr/ADR-001-...md`.
- **New backlog-only story directory `conclave/product/stories-backlog/`** — home for stories that exist in `backlog.md` but are not yet pulled into any sprint. Created lazily by `/conclave-story new` when the user picks "backlog only".

### Changed
- `skills/conclave/templates/architecture.template.md` section 4 is now a *referenced-ADR table* rather than inline ADR sections. New section 7 documents the `/conclave-adr` flow.
- `skills/conclave/agents/product-manager.md` gains a "How you operate inside `/conclave-story`" section with per-sub-action contracts.
- `skills/conclave/agents/tech-lead.md` gains a "How you operate inside `/conclave-adr`" section with topic-directed and discovery contracts.
- Existing installs with inline ADRs in `architecture.md` are migrated on the first `/conclave-adr` run — inline ADRs are extracted to standalone files under `conclave/product/adr/` with `status: accepted` and `date: unknown`.
```

## 7. API Contract

Sin API surface — no aplica. No HTTP layer. Everything is local markdown authoring via the Claude Code `Agent` and file-write tools.

## 8. Criterios de exito *(Success criteria)*

- [ ] `/conclave-story new` in a repo with an initialized `conclave/`: the command asks for title / discipline / priority / estimate + backlog-only vs pull-into-sprint. On completion, the story file exists at either `conclave/product/stories-backlog/US-NNN-<slug>.md` or `conclave/sprints/SPRINT-NNN/stories/US-NNN-<slug>.md`; an acceptance file with 2–4 Gherkin scenarios exists at the sibling path; `backlog.md` has a new row with the correct Status and In-sprint values.
- [ ] `/conclave-story edit US-002` on a `ready` story: user's stated change is applied; story ID is unchanged; frontmatter fields not covered by the change are unchanged; `backlog.md` row surface fields updated only if the change touched them.
- [ ] `/conclave-story edit US-002` on a story with `status: in-progress`: command refuses with the exact error text specified in §5.2.
- [ ] `/conclave-story split US-005` on a `ready` story with 3 Gherkin scenarios, split into 2: two child story files are created (`US-N+1`, `US-N+2`) with their own acceptance files; each has `split_from: US-005` in frontmatter; parent has `status: retired`, `superseded_by: [US-N+1, US-N+2]`, `retirement_reason` set to a "Split into ..." message; `backlog.md` has 3 rows (parent retired, two children in place).
- [ ] `/conclave-story split US-005` where the PM subagent cannot cover a parent scenario in any child: command refuses with the offending scenario name; no files are written.
- [ ] `/conclave-story retire US-007` on a `ready` story: user provides a retirement reason; story frontmatter updates to `status: retired`, `retirement_reason: <text>`, `retired_at: <ISO date>`; no PM subagent call is dispatched; `backlog.md` row's Status → `retired`.
- [ ] `/conclave-story retire US-007` on a story with `status: in-progress`: command refuses with the exact error text specified in §5.4.
- [ ] `/conclave-adr "PostgreSQL vs Redis for caching"` in a repo with a v0.7.0 `architecture.md` containing 2 inline ADRs: on completion, `conclave/product/adr/` exists with 3 files (ADR-001, ADR-002 migrated from inline; ADR-003 newly authored); `architecture.md` section 4 is a table with 3 rows; migrated ADRs have `status: accepted` and `date: unknown`; new ADR has `status: proposed` and today's date.
- [ ] Second `/conclave-adr` run (topic-directed) in the same repo: migration is skipped (no inline ADRs to migrate); one new file `ADR-004-<slug>.md` is created; `architecture.md` table gains one row.
- [ ] `/conclave-adr` with no args in a repo with a rich sprint and gaps in `architecture.md`: TL proposes 1–3 candidates; user picks one; ADR is authored the same way as topic-directed.
- [ ] `/conclave-adr` with no args in a fresh repo with an empty sprint and complete `architecture.md`: TL returns empty list; command prints "No ADR candidates surfaced ..." and exits with no file writes.
- [ ] `conclave/config.md` with `models.overrides.product_manager: claude-opus-4-6`: `/conclave-story new` prints `Models: pm=claude-opus-4-6` and dispatches the PM Agent with that model.
- [ ] `conclave/config.md` without a `models:` block: both new commands behave identically to a session-default run — no model line printed, no warning.
- [ ] Working tree dirty: both commands refuse with the same error text existing commands use.
- [ ] A story is `retired` (via `retire` or `split`): `/conclave-planning` does not offer it as assignable; `/conclave-dev` refuses to pick it up; `/conclave-sprint`'s Phase 2 does not collect it.
- [ ] `CHANGELOG.md`, `README.md`, `SKILL.md`, `site/content/{en,es}/commands/story.mdx`, `site/content/{en,es}/commands/adr.mdx`, `site/content/{en,es}/state-machine.mdx`, and both plugin manifest files are updated per §6.

### Tests requeridos

No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands"). All scenarios above are verified manually per the verification commands.

### Comandos de verificacion

```bash
# In the plugin repo — validate the plugin manifest after edits:
claude plugin validate .

# In a scratch target repo with a v0.7.0 conclave/ setup:
/conclave-story new                                # PM authors a fresh story into the backlog
/conclave-story edit US-003                        # PM refines a ready story
/conclave-story split US-004                       # PM decomposes a story into 2 or 3 children
/conclave-story retire US-002                      # PM retires an obsolete story
/conclave-adr "Postgres vs Redis for caching"      # TL authors a proposed ADR
/conclave-adr                                      # Discovery mode — TL proposes candidates
```

Then in the target repo:

```bash
# Confirm the file layout
find conclave/product/adr -type f
find conclave/product/stories-backlog -type f 2>/dev/null || echo "(no backlog-only stories yet)"

# Confirm migration idempotency
grep -c "^### ADR-" conclave/product/architecture.md   # must be 0 after first /conclave-adr run
grep -c "\bconclave/product/adr/ADR-" conclave/product/architecture.md  # must equal number of ADRs

# Confirm the story state machine still refuses retired stories in dev/planning
/conclave-dev US-002    # (US-002 is retired) — must refuse
/conclave-planning      # (there is a draft sprint) — retired stories must NOT appear in assignments
```

## 9. Criterios de UX *(UX criteria)*

### Loading

Both commands print a model-summary line (or nothing if the `models:` block is absent) before dispatching the first Agent call — same convention as v0.7.0.

`/conclave-story split` and `/conclave-story new` print a progress line before Agent dispatch: `Delegating to product-manager (split into 3 children) ...`. Same style as `/conclave-planning`'s existing Agent-dispatch narration.

`/conclave-adr` discovery mode prints `Scanning sprint activity + architecture for ADR candidates ...` before the TL subagent runs.

### Formularios

Every user decision uses `AskUserQuestion` — no bare CLI prompts. Multi-select is used for "how many splits" (2/3/4) and "where does the new story land" (Backlog / Sprint). Free-form text is used for titles, split axes, and retirement reasons.

### Passwords

No aplica — no credentials involved.

### Errores

Each error case has an exact message; see §5 for the full list. Summary:

- Missing / unknown sub-action for `/conclave-story`: `"Usage: /conclave-story <new|edit US-NNN|split US-NNN|retire US-NNN>"`.
- Dirty working tree: `"Working tree is dirty. Stash or commit your local changes, then re-run."` (identical to `/conclave-dev`'s message).
- Story not found in the active sprint or backlog-only directory: `"US-NNN not found in the active sprint or in conclave/product/stories-backlog/."`.
- Story past `ready` (for `edit`/`split`/`retire`): the exact texts from §5.2, §5.3, §5.4.
- PM subagent flags an unsafe split: `"Cannot cover parent scenario '<scenario name>' in any proposed child. Split refused. Adjust the split axis or reduce N."`.
- TL discovery mode returns empty: `"No ADR candidates surfaced — architecture appears complete relative to sprint scope."`.
- No topic for `/conclave-adr` when discovery mode wasn't requested: not an error — the command interprets empty args as discovery mode.
- Invalid model ID: `WARNING: Unknown model '<value>' for role <role>. Falling back to <fallback>.` — same as v0.7.0.

### Navegacion

No aplica — text-only CLI.

### Accesibilidad

No aplica — text-only CLI.

## 10. Decisiones tomadas *(Decisions made — locked)*

| Decision | Why |
|---|---|
| One `/conclave-story` command with sub-actions (not four separate commands) | Explicit user decision. Smaller command-menu surface; the sub-action naturally frames the PM's task. Matches other plugins' `<tool> <verb>` pattern. |
| `retire` is a mechanical status change with no LLM call | Retirement is a policy decision the human already made; adding an LLM step would produce prose no one reads and delay a simple frontmatter edit. |
| `split` never merges scenarios — children cover all parent scenarios | Explicit safety property from §5.5. Prevents scope leaks during splits — the PM subagent must refuse an unsafe split rather than silently drop coverage. |
| ADRs live in standalone files under `conclave/product/adr/` (not inline in `architecture.md`) | Explicit user decision. Diffeable per ADR; reviewable in isolation on a PR; mirrors this repo's own `docs/adr/` convention. |
| Inline ADRs in existing installs are migrated on first `/conclave-adr` run | Backward compatibility for the ~users of v0.1–0.7 already have inline ADRs from `/conclave-spec`. Migration is deterministic and idempotent. |
| Migrated ADRs get `status: accepted, date: unknown` | Migration is mechanical — we cannot know the original decision date without git-blame gymnastics. `accepted` is the honest default (the team acted on them by shipping `architecture.md`). |
| TL only produces `status: proposed` ADRs | Explicit user decision (`/generate-spec` answers). Team decides on acceptance at PR-merge time — the TL is proposing, not deciding. |
| Discovery mode returns 1–3 candidates or none — never more | Prevents overwhelm; forces the TL to prioritise. If nothing surfaces, the empty result is an honest signal. |
| New `retired` terminal state (rather than reusing `backlog` + a flag) | Explicit state is queryable, greppable, and self-documenting in the frontmatter enum. A flag on `backlog` would leak retired stories into every existing "collect all backlog stories" query. |
| `retired` is terminal — no un-retire command | If a team changes their mind, they hand-edit the frontmatter (git preserves history). A dedicated command implies retirement is common; it should be rare. Same argument as "no un-done command". |
| `edit`/`split`/`retire` refuse on `in-progress`+ stories | Mid-implementation edits invalidate the QA verification model. Surface the issue via a PR comment on the story file instead — the dev fixes it in the same PR. |
| Backlog-only stories live in a new `conclave/product/stories-backlog/` dir | Today, backlog rows in `backlog.md` reference stories that exist only under a sprint dir. This spec makes those rows first-class files, which lets `edit`/`split`/`retire` operate uniformly on backlog and sprint stories. |
| `architecture.md` migration is not auto-committed | Every Conclave command is PR-driven; the migration commit is included in the PR the user opens after `/conclave-adr` runs. |
| Model resolution reuses the v0.7.0 pattern verbatim | Consistency: one resolution rule across all commands means one behavior to explain and one bug surface. |
| No `merge` sub-action | Merging two stories back into one is rare; the PM can `edit` one story and `retire` the other. Adding `merge` would need policy on scenario reconciliation not worth the surface area. |
| ADR `supersedes` / `superseded_by` are set **manually on PR merge**, not by any Conclave command in v0.8.0 | Consistent with the "TL only produces `proposed`" decision above: transitioning an ADR to `superseded` is a team decision, made when the newer ADR that replaces it is accepted. The fields exist in the template so future ADRs can reference them, and so a follow-up `/conclave-adr-supersede` (out of scope this phase) has a target schema to write. Teams that want to hand-supersede an ADR before that command ships: edit both files' frontmatter directly — git preserves the audit trail. |

## 11. Edge cases

### Datos invalidos

- `/conclave-story` with no sub-action → refuse with usage.
- `/conclave-story edit` (no US-NNN) → refuse with usage.
- `/conclave-story new US-NNN` → refuse (`new` takes no ID; command allocates monotonically).
- `US-NNN` argument that references a story in a `done` or `archived` sprint (not the active one) → refuse: `edit`/`split`/`retire` scope is the active sprint + backlog-only dir. Cross-sprint operations are out of scope.
- Split N outside {2, 3, 4} → the `AskUserQuestion` options constrain the answer; unreachable in the happy path.
- `/conclave-adr ""` (empty string argument) → treated as discovery mode.
- Multiple positional args to `/conclave-adr` → joined with spaces into the topic string.

### API errors / Agent call failures

- PM subagent returns unparseable markdown for `new`/`edit`/`split` → refuse with `Product Manager subagent produced malformed output. Re-run and consider a different model or wording of your inputs.` No files are written.
- TL subagent returns unparseable ADR markdown → same message pattern, no files written.
- TL subagent proposes 0 candidates in discovery mode → command exits cleanly with the "No ADR candidates surfaced" message (this is not an error).
- Agent call throws during migration → migration is atomic per-file (extract inline ADR N, then write ADR-N file). If interrupted, some inline sections may already be extracted; the user resolves by hand or re-runs the command (idempotent — the command detects the partial state).

### Sin conexion

- No network calls in either command — same as every existing command.

### Timeout

- Long-running TL discovery (Read/Grep/Glob on a large codebase) → the Agent call inherits the parent Claude Code session's timeout. No new timeout knob. If it hits it, the user re-runs with a narrower topic (or does not use discovery mode on a very large codebase).

### Respuesta vacia o inesperada

- PM subagent returns fewer than N stories in `split` → refuse: `Split expected N children, subagent returned M. Aborting.`.
- TL subagent returns an ADR without a Decision section → refuse: `ADR is missing the Decision section. Aborting.`.

### Doble submit / re-run

- Re-running `/conclave-story new` — always allocates a new ID; no collision.
- Re-running `/conclave-story split US-005` on an already-`retired` story → refuse: `Story is retired.`. To split a story again, hand-un-retire it first.
- Re-running `/conclave-adr "same topic"` — always allocates a new ADR number and writes a new file. The user is free to `git checkout .` if it was a mistake.
- Re-running `/conclave-adr` (discovery) after migration → migration is skipped (no inline ADRs left).

## 12. Estados de UI requeridos *(Required UI states)*

No aplica — text-only CLI. The observable states are:

- **Story `status` frontmatter** — the source of truth. New values: `retired`. Every existing state is unchanged.
- **Story `retirement_reason`, `retired_at`, `superseded_by`, `split_from`** — new optional frontmatter fields. Absent by default; populated only by their triggering sub-actions.
- **ADR `status` frontmatter** — enum values: `proposed` (TL default), `accepted` (manual on merge), `superseded` (set by a follow-up ADR).
- **`architecture.md` section 4** — table format (post-migration). Pre-migration format (inline `### ADR-NNN` blocks) is a transient state that only exists in un-migrated repos.

## 13. Validaciones *(Validations)*

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| First positional arg of `/conclave-story` | One of `new | edit | split | retire` | `Usage: /conclave-story <new|edit US-NNN|split US-NNN|retire US-NNN>` |
| `US-NNN` arg for `edit`/`split`/`retire` | Must match a story file in the active sprint or backlog-only dir | `US-NNN not found in the active sprint or in conclave/product/stories-backlog/.` |
| Story `status` for `edit`/`split`/`retire` | Must be `ready` or `backlog` | Exact text per §5.2/§5.3/§5.4 (varies by sub-action) |
| Retirement reason | Non-empty string | `Retirement reason is required.` (via `AskUserQuestion`'s "required" flag) |
| Split N | Integer in {2, 3, 4} | Enforced by `AskUserQuestion` options |
| `/conclave-adr` topic | Optional; if present, non-empty when trimmed | Empty string → treated as discovery mode |
| ADR file body | Must include Decision section | `ADR is missing the Decision section. Aborting.` |
| PM subagent split output | `len(children) == N` and combined scenarios ⊇ parent scenarios | `Split expected N children, subagent returned M. Aborting.` OR `Cannot cover parent scenario '<name>' in any proposed child. Split refused.` |

### Validaciones de servidor

No aplica.

## 14. Seguridad y permisos *(Security & permissions)*

- **No secrets involved** — story titles, ADR topics, retirement reasons are all committed to git and visible to the whole team. Same exposure as every other `conclave/` file.
- **No new permission surface** — both new commands invoke the same PM and TL subagents that other commands invoke; charter-level guardrails (PM does not commit, TL does not merge) apply unchanged.
- **File-write scope** — both commands are restricted to `conclave/product/`, `conclave/sprints/<active>/`, and `conclave/context/`. The `allowed-tools` in each command's frontmatter excludes any tool that could write outside this scope. The orchestrator additionally refuses to touch files under `.claude-plugin/`, `docs/`, `.github/`, or the plugin's own `commands/`/`skills/` directories in a target repo (defense in depth — this is a target-repo command, but the same command file would be shipped inside the plugin's own repo where a rogue write could mutate the plugin itself).

## 15. Observabilidad y logging *(Observability & logging)*

- **Terminal output** — each command's own model summary line, progress narration, and final report. No new log file introduced.
- **Git history** — the primary audit trail. Every story edit / split / retirement / ADR authoring is a commit the user makes after the command runs; `git log -- conclave/product/backlog.md` shows the ordering of PM decisions, and `git log conclave/product/adr/` shows the ordering of TL decisions.
- **Context snapshots** — both commands write inputs to `conclave/context/<timestamp>/`, matching v0.1's snapshot invariant. This is the offline audit surface: what did the PM/TL see when they made this decision?
- **Never log** — no secrets, no credentials, no PII involved. Nothing to redact.

## 16. i18n / textos visibles *(i18n / user-facing copy)*

No aplica — no translation-key system in the plugin. All new user-facing text (usage messages, progress narration, error messages, `AskUserQuestion` prompt titles/labels) is English plain text. Site docs — four new MDX pages plus two updated ones — are translated Spanish prose matching the existing site pattern (technical terms stay in English even in the ES prose).

## 17. Performance

- **`/conclave-story new/edit/retire`** — one Agent call (or zero for `retire`). Negligible latency beyond the model round-trip.
- **`/conclave-story split`** — one Agent call producing N child blocks in one output. Latency is model-dependent; batch size is small (2–4). No parallelism required.
- **`/conclave-adr` topic-directed** — one Agent call with a Read-heavy tool subset. Latency depends on how much Read/Grep the TL does; typical sprints run in a few seconds to under a minute.
- **`/conclave-adr` discovery** — one Agent call for candidate generation, then (if user picks a candidate) a second call for authoring. Sequential, not concurrent. Reason: the second call needs the candidate title, which the first call produces.
- **Migration on first `/conclave-adr`** — pure file I/O for the extraction. Depends on the number of inline ADRs (typically 3–7). Sub-second on any reasonable input.
- **No new concurrency model** — neither command uses the batch-of-3 pattern from v0.6.0 / v0.7.0. Reason: authoring is inherently single-threaded per artifact.

## 18. Restricciones *(Restrictions / hard "do not" rules)*

The implementer must NOT:

- [ ] Change the state machine beyond adding `retired` — every existing transition (`backlog → ready → in-progress → review → verified → done`) is unchanged.
- [ ] Skip adding the retired-story filter to any of the **exactly five** commands that collect stories from disk: `/conclave-planning` (assignment collection), `/conclave-dev` (story pickup), `/conclave-qa` (verification queue), `/conclave-pr-review` (verified-story collection), and `/conclave-sprint` (all three phase-collection queries). `/conclave-spec` is intentionally excluded — it authors new stories rather than collecting existing ones, so a filter would be nonsensical there.
- [ ] Add an `assignee` prompt to `/conclave-story new` — assignment is `/conclave-planning`'s job, not the PM's authoring job. The story is written with `assignee: ""`.
- [ ] Modify `/conclave-spec`, `/conclave-planning`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, or `/conclave-sprint` beyond the migration hooks needed to make them skip `retired` stories (a single-line filter in each of those commands' collection queries).
- [ ] Add a `merge` sub-action to `/conclave-story`.
- [ ] Auto-commit or auto-open a PR. The user runs `git commit` and `gh pr create` manually — same as every existing command.
- [ ] Move retired story files out of their original directory. They stay in place; only frontmatter changes.
- [ ] Delete any story file, ever.
- [ ] Allow the TL to produce ADRs with `status: accepted` — always `proposed`.
- [ ] Allow the PM to modify story files whose `status` is past `ready` — the orchestrator refuses, and the charter reinforces.
- [ ] Skip the migration idempotency check — re-running `/conclave-adr` after migration must be a no-op for migration and only affect the new ADR being authored.
- [ ] Introduce a new artifact directory beyond `conclave/product/adr/` and `conclave/product/stories-backlog/`.
- [ ] Change the story frontmatter schema in a way that breaks pre-0.8.0 story files — all new fields (`retirement_reason`, `retired_at`, `superseded_by`, `split_from`) are optional; existing files without them remain valid.
- [ ] Skip the `CHANGELOG.md` entry or any of the doc updates called out in §6.

## 19. Entregables *(Deliverables)*

- [ ] `commands/conclave-story.md` created; four sub-actions dispatched per §5.
- [ ] `commands/conclave-adr.md` created; topic-directed + discovery modes; migration on first run.
- [ ] `skills/conclave/agents/product-manager.md` extended with the `/conclave-story` operating-mode section per §6.
- [ ] `skills/conclave/agents/tech-lead.md` extended with the `/conclave-adr` operating-mode section per §6.
- [ ] `skills/conclave/templates/adr.template.md` created.
- [ ] `skills/conclave/templates/architecture.template.md` updated (section 4 → table; new section 7).
- [ ] `skills/conclave/templates/story.template.md` updated (status enum + optional frontmatter fields + `retired` prose).
- [ ] `skills/conclave/templates/product-backlog.template.md` legend updated.
- [ ] `skills/conclave/SKILL.md` §3, §5, §6 updated.
- [ ] `README.md` quick start updated.
- [ ] `CHANGELOG.md` [Unreleased] entry drafted per §6.
- [ ] `.claude-plugin/plugin.json` and `marketplace.json` bumped to `0.8.0`.
- [ ] `site/content/en/commands/story.mdx`, `site/content/es/commands/story.mdx`, `site/content/en/commands/adr.mdx`, `site/content/es/commands/adr.mdx` created.
- [ ] `site/content/en/state-machine.mdx`, `site/content/es/state-machine.mdx` updated for `retired`.
- [ ] Single-line filter added to `/conclave-planning`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, `/conclave-sprint` to skip stories with `status: retired`.
- [ ] `claude plugin validate .` passes after edits.
- [ ] Manual verification per §8 completed.

## 20. Checklist final para el agente *(Final agent checklist)*

Before delivering, verify:

- [ ] Read this spec end-to-end.
- [ ] Confirmed prerequisites (§4) are satisfied.
- [ ] Modified only files listed in §6 — no unrelated refactors.
- [ ] Story files whose `status` was past `ready` were never modified by any of the four `/conclave-story` sub-actions.
- [ ] `retired` stories are excluded by every command's story-collection query (`/conclave-planning`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, `/conclave-sprint`).
- [ ] Split children's combined scenarios cover every parent scenario — no scope leaks; the safety property is enforced by the PM subagent, not just by the orchestrator.
- [ ] Migration is idempotent: a second `/conclave-adr` run does not re-migrate; `architecture.md` never contains both inline ADRs and referenced-ADR rows for the same ADR.
- [ ] TL ADRs are always `status: proposed`; migrated ADRs are always `status: accepted, date: unknown`.
- [ ] Model resolution logic matches v0.7.0 byte-for-byte — no copy-paste drift.
- [ ] `AskUserQuestion` is the only user-interaction surface — no bare CLI prompts.
- [ ] `CHANGELOG.md`, `README.md`, `SKILL.md` and all site pages reflect the new behavior in both EN and ES.
- [ ] Plugin manifest version fields bumped to `0.8.0`.
- [ ] No scratch files, TODOs, or transient notes left under `docs/`, `commands/`, `skills/`, or `site/`.
