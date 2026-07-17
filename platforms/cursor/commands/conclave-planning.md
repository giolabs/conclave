---
name: conclave-planning
description: Run Sprint Planning for the current draft sprint. Profile-aware — adapts ceremony depth to the team's profile (lean / full-scrum / custom). Confirms the goal, assigns stories, validates DoR, computes capacity, and locks the sprint into status active.
---

# /conclave-planning


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Run the **Sprint Planning** ceremony for the current draft sprint.

This is one of the two **structural** Scrum gates (along with QA Verification) — it is required in every team profile and cannot be skipped. When it finishes, the sprint moves from `draft` → `active` and the team is committed to the selected stories.

Follow these steps in order.

---

## Step 1 — Resolve the draft sprint

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, surface that and stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.
3. List `$REPO_ROOT/conclave/sprints/` and find the highest-numbered sprint directory.
4. Read its `meta.md` frontmatter:
   - `status: draft` → this is the sprint we plan. Continue. Set `SPRINT_ID` and `SPRINT_PATH`.
   - `status: active` → refuse: planning has already happened. Suggest waiting until the sprint closes.
   - `status: done` or `archived` → suggest `/conclave-spec` to create the next sprint.
   - No sprint dir at all → suggest `/conclave-spec` and stop.

## Step 2 — Load configuration and validate the profile contract

Read `$REPO_ROOT/conclave/config.md`. Extract:

- `models.*` — resolve models for the three planning agents:
  - `MODEL_FOR_PM` = `models.overrides.product_manager` → `models.default` → null
  - `MODEL_FOR_TL` = `models.overrides.tech_lead` → `models.default` → null
  - `MODEL_FOR_SM` = `models.overrides.scrum_master` → `models.default` → null
  Invalid model name → `WARNING: Unknown model '<value>' for role <role>. Falling back to <next_fallback>.` then continue. Absent block → all null, no warning. Print `Models: pm=<id>, tl=<id>, sm=<id>` for any non-null values.
- `team_profile` (`lean` | `full-scrum` | `custom`)
- `ceremonies.sprint_planning.required` → must be `true`. If somehow `false`, refuse with: *"sprint_planning is a structural Scrum gate and cannot be disabled. Edit config.md to restore required: true and re-run."*
- `ceremonies.backlog_grooming.required` — affects step 5
- `ceremonies.daily_standup.required` — affects what the planning record includes
- `ceremonies.sprint_retrospective.required` — affects whether to import experiments

Read the rest of the workspace in parallel:

- `$REPO_ROOT/conclave/team/roster.md` — if it has no `Discipline` column (pre-0.2.0 schema), treat every member's discipline as `multi` for this run and print once: *"Roster is using the pre-0.2.0 schema (no Discipline column) — treating all members as multi-discipline. Run `/conclave-init` again or add a Discipline column by hand to opt into discipline-based assignment."* Do not refuse to run.
- `$REPO_ROOT/conclave/product/backlog.md`
- `$REPO_ROOT/conclave/product/definition-of-ready.md`
- `$REPO_ROOT/conclave/product/architecture.md`
- `$SPRINT_PATH/spec.md` and `$SPRINT_PATH/meta.md`
- All `$SPRINT_PATH/stories/US-NNN-*.md` and `$SPRINT_PATH/acceptance/AC-US-NNN.md` — **skip any file whose frontmatter `status: retired`** (v0.8.0+: retired stories are historical records only and never enter planning; they may be present in the sprint dir if `/conclave-story retire` or `/conclave-story split` was run against a story already in the sprint).
- If a previous sprint exists and `sprint_retrospective.required: true`: read `$REPO_ROOT/conclave/sprints/SPRINT-PREV/retro.md` to import active experiments.

## Step 3 — Ask the team for inputs

Use `AskQuestion`. The depth of the questionnaire depends on the profile.

**Always ask:**

1. **Sprint start date** (default: today, ISO format).
2. **Sprint end date** (default: start + sprint length from `ceremonies.md`).
3. **Facilitator name** (the human Scrum Master running this session; default: the user running the command).

**Ask in `full-scrum` only:**

4. **Per-dev capacity adjustment** — any developers on PTO / partial availability this sprint? Free-form text.
5. **Were there carryover commitments from last sprint?** (yes / no / N/A)

**Ask if `backlog_grooming.required: false`:**

6. **Refine top-of-backlog?** (yes / no — default yes) → if yes, the SM will absorb a light grooming pass into the planning output.

## Step 4 — Delegate to PM and TL (Wave 1), then SM (Wave 2)

Dispatch happens in **two waves**, not one three-way-parallel round: Scrum Master's assignment task needs the Tech Lead's per-story `discipline` values to pick valid assignees, so it runs after Wave 1 returns rather than guessing ahead of it.

### Wave 1 — issue two `Task` tool calls in a single message

#### Agent B — Product Manager (scope reviewer)

- **Model**: `MODEL_FOR_PM` (omit if null).
- Prompt prefix: full content of `agents/product-manager.md`.
- Task: validate **scope** of the selected stories. For each story in the draft sprint:
  - Confirm the priority assigned during `/conclave-spec` is still correct in light of the rest of the backlog.
  - Recommend a swap if a higher-value `must` story sits in the backlog.
  - Confirm the acceptance criteria are unambiguous.
- Output: a markdown section titled `## Scope findings` listing per-story verdicts (`ok` or a specific recommendation). No re-writes — only findings.

#### Agent C — Tech Lead (feasibility reviewer + discipline assignment)

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `agents/tech-lead.md`.
- Task: validate **technical feasibility** of the selected stories against the current `architecture.md`. For each story:
  - Confirm the story respects existing ADRs, or flag the deviation it would force.
  - Identify any cross-story technical dependencies (US-002 must merge before US-004).
  - Flag stories that exceed their estimate based on the architecture (e.g. an `S` story that needs a new service is actually `M`+).
  - **Assign a `discipline` value** (`frontend | backend | qa | design | devops | mobile | multi`) based on the nature of the work. Prefer `multi` over a guessed precision if the story text doesn't make it obvious.
- Output: a markdown section titled `## Technical feasibility findings` listing per-story verdicts, each including its assigned `discipline`. No re-writes.

Wait for both. If either errors, surface and stop.

### Wave 2 — issue one `Task` tool call, after Wave 1 returns

#### Agent A — Scrum Master (facilitator)

- **Model**: `MODEL_FOR_SM` (omit if null).
- Prompt prefix: full content of `agents/scrum-master.md`.
- Task: produce the **Sprint Planning record** following `skills/conclave/templates/planning.template.md`.
- Inputs to embed: the draft `spec.md`, story files, roster (with the backward-compat note from Step 2 if applicable), backlog, DoR, prior retro if any, the user's answers from Step 3, the resolved profile and ceremony flags, `architecture.md` (read-only for context), **and Wave 1's two outputs** — the TL's per-story `discipline` values and feasibility findings, and the PM's scope findings.
- Output: the planning-record markdown, including the "Discipline assignments & coverage gaps" section (per-story assignee, or an explicit unresolved-coverage-gap flag — see `scrum-master.md`'s assignment rule).

Wait for it. If it errors, surface and stop.

## Step 5 — Synthesize and validate

The orchestrator (you) now reconciles the three outputs:

### 5.1 Apply scope swaps if the PM raised any
If the PM recommended swapping a sprint story for a higher-value backlog story:
- Surface the swap to the user via `AskQuestion` (accept / reject / discuss).
- If accepted, update the in-memory story list. Move the dropped story back to `status: backlog` in the backlog, and pull the new one into the sprint.

### 5.2 Apply technical splits if the TL raised any
If the TL flagged a story as under-estimated or needing a split:
- Surface to user. If accepted, update the story file's frontmatter `estimate` field or create a split-story placeholder (`US-NNN-a`, `US-NNN-b`). For MVP, do not auto-split — just record the recommendation and ask the user to handle next groom.

### 5.3 Run DoR validation
For each remaining story, check against `definition-of-ready.md`, including the new **"discipline is assigned"** item — use the TL's Wave 1 `discipline` value (not yet written to disk). Stories that fail the DoR cannot enter the sprint:
- If any fail in `lean`: surface to user, ask whether to drop them.
- If any fail in `full-scrum`: refuse to lock — the team must groom first.

### 5.4 Capacity check
Compute:
- `units(estimate)` mapping: XS=1, S=2, M=3, L=5, XL=8.
- `committed = sum(units(story.estimate) for story in selected)`
- `team_capacity = num_devs * sprint_weeks * 5` (rough nominal).
- If `committed > 1.2 * team_capacity`: surface the over-commit and recommend dropping the lowest-priority story. Re-run from 5.3 if a drop is accepted.

### 5.5 Absorb grooming if `backlog_grooming.required: false`
The SM agent included a `## Top-of-backlog refinement` subsection. Use it to update `conclave/product/backlog.md` — only the `last_groomed_at` field and any reordering the SM recommended. Do NOT write new stories from this step.

### 5.6 Resolve discipline coverage gaps
If the SM's Wave 2 output flags any story as an unresolved coverage gap (no roster member's `Discipline` matches), surface it to the human via `AskQuestion` **yourself** — do not let the SM subagent guess: *"No one on the roster covers `<discipline>` for `<story>`. Assign to Tech Lead as a temporary fallback, or pick someone else?"* Record the resolution (who was actually assigned, and that it was a fallback) in that story's `Notes` cell for `planning.template.md`'s selected-stories table, so it's visible in the PR. Resolve every gap before proceeding to Step 6 — an unresolved gap blocks locking the sprint the same way a failed DoR item does.

## Step 6 — Write outputs

### 6.1 Update `meta.md`
Set `status: active`, `target_start`, `target_end`. Keep `created_at` untouched.

### 6.2 Update `spec.md`
Replace the selected-stories table with the final list (with assignees filled in). Set `status: active` in frontmatter.

### 6.3 Update each story's frontmatter
For each story in the final selection:
- `assignee` → the person assigned by the SM (including any coverage-gap fallback resolved in 5.6)
- `discipline` → the value the Tech Lead assigned in Wave 1
- `status` → `ready`

### 6.4 Write `planning.md`
Render `skills/conclave/templates/planning.template.md` using the SM's output, the PM's `Scope findings`, the TL's `Technical feasibility findings`, the user's answers, the capacity numbers, and the resolved profile. Write to `$SPRINT_PATH/planning.md`.

### 6.5 Update the backlog table
Mark each selected story's `Status` cell as `in-progress` and `In sprint` cell as `$SPRINT_ID` in `conclave/product/backlog.md`. Do not reorder unrelated rows.

## Step 7 — Report to the user

Print a short summary:

- The sprint is locked: `SPRINT_ID` is now `active`, runs from start_date to end_date.
- Number of committed stories and total estimate units vs team capacity (with the buffer percentage).
- Assignees and their discipline (one line per story: `US-NNN → <assignee> (<discipline>)`).
- Any discipline coverage gaps that came up and how they were resolved (5.6).
- Any open commitments / risks the SM flagged.
- Suggested git command sequence:

  ```bash
  git add conclave/
  git commit -m "conclave: lock SPRINT-NNN — <one-line sprint goal>"
  gh pr create --title "Sprint Planning: SPRINT-NNN" --body "Goal, assignments, DoR validation."
  ```

- Next step for each dev: `/conclave-dev US-NNN` (planned, not yet shipped — for now, devs work the stories manually).

## Guardrails

- **Do not modify** any file outside `$REPO_ROOT/conclave/`.
- **Do not commit.** The team reviews planning as a PR.
- **Never override the structural required flag** for `sprint_planning` or `qa_verification`. If a malformed `config.md` says otherwise, refuse with a clear error.
- **If any agent's output fails its self-check**, surface the failure to the user verbatim and stop. Do not silently fix.
- **Preserve every existing comment, note, or hand-edit** in `spec.md`, story files, and `planning.md` if they exist. Re-runs must be idempotent: a second `/conclave-planning` on the same draft sprint should be refused (status would be `active`), not silently re-do the work.
