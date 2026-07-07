---
description: Drive an entire active sprint from ready → done in one invocation. Phase 1: planning (if sprint is draft). Phase 2: dev all ready stories (batch-of-3). Phase 3: QA all review stories (batch-of-3). Phase 4: Tech Lead PR review for verified stories (if peer_pr_review.required). Each phase uses configured models. Failures are isolated per story.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git push:*), Bash(git stash:*), Bash(git fetch:*), Bash(git add:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr comment:*), Bash(gh pr checks:*), Bash(gh pr review:*), Bash(gh pr diff:*), Bash(gh run list:*), Bash(gh run view:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-sprint

Drive an entire active (or draft) sprint end-to-end in a single invocation. Four sequential phases:

- **Phase 1 — Planning**: runs sprint planning if the sprint is still `draft`; skipped if already `active`.
- **Phase 2 — Dev**: dispatches all `ready` stories concurrently in batches of ≤ 3.
- **Phase 3 — QA**: dispatches all `review` stories concurrently in batches of ≤ 3.
- **Phase 4 — PR Review**: dispatches all `verified` stories to the Tech Lead (batches of ≤ 3); skipped when `peer_pr_review.required: false`.

Each phase is profile-aware. Failures are isolated per story — one failed story does not block others. Phase 1 failure is a hard stop.

Follow these steps in order.

---

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
  - **Wave 2** — issue one `Agent` call:
    - **Agent A — Scrum Master**: model `MODEL_FOR_SM` (omit if null). Same task as `/conclave-planning` Agent A.
  - Wait. If it errors: same abort message. Stop.
  - Synthesize and validate per `/conclave-planning` Steps 5–6. Write all outputs (`meta.md`, `spec.md`, story frontmatter, `planning.md`, `backlog.md`).
  - Sprint must be `active` after this step. If not, abort and stop.

## Step 5 — Collect Phase 2 stories

Re-read all story frontmatter under `$SPRINT_PATH/stories/`. Collect every story with `status: ready`. Set `DEV_STORIES`. **Explicitly exclude any story with `status: retired`** — retired stories are terminal historical records and never enter any phase (v0.8.0+). The filter is redundant with the `status: ready` check but stated explicitly here so the intent is unmistakable across all three phase collections.

If `DEV_STORIES` is empty, print `Phase 2 — Dev: skipped (0 stories in ready)` and skip to Step 7.

## Step 6 — Phase 2: Dev

Print `## Phase 2 — Dev (${count(DEV_STORIES)} stories)`.

Partition `DEV_STORIES` into batches of ≤ 3. For each batch:
- Issue one `Agent` call per story **in the same message** (concurrent). Each Agent call encapsulates the full single-story dev flow (Steps 1–9 of `/conclave-dev`) for that story.
  - Model: route by discipline using the same table as `/conclave-dev` Step 6:
    - `discipline: design` → `MODEL_FOR_DESIGNER`
    - `discipline: devops` → `MODEL_FOR_DEVOPS`
    - `frontend | backend | mobile | multi | unset` → `MODEL_FOR_DEVELOPER`
  - Omit the model param if null.
  - **Autonomous mode is forced ON for every Phase 2 dispatch (`INTERACTIVE = false`), regardless of `conclave/config.md`'s `commands.dev.interactive` setting.** Sprint dispatches are inherently batched; per-story `AskUserQuestion` prompts would freeze the batch. Explicitly pass this into each per-story task prompt so `/conclave-dev`'s Step 1.5 resolver picks it up: prepend the same preamble line the CLI-flag path uses (see `commands/conclave-dev.md` Step 6 preamble). Additionally, set the run-report `Config source` field to the literal string `forced by /conclave-sprint Phase 2` so each story's appended `## Autonomous run —` section names the sprint runner as the driver.
- Wait for all calls in the batch. Collect `{ story_id, outcome: ok|failed|aborted, branch, pr_url, error }`. `aborted` matches an `AUTONOMOUS_ABORT` return from the subagent (v0.9.0+); treat it the same as `failed` for sprint-summary purposes.
- On failure or abort: the per-story Agent call has already reset that story's frontmatter `status: ready` and appended a `## Autonomous run —` section documenting the failure. Record the error/reason in the batch's collected results.

Print a per-batch table using the same format as `/conclave-dev`'s final summary.

## Step 7 — Collect Phase 3 stories

Re-read all story frontmatter. Collect every story with `status: review`. Set `QA_STORIES`.

If `QA_STORIES` is empty, print `Phase 3 — QA: skipped (0 stories in review)` and skip to Step 9.

## Step 8 — Phase 3: QA

Print `## Phase 3 — QA (${count(QA_STORIES)} stories)`.

Partition `QA_STORIES` into batches of ≤ 3. For each batch:
- Issue one `Agent` call per story **in the same message** (concurrent). Each Agent call encapsulates the full single-story QA flow (Steps 1–8 of `/conclave-qa`) for that story.
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
- Issue one `Agent` call per story **in the same message** (concurrent). Each Agent call encapsulates the full TL review flow (Steps 1–7 of `/conclave-pr-review`) for that story.
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

## Guardrails

- **Phase 1 failure is a hard stop.** Proceeding to dev without a locked sprint goal is structurally unsound. Surface the error and stop.
- **All other phase failures are per-story isolated.** A failed story is reported in the summary; other stories continue.
- **Do not modify any file outside `$REPO_ROOT/conclave/`** (except story feature branches and the `tests/uat/` path `/conclave-qa` writes to).
- **Do not merge any PR.** Approval in Phase 4 is sufficient; merging is a human action.
- **Never print a phase skip silently.** Every skipped phase must print a skip notice with the reason.
- **Re-runs are safe.** Story `status` frontmatter is the recovery mechanism. Re-running `/conclave-sprint` after a partial failure picks up from the current frontmatter state — Phase 2 collects `ready` stories, Phase 3 collects `review` stories, Phase 4 collects `verified` stories.
