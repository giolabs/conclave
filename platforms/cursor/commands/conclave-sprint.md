---
name: conclave-sprint
description: Drive an entire active sprint end-to-end. Interactive (default): one-pass planning → batched Dev/QA/PR review — never merges. Autonomous Sprint Loop (--no-interaction / commands.sprint.interactive: false): serial self-heal Dev→CI→QA→forced TL→merge, schedule window, budgets, run report, optional Slack (ADR-004).
---

# /conclave-sprint


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Drive an entire active (or draft) sprint end-to-end in a single invocation.

```
/conclave-sprint
/conclave-sprint --no-interaction
/conclave-sprint --headless
/conclave-sprint --no-interaction --ignore-schedule
```

## Modes

| Mode | How | Behavior |
|---|---|---|
| **Interactive** (default) | No flag; `commands.sprint.interactive` absent or `true` | One-pass Phases 1–4 (batch-of-3). **Never merges.** |
| **Autonomous Sprint Loop** (v0.13.0+) | `--no-interaction` / `--headless`, or `commands.sprint.interactive: false` | Serial self-heal per story → forced TL → **merge** → sprint close + run report. Zero Ask prompts. |

Follow these steps in order.

---

## Step 0 — Parse flags and resolve INTERACTIVE

1. From the invocation argument list, extract (and remove) flags:
   - `--no-interaction` or `--headless` → `CLI_FORCE_AUTONOMOUS = true`
   - `--ignore-schedule` → `IGNORE_SCHEDULE = true` (default `false`)
2. Read `$REPO_ROOT` later in Step 1; for INTERACTIVE resolution you need `conclave/config.md`. If the workspace is not yet resolved, resolve it first with Step 1 items 1–2 only, then return here.
3. Read `commands.sprint.interactive` from config (same coercion table as `commands.dev.interactive` in `config.template.md`). Absent → `true`.
4. Resolve:
   - If `CLI_FORCE_AUTONOMOUS` → `INTERACTIVE = false`
   - Else → `INTERACTIVE =` coerced config value
5. There is **no** flag to force interactive when config is autonomous.
6. If `INTERACTIVE = false`, print `Mode: autonomous-sprint-loop` and continue with **Autonomous Sprint Loop** (Steps A1–A14 below), skipping Interactive Steps 4–11.
7. If `INTERACTIVE = true`, print nothing about Mode (silent default) and continue with Interactive Steps 1–11 (unchanged one-pass semantics).

---

# Interactive mode (one-pass — never merge)

## Step 1 — Resolve the workspace

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, surface that and stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.
3. Verify the working tree is clean (`git status --porcelain` is empty). If not, refuse: *"Working tree is dirty. Stash or commit your local changes, then re-run."*

## Step 2 — Load config and resolve models

Read `$REPO_ROOT/conclave/config.md`. Extract:

- `team_profile` (`lean` | `full-scrum` | `custom`)
- `ceremonies.*` — all flags, especially `peer_pr_review.required`
- `models.*` — resolve for all roles:
  - `MODEL_FOR_PM`        = `models.overrides.product_manager` → `models.default` → null
  - `MODEL_FOR_TL`        = `models.overrides.tech_lead`       → `models.default` → null
  - `MODEL_FOR_SM`        = `models.overrides.scrum_master`    → `models.default` → null
  - `MODEL_FOR_DEVELOPER` = `models.overrides.developer`       → `models.default` → null
  - `MODEL_FOR_DESIGNER`  = `models.overrides.designer`        → `models.default` → null
  - `MODEL_FOR_DEVOPS`    = `models.overrides.devops`          → `models.default` → null
  - `MODEL_FOR_QA`        = `models.overrides.qa`              → `models.default` → null

Resolution rule: if a configured value is not one of `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, print `WARNING: Unknown model '<value>' for role <role>. Falling back to <next_fallback>.` and continue. If the `models:` block is absent, all resolve to null — no warning.

Print one line: `Models: <role>=<id>, ...` listing only non-null values. If all are null (block absent), omit this line entirely.

## Step 3 — Resolve the sprint

1. List `$REPO_ROOT/conclave/sprints/` and find the sprint(s).
2. Identify the sprint with `status: active` or `status: draft`. Set `SPRINT_ID` and `SPRINT_PATH`.
   - No sprint → refuse: *"No sprint to run. Create one with `/conclave-spec`, then lock it with `/conclave-planning`."* Stop.
   - Multiple `active` sprints → refuse (should not happen in normal flow). Stop.

## Step 4 — Phase 1: Planning (skipped if sprint already `active`)

Check the resolved sprint's `status`:
- `status: active` → print `Phase 1 — Planning: skipped (sprint already active)` and continue to Step 5.
- `status: draft` → run the full Sprint Planning agent orchestration:
  - Read all inputs as specified in `/conclave-planning` Steps 2–3.
  - Ask the user for sprint dates and facilitator (Step 3 of `/conclave-planning`).
  - **Wave 1** — issue two `Agent` calls in a single message:
    - **Agent B — Product Manager**: model `MODEL_FOR_PM` (omit if null). Same task as `/conclave-planning` Agent B.
    - **Agent C — Tech Lead**: model `MODEL_FOR_TL` (omit if null). Same task as `/conclave-planning` Agent C.
  - Wait for both. If either errors: print `Sprint run aborted: Phase 1 (Planning) failed. Fix the error above and re-run /conclave-sprint.` Stop.
  - **Wave 2** — issue one `Task` call:
    - **Agent A — Scrum Master**: model `MODEL_FOR_SM` (omit if null). Same task as `/conclave-planning` Agent A.
  - Wait. If it errors: same abort message. Stop.
  - Synthesize and validate per `/conclave-planning` Steps 5–6. Write all outputs (`meta.md`, `spec.md`, story frontmatter, `planning.md`, `backlog.md`).
  - Sprint must be `active` after this step. If not, abort and stop.

## Step 5 — Collect Phase 2 stories

Re-read all story frontmatter under `$SPRINT_PATH/stories/`. Collect every story with `status: ready`. Set `DEV_STORIES`. **Explicitly exclude any story with `status: retired`** — retired stories are terminal historical records and never enter any phase (v0.8.0+). The filter is redundant with the `status: ready` check but stated explicitly here so the intent is unmistakable across all three phase collections.

**Bugs (`BUG-NNN`, v0.10.0+) are never auto-collected by any `/conclave-sprint` phase** — they bypass sprint orchestration by design (see `/conclave-bug`: a reported bug is immediately `ready` but lives under `conclave/product/bugs/`, not under any sprint's `stories/`, so this phase's directory scan never sees them). Fix a bug directly via `/conclave-dev BUG-NNN`.

If `DEV_STORIES` is empty, print `Phase 2 — Dev: skipped (0 stories in ready)` and skip to Step 7.

## Step 6 — Phase 2: Dev

Print `## Phase 2 — Dev (${count(DEV_STORIES)} stories)`.

Partition `DEV_STORIES` into batches of ≤ 3. For each batch:
- Issue one `Task` call per story **in the same message** (concurrent). Each Task call encapsulates the full single-story dev flow (Steps 1–9 of `/conclave-dev`) for that story.
  - Model: route by discipline using the same table as `/conclave-dev` Step 6:
    - `discipline: design` → `MODEL_FOR_DESIGNER`
    - `discipline: devops` → `MODEL_FOR_DEVOPS`
    - `frontend | backend | mobile | multi | unset` → `MODEL_FOR_DEVELOPER`
  - Omit the model param if null.
  - **Autonomous mode is forced ON for every Phase 2 dispatch (`INTERACTIVE = false`), regardless of `conclave/config.md`'s `commands.dev.interactive` setting.** Sprint dispatches are inherently batched; per-story `AskQuestion` prompts would freeze the batch. Explicitly pass this into each per-story task prompt so `/conclave-dev`'s Step 1.5 resolver picks it up: prepend the same preamble line the CLI-flag path uses (see `commands/conclave-dev.md` Step 6 preamble). Additionally, set the run-report `Config source` field to the literal string `forced by /conclave-sprint Phase 2` so each story's appended `## Autonomous run —` section names the sprint runner as the driver.
- Wait for all calls in the batch. Collect `{ story_id, outcome: ok|failed|aborted, branch, pr_url, error }`. `aborted` matches an `AUTONOMOUS_ABORT` return from the subagent (v0.9.0+); treat it the same as `failed` for sprint-summary purposes.
- On failure or abort: the per-story Task call has already reset that story's frontmatter `status: ready` and appended a `## Autonomous run —` section documenting the failure. Record the error/reason in the batch's collected results.

Print a per-batch table using the same format as `/conclave-dev`'s final summary.

## Step 7 — Collect Phase 3 stories

Re-read all story frontmatter. Collect every story with `status: review`. Set `QA_STORIES`.

If `QA_STORIES` is empty, print `Phase 3 — QA: skipped (0 stories in review)` and skip to Step 9.

## Step 8 — Phase 3: QA

Print `## Phase 3 — QA (${count(QA_STORIES)} stories)`.

Partition `QA_STORIES` into batches of ≤ 3. For each batch:
- Issue one `Task` call per story **in the same message** (concurrent). Each Task call encapsulates the full single-story QA flow (Steps 1–8 of `/conclave-qa`) for that story.
  - **Model**: `MODEL_FOR_QA` (omit if null).
- Wait for all calls. Collect results. A `verdict: blocked` is a normal QA outcome — report it, do not treat as an Agent error.

Print a per-batch table.

## Step 9 — Check peer_pr_review flag

If `ceremonies.peer_pr_review.required: false`:
- Print `Phase 4 — PR Review: skipped (peer_pr_review.required: false)`.
- Skip to Step 11.

## Step 10 — Collect Phase 4 stories and run PR Review

Re-read all story frontmatter. Collect every story with `status: verified`. Set `PR_STORIES`.

If `PR_STORIES` is empty, print `Phase 4 — PR Review: skipped (0 stories in verified)` and skip to Step 11.

Print `## Phase 4 — PR Review (${count(PR_STORIES)} stories)`.

Partition `PR_STORIES` into batches of ≤ 3. For each batch:
- Issue one `Task` call per story **in the same message** (concurrent). Each Task call encapsulates the full TL review flow (Steps 1–7 of `/conclave-pr-review`) for that story.
  - **Model**: `MODEL_FOR_TL` (omit if null).
- Wait for all calls. Collect results.

Print a per-batch table.

## Step 11 — Print final sprint summary

Print `## Sprint run complete — ${SPRINT_ID}`.

Print one summary table covering every story that was touched during this run:

```
| Story  | Starting status | Final status | Notes               |
|--------|-----------------|--------------|---------------------|
| US-001 | ready           | done         |                     |
| US-002 | ready           | review       | ✗ QA: blocked       |
| US-003 | review          | done         | (was already review)|
```

Print the suggested git command:

```bash
git add conclave/
git commit -m "conclave: sprint run complete — ${SPRINT_ID}"
```

---

# Autonomous Sprint Loop (v0.13.0+ — ADR-004)

**Prerequisite:** the GitHub CLI (`gh`) must be installed and authenticated (`gh auth login`) with an account that has access to this repository (push, PRs, merge). Conclave does not install or configure `gh`.

Execute these steps **instead of** Interactive Steps 4–11 when `INTERACTIVE = false`. Steps 1–3 (workspace, models, sprint resolve) still apply first. Then:

## Step A1 — Schedule gate

Read `commands.sprint.schedule` if present:

- No `schedule` block → no gating; continue.
- `enforce: false` → print the window as informational; continue.
- `IGNORE_SCHEDULE = true` → print `Schedule: bypassed (--ignore-schedule)`; set `SCHEDULE_BYPASSED = true`; continue.
- Else (`enforce` true or absent-with-block → treat as true):
  - Parse `window_start` / `window_end` as ISO-8601 with explicit offset. Invalid → hard abort with a clear error (do not invent a window).
  - `now = date` (same offset context as the window strings when possible).
  - If `now < window_start`: print `Outside schedule window (starts <ts>); nothing to do.` → **exit 0**. Write nothing. Stop.
  - If `now > window_end`: print `Schedule window ended <ts>; nothing to do.` → **exit 0**. Write nothing. Stop.
  - Else: inside window → continue.

## Step A2 — Resolve loop config

Set:

- `EFFECTIVE_PEER_PR_REVIEW = true` (ephemeral for this run — **do not** rewrite `config.md`)
- `INTEGRATION_BRANCH` = `repo.integration_branch` → else prefer `develop` if it exists on origin → else `main`. Print it.
- `MERGE_METHOD` = `commands.sprint.merge_method` ∈ {`squash`,`merge`,`rebase`} → default `squash`. Invalid → warn + `squash`.
- Budgets (warn + default if invalid / ≤0 / non-numeric):
  - `max_attempts_per_story` default `3`
  - `max_ci_wait_minutes` default `ceremonies.qa_verification.ci_wait_timeout_minutes` else `20`
  - `max_total_tokens` default `2000000`
  - `max_wall_clock_hours` default `12`
  - `token_estimates` — use config overrides or built-ins: `planning: 60000`, `developer: 180000`, `qa: 90000`, `tech_lead: 70000` (and designer/devops → developer estimate when those roles dispatch)
- Slack: `notifications.slack.enabled` (default false); `webhook_env` default `SLACK_WEBHOOK_URL`
- `STARTED_AT` = now (ISO-8601); start wall-clock timer
- `TOKENS_TOTAL = 0`; `TOKENS_PRECISION = estimated`; empty ledger list; `ATTEMPTS_TOTAL = 0`

Print one line summarizing budgets, window (or `none`), models, integration branch, merge method.

## Step A3 — Concurrency lock + open run report

1. `mkdir -p $SPRINT_PATH/runs`
2. Glob existing `RUN-*-*.md`. If any has frontmatter `outcome: in_progress` and `started_at` younger than `max_wall_clock_hours` ago → refuse: *"Autonomous sprint loop already in progress (RUN-NNN). Wait for it to finish or mark the stale report aborted."* Stop without touching stories.
3. If a stale `in_progress` report is older than `max_wall_clock_hours` → note it in the new report's stop conditions later; proceed.
4. Allocate next monotonic `RUN_ID` (`RUN-001`, `RUN-002`, …).
5. Fill `skills/conclave/templates/sprint-run-report.template.md` with `outcome: in_progress`, empty `finished_at`, known config snapshot, placeholder tables. Write `$SPRINT_PATH/runs/${RUN_ID}-autonomous-loop.md` **immediately** (lock + evidence).

## Step A4 — Headless Planning (if draft)

If sprint is already `active` → print `Phase 1 — Planning: skipped (sprint already active)` and go to A5.

If `draft`:
1. **No `AskQuestion`.** Defaults:
   - Sprint start = today (UTC date); end = start + `ceremonies` sprint length if present, else +14 days.
   - Facilitator = first roster member (or sole solo row).
   - Coverage gaps → assign Tech Lead as temporary fallback; record in planning notes.
2. Run Wave 1 (PM + TL) and Wave 2 (SM) as in Interactive Step 4, with models from Step 2. Prepend each task: `Autonomous sprint loop — no AskQuestion; use defaults.`
3. Ledger += one row per planning dispatch (`estimated` unless measured usage is available). Checkpoint budgets (A13 helpers).
4. Sprint must become `active` or **hard-abort**: finalize report `outcome: aborted`, reason `planning_failed`, Slack if enabled, stop.

## Step A5 — Collect target stories

Re-read stories under `$SPRINT_PATH/stories/`. Target = every non-`retired` story where `status != done` and `status != backlog`. **Never** include `BUG-NNN`. Order by story id ascending. Record starting statuses for the report.

If empty → finalize report `outcome: completed` (nothing to do), optionally close sprint if all non-retired are already `done` (A11), Slack, stop.

## Step A6 — Serial delivery loop (per story)

For each story in the target list:

1. `attempts = 0`. Story result bucket: `{ attempts, pr_url, merge_sha, notes, final_status }`.
2. While story frontmatter `status != done` and `attempts < max_attempts_per_story`:
   1. **Checkpoint** (A13): if window elapsed or any budget exhausted → drain (finish in-flight writes only), break out of both loops, go to A11 with the appropriate stop reason.
   2. `attempts++`; `ATTEMPTS_TOTAL++`
   3. Re-read story status. Apply re-entry:
      - `ready` / `in-progress` → needs Dev
      - `review` → skip Dev; wait checks if PR exists; then QA
      - `verified` → skip Dev/QA; TL only
      - `done` → break inner loop
      - `retired` / `backlog` → should not happen; skip story
   4. **Dev** (when needed): dispatch autonomous Dev for this single story (same encapsulation as Interactive Phase 2, but **serial**, one story). Config source string: `forced by /conclave-sprint autonomous loop`. Model by discipline. Ledger += developer (or designer/devops) row. On structural `AUTONOMOUS_ABORT` (no test framework, etc.) → mark story incomplete, **do not** burn remaining attempts on retries; break to next story. On other failure → continue loop if attempts remain.
   5. **PR checks**: resolve PR URL from story/branch via `gh pr view`. Poll `gh pr checks` until all success, any failure, or `max_ci_wait_minutes` / wall-clock / window. Failure or timeout → note; continue (Dev again next attempt). Success → continue.
   6. **QA (headless)**: encapsulate `/conclave-qa` for this story with **no AskQuestion**:
      - ID known → no picker
      - Missing local branch → `git fetch` then switch (default yes)
      - CI job proposal → **decline** writing new workflow; proceed Gherkin-only if possible; record in notes
      - Model `MODEL_FOR_QA`. Ledger += qa.
      - `blocked` → continue (Dev fix next attempt)
      - `pending_uat` (mobile) → incomplete; break (do not spin)
      - pass → story moves to `verified` (because EFFECTIVE_PEER_PR_REVIEW) or follow QA command semantics with peer review forced true for this run
   7. **TL PR review (always)**: encapsulate `/conclave-pr-review` with model `MODEL_FOR_TL`. Ledger += tech_lead. `request_changes` / malformed → continue. Approve → story `done` (frontmatter).
   8. **Merge** (only after QA pass + TL approve and status `done`):  
      `gh pr merge <pr> --<MERGE_METHOD> --delete-branch` into `INTEGRATION_BRANCH`.  
      On failure (conflicts, branch protection) → incomplete; **never** `--admin` / force. Break.
3. If still not `done` after max attempts → leave frontmatter as-is; mark `incomplete` in report notes; continue to next story.

## Step A7–A10 — (reserved)

(Intentionally unused — kept for readable step numbering vs Interactive mode.)

## Step A11 — Close sprint if complete

Re-read all non-retired stories. If **every** one is `status: done`:
- Set `$SPRINT_PATH/meta.md` frontmatter `status: done` (mechanical close — not a full `/conclave-review` ceremony).
- Set `sprint_closed: true` in the report.

Else leave sprint `active`; `sprint_closed: false`.

## Step A12 — Finalize run report + Slack

1. Compute `finished_at`, wall-clock hours, `tokens_total`, `tokens_precision`.
2. Determine `outcome`:
   - `completed` — all targeted stories done (+ sprint closed when applicable)
   - `partial` — some incomplete, or stop reason `schedule_window_elapsed`
   - `aborted_budget` — `token_budget_exhausted` or `wall_clock_exhausted`
   - `aborted` — planning failure or other hard abort
3. Rewrite the RUN file in place (same path) with final tables/ledger/stop conditions.
4. **Slack** (if `notifications.slack.enabled`):
   - Read webhook URL from env named by `webhook_env`. If unset → warn; `slack_delivery: failed`; do not fail the run.
   - Else `curl -sS -X POST -H 'Content-type: application/json' --data '{"text":"<summary>"}' "$WEBHOOK_URL"` with a short summary (sprint id, outcome, done/incomplete counts, stop reason, path to report). **Never** echo or write the webhook URL into `conclave/` or the terminal transcript beyond a redacted success/fail line.
   - Success → `slack_delivery: sent`; curl fail → `failed`.
   - If Slack disabled → `slack_delivery: disabled`.

## Step A13 — Budget / window checkpoint helper

Call before each new dispatch and during CI polling:

1. If `enforce` schedule and `now > window_end` and not bypassed → stop reason `schedule_window_elapsed`; drain.
2. If wall-clock hours ≥ `max_wall_clock_hours` → `wall_clock_exhausted`; drain.
3. Before adding an estimated dispatch cost: if `TOKENS_TOTAL + next_estimate > max_total_tokens` → `token_budget_exhausted`; drain **without** starting that dispatch. After a measured row, if `TOKENS_TOTAL > max_total_tokens` → same (allow in-flight write to finish first).
4. Drain means: no new Dev/QA/TL dispatches; finalize report; Slack; stop.

When appending a ledger row: use measured usage if the runtime exposes it for that Task call; else estimate. If any row is measured and any estimated → `tokens_precision: mixed`.

## Step A14 — Terminal summary

Print `## Autonomous sprint loop complete — ${SPRINT_ID} (${RUN_ID})` with per-story table, budget usage, path to the run report, and:

```bash
git add conclave/
git commit -m "conclave: autonomous sprint loop ${RUN_ID} — ${SPRINT_ID}"
```

Do **not** commit for the user.

---

## Guardrails

- **Phase 1 / Planning failure is a hard stop** in both modes.
- **Interactive mode: Do not merge any PR.** Approval in Phase 4 is sufficient; merging is a human action.
- **Autonomous Sprint Loop: may merge** only after QA pass + TL approve for that story's PR, into `INTEGRATION_BRANCH`, using configured `merge_method`. Never force-push; never `--admin` bypass in v1. See ADR-004.
- **Autonomous Sprint Loop: force TL review** for the run even when `ceremonies.peer_pr_review.required: false`. Do not permanently mutate that flag in `config.md`.
- **Never collect `BUG-NNN`** into any `/conclave-sprint` mode.
- **Do not modify any file outside `$REPO_ROOT/conclave/`** except story feature branches, `tests/uat/` paths QA may write, and git operations on those branches / merges via `gh`.
- **Never print a phase skip silently** (interactive). Loop mode prints checkpoints and stop reasons explicitly.
- **Re-runs are safe.** Story `status` frontmatter is the recovery mechanism. A new autonomous run creates a new `RUN-NNN` file; prior runs are preserved. Budgets reset per run.
- **Never store Slack webhook URLs or tokens** in any `conclave/` file.
- **Schedule no-ops** outside the window must exit 0 with one line and **no** report file.
