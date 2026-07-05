---
description: Verify a story in status review against its Gherkin acceptance criteria. Generates UAT test artifacts (Playwright for frontend/multi, a shared Postman collection for backend/multi, a manual checklist for mobile), pushes them, and waits for the target repo's own CI to run them before spawning the adversarial QA subagent that re-derives pass/fail from first principles. Appends a verification report to the acceptance file, leaves a comment on the PR with the verdict, and either moves the story to verified (when the TL approval gate is on) or directly to done (when it is off). QA does NOT approve the PR itself — that is the Tech Lead's call via /conclave-pr-review. QA verification is structurally required — cannot be skipped.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git rev-parse HEAD:*), Bash(git log:*), Bash(git switch:*), Bash(git checkout:*), Bash(git fetch:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(gh pr view:*), Bash(gh pr comment:*), Bash(gh pr checks:*), Bash(gh run list:*), Bash(gh run view:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-qa US-NNN

Verify a single user story in `status: review` against its acceptance criteria. When this finishes, the story has moved to one of four states:

- **`verified`** — QA passed, awaiting Tech Lead PR approval. Happens when `peer_pr_review.required: true`.
- **`done`** — QA passed and there is no separate TL gate. Happens when `peer_pr_review.required: false`.
- **`review` (pending UAT)** — UAT artifacts were generated/pushed and nothing has failed, but a mobile checklist is awaiting a human, or was left incomplete. Not a defect — re-run once it's filled in.
- **`review` (with blockers)** — QA found failures, in the Gherkin scenarios, the DoD, or the generated UAT tests' CI run. The dev (or tester) fixes, pushes, and QA re-runs.

The argument `US-NNN` is required and must match a story file under the active sprint.

This is one of the two **structural** Scrum gates Conclave enforces (along with Sprint Planning). It cannot be skipped by any profile. QA does NOT approve the PR itself — code-level approval belongs to the Tech Lead via `/conclave-pr-review`. QA's verdict goes into the verification report and a PR comment.

Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.
3. Confirm `ceremonies.qa_verification.required: true`. If somehow `false`, refuse with: *"qa_verification is a structural Scrum gate and cannot be disabled. Edit config.md to restore required: true and re-run."*

## Step 2 — Resolve the story

1. Parse `US-NNN`. If missing, ask via `AskUserQuestion` to pick from the list of `review` stories in the active sprint.
2. Find the active sprint as in `/conclave-dev` Step 2.
3. Locate `$REPO_ROOT/conclave/sprints/$SPRINT_ID/stories/US-NNN-*.md` and `$REPO_ROOT/conclave/sprints/$SPRINT_ID/acceptance/AC-US-NNN.md`. If either missing, refuse.
4. Read the story frontmatter:
   - `status: review` → continue.
   - `status: in-progress` → refuse: *"Story is still in development. Wait for `/conclave-dev` to push it to `review`."*
   - `status: done` → refuse: *"Story is already verified. Past verification reports live in the acceptance file."*
   - Anything else → refuse.

## Step 3 — Switch to the dev branch

1. The branch should be `feat/US-NNN-<slug>` from the story's slug.
2. `git switch $BRANCH` (or `git checkout $BRANCH`). If the branch does not exist locally, ask the user via `AskUserQuestion` whether to fetch it (`git fetch origin $BRANCH:$BRANCH`) or abort.
3. Capture `git rev-parse HEAD` as `COMMIT_SHA` — this is the SHA the verification report is anchored to.

## Step 4 — Load context (in parallel)

Read:

- `$REPO_ROOT/conclave/config.md` — `team_profile`, `ceremonies.peer_pr_review.required`, `ceremonies.qa_verification.ci_wait_timeout_minutes` (default `20` if absent)
- `$REPO_ROOT/conclave/product/definition-of-done.md`
- `$REPO_ROOT/conclave/team/testing-environments.md` — if missing, or every environment/variable row is still `TBD`, set `UAT_ENABLED = false` and skip Steps 5–7 entirely (go straight to today's Gherkin-only verification at Step 8). Otherwise `UAT_ENABLED = true`.
- The story file (note `discipline`)
- The acceptance file
- `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/verification-report.template.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/uat-report.template.md` (only if `UAT_ENABLED`)
- The existing `tests/uat/api-collection.postman_collection.json` and `tests/uat/US-NNN-UAT.md` in the target repo, if present (only if `UAT_ENABLED`) — a pre-existing `US-NNN-UAT.md` means this is a *second* run reading back a CI/mobile result, not the first
- PR metadata if `gh` is available: `gh pr view --json number,reviewDecision,reviews,statusCheckRollup` for the branch. Record `PR_NUMBER`, `PR_URL`, `PEER_APPROVALS`, `CI_STATUS`.

## Step 5 — Generate UAT artifacts (subagent) — skipped when `UAT_ENABLED` is false

Issue an `Agent` tool call with:

- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/qa.md`.
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
If `ci_job_proposal` is non-null, use `AskUserQuestion` to confirm with the human before writing: *"No CI job runs tests/uat/ yet. Add this step to `<file>`?"* (`Yes, add it` / `No, skip UAT this run`). If declined, treat this run as `UAT_ENABLED = false` from here on and skip to Step 8.

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

Issue a single `Agent` tool call with:

- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/qa.md`.
- Task: verify the story per the charter, folding in the UAT outcome.
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
Append `report_markdown` to the end of `acceptance/AC-US-NNN.md`. Never overwrite previous verification sections. If `uat_report_final` is non-null, overwrite `tests/uat/US-NNN-UAT.md` with it — this is the one case where overwriting the file is correct, since it's replacing the placeholder shell Step 5.2 wrote with the real, now-known CI outcome. Commit with `chore(US-NNN): QA verification report` on the dev branch.

### 8.2 Update the story file
- `verdict: passed`:
  - If `peer_pr_review.required: true` → frontmatter `status: verified`. Remove any `## QA blockers` / `## QA pending` section if present from a previous run.
  - If `peer_pr_review.required: false` → frontmatter `status: done`. Remove any `## QA blockers` / `## QA pending` section.
- `verdict: pending_uat` → leave frontmatter `status: review`. Append (or replace) a `## QA pending` section with `pending_note` — worded as awaiting completion, not as a defect.
- `verdict: blocked` → leave frontmatter `status: review`. Append (or replace) a `## QA blockers` section with one bullet per `failing_items` entry: the failing scenario/DoD item/CI evidence, plus reproduction steps or the log excerpt + run URL.

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

- **Do not modify any file outside `conclave/`, the story's acceptance file, and `tests/uat/US-NNN.spec.ts` / `tests/uat/api-collection.postman_collection.json` / `tests/uat/postman-environment.json` / `tests/uat/US-NNN-UAT.md`.** QA writes verification reports and UAT artifacts; QA does NOT fix code.
- **May propose (with human confirmation via `AskUserQuestion`) an addition to `.github/workflows/*.yml` limited to running `tests/uat/`** — no other pipeline changes, and never written without that confirmation.
- **Never delete prior verification sections.** Each run appends a new `## Verification — <date>` block. The acceptance file is the story's full audit trail.
- **Never overwrite another story's requests in the shared Postman collection.** Merge only.
- **Never resolve, read, or write a secret value**, anywhere, at any step. Only environment-variable/CI-secret names ever appear in anything written.
- **Never use `gh pr review --approve` or `gh pr review --request-changes`.** QA's role ends at the verification report and a PR comment. Code-level approval is the Tech Lead's call, exercised through `/conclave-pr-review`.
- **Never pass a story when any scenario is `FAIL`, any required DoD item is unmet, or `CI_RESULT` is `failed`/`blocked`.** Even if the dev is asking nicely. The whole point of QA is the integrity of the gate.
- **Never conflate `pending_uat` with `blocked`.** A mobile checklist awaiting a human is not a defect.
- **Never wait past `ci_wait_timeout_minutes`.** Treat an elapsed timeout as `blocked` and stop — do not keep polling indefinitely.
- **Do not merge the PR.** Even in `lean` profile where you move the story to `done`, merging is a separate human action so the team can decide when (release windows, batching, etc.).
- **Re-runs are append-only.** A second `/conclave-qa US-NNN` after dev fixes (or after a human completes a mobile checklist) appends a new verification section; story status transitions to `verified` / `done` (or stays `review`) based on the new run alone — past runs are kept for history but do not affect the verdict.
