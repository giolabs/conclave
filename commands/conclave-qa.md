---
description: Verify a story in status review against its Gherkin acceptance criteria. Spawns the adversarial QA subagent that re-derives pass/fail from first principles, appends a verification report to the acceptance file, then either marks the story done and approves the PR or leaves it in review with explicit blockers. QA verification is structurally required — cannot be skipped.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git rev-parse HEAD:*), Bash(git log:*), Bash(git switch:*), Bash(git checkout:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(gh pr view:*), Bash(gh pr review:*), Bash(gh pr checks:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-qa US-NNN

Verify a single user story in `status: review` against its acceptance criteria. When this finishes, the story is either `done` (approved, PR approved) or back in `review` with explicit blockers recorded in the story file and on the PR.

The argument `US-NNN` is required and must match a story file under the active sprint.

This is one of the two **structural** Scrum gates Conclave enforces (along with Sprint Planning). It cannot be skipped by any profile.

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

- `$REPO_ROOT/conclave/config.md` — `team_profile`, `ceremonies.peer_pr_review.required`
- `$REPO_ROOT/conclave/product/definition-of-done.md`
- The story file
- The acceptance file
- `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/verification-report.template.md`
- PR metadata if `gh` is available: `gh pr view --json number,reviewDecision,reviews,statusCheckRollup` for the branch. Record `PR_NUMBER`, `PR_URL`, `PEER_APPROVALS`, `CI_STATUS`.

## Step 5 — Delegate to the QA subagent

Issue a single `Agent` tool call with:

- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/qa.md`.
- Task: verify the story per the charter.
- Inputs to embed in the prompt:
  - Story file content
  - Acceptance file content with all Gherkin scenarios
  - `definition-of-done.md` content
  - Resolved `team_profile` and `peer_pr_review.required` flag
  - `COMMIT_SHA`, `BRANCH`, `PR_NUMBER`, `PR_URL`
  - `PEER_APPROVALS` (list of approving handles, excluding the author) and `CI_STATUS`
  - Full path to the verification-report template
- Expected output:
  - `report_markdown` — the rendered verification report (will be appended to the acceptance file)
  - `verdict` — one of `done`, `blocked`
  - `failing_items` — list of `{ scenario_or_dod_item, reproduction }` if `verdict == blocked`
  - `pr_action` — one of `approve`, `request_changes`, `none`
  - `pr_review_body` — short markdown the QA wants to leave on the PR review

Wait for the subagent. If it errors, surface and stop.

## Step 6 — Write outputs

### 6.1 Append the verification report
Append `report_markdown` to the end of `acceptance/AC-US-NNN.md`. Never overwrite previous verification sections. Commit with `chore(US-NNN): QA verification report` on the dev branch.

### 6.2 Update the story file
- `verdict: done` → frontmatter `status: done`. Remove any `## QA blockers` section if it exists from a previous run.
- `verdict: blocked` → leave frontmatter `status: review`. Append (or replace) a `## QA blockers` section with one bullet per `failing_items` entry: the failing scenario or DoD item, plus the reproduction steps.

Commit with `chore(US-NNN): mark done` or `chore(US-NNN): QA blockers raised`.

### 6.3 Act on the PR
If `gh` is available and `pr_action` is not `none`:

- `pr_action: approve` → `gh pr review $PR_NUMBER --approve --body "<pr_review_body>"`
- `pr_action: request_changes` → `gh pr review $PR_NUMBER --request-changes --body "<pr_review_body>"`

If `gh` is not available, print the prepared command for the user to run.

### 6.4 Push
`git push origin $BRANCH` so the verification report and story status update are visible.

## Step 7 — Report to the user

Print:

- Story ID, title, and final `status`.
- One-line verdict (`done` or `blocked: <count> failing item(s)`).
- For `done`: link to the PR (or merge command if no PR exists) and a note that the PR is approved (or the prepared `gh pr review --approve` command if `gh` was unavailable).
- For `blocked`: numbered list of failing items with one-line reproductions. Suggest the dev fix and the QA re-run `/conclave-qa US-NNN` after fixes are pushed.
- A reminder that the verification report is now appended to `acceptance/AC-US-NNN.md`.

## Guardrails

- **Do not modify any file outside `conclave/` and the story's acceptance file.** QA writes verification reports; QA does NOT fix code.
- **Never delete prior verification sections.** Each run appends a new `## Verification — <date>` block. The acceptance file is the story's full audit trail.
- **Never approve when any scenario is `FAIL` or any required DoD item is unmet.** Even if the dev is asking nicely. The whole point of QA is the integrity of the gate.
- **Do not merge the PR.** Approval is sufficient; merging is a separate human action so the team can decide when (release windows, batching, etc.).
- **Re-runs are append-only.** A second `/conclave-qa US-NNN` after dev fixes pushes a new verification section; story status transitions back to `done` (or stays `review`) based on the new run alone — past runs are kept for history but do not affect the verdict.
