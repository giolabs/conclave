---
name: conclave-qa
description: Verify one or more stories and/or bugs (US-NNN or BUG-NNN) against their Gherkin scenarios on the develop branch. Generates UAT test artifacts (Playwright for frontend/multi, a shared Postman collection for backend/multi, a manual checklist for mobile). Bugs found during QA are reported directly in the active sprint's bugs folder with full story/PR linkage. Sprint cannot close with open critical bugs. QA does NOT approve the PR — that is the Tech Lead's call via /conclave-pr-review. Supports `--lab` flag: when passed with a single US-NNN ID, executes that story's TL-generated lab spec (`US-NNN-lab.md`) against the integration branch, records Tier A evidence, and auto-creates BUG-NNN entries for any findings.
---

# /conclave-qa US-NNN|BUG-NNN [US-NNN|BUG-NNN ...] [--lab]


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Verify one or more user stories and/or bugs in `status: review` against their Gherkin scenarios — a `BUG-NNN`'s repro steps are verified exactly like a story's acceptance criteria, same UAT/CI logic, same verdict semantics.

- **Single ID** (`/conclave-qa US-001` or `/conclave-qa BUG-004`): identical flow either way — no change in output or flow versus verifying a story.
- **Multiple, and mixed** (`/conclave-qa US-001 US-002 BUG-004`): each ID is verified on its own branch, concurrently in batches of ≤ 3, regardless of kind.

When this finishes, each ID has moved to one of four states:

- **`verified`** — QA passed, awaiting Tech Lead PR approval. Happens when `peer_pr_review.required: true`.
- **`done`** — QA passed and there is no separate TL gate. Happens when `peer_pr_review.required: false`.
- **`review` (pending UAT)** — UAT artifacts were generated/pushed and nothing has failed, but a mobile checklist is awaiting a human, or was left incomplete. Not a defect — re-run once it's filled in.
- **`review` (with blockers)** — QA found failures, in the Gherkin scenarios, the DoD, or the generated UAT tests' CI run. The dev (or tester) fixes, pushes, and QA re-runs.

At least one `US-NNN` argument is required; all must match story files in `status: review` under the active sprint.

This is one of the two **structural** Scrum gates Conclave enforces (along with Sprint Planning). It cannot be skipped by any profile. QA does NOT approve the PR itself — code-level approval belongs to the Tech Lead via `/conclave-pr-review`. QA's verdict goes into the verification report and a PR comment.

Follow these steps in order.

---

## Step 0 — Multi-story dispatch (skip entirely if only one story ID is provided)

1. Parse all `US-NNN` and `BUG-NNN` arguments from the command invocation (order-preserving, IDs of either kind may be mixed). If exactly one ID is present, skip this step entirely and continue with Step 1 as today.
2. If duplicate IDs are present, deduplicate silently and print one warning line: *"Duplicate IDs removed: `US-NNN`/`BUG-NNN`, ... — each will only be verified once."*
3. **Validate all IDs upfront** — direct file reads by the orchestrator, no Task calls. For each ID run the equivalent of Steps 1–3 (workspace check, resolution per §Step 2's prefix branching, status check). Collect per-ID results. If ANY ID fails validation, print a per-ID table and stop — no Task call is dispatched:
   ```
   US-001  — PASS (review)
   BUG-004 — PASS (review)
   US-002  — FAIL: story not found in active sprint
   US-003  — FAIL: status is done (already verified)
   Refusing all IDs. Fix the above and re-run.
   ```
4. Partition the validated IDs into **batches of ≤ 3** (preserve order, story/bug IDs mixed freely).
5. For each batch:
   - Issue one `Task` tool call per ID **in the same message** (concurrent). Each Task call encapsulates all single-ID steps (Steps 1–9 of this command) for that ID, including UAT generation, CI wait, and verification report.
   - Wait for all calls in the batch to return.
   - For each result record `{ id, outcome: passed|blocked|pending_uat|failed, pr_url, error }`. On a hard error (Task call failed, not a QA `blocked`): record the error — do not attempt a status reset (the file may already have been partially updated by the subagent).
6. After all batches complete, print the final summary table:
   ```
   | ID      | Branch                | PR                           | Verdict              |
   |---------|-----------------------|-------------------------------|----------------------|
   | US-001  | feat/US-001-login     | https://github.com/…/pull/42 | ✓ passed             |
   | BUG-004 | feat/BUG-004-checkout | https://github.com/…/pull/43 | ✓ passed             |
   | US-003  | feat/US-003-mobile    | https://github.com/…/pull/44 | ⏳ pending_uat        |
   ```
7. Stop. The individual steps below were already executed inside each Task call.

---

## Step 1 — Resolve the workspace

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.
3. Confirm `ceremonies.qa_verification.required: true`. If somehow `false`, refuse with: *"qa_verification is a structural Scrum gate and cannot be disabled. Edit config.md to restore required: true and re-run."*

## Step 2 — Resolve the story or bug

1. Parse `US-NNN`/`BUG-NNN`. If missing, ask via `AskQuestion` to pick from the list of `review` stories in the active sprint (bugs are not offered in this picker — same rationale as `/conclave-dev`).
2. **Resolution by ID prefix**:
   - **`US-NNN`**: find the active sprint as in `/conclave-dev` Step 2. Locate `$REPO_ROOT/conclave/sprints/$SPRINT_ID/stories/US-NNN-*.md` and `$REPO_ROOT/conclave/sprints/$SPRINT_ID/acceptance/AC-US-NNN.md`. If either missing, refuse.
   - **`BUG-NNN`**: no sprint lookup. Locate `$REPO_ROOT/conclave/product/bugs/BUG-NNN-*.md`. If missing, refuse. A bug has no separate acceptance file — its Gherkin repro steps live inline (see `bug.template.md`); every place below that reads "the acceptance file" reads the bug file itself instead.
   - Any other prefix → refuse with `Unrecognized ID prefix: <id>. Expected US-NNN or BUG-NNN.`
3. Read the frontmatter (same status enum for both):
   - `status: review` → continue.
   - `status: in-progress` → refuse: *"Story/bug is still in development. Wait for `/conclave-dev` to push it to `review`."*
   - `status: retired` → refuse: *"Story/bug is retired and cannot be QA-verified. Retired items are terminal — un-retire by hand-editing the frontmatter if this was a mistake, then re-run."*
   - `status: done` → refuse: *"Story/bug is already verified. Past verification reports live in the acceptance/bug file."*
   - Anything else → refuse.

## Step 3 — Switch to the integration (develop) branch

QA verification now runs on the **integration branch** (not the feature branch) so it verifies the integrated state of the codebase, including any interactions between recently merged stories.

1. Determine `INTEGRATION_BRANCH` from `config.md` (`repo.integration_branch`), defaulting to `develop`, then `main` if neither exists.
2. `git fetch origin $INTEGRATION_BRANCH`.
3. `git switch $INTEGRATION_BRANCH` (or `git checkout $INTEGRATION_BRANCH`). If the branch does not exist locally, `git checkout -b $INTEGRATION_BRANCH origin/$INTEGRATION_BRANCH`.
4. `git pull origin $INTEGRATION_BRANCH` to ensure the branch is up to date.
5. Capture `git rev-parse HEAD` as `COMMIT_SHA` — this is the SHA the verification report is anchored to.
6. Also capture the PR URL for the story under verification: `gh pr list --head feat/$ID-<slug> --json url,number --jq '.[0]'`. Store as `STORY_PR_URL` and `STORY_PR_NUMBER`. This is used when a QA failure becomes a bug report to link the PR that introduced the issue.

## Step 4 — Load context (in parallel)

Read:

- `$REPO_ROOT/conclave/config.md` — `team_profile`, `ceremonies.peer_pr_review.required`, `ceremonies.qa_verification.ci_wait_timeout_minutes` (default `20` if absent), and `models.*`. Resolve `MODEL_FOR_QA` = `models.overrides.qa` → `models.default` → null (session). Invalid model name → print `WARNING: Unknown model '<value>' for role qa. Falling back to <next_fallback>.` then continue. Absent `models:` block → null, no warning. Print `Model for qa: <id or 'session default'>` if non-null.
- `$REPO_ROOT/conclave/product/definition-of-done.md`
- `$REPO_ROOT/conclave/team/testing-environments.md` — if missing, or every environment/variable row is still `TBD`, set `UAT_ENABLED = false` and skip Steps 5–7 entirely (go straight to today's Gherkin-only verification at Step 8). Otherwise `UAT_ENABLED = true`.
- The story or bug file (note `discipline` and `type`). **`type: spike` (v2.0.0+)**: set `UAT_ENABLED = false` and skip Steps 5–6 — a spike ships no runtime behaviour. Also read its `findings_path` file, every ADR in its `produced_adrs` (from the epic's `adrs:` / the PR diff) and its `produced_spec`, so Step 7 can check the deliverable.
- The acceptance file (`US-NNN`) or the bug file itself, which holds its own repro steps inline (`BUG-NNN`)
- `skills/conclave/templates/verification-report.template.md`
- `skills/conclave/templates/uat-report.template.md` (only if `UAT_ENABLED`)
- The existing `tests/uat/api-collection.postman_collection.json` and `tests/uat/US-NNN-UAT.md` in the target repo, if present (only if `UAT_ENABLED`) — a pre-existing `US-NNN-UAT.md` means this is a *second* run reading back a CI/mobile result, not the first
- PR metadata if `gh` is available: `gh pr view --json number,reviewDecision,reviews,statusCheckRollup` for the branch. Record `PR_NUMBER`, `PR_URL`, `PEER_APPROVALS`, `CI_STATUS`.

## Step 5 — Generate UAT artifacts (subagent) — skipped when `UAT_ENABLED` is false

Issue an `Task` tool call with:

- **Model**: `MODEL_FOR_QA` (omit if null).
- Prompt prefix: full content of `agents/qa.md`.
- Task: generate UAT artifacts for this story per the charter's "Generating UAT artifacts" section.
- Inputs to embed: story file (with `discipline`), acceptance file's Gherkin scenarios, `testing-environments.md` content, the existing Postman collection (if any), whether `tests/uat/US-NNN-UAT.md` already exists (second-run case).
- Expected output:
  - `discipline_strategy` — one of `frontend`, `backend`, `multi`, `mobile`, `none`
  - `playwright_spec` — file content for `tests/uat/US-NNN.spec.ts`, or `null`
  - `postman_collection` — the full merged content of `tests/uat/api-collection.postman_collection.json`, or `null`
  - `postman_environment` — the full content of `tests/uat/postman-environment.json`, or `null`
  - `uat_report_markdown` — content for `tests/uat/US-NNN-UAT.md` (automated-summary shell, or the mobile manual checklist), or `null` if this is a second run and the file already exists (do not clobber a human's filled-in checklist)
  - `ci_job_proposal` — `null`, or a proposed addition/diff to a `.github/workflows/*.yml` file if no job runs `tests/uat/` yet
  - `immediate_verdict` — `pending_uat` if this is `mobile` (or any discipline with `discipline_strategy: none`), otherwise `null` (meaning: proceed to push + CI wait)

If it errors, surface and stop.

### 5.1 Confirm and write the CI job proposal, if any
If `ci_job_proposal` is non-null, use `AskQuestion` to confirm with the human before writing: *"No CI job runs tests/uat/ yet. Add this step to `<file>`?"* (`Yes, add it` / `No, skip UAT this run`). If declined, treat this run as `UAT_ENABLED = false` from here on and skip to Step 8.

### 5.2 Write and commit the generated artifacts
Write whichever of `playwright_spec`, `postman_collection`, `postman_environment`, `uat_report_markdown` (when not `null`), and the confirmed CI job change are present, into the target repo (`tests/uat/...`, `.github/workflows/...`). Commit with `chore(US-NNN): generate UAT test artifacts` on the dev branch. **Do not push yet if `discipline_strategy` is `mobile`** — there is nothing for CI to run; push once at the end alongside the verification report (Step 8's 8.4).

## Step 6 — Push and wait for CI — skipped for `mobile` and when `immediate_verdict` is already `pending_uat`

1. `git push origin $BRANCH`.
2. Identify the CI run triggered by this push: `gh run list --commit $(git rev-parse HEAD) --json databaseId,status,conclusion,url`.
3. Poll (a reasonable interval, e.g. 15–30s) up to `ci_wait_timeout_minutes` minutes:
   - A run concludes `success` → `CI_RESULT = passed`.
   - A run concludes anything else → `CI_RESULT = failed`. Pull a bounded excerpt: `gh run view <id> --log-failed` (cap the output, e.g. last ~100 lines total across failed steps). Record `CI_RUN_URL` and the excerpt as `CI_EVIDENCE`.
   - No run appears for the commit within a short grace period (~2 minutes), or the timeout elapses while still `in_progress`/`queued` → `CI_RESULT = blocked`. Record why (`"no run found for commit"` or `"timed out after Nm"`) as `CI_EVIDENCE`.

## Step 7 — Delegate to the QA subagent (read back CI/mobile result)

Issue a single `Task` tool call with:

- **Model**: `MODEL_FOR_QA` (omit if null).
- Prompt prefix: full content of `agents/qa.md`.
- Task: verify the story per the charter, folding in the UAT outcome. For a spike: task **spike verification** (charter section "Verifying a spike") — each Gherkin scenario is checked against the findings report and the declared outputs, not against running software.
- Inputs to embed in the prompt:
  - Story file content, acceptance file content with all Gherkin scenarios
  - `definition-of-done.md` content
  - Resolved `team_profile` and `peer_pr_review.required` flag
  - `COMMIT_SHA`, `BRANCH`, `PR_NUMBER`, `PR_URL`
  - `PEER_APPROVALS` and `CI_STATUS`
  - `UAT_ENABLED`, and when true: `discipline_strategy`, `CI_RESULT`/`CI_RUN_URL`/`CI_EVIDENCE` (frontend/backend/multi), or the current `tests/uat/US-NNN-UAT.md` content (mobile)
  - Full path to the verification-report and uat-report templates
- Expected output:
  - `report_markdown` — the rendered verification report (appended to the acceptance file), including the UAT execution subsection
  - `uat_report_final` — for `frontend`/`backend`/`multi` with `UAT_ENABLED`, the full content of `tests/uat/US-NNN-UAT.md` rewritten with the resolved `CI_RESULT`/`CI_RUN_URL` and per-scenario outcomes (replacing the placeholder shell written in Step 5.2); `null` for `mobile` (never overwrite the human's checklist) or when UAT is disabled
  - `verdict` — one of `passed`, `blocked`, `pending_uat`
  - `failing_items` — list of `{ scenario_or_dod_item, reproduction, evidence }` if `verdict == blocked`
  - `pending_note` — short text naming what's awaiting completion, if `verdict == pending_uat`
  - `pr_comment_body` — short markdown summarizing the verdict; will be posted as a PR comment (not a review)

Wait for the subagent. If it errors, surface and stop.

## Step 8 — Write outputs

### 8.1 Append the verification report and finalize the UAT report
Append `report_markdown` to the end of `acceptance/AC-US-NNN.md` (`US-NNN`) or `conclave/product/bugs/BUG-NNN-*.md` (`BUG-NNN` — appended to the bug file itself, since it has no separate acceptance file). Never overwrite previous verification sections. If `uat_report_final` is non-null, overwrite `tests/uat/<ID>-UAT.md` with it — this is the one case where overwriting the file is correct, since it's replacing the placeholder shell Step 5.2 wrote with the real, now-known CI outcome. Commit with `chore(<ID>): QA verification report` on the dev branch.

### 8.2 Update the story file
- `verdict: passed`:
  - If `peer_pr_review.required: true` → frontmatter `status: verified`. Remove any `## QA blockers` / `## QA pending` section if present from a previous run.
  - If `peer_pr_review.required: false` → frontmatter `status: done`. Remove any `## QA blockers` / `## QA pending` section.
- `verdict: pending_uat` → leave frontmatter `status: review`. Append (or replace) a `## QA pending` section with `pending_note` — worded as awaiting completion, not as a defect.
- `verdict: blocked` → leave frontmatter `status: review`. Append (or replace) a `## QA blockers` section with one bullet per `failing_items` entry: the failing scenario/DoD item/CI evidence, plus reproduction steps or the log excerpt + run URL.

### 8.2b — Sprint bug report on `verdict: blocked`

When `verdict: blocked`, for each item in `failing_items` that constitutes a reproducible defect (not a missing feature or scope gap — only a behavioral regression or acceptance-criteria violation), create a bug report in the active sprint:

1. Determine the next available `BUG-NNN` ID: scan `$SPRINT_PATH/bugs/` for existing files; next ID = max + 1, or `BUG-001` if the folder is empty. Create `mkdir -p $SPRINT_PATH/bugs/` if needed.

2. Build the bug slug from the failing scenario name (lowercase, dash-separated, ASCII, max 40 chars).

3. Determine severity from the failing item:
   - A scenario tagged `@critical` or a DoD item that is `must` → `severity: critical`
   - A CI failure affecting core flows → `severity: high`
   - Other failing scenarios → `severity: medium`

4. Render the bug file at `$SPRINT_PATH/bugs/BUG-NNN-<slug>.md` using `skills/conclave/templates/bug.template.md` with these values:
   - `title`: concise description of the failure
   - `status: ready` (immediately actionable — same as `/conclave-bug report` behavior)
   - `severity`: as determined above
   - `linked_story`: the `US-NNN` being verified
   - `linked_acceptance`: path to `conclave/sprints/$SPRINT_ID/acceptance/AC-US-NNN.md`
   - `linked_pr`: `$STORY_PR_URL` (the PR that introduced the behavior under test)
   - `introduced_at`: `$COMMIT_SHA` on `$INTEGRATION_BRANCH`
   - `gherkin_repro`: the failing Gherkin scenario(s) verbatim
   - `evidence`: CI log excerpt or manual reproduction steps from `failing_items`

5. Print one line per bug created: `🐛 BUG-NNN created → $SPRINT_PATH/bugs/BUG-NNN-<slug>.md (severity: <level>)`

**Note:** a `critical` bug in the sprint's bugs folder will block `/conclave-sprint` from generating the closing report (Step 12 of that command). The developer must fix the bug via `/conclave-dev BUG-NNN` and QA must re-verify before the sprint can close.

Commit with `chore(US-NNN): QA verified`, `chore(US-NNN): mark done`, `chore(US-NNN): QA blockers raised`, or `chore(US-NNN): UAT pending` depending on the outcome.

### 8.3 Post the verdict on the PR (do NOT approve/request-changes)
If `gh` is available, post a PR comment with the QA verdict:

```
gh pr comment $PR_NUMBER --body "<pr_comment_body>"
```

The body includes the verdict (passed / blocked / pending_uat), a one-line summary per scenario (and the UAT/CI outcome when `UAT_ENABLED`), and a link to the appended verification report in `AC-US-NNN.md`.

**Do NOT run `gh pr review --approve` or `gh pr review --request-changes`** from here. Code-level review is the Tech Lead's job via `/conclave-pr-review US-NNN`. QA's contribution to the PR is a comment, not a review.

If `gh` is not available, print the prepared `gh pr comment` command for the user to run.

### 8.4 Push
`git push origin $BRANCH` so the verification report, story status update, and (for `mobile`, deferred from Step 5.2) the generated checklist are all visible.

## Step 9.5 — Lab test execution (only when `--lab` flag is present)

This section runs **in addition to** Step 9, not instead of it, and only when the `--lab` flag was passed on the command line. The `--lab` flag is only valid with a single `US-NNN` ID — not with `BUG-NNN` (bugs run their lab test automatically during `/conclave-bug report`) and not in multi-ID mode (Step 0). If `--lab` is passed with a bug ID or multiple IDs, refuse with a usage message and stop.

### 9.5.1 — Prerequisites

1. Confirm `LAB_TEST_ENABLED == true` in config. If false, print:
   `Lab test requested but lab_test.enabled is false in config.md. Enable it to use --lab.` and stop.

2. **Require `conclave/lab-config.md`**. Attempt to read `$REPO_ROOT/conclave/lab-config.md`:
   - If **not found**: print the setup instructions below and stop — execution is impossible without env var values:
     ```
     ✘  conclave/lab-config.md is missing. Lab test execution requires it.
        1. Copy the template:
           cp <plugin_root>/skills/conclave/templates/lab-config.template.md conclave/lab-config.md
        2. Fill in the environment values (base_url, vars) for the integration environment.
        3. Add to .gitignore:
           echo "conclave/lab-config.md" >> .gitignore
        4. Re-run /conclave-qa US-NNN --lab once configured.
     ```
   - If found but the **`integration.vars` block is entirely empty**: warn and ask via `AskQuestion` whether to fall back to `local.vars` (with a note that results may not reflect the integration environment). If the user declines, stop.
   - If found and contains usable vars: parse frontmatter into `LAB_CONFIG`. Check `.gitignore` for the entry; print a one-line warning if missing: `⚠  conclave/lab-config.md is not in .gitignore — add it to avoid leaking local values.`

3. Locate the lab spec file: `$REPO_ROOT/conclave/sprints/$SPRINT_ID/stories/US-NNN-lab.md` (co-located with the story).
   - If missing: print `No lab spec found for US-NNN. The Tech Lead must generate it first via /conclave-pr-review US-NNN.` and stop.
   - If `status: pending` in the lab spec frontmatter: continue.
   - If `status: blocked`: print the lab spec's `## Needs more info` section and stop — a blocked spec cannot be executed.
   - If `status: passed` or `status: failed`: print the last Evidence log row and ask the user (via `AskQuestion`) whether to re-run.

3. Confirm the story's PR is merged into the integration branch:
   ```
   gh pr list --head feat/US-NNN-<slug> --state merged --json mergedAt,mergeCommit --jq '.[0]'
   ```
   If no merged PR is found, print: `US-NNN has not been merged into the integration branch yet. Merge first, then re-run /conclave-qa US-NNN --lab.` and stop.

### 9.5.2 — Check out the integration branch

1. `git fetch origin $LAB_TEST_BRANCH`.
2. `git switch $LAB_TEST_BRANCH` (or `git checkout $LAB_TEST_BRANCH`).
3. `git pull origin $LAB_TEST_BRANCH`.
4. Capture `git rev-parse HEAD` as `LAB_SHA`.

### 9.5.3 — Set up the environment and execute the Verify command

**Environment setup (before running the Verify command):**

From `LAB_CONFIG`, select the appropriate env var set:
- Primary: `environments.integration.vars` (preferred — the lab test runs on the integration branch)
- Fallback: `environments.local.vars` (only if the user approved the fallback in Step 9.5.1)

For each key-value pair in the selected vars block, export the variable to the shell environment before running the command:
```bash
export KEY="VALUE"
```
**Never print the values in any output, log, or report.** Only the variable names appear in logs, in the format `Exported: KEY1, KEY2, KEY3`.

Also export `BASE_URL` from `environments.integration.base_url` (or `local.base_url`) as the base URL, in case the Verify command references it.

Generate `LAB_TEST_TAG = lab-<unix_timestamp>` and export it. The Verify command uses this prefix when naming any resources it creates, making cleanup safe and unambiguous.

**Safety pre-checks (abort execution if any fail):**

Before running the Verify command, enforce these rules from `LAB_CONFIG.safety`:
- `payment_mode` must be `test` — if it is `live` or anything else, print `✘ Lab test aborted: safety.payment_mode must be "test". Never run lab tests against a live payment environment.` and stop.
- If `STRIPE_SECRET_KEY` is in the env var set and its value does NOT start with `sk_test_`, print `✘ Lab test aborted: STRIPE_SECRET_KEY must be a test key (sk_test_*). Found a live key — refusing to execute.` and stop. Never log the key value.
- Print one line listing exported variable names (never values): `Exported: VAR1, VAR2, VAR3 (LAB_TEST_TAG=lab-<timestamp>)`.

**Execute the Verify command:**

Read the lab spec's `## Verify command` block verbatim. Execute it with the environment set above.

**Timebox**: enforce `LAB_TEST_TIMEBOX` minutes. If the command does not complete within that window, send SIGTERM, capture partial output, and record `result: blocked` with reason `"timed out after Nm"`.

Capture:
- `LAB_EXIT_CODE` — the command's exit code (or `timeout` if timed out).
- `LAB_OUTPUT` — the first 200 characters of stdout+stderr combined.
- `LAB_TIMESTAMP` — ISO-8601 timestamp of the run start.
- `LAB_RESULT` — `passed` if exit code is 0 AND output contains the expected pattern; `failed` otherwise; `blocked` if timed out.

### 9.5.4 — Record Tier A evidence in the lab spec

Append one row to the `## Evidence log` table in the lab spec file:

```
| <run_number> | <LAB_SHA> | <LAB_EXIT_CODE> | <LAB_OUTPUT> | <LAB_RESULT> | <LAB_TIMESTAMP> |
```

Update the lab spec frontmatter:
- `status`: `passed` | `failed` | `blocked`
- `last_run_at`: `LAB_TIMESTAMP`
- `last_run_sha`: `LAB_SHA`

This is Tier A evidence: command + output + SHA, gathered this session.

### 9.5.5 — Auto-create BUG-NNN for failures

If `LAB_RESULT == failed`:

Delegate to the QA subagent via `Agent`:
- **Model**: `MODEL_FOR_QA` (omit if null).
- Prompt prefix: full content of `agents/qa.md`.
- Task: *"Generate a bug report from a lab test failure. Follow the 'How you operate inside lab test execution (--lab)' section of your charter."*
- Embed: the full lab spec content, `LAB_OUTPUT`, `LAB_EXIT_CODE`, `LAB_SHA`, `LAB_TIMESTAMP`, and the originating story ID (`US-NNN`).
- Expected output: Gherkin repro steps derived from the failing Verify command, an advisory severity, and a `## Needs more info` note (if applicable).

Wait for the subagent. Then:

1. Compute the next `BUG-NNN` ID: scan `$REPO_ROOT/conclave/product/bugs/BUG-*.md` (note: global bug pool, not sprint-local). `NEW_BUG_ID = max(existing) + 1`, zero-padded to 3 digits.

2. Write `conclave/product/bugs/BUG-NEW_BUG_ID-lab-failure-<slug>.md` from `bug.template.md` with:
   - `status: ready`
   - `severity`: from the QA subagent's advisory severity (pre-fill; the team confirms on triage)
   - `discipline: multi` (lab tests cut across disciplines by default)
   - `related_story`: `US-NNN`
   - `suspected_code_area`: from the lab spec's `## Scope` section (what it verifies)
   - `lab_test_path`: path to the lab spec file
   - `reported_via: lab_test`
   - The QA subagent's Gherkin repro steps

3. Update the lab spec frontmatter: add `linked_bug: BUG-NEW_BUG_ID`.

4. Print: `🐛 Lab failure → BUG-NEW_BUG_ID created at conclave/product/bugs/BUG-NEW_BUG_ID-lab-failure-<slug>.md`.

If `LAB_RESULT == blocked` (timeout): print a warning that the lab spec could not be fully executed, note the timeout, and do **not** create a bug — a timeout is not a confirmed failure.

### 9.5.6 — Commit and push lab results

Commit all changes (updated lab spec + any new bug files):
```
chore(US-NNN): lab test run — <passed|failed|blocked>
```
`git push origin $LAB_TEST_BRANCH`.

---

## Step 9 — Report to the user

Print:

- Story ID, title, and final `status` (`verified`, `done`, or still `review`).
- One-line verdict (`passed`, `blocked: <count> failing item(s)`, or `pending_uat: <what's awaiting completion>`).
- When `UAT_ENABLED`: which UAT artifacts were generated, which CI run was checked and its conclusion (or, for `mobile`, that a human needs to fill in `tests/uat/US-NNN-UAT.md` and someone should re-run `/conclave-qa US-NNN` afterward).
- When `UAT_ENABLED` is false: a note that UAT was skipped because `conclave/team/testing-environments.md` has no environment configured yet.
- For `passed` + `peer_pr_review.required: true`: link to the PR, note that QA verdict is posted as a comment, and prompt the Tech Lead to run `/conclave-pr-review US-NNN` to approve and merge.
- For `passed` + `peer_pr_review.required: false`: link to the PR, note that there is no separate TL gate in this profile; the PR is ready to merge.
- For `blocked`: numbered list of failing items with one-line reproductions/evidence. Suggest the dev fix and the QA re-run `/conclave-qa US-NNN` after fixes are pushed.
- For `pending_uat`: exactly what a human needs to do and where.
- A reminder that the verification report is now appended to `acceptance/AC-US-NNN.md` and a comment is on the PR.

## Guardrails

- **QA runs on `$INTEGRATION_BRANCH` (develop / main), not the feature branch.** This is the canonical source of truth for integration state. Never switch to a feature branch during verification.
- **Do not modify any file outside `conclave/`, the story's acceptance file (or the bug file itself, for `BUG-NNN`), and `tests/uat/<ID>.spec.ts` / `tests/uat/api-collection.postman_collection.json` / `tests/uat/postman-environment.json` / `tests/uat/<ID>-UAT.md`.** QA writes verification reports and UAT artifacts; QA does NOT fix code.
- **Sprint bugs go in `conclave/sprints/<SPRINT_ID>/bugs/`** — not in `conclave/product/bugs/` (that path is for bugs reported directly via `/conclave-bug report`, outside the QA flow). These two locations are distinct by design. **Lab-test-sourced bugs go in `conclave/product/bugs/`** — they cross sprint boundaries.
- **May propose (with human confirmation via `AskQuestion`) an addition to `.github/workflows/*.yml` limited to running `tests/uat/`** — no other pipeline changes, and never written without that confirmation.
- **Never delete prior verification sections.** Each run appends a new `## Verification — <date>` block. The acceptance/bug file is the story's/bug's full audit trail.
- **Never overwrite another story's requests in the shared Postman collection.** Merge only.
- **Never resolve, read, or write a secret value**, anywhere, at any step. Only environment-variable/CI-secret names ever appear in anything written.
- **Never use `gh pr review --approve` or `gh pr review --request-changes`.** QA's role ends at the verification report and a PR comment. Code-level approval is the Tech Lead's call, exercised through `/conclave-pr-review`.
- **Never pass a story when any scenario is `FAIL`, any required DoD item is unmet, or `CI_RESULT` is `failed`/`blocked`.** Even if the dev is asking nicely. The whole point of QA is the integrity of the gate.
- **Never conflate `pending_uat` with `blocked`.** A mobile checklist awaiting a human is not a defect.
- **Never wait past `ci_wait_timeout_minutes`.** Treat an elapsed timeout as `blocked` and stop — do not keep polling indefinitely.
- **Do not merge the PR.** Even in `lean` profile where you move the story to `done`, merging is a separate human action so the team can decide when (release windows, batching, etc.).
- **Re-runs are append-only.** A second `/conclave-qa US-NNN` after dev fixes (or after a human completes a mobile checklist) appends a new verification section; story status transitions to `verified` / `done` (or stays `review`) based on the new run alone — past runs are kept for history but do not affect the verdict.
- **`--lab` is single-story-only and post-merge-only.** Never run the lab execution path before the PR is merged, and never on multiple IDs or a `BUG-NNN` — bugs run their lab test automatically during `/conclave-bug report`.
- **Lab timeouts are `blocked`, not `failed`.** A timed-out Verify command does not create a bug automatically — a human must triage the timeout reason.
- **The Evidence log is Tier A.** Every lab test row is anchored to a real SHA and a real exit code. Never fabricate output or infer a pass from inspection.
- **Never print env var values.** Only variable names appear in logs and reports. Values from `lab-config.md` are used only at the moment the Verify command runs, and never stored in any Conclave artifact.
- **`conclave/lab-config.md` must be gitignored.** If it is missing from `.gitignore`, warn — but do not block execution on the warning.
