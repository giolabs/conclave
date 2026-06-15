---
description: Tech Lead PR review and approval gate. Validates that QA already verified the story behaviorally, then spawns the Tech Lead subagent to review the diff against the architecture, ADRs, and code-level DoD items. On approve, runs gh pr review --approve and moves the story to done. On request-changes, moves it back to review for the dev to fix. Only runs when ceremonies.peer_pr_review.required is true.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git switch:*), Bash(git checkout:*), Bash(git diff:*), Bash(git log:*), Bash(git fetch:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(gh pr view:*), Bash(gh pr review:*), Bash(gh pr diff:*), Bash(gh pr checks:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-pr-review US-NNN

Tech Lead PR approval gate. Reviews the code of a story that QA has already verified behaviorally. On approve, the PR is approved and the story moves to `status: done`. On request-changes, the story moves back to `review` and the dev fixes.

This command runs only when `ceremonies.peer_pr_review.required: true` in `conclave/config.md`. In `lean` profile (flag off), QA's pass is the merge signal and there is no separate TL gate.

Follow these steps in order.

---

## Step 1 — Resolve the workspace and the profile gate

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. If not a git repo, stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.
3. Read `ceremonies.peer_pr_review.required` from `config.md`.
   - `false` → refuse with: *"Your team profile (`lean` or custom-off) has `peer_pr_review.required: false`. There is no separate Tech Lead PR gate. QA verification is the merge signal — once `/conclave-qa US-NNN` passes, the story is `done`."*
   - `true` → continue.

## Step 2 — Resolve the story

1. Parse `US-NNN`. If missing, ask via `AskUserQuestion` to pick from the list of `verified` stories in the active sprint.
2. Find the active sprint as in `/conclave-dev` Step 2.
3. Locate the story and acceptance files. If either missing, refuse.
4. Read the story frontmatter:
   - `status: verified` → continue (this is the happy path: QA passed, TL approval pending).
   - `status: review` → refuse: *"QA has not verified this story yet. Run `/conclave-qa US-NNN` first."*
   - `status: in-progress` → refuse: *"Story is still in development."*
   - `status: done` → refuse: *"Story is already done. Past TL reviews are on the PR."*
   - Anything else → refuse.

## Step 3 — Switch to the dev branch

1. Branch name is `feat/US-NNN-<slug>` from the story's slug.
2. `git switch $BRANCH`. If not present locally, ask user whether to `git fetch origin $BRANCH:$BRANCH` first.
3. Determine the integration branch from `config.md` or default to `main`. Compute the diff: `git diff $INTEGRATION_BRANCH...$BRANCH`.

## Step 4 — Load context (in parallel)

Read:

- `$REPO_ROOT/conclave/config.md`
- `$REPO_ROOT/conclave/product/architecture.md`
- `$REPO_ROOT/conclave/product/definition-of-done.md`
- Story file (must show `status: verified`)
- Acceptance file (with the QA's latest `## Verification — <date>` block — needed so the TL knows what behavior QA actually verified)
- The diff (`git diff $INTEGRATION_BRANCH...$BRANCH` — pass the full output to the TL agent)
- PR metadata via `gh pr view --json number,title,url,reviewDecision,statusCheckRollup,commits`. Capture `PR_NUMBER`, `PR_URL`, `CI_STATUS`.

## Step 5 — Delegate to the Tech Lead subagent

Issue a single `Agent` tool call with:

- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/tech-lead.md`.
- Task: review the PR per the charter's "How you operate inside `/conclave-pr-review`" section.
- Inputs embedded:
  - Story file content
  - Acceptance file content (including QA's latest verification block)
  - `architecture.md`
  - `definition-of-done.md`
  - Full diff text
  - PR metadata (`PR_NUMBER`, `PR_URL`, CI status, commit list)
  - Resolved `team_profile`
- Expected output:
  - `verdict` — one of `approved`, `request_changes`
  - `review_markdown` — the rendered Tech Lead review block (will be posted as the PR review body)
  - `findings` — list of `{ severity, location, description }` (severity is `blocker` or `non-blocking`)
  - `adr_evaluation` — present only if the PR body included an `## Architectural deviations` section

Wait for the subagent. If it errors, surface and stop.

## Step 6 — Write outputs

### 6.1 Update the story file
- `verdict: approved` → frontmatter `status: done`.
- `verdict: request_changes` → frontmatter `status: review`. Append (or replace) a `## TL findings` section with one bullet per finding, each tagged with severity.

Commit on the dev branch with `chore(US-NNN): TL approved` or `chore(US-NNN): TL findings raised`.

### 6.2 Act on the PR
- `verdict: approved` → `gh pr review $PR_NUMBER --approve --body "<review_markdown>"`.
- `verdict: request_changes` → `gh pr review $PR_NUMBER --request-changes --body "<review_markdown>"`.

If `gh` is not available, print the prepared command for the user to run.

### 6.3 Push
`git push origin $BRANCH` so the story-status change is visible.

## Step 7 — Report

Print:

- Story ID, title, and final `status` (`done` or back to `review`).
- TL verdict (`approved` or `request_changes: <count> blocker(s), <count> non-blocking`).
- For `approved`: link to the PR with a note that it is approved and ready to merge. Remind the user that merging is a separate human action (release windows, batching).
- For `request_changes`: numbered list of blockers with location and description. Next step: the dev pushes fixes, then re-run `/conclave-qa US-NNN` (criteria may have shifted) followed by `/conclave-pr-review US-NNN`.

## Guardrails

- **Never approve a story whose status is not `verified`.** QA gate comes first.
- **Never run on a workspace where `peer_pr_review.required: false`.** Refuse at Step 1.
- **Do not merge the PR.** Approval is sufficient.
- **Do not modify code on the dev branch.** TL findings go in the review body; the dev addresses them.
- **A single blocker blocks the whole approval.** Do not approve "with notes" when there is any `blocker`-severity finding.
- **Re-runs are append-only on the story file.** A second `/conclave-pr-review` after dev fixes adds a new `## TL findings` section if there are still findings; on approve, removes that section and moves to `done`.
