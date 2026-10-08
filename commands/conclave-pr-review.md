---
description: Tech Lead PR review and approval gate for a story or bug (US-NNN or BUG-NNN). Validates that QA already verified it behaviorally, then spawns the Tech Lead subagent to review the diff against the architecture, ADRs, and code-level DoD items. On approve, runs gh pr review --approve and moves it to done. On request-changes, moves it back to review for the dev to fix. Only runs when ceremonies.peer_pr_review.required is true.
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

## Step 2 — Resolve the story or bug

1. Parse `US-NNN`/`BUG-NNN`. If missing, ask via `AskUserQuestion` to pick from the list of `verified` stories in the active sprint (bugs are not offered in this picker — same rationale as `/conclave-dev`).
2. **Resolution by ID prefix** (same branching as `/conclave-dev`/`/conclave-qa`):
   - **`US-NNN`**: find the active sprint as in `/conclave-dev` Step 2. Locate the story and acceptance files. If either missing, refuse.
   - **`BUG-NNN`**: no sprint lookup. Locate `$REPO_ROOT/conclave/product/bugs/BUG-NNN-*.md`. If missing, refuse. No separate acceptance file — the bug file holds its own verification history.
   - Any other prefix → refuse with `Unrecognized ID prefix: <id>. Expected US-NNN or BUG-NNN.`
3. Read the frontmatter (same status enum for both):
   - `status: verified` → continue (this is the happy path: QA passed, TL approval pending).
   - `status: review` → refuse: *"QA has not verified this story yet. Run `/conclave-qa US-NNN` first."*
   - `status: in-progress` → refuse: *"Story is still in development."*
   - `status: done` → refuse: *"Story is already done. Past TL reviews are on the PR."*
   - `status: retired` → refuse: *"Story is retired and cannot be TL-approved. Retired stories are terminal — un-retire by hand-editing the frontmatter if this was a mistake, then re-run."*
   - Anything else → refuse.

## Step 3 — Switch to the dev branch

1. Branch name is `feat/US-NNN-<slug>` or `feat/BUG-NNN-<slug>` from the ID's slug.
2. `git switch $BRANCH`. If not present locally, ask user whether to `git fetch origin $BRANCH:$BRANCH` first.
3. Determine the integration branch from `config.md` or default to `main`. Compute the diff: `git diff $INTEGRATION_BRANCH...$BRANCH`.

## Step 4 — Load context (in parallel)

Read:

- `$REPO_ROOT/conclave/config.md` — extract `team_profile`, `ceremonies.*`, `models.*`, and `lab_test.*`. Resolve:
  - `MODEL_FOR_TL` = `models.overrides.tech_lead` → `models.default` → null
  Invalid model name → `WARNING: Unknown model '<value>' for role <role>. Falling back to <next_fallback>.` then continue. Absent block → null, no warning. Print `Models: tl=<id>` for any non-null values.
  - `LAB_TEST_ENABLED` = `lab_test.enabled` (default `false`).
  - `LAB_TEST_BRANCH` = `lab_test.integration_branch` → `repo.integration_branch` → `develop`.
  - `LAB_TEST_RUNNER` = `lab_test.runner` (default `auto`).
  - `LAB_TEST_TIMEBOX` = `lab_test.timebox_minutes` (default `30`).
  - `LAB_TEST_GENERATE_ON` = `lab_test.stories.generate_on` (default `pr-review`).
- `$REPO_ROOT/conclave/product/architecture.md`
- `$REPO_ROOT/conclave/product/definition-of-done.md`
- Story file (must show `status: verified`)
- Acceptance file (with the QA's latest `## Verification — <date>` block — needed so the TL knows what behavior QA actually verified)
- The diff (`git diff $INTEGRATION_BRANCH...$BRANCH` — pass the full output to the TL agent)
- PR metadata via `gh pr view --json number,title,url,reviewDecision,statusCheckRollup,commits`. Capture `PR_NUMBER`, `PR_URL`, `CI_STATUS`.

## Step 5 — Delegate to the Tech Lead subagent

Issue a single `Agent` tool call with:

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/tech-lead.md`.
- Task: review the PR per the charter's "How you operate inside `/conclave-pr-review`" section. **`type: spike` (v2.0.0+)**: review the deliverable instead of code — the findings answer the question with the evidence they claim, each produced ADR passes the `/conclave-adr` evidence gates, a produced SPEC follows `tech-spec.template.md`, and the diff holds only markdown under `conclave/`. Also embed the findings file, produced ADRs and SPEC.
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

### 6.5 Generate the story lab test (if applicable)

Check: `LAB_TEST_ENABLED == true` AND `LAB_TEST_GENERATE_ON == pr-review` AND `verdict == approved` AND the story is not `type: spike` (a spike has no runtime behaviour to lab-test).

If the check passes:

a. Check if a lab spec already exists at `$SPRINT_PATH/stories/US-NNN-lab.md` (or `$REPO_ROOT/conclave/sprints/$SPRINT_ID/stories/US-NNN-lab.md`). If it exists and its `status` is not `blocked`, skip generation (do not overwrite a usable spec).

b. **Require `conclave/lab-config.md`**. Attempt to read `$REPO_ROOT/conclave/lab-config.md`:
   - If **not found**: skip lab spec generation and print:
     ```
     ⚠  Lab spec not generated — conclave/lab-config.md is missing.
        The Tech Lead needs the Variable registry to write concrete Verify commands.
        Setup:
          cp <plugin_root>/skills/conclave/templates/lab-config.template.md conclave/lab-config.md
          # Fill in the Variable registry section and environment values.
          echo "conclave/lab-config.md" >> .gitignore
        Then re-run /conclave-pr-review US-NNN to generate the lab spec.
     ```
   - If found: parse frontmatter; store Variable registry (names + purpose only, never values) as `LAB_VAR_REGISTRY`. Check `.gitignore`; warn if missing.

c. Dispatch the Tech Lead subagent via `Agent`:
   - **Model**: `MODEL_FOR_TL` (omit if null).
   - Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/tech-lead.md`.
   - Task: *"Generate a lab test specification for the story below. Follow the 'How you operate inside lab test generation' section of your charter — Story context mode."*
   - Embed:
     - The full story file content
     - The acceptance file content (with QA's verification block)
     - The full diff
     - Lab test config: `integration_branch`, `runner`, `timebox_minutes`
     - **`LAB_VAR_REGISTRY`** — the Variable registry table from `conclave/lab-config.md` (variable names + purpose + required-when). The TL uses these names to write concrete `Verify:` commands. Never embed actual values.
     - **`LAB_CONFIG.environments.integration.base_url`** (or `local.base_url` if integration is empty) — the base URL for the Verify command.
   - Expected output: the fully rendered content of a `lab-test.template.md` — a complete `US-NNN-lab.md` with no unfilled `{{placeholder}}` strings. If the TL cannot write a concrete `Verify:` command (insufficient context from the diff), it returns a partial spec with `status: blocked` and a `## Needs more info` section.

c. Write the lab spec to `$SPRINT_PATH/stories/US-NNN-lab.md`.

d. Update `lab_test_path` in the story file frontmatter to point to the lab spec path. Commit: `chore(US-NNN): TL generates lab test spec`.

e. Push: `git push origin $BRANCH`.

f. Report the lab spec path in Step 7's output.

If the check does not pass (lab_test disabled, generate_on is not pr-review, or verdict is request_changes): skip silently.

## Step 7 — Report

Print:

- Story ID, title, and final `status` (`done` or back to `review`).
- TL verdict (`approved` or `request_changes: <count> blocker(s), <count> non-blocking`).
- For `approved`: link to the PR with a note that it is approved and ready to merge. Remind the user that merging is a separate human action (release windows, batching).
- For `approved` + `LAB_TEST_ENABLED`: lab spec path (if generated), or reason skipped (spec already existed / not applicable). Next step: once merged to the integration branch, QA runs `/conclave-qa US-NNN --lab` to execute the lab spec.
- For `request_changes`: numbered list of blockers with location and description. Next step: the dev pushes fixes, then re-run `/conclave-qa US-NNN` (criteria may have shifted) followed by `/conclave-pr-review US-NNN`.

## Guardrails

- **Never approve a story whose status is not `verified`.** QA gate comes first.
- **Never run on a workspace where `peer_pr_review.required: false`.** Refuse at Step 1.
- **Do not merge the PR.** Approval is sufficient.
- **Do not modify code on the dev branch.** TL findings go in the review body; the dev addresses them.
- **A single blocker blocks the whole approval.** Do not approve "with notes" when there is any `blocker`-severity finding.
- **Re-runs are append-only on the story file.** A second `/conclave-pr-review` after dev fixes adds a new `## TL findings` section if there are still findings; on approve, removes that section and moves to `done`.
- **Lab spec generation is silently skipped on `request_changes`.** Only generate when the verdict is `approved`.
- **Never overwrite an existing usable lab spec.** If `US-NNN-lab.md` already exists and its status is not `blocked`, skip generation.
