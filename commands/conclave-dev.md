---
description: Pick up a story from the active sprint and implement it. Creates a feature branch, spawns the Developer subagent (which writes code, tests, and runs them), updates the story to status review, and opens a PR. Profile-aware peer-review handling.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git push:*), Bash(git stash:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(gh pr create:*), Bash(gh pr view:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-dev US-NNN

Pick up a single user story from the active sprint and drive it through implementation. When this finishes, the story is in `status: review` with a feature branch and a PR ready for QA verification via `/conclave-qa US-NNN`.

The argument `US-NNN` is required and must match a story file under the active sprint.

Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, surface that and stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.
3. Verify the working tree is clean (`git status --porcelain` is empty). If not, refuse with: *"Working tree is dirty. Stash or commit your local changes, then re-run."*

## Step 2 — Resolve the story

1. Parse the `US-NNN` argument. If missing or malformed, ask the user via `AskUserQuestion` to pick from the list of `ready` and `in-progress` stories in the active sprint.
2. List `$REPO_ROOT/conclave/sprints/` and read each `meta.md`'s frontmatter to find the sprint with `status: active`.
   - No active sprint → refuse with: *"No active sprint. Run `/conclave-planning` to lock the latest draft sprint first."*
   - Multiple active sprints → refuse and ask the user to pick (this should not happen in normal flow).
3. Locate `$REPO_ROOT/conclave/sprints/$SPRINT_ID/stories/US-NNN-*.md`. If not found, refuse.
4. Read the story frontmatter:
   - `status: ready` → continue.
   - `status: in-progress` → this is a resume. Continue but warn the user.
   - `status: review` or `status: done` → refuse (already past the dev gate). Suggest `/conclave-qa US-NNN` if it's `review`.
   - `status: backlog` → refuse (story has not been pulled into a sprint — needs planning).
5. Read the `assignee`. If it does not match the current user (best effort from `git config user.name` or `$USER`), surface that and use `AskUserQuestion` to ask whether to take over the story (`Yes, reassign to me` / `No, abort`).

## Step 3 — Load context (in parallel)

Read:

- `$REPO_ROOT/conclave/config.md` — especially `team_profile` and `ceremonies.peer_pr_review.required`
- `$REPO_ROOT/conclave/product/architecture.md`
- `$REPO_ROOT/conclave/product/definition-of-done.md`
- `$REPO_ROOT/conclave/team/roster.md` — needed to pick a peer reviewer if peer review is on. If it has no `Discipline` column (pre-0.2.0 schema), treat every member as `multi`-discipline and print once: *"Roster is using the pre-0.2.0 schema (no Discipline column) — treating all members as multi-discipline. Run `/conclave-init` again or add a Discipline column by hand to opt into discipline-based assignment."*
- The story file (`stories/US-NNN-*.md`)
- The acceptance file (`acceptance/AC-US-NNN.md`)
- The sprint's `spec.md` (for the sprint goal as context)

## Step 4 — Create the feature branch

1. Compute `SLUG` from the story title (lowercase, dash-separated ASCII, ~40 chars).
2. Branch name: `BRANCH=feat/US-NNN-$SLUG`.
3. Determine the integration branch (`main` or `master`, default `main` if both absent — pick whatever the repo uses).
4. Run `git checkout -b $BRANCH` from a freshly updated integration branch. If `$BRANCH` already exists locally, ask the user via `AskUserQuestion` whether to (a) switch to the existing branch and resume, (b) delete and recreate, or (c) abort.

## Step 5 — Mark the story `in-progress`

Update the story file's frontmatter `status: in-progress` and `assignee: <current user>` (if the user agreed in Step 2). Commit just this change with `chore(US-NNN): pick up story`. This commit makes the assignment visible to the team immediately.

## Step 6 — Delegate to the execution subagent

Read the story's `discipline` field and select the charter to load:

| `discipline` | Charter |
|---|---|
| `design` | `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/designer.md` |
| `devops` | `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/devops.md` |
| `frontend`, `backend`, `mobile`, `multi`, or empty/unset (pre-0.2.0 stories) | `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/developer.md` (no dedicated mobile charter yet — `mobile` stories route here same as `frontend`/`backend`) |

Issue a single `Agent` tool call with:

- Prompt prefix: full content of the charter resolved above.
- Task: implement the story end-to-end per the charter.
- Inputs to embed in the prompt:
  - Story file content
  - Acceptance file content with full Gherkin scenarios
  - `architecture.md` content
  - `definition-of-done.md` content
  - Resolved `team_profile` and `peer_pr_review.required` flag
  - Current branch name and integration branch name
  - Full path to `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/pr-body.template.md`
- Expected output: a JSON-like block containing `branch`, `commits` (list of commit subjects authored), `tests_added` (paths), `pr_body` (the fully rendered PR body string), and optionally `adr_proposal` (the markdown of any proposed ADR change). The subagent commits the code itself; the orchestrator does not need to commit further.

Wait for the subagent. If it errors or self-reports a checklist failure, surface the failure verbatim, set the story back to `status: ready`, and stop.

## Step 7 — Push and open the PR

1. `git push -u origin $BRANCH`.
2. If `gh` is available, run `gh pr create --base <integration_branch> --head $BRANCH --title "$STORY_ID: $STORY_TITLE" --body "$PR_BODY"`. The body comes from the subagent's `pr_body` output.
3. If `peer_pr_review.required: true`: pick one reviewer from the roster who is not the assignee and tag them via `gh pr edit --add-reviewer @<handle>` (best effort; failure is non-fatal).
4. If `gh` is not available, do **not** open a PR. Instead, print the prepared `gh pr create` command for the user to run.

## Step 8 — Update the story file

Set frontmatter `status: review`. Commit with `chore(US-NNN): ready for QA verification`. Push.

## Step 9 — Report

Print:

- Story ID and title
- Discipline and which charter handled it (`developer.md` / `designer.md` / `devops.md`)
- Branch name and PR URL (or the prepared `gh pr create` command if no `gh`)
- Tests added (paths)
- Whether a peer reviewer was tagged (and who)
- Whether an ADR proposal was attached to the PR
- Next step: `/conclave-qa US-NNN` for QA to verify

## Guardrails

- **Do not touch any file under `conclave/` except the single story file's frontmatter.** Architecture changes go in a separate ADR PR raised by the Tech Lead.
- **Do not merge the PR.** Even with `peer_pr_review.required: false`, QA approval is structurally required before the story is `done`.
- **Do not work multiple stories at once.** If the user invokes `/conclave-dev` on a second story while another is still `in-progress` on the same branch, refuse.
- **Idempotent on resume.** If the branch exists, the story is `in-progress`, and the user opted to resume in Step 4: the Developer subagent must read what already exists in the branch before generating new code, not overwrite.
- **If any of `git push`, `gh pr create`, or `gh pr edit` fails, do NOT roll back local commits.** Surface the error and let the user retry the network step manually. The local branch and story-frontmatter changes are the durable output.
