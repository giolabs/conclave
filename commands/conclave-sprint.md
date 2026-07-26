---
description: Drive an entire active sprint end-to-end in one pass. Interactive (default): planning → batched Dev/QA/PR review. Headless (--no-interaction / commands.sprint.interactive: false): the same one pass with zero prompts and documented planning defaults. Neither mode merges, self-heals, or reads a schedule — unattended delivery lives in /conclave-dev --loop (ADR-006).
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git push:*), Bash(git stash:*), Bash(git fetch:*), Bash(git add:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*), Bash(git config:*), Bash(ls:*), Bash(mkdir:*), Bash(cat:*), Bash(date:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr comment:*), Bash(gh pr checks:*), Bash(gh pr review:*), Bash(gh pr diff:*), Bash(gh run list:*), Bash(gh run view:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-sprint

Drive an entire active (or draft) sprint end-to-end in a single invocation.

```
/conclave-sprint
/conclave-sprint --no-interaction
/conclave-sprint --headless
```

## Modes

| Mode | How | Behavior |
|---|---|---|
| **Interactive** (default) | No flag; `commands.sprint.interactive` absent or `true` | One-pass Phases 1–4 (batch-of-3). |
| **Headless one-pass** | `--no-interaction` / `--headless`, or `commands.sprint.interactive: false` | The same one pass with zero prompts and documented planning defaults. |

**Neither mode merges a PR, self-heals a failure, reads a schedule, or spends a token budget.** Up to 0.14.0 `--no-interaction` ran a self-healing loop that merged into the integration branch; ADR-006 moved unattended delivery to `/conclave-dev --loop`, which runs three waves (Dev → QA → Tech Lead) and leaves approved PRs for a human. This command keeps ownership of the sprint ceremony: planning, one pass over the phases, and the summary.

Follow these steps in order.

---

## Step 0 — Parse flags and resolve INTERACTIVE

1. From the invocation argument list, extract (and remove) flags:
   - `--no-interaction` or `--headless` → `CLI_FORCE_AUTONOMOUS = true`
   - `--ignore-schedule` → accepted and **ignored** with one line: *"`--ignore-schedule` has no effect on /conclave-sprint since 0.15.0 — schedules belong to /conclave-dev --loop."*
2. Read `$REPO_ROOT` later in Step 1; for INTERACTIVE resolution you need `conclave/config.md`. If the workspace is not yet resolved, resolve it first with Step 1 items 1–2 only, then return here.
3. Read `commands.sprint.interactive` from config (same coercion table as `commands.dev.interactive` in `config.template.md`). Absent → `true`.
4. Resolve:
   - If `CLI_FORCE_AUTONOMOUS` → `INTERACTIVE = false`
   - Else → `INTERACTIVE =` coerced config value
5. There is **no** flag to force interactive when config is autonomous.
6. If `INTERACTIVE = false`, print `Mode: headless-one-pass` plus the redirect line from §"Headless one-pass mode", then run Steps 1–11 with the headless substitutions described there.
7. If `INTERACTIVE = true`, print nothing about Mode (silent default) and continue with Steps 1–11 unchanged.
8. If `commands.sprint.schedule`, `commands.sprint.budgets`, or `commands.sprint.merge_method` is present in config, print one line each: *"`commands.sprint.<key>` is ignored since 0.15.0 — configure `commands.dev.<key>` for the delivery loop."* They are no-ops, not errors.

---

# One-pass phases (never merge)

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

**Bugs (`BUG-NNN`, v0.10.0+) are never auto-collected by any `/conclave-sprint` phase** — they bypass sprint orchestration by design (see `/conclave-bug`: a reported bug is immediately `ready` but lives under `conclave/product/bugs/`, not under any sprint's `stories/`, so this phase's directory scan never sees them). Fix a bug directly via `/conclave-dev BUG-NNN`.

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

If any story ended somewhere other than `done`, add one line:

```
Stories still in flight: US-002, US-005. Run /conclave-dev --loop to drive them to an
approved PR unattended (Dev → QA → Tech Lead, no merge).
```

---

# Headless one-pass mode

Runs when `INTERACTIVE = false` (`--no-interaction` / `--headless` / `commands.sprint.interactive: false`). It is the **same** Steps 1–11 above with prompts replaced by documented defaults — not a different pipeline.

Right after the `Mode: headless-one-pass` line, print:

```
Note: this is a single pass — no self-heal, no schedule, no budgets, no merge.
Unattended delivery lives in /conclave-dev --loop (three waves, leaves approved PRs for you).
```

Substitutions:

1. **Step 4 (Planning), `draft` sprint** — no `AskUserQuestion`. Apply:
   - Sprint start = today (UTC date); end = start + the sprint length in `ceremonies` if present, else +14 days.
   - Facilitator = the first roster member (or the sole solo row).
   - Coverage gaps → assign the Tech Lead as a temporary fallback and record it in the planning notes.
   - Prepend each Agent task with `Headless sprint run — no AskUserQuestion; use defaults.`
   - The sprint must be `active` afterwards; otherwise abort exactly as the interactive path does.
2. **Steps 5–11** run unchanged, including batch-of-3 concurrency. Phase 4 still honors `ceremonies.peer_pr_review.required` — headless mode does **not** force the Tech Lead gate. (`/conclave-dev --loop` does, for its own run.)
3. **Nothing is merged**, no run report is written, no story is retried. A story that fails Dev or is blocked by QA is reported and left where it is.

To pick those stories up unattended, run `/conclave-dev --loop` afterwards: it re-enters them at the right wave and drives them to an approved PR.

---

## Guardrails

- **Phase 1 / Planning failure is a hard stop** in both modes.
- **Never merge a PR, in either mode.** Approval in Phase 4 is sufficient; merging is a human action. No path in this command runs `gh pr merge` (ADR-006).
- **This command is not a delivery loop.** No self-heal, no schedule gate, no budgets, no run report, no token ledger — those belong to `/conclave-dev --loop`. `commands.sprint.schedule` / `budgets` / `merge_method` are ignored no-ops kept only so an upgraded config does not error.
- **Headless mode does not force the Tech Lead gate.** Phase 4 follows `ceremonies.peer_pr_review.required` as written.
- **Never collect `BUG-NNN`** into any `/conclave-sprint` phase.
- **Do not modify any file outside `$REPO_ROOT/conclave/`** except story feature branches, `tests/uat/` paths QA may write, and git operations on those branches.
- **Never print a phase skip silently.**
- **Re-runs are safe.** Story `status` frontmatter is the recovery mechanism.
- **Sprint close stays a ceremony.** This command does not mechanically close a sprint; `/conclave-review` does.
