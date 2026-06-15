---
description: Verify a story in status review against its Gherkin acceptance criteria. Spawns the adversarial QA subagent that re-derives pass/fail from first principles, appends a verification report to the acceptance file, leaves a comment on the PR with the verdict, and either moves the story to verified (when the TL approval gate is on) or directly to done (when it is off). QA does NOT approve the PR itself — that is the Tech Lead's call via /conclave-pr-review. QA verification is structurally required — cannot be skipped.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git rev-parse HEAD:*), Bash(git log:*), Bash(git switch:*), Bash(git checkout:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(gh pr view:*), Bash(gh pr comment:*), Bash(gh pr checks:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-qa US-NNN

Verify a single user story in `status: review` against its acceptance criteria. When this finishes, the story has moved to one of three states:

- **`verified`** — QA passed, awaiting Tech Lead PR approval. Happens when `peer_pr_review.required: true`.
- **`done`** — QA passed and there is no separate TL gate. Happens when `peer_pr_review.required: false`.
- **`review` (with blockers)** — QA found failures. The dev fixes, pushes, and QA re-runs.

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
  - `verdict` — one of `passed`, `blocked`
  - `failing_items` — list of `{ scenario_or_dod_item, reproduction }` if `verdict == blocked`
  - `pr_comment_body` — short markdown summarizing the verdict; will be posted as a PR comment (not a review)

Wait for the subagent. If it errors, surface and stop.

## Step 6 — Write outputs

### 6.1 Append the verification report
Append `report_markdown` to the end of `acceptance/AC-US-NNN.md`. Never overwrite previous verification sections. Commit with `chore(US-NNN): QA verification report` on the dev branch.

### 6.2 Update the story file
- `verdict: passed`:
  - If `peer_pr_review.required: true` → frontmatter `status: verified`. Remove any `## QA blockers` section if it exists from a previous run.
  - If `peer_pr_review.required: false` → frontmatter `status: done`. Remove any `## QA blockers` section. (No separate TL approval gate exists in this profile.)
- `verdict: blocked` → leave frontmatter `status: review`. Append (or replace) a `## QA blockers` section with one bullet per `failing_items` entry: the failing scenario or DoD item, plus the reproduction steps.

Commit with `chore(US-NNN): QA verified` or `chore(US-NNN): mark done` or `chore(US-NNN): QA blockers raised` depending on the outcome.

### 6.3 Post the verdict on the PR (do NOT approve/request-changes)
If `gh` is available, post a PR comment with the QA verdict:

```
gh pr comment $PR_NUMBER --body "<pr_comment_body>"
```

The body includes the verdict (passed / blocked), a one-line summary per scenario, and a link to the appended verification report in `AC-US-NNN.md`.

**Do NOT run `gh pr review --approve` or `gh pr review --request-changes`** from here. Code-level review is the Tech Lead's job via `/conclave-pr-review US-NNN`. QA's contribution to the PR is a comment, not a review.

If `gh` is not available, print the prepared `gh pr comment` command for the user to run.

### 6.4 Push
`git push origin $BRANCH` so the verification report and story status update are visible.

## Step 7 — Report to the user

Print:

- Story ID, title, and final `status` (`verified`, `done`, or still `review`).
- One-line verdict (`passed` or `blocked: <count> failing item(s)`).
- For `passed` + `peer_pr_review.required: true`: link to the PR, note that QA verdict is posted as a comment, and prompt the Tech Lead to run `/conclave-pr-review US-NNN` to approve and merge.
- For `passed` + `peer_pr_review.required: false`: link to the PR, note that there is no separate TL gate in this profile; the PR is ready to merge.
- For `blocked`: numbered list of failing items with one-line reproductions. Suggest the dev fix and the QA re-run `/conclave-qa US-NNN` after fixes are pushed.
- A reminder that the verification report is now appended to `acceptance/AC-US-NNN.md` and a comment is on the PR.

## Guardrails

- **Do not modify any file outside `conclave/` and the story's acceptance file.** QA writes verification reports; QA does NOT fix code.
- **Never delete prior verification sections.** Each run appends a new `## Verification — <date>` block. The acceptance file is the story's full audit trail.
- **Never use `gh pr review --approve` or `gh pr review --request-changes`.** QA's role ends at the verification report and a PR comment. Code-level approval is the Tech Lead's call, exercised through `/conclave-pr-review`.
- **Never pass a story when any scenario is `FAIL` or any required DoD item is unmet.** Even if the dev is asking nicely. The whole point of QA is the integrity of the gate.
- **Do not merge the PR.** Even in `lean` profile where you move the story to `done`, merging is a separate human action so the team can decide when (release windows, batching, etc.).
- **Re-runs are append-only.** A second `/conclave-qa US-NNN` after dev fixes appends a new verification section; story status transitions to `verified` / `done` (or stays `review`) based on the new run alone — past runs are kept for history but do not affect the verdict.
