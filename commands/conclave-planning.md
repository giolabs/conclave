---
description: Generate stories and acceptance criteria from the product document, run Sprint Planning, and activate the first sprint. Use --all to plan every sprint from the document in one pass. The primary command after /conclave-spec.
allowed-tools: Bash(git rev-parse:*), Bash(ls:*), Bash(find:*), Bash(date:*), Bash(cat:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-planning [--all]

Generate the **Product Backlog, Architectural Foundation, stories, and acceptance criteria** from the product planning document, then run the Sprint Planning ceremony to activate the first sprint.

```
/conclave-planning           # plan Sprint 1 — generate stories and lock the first sprint active
/conclave-planning --all     # plan ALL sprints from the product document, activate the first
```

This command has two phases:

- **Phase A — Generation** (runs only when no backlog exists yet): the PM and TL read the product document and produce the full backlog, architectural foundation, per-story files, and Gherkin acceptance criteria.
- **Phase B — Planning ceremony** (always runs): the SM facilitates, stories are assigned by discipline, the DoR is validated, capacity is checked, and the sprint is locked active.

On subsequent runs (re-planning after stories exist), Phase A is skipped and only Phase B runs.

---

## Step 0 — Parse flags

Check if `--all` is present. Set `PLAN_ALL = true` if so, `false` otherwise.

## Step 1 — Resolve workspace

1. Run `git rev-parse --show-toplevel` → `REPO_ROOT`. If not a git repo, surface and stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not: *"Run `/conclave-spec` first to initialize the workspace."* Stop.
3. Read `$REPO_ROOT/conclave/config.md`. Extract:

| Field | Variable | Notes |
|---|---|---|
| `project_name` | `PROJECT_NAME` | |
| `story_prefix` | `STORY_PREFIX` | default `US` if absent |
| `product_doc_path` | `PRODUCT_DOC_PATH` | |
| `project_language` | `PROJECT_LANGUAGE` | default `es` if absent |
| `team_profile` | `TEAM_PROFILE` | |
| `team_mode` | `TEAM_MODE` | |
| `models.*` | `MODEL_FOR_PM`, `MODEL_FOR_TL`, `MODEL_FOR_SM` | resolve: overrides → default → null |

Invalid model name → warn and fall back to next in chain. Print non-null model assignments.

4. If `PRODUCT_DOC_PATH` is empty or null: *"No product document is set. Edit `conclave/config.md` and set `product_doc_path` to the path of your product planning document (e.g. `docs/mvp.md`), then re-run."* Stop.
5. If the file at `PRODUCT_DOC_PATH` does not exist: *"Product document not found at `<path>`. Create it or update `product_doc_path` in `conclave/config.md`."* Stop.
6. Read `PRODUCT_DOC_PATH` and store as `PRODUCT_DOC`.

## Step 2 — Determine phase A vs. B

Check whether Phase A (generation) must run:

- Read `$REPO_ROOT/conclave/product/backlog.md`. If the file does not exist or contains fewer than 3 story rows → **run Phase A** (`FIRST_RUN = true`).
- If backlog exists and has stories → skip Phase A (`FIRST_RUN = false`). Jump to Step 5 (Sprint resolution).

## Step 3 — [Phase A] Ask generation preferences

Only when `FIRST_RUN = true`.

Use `AskUserQuestion`:

1. **Sprint count target** — How many sprints should the product document map to? Options: 1 / 2 / 3 / 4 / "Let the PM decide from the document". (Only relevant when `PLAN_ALL = true`; skip this question if `PLAN_ALL = false` — default to 1 sprint scope for Phase A.)
2. **Sprint 1 story count** — How many stories do you want in Sprint 1? Options: 3 / 4 / 5 / "Let the PM decide". Default: 4.
3. **Hard constraints** — Any deadlines, performance budgets, banned dependencies, or compliance rules the PM and TL must know? Free text, optional.

Carry the answers as `GENERATION_PREFS`.

## Step 4 — [Phase A] Delegate to PM and TL in parallel

Issue **two `Agent` tool calls in a single message**:

### Agent A — Tech Lead (Architectural Foundation)

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/tech-lead.md`.
- Task: produce the **Architectural Foundation** following `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/architecture.template.md`.
- Inputs: `PRODUCT_DOC`, `GENERATION_PREFS`, the context snapshots from `conclave/context/`.
- Output: full architecture markdown. The orchestrator writes it to `conclave/product/architecture.md`.

### Agent B — Product Manager (Backlog + Stories)

- **Model**: `MODEL_FOR_PM` (omit if null).
- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/product-manager.md`.
- Task: read the product document and produce:
  1. A **Product Backlog table** (all stories — priority, estimate, discipline hint, sprint assignment if `PLAN_ALL = true` or sprint-count > 1).
  2. For each story: an inline block with:
     - Title
     - As a / I want / So that
     - Priority (`must` / `should` / `could`)
     - Estimate (`XS` / `S` / `M` / `L` / `XL`)
     - Dependencies (other story IDs, if any)
     - Sprint assignment number (1, 2, 3, …) — always, even if only one sprint
     - Gherkin acceptance criteria (Given / When / Then scenarios, minimum 2 per story)
  3. If `PLAN_ALL = true`: group stories into sprint buckets per the document's structure and the sprint-count target.
  4. If `PLAN_ALL = false`: surface the top N stories for Sprint 1 (N = `GENERATION_PREFS.sprint_1_story_count`).
- Inputs: `PRODUCT_DOC`, `GENERATION_PREFS`, context snapshots.
  Prefix the product document in the prompt with: `## Product planning document — this is the source of truth for stories and constraints:`
- Output: structured markdown with the backlog table and per-story blocks. The orchestrator parses this into individual files.
- Language instruction: *"Write all story titles, acceptance criteria, and descriptions in `{{PROJECT_LANGUAGE}}`. Keep frontmatter keys, Gherkin keywords (Given/When/Then), and technical identifiers in English."*

Wait for both agents. If either errors, surface and stop.

### 4.1 — Synthesize and write Phase A artifacts

**4.1.1 Architectural Foundation**
Write Agent A's output to `$REPO_ROOT/conclave/product/architecture.md`.

**4.1.2 Determine the next story number**
List `$REPO_ROOT/conclave/sprints/*/stories/` for existing `<PREFIX>-NNN-*.md` files. Find the highest NNN. Start the next batch from `NNN + 1` (zero-padded to 3 digits). If none exist, start at `001`.

**4.1.3 Write story and acceptance files per sprint**

For each sprint implied by the PM's output:

1. Determine `SPRINT_ID` = `SPRINT-001`, `SPRINT-002`, etc. (next available).
2. Create directories: `conclave/sprints/$SPRINT_ID/stories/`, `conclave/sprints/$SPRINT_ID/acceptance/`.
3. Render `sprint-meta.template.md` → `conclave/sprints/$SPRINT_ID/meta.md` with `status: draft`.
4. For each story assigned to this sprint:
   - ID: `$STORY_PREFIX-NNN` (e.g., `US-001`, `TASK-001`).
   - `<slug>` = lowercase, dash-separated, ASCII, ≤ 40 chars from the story title.
   - Render `story.template.md` → `conclave/sprints/$SPRINT_ID/stories/$STORY_PREFIX-NNN-<slug>.md`.
   - Render `acceptance.template.md` → `conclave/sprints/$SPRINT_ID/acceptance/AC-$STORY_PREFIX-NNN.md` — fill in the Gherkin scenarios from the PM's output.
5. Render `sprint-spec.template.md` → `conclave/sprints/$SPRINT_ID/spec.md` with the story table populated.

**Sprint creation scope:**
- If `PLAN_ALL = false`: create only `SPRINT-001` with the top N stories.
- If `PLAN_ALL = true`: create one `SPRINT-NNN` directory per sprint the PM identified.

**4.1.4 Write Product Backlog**
Build the backlog table from the PM's output and write to `$REPO_ROOT/conclave/product/backlog.md` using `product-backlog.template.md`. Every story gets a row. Sprint-1 stories show `in-progress` in the Status column.

**4.1.5 Context snapshot update**
Append a `## /conclave-planning run — <ISO>` section to `conclave/context/claude-md.snapshot.md` recording: product doc path, story count, sprint count.

## Step 5 — Resolve the sprint to plan

Collect the list of draft sprints:

```bash
ls $REPO_ROOT/conclave/sprints/
```

Read each sprint's `meta.md` frontmatter.

- **`PLAN_ALL = false`**: find the lowest-numbered sprint with `status: draft`. If none exist, surface: *"No draft sprint found. Have you run `/conclave-planning` already? If the active sprint is done, run `/conclave-sprint close` first."* Stop.
- **`PLAN_ALL = true`**: collect all `status: draft` sprints, sorted ascending. Warn about any `status: active` sprint that will be skipped.

Set `SPRINTS_TO_PLAN` accordingly. Set `SPRINT_ID` to the first sprint in the list.

## Step 6 — Load planning inputs

For the first sprint to plan, load in parallel:

- `$REPO_ROOT/conclave/team/roster.md`
- `$REPO_ROOT/conclave/product/definition-of-ready.md`
- `$REPO_ROOT/conclave/product/architecture.md`
- `$REPO_ROOT/conclave/sprints/$SPRINT_ID/spec.md`
- `$REPO_ROOT/conclave/sprints/$SPRINT_ID/meta.md`
- All `$SPRINT_ID/stories/$STORY_PREFIX-NNN-*.md` — skip any with `status: retired`
- All `$SPRINT_ID/acceptance/AC-$STORY_PREFIX-NNN.md`

Check roster schema: if no `Discipline` column, treat every member as `multi` and print a one-time compatibility hint.

## Step 7 — Ask the team for planning inputs

Use `AskUserQuestion`:

**Always ask:**
1. **Sprint start date** (default: today, ISO format).
2. **Sprint end date** (default: start + 2 weeks).
3. **Facilitator name** (who is running this planning session).

**Ask in `full-scrum` only:**
4. **Capacity adjustments** — any developers on PTO or partial availability?
5. **Carryover commitments from a previous sprint?** (yes / no / N/A)

## Step 8 — Planning ceremony (Wave 1: PM + TL in parallel)

Issue **two `Agent` tool calls in a single message**:

### Agent B — Product Manager (scope review)

- **Model**: `MODEL_FOR_PM` (omit if null).
- Task: for each story in the draft sprint, confirm priority is correct vs. the full backlog; recommend a swap if a higher-value `must` story is waiting; confirm acceptance criteria are unambiguous.
- Output: `## Scope findings` — per-story verdict (`ok` or recommendation).

### Agent C — Tech Lead (feasibility + discipline assignment)

- **Model**: `MODEL_FOR_TL` (omit if null).
- Task: validate technical feasibility against `architecture.md`; confirm or flag ADR deviations; identify cross-story dependencies; flag under-estimated stories; **assign `discipline`** (`frontend | backend | qa | design | devops | mobile | multi`) to each story.
- Output: `## Technical feasibility findings` — per-story verdict including the assigned discipline.

Wait for both.

## Step 9 — Planning ceremony (Wave 2: SM)

Issue one `Agent` tool call after Wave 1 returns:

### Agent A — Scrum Master (planning record)

- **Model**: `MODEL_FOR_SM` (omit if null).
- Task: produce the **Sprint Planning record** following `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/planning.template.md`.
- Inputs: story files, roster, DoR, user answers from Step 7, Wave 1 outputs (TL's discipline assignments and feasibility findings, PM's scope findings).
- Output: full planning record markdown with "Discipline assignments & coverage gaps" section.

Wait for the SM.

## Step 10 — Synthesize and validate

### 10.1 Scope swaps
If the PM recommended swapping a story for a higher-priority backlog item, surface via `AskUserQuestion`. If accepted, update the story list and backlog.

### 10.2 DoR validation
For each story, validate against `definition-of-ready.md`. Include the new "discipline is assigned" check using the TL's Wave 1 output. Stories failing DoR cannot enter the sprint:
- `lean`: surface and ask whether to drop them.
- `full-scrum`: refuse to lock — ask the user to groom first.

### 10.3 Capacity check
- Estimate units: XS=1, S=2, M=3, L=5, XL=8.
- `committed = sum(units)`; `capacity = num_devs × sprint_weeks × 5`.
- If `committed > 1.2 × capacity`: warn and suggest dropping the lowest-priority story.

### 10.4 Discipline coverage gaps
If the SM flags an unresolved gap (no roster member covers the assigned discipline), ask via `AskUserQuestion`: *"No one on the roster covers `<discipline>` for `<story>`. Assign to Tech Lead as a fallback?"* Record the resolution in the planning record.

## Step 11 — Write outputs

### 11.1 Update `meta.md`
For the first sprint (`SPRINT_ID`): set `status: active`, `target_start`, `target_end`.
For all subsequent sprints in `SPRINTS_TO_PLAN` (multi-sprint mode): set only `target_start`, `target_end` — leave `status: draft`.

### 11.2 Update `spec.md`
Replace the selected-stories table with the final list including discipline and assignee. Set `status: active` in frontmatter for the first sprint.

### 11.3 Update story frontmatter
For each story in the first sprint:
- `assignee` → from SM output
- `discipline` → from TL output
- `status` → `ready`

### 11.4 Write `planning.md`
Render `planning.template.md` with the SM's output, PM's scope findings, TL's feasibility findings, user answers, and capacity numbers. Write to `$SPRINT_PATH/planning.md`.

### 11.5 Update `backlog.md`
Mark each selected story as `in-progress` and set the `In sprint` cell to `$SPRINT_ID`.

## Step 11b — Multi-sprint mode (`PLAN_ALL = true`)

After completing Steps 5–11 for the first sprint, repeat Steps 6–11 for each remaining sprint in `SPRINTS_TO_PLAN` sequentially:
- Skip the profile questionnaire (already answered).
- Ask only for sprint start and end dates.
- Do **not** set `status: active` — these sprints remain `draft`.
- Carry forward the reduced backlog pool (stories committed to prior sprints are excluded).
- Print after each: `✓ SPRINT-NNN planned (draft) — N stories, N estimate units.`

## Step 12 — Report

**Single-sprint mode:**
```
✓ SPRINT-NNN is now active (start_date → end_date)

Stories committed:
  <PREFIX>-001 → <assignee> (frontend)  [M]
  <PREFIX>-002 → <assignee> (backend)   [S]
  ...

Capacity: <committed> / <capacity> units (<buffer>% buffer)
```

**Multi-sprint mode (`--all`):**
```
✓ SPRINT-001 is active
  SPRINT-002 planned (draft) — N stories
  SPRINT-003 planned (draft) — N stories

Draft sprints are ready. Each activates when the previous closes.
```

Suggested next steps:

```bash
git add conclave/
git commit -m "conclave: plan SPRINT-NNN — <sprint goal>"
gh pr create --title "Sprint Planning: SPRINT-NNN" --body "Goal, assignments, DoR validation."

# Start development:
/conclave-dev <PREFIX>-001
/conclave-dev <PREFIX>-001 <PREFIX>-002 <PREFIX>-003   # parallel batch
/conclave-dev --loop                                    # autonomous three-wave loop
```

## Guardrails

- Do not modify any file outside `$REPO_ROOT/conclave/`.
- Do not commit. The team reviews on a PR.
- `sprint_planning` and `qa_verification` are structural gates — never read `required: false` on them without refusing.
- If any agent's output fails its self-check, surface the failure verbatim and stop.
- If the sprint already has `status: active`, refuse re-planning: *"SPRINT-NNN is already active. Wait for it to close before planning again."*
- Preserve all hand-edits in story files, `spec.md`, and `planning.md` on re-runs.
