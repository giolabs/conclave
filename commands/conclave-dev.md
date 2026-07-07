---
description: Pick up one or more stories from the active sprint and implement them. Each story gets its own feature branch, Developer subagent, and PR. Multiple stories run in concurrent batches of ≤ 3. Profile-aware peer-review handling. Supports autonomous (no-interaction) mode via `--no-interaction` CLI flag or `commands.dev.interactive: false` in config.md.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git push:*), Bash(git stash:*), Bash(git log:*), Bash(git config:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(gh pr create:*), Bash(gh pr view:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-dev [--no-interaction] US-NNN [US-NNN ...]

Pick up one or more user stories from the active sprint and drive each through implementation. When this finishes, every story is in `status: review` with its own feature branch and PR ready for QA verification.

- **Single story** (`/conclave-dev US-001`): identical to the previous behaviour — no change in output or flow.
- **Multiple stories** (`/conclave-dev US-001 US-002 US-003`): each story gets its own branch and PR; stories run in concurrent batches of ≤ 3.
- **Autonomous mode** (`/conclave-dev --no-interaction US-001` OR `commands.dev.interactive: false` in `conclave/config.md`): the command never calls `AskUserQuestion`. Every prompt site applies a documented sensible default (assignee takeover, branch recreate/resume) or aborts with `AUTONOMOUS_ABORT: <reason>` when no safe default exists. A `## Autonomous run — <ISO>` section is appended to the story file with outcome, decisions, files touched, and blockers if any. Synonym: `--headless`.

At least one `US-NNN` argument is required; all must match story files under the active sprint.

Follow these steps in order.

---

## Step 0 — Multi-story dispatch (skip entirely if only one story ID is provided)

1. **Parse the CLI flags first.** Scan the arg list for `--no-interaction` or `--headless`. Set `CLI_NO_INTERACTION = true` if either appears (idempotent — multiple occurrences are a no-op). Remove those tokens from the arg list before parsing story IDs.
2. Parse all `US-NNN` arguments from the (post-flag-removal) arg list. If exactly one is present, skip this step entirely and continue with Step 1 as today (the `CLI_NO_INTERACTION` value is carried forward and used by Step 1.5 below).
3. If duplicate IDs are present, deduplicate silently and print one warning line: *"Duplicate story IDs removed: `US-NNN`, ... — each will only be worked once."*
4. **Validate all stories upfront** — direct file reads by the orchestrator, no Agent calls. For each story run the equivalent of Steps 1–3 (workspace check, active-sprint lookup, story-file resolution, status check, branch check). Collect per-story results. If ANY story fails validation, print a per-story table and stop — no Agent call is dispatched:
   ```
   US-001 — PASS (ready)
   US-002 — FAIL: story not found in active sprint
   US-003 — FAIL: status is in-progress (already claimed on feat/US-003-foo)
   Refusing all stories. Fix the above and re-run.
   ```
5. Partition the validated story IDs into **batches of ≤ 3** (preserve order).
6. For each batch:
   - Issue one `Agent` tool call per story **in the same message** (concurrent). Each Agent call encapsulates all single-story steps (Steps 1–9 of this command) for that story ID. **Propagate `CLI_NO_INTERACTION`** into each per-story invocation so they resolve `INTERACTIVE` identically to the parent.
   - Wait for all calls in the batch to return.
   - For each result record `{ story_id, outcome: ok|failed|aborted, branch, pr_url, error }`. On failure or `AUTONOMOUS_ABORT`: the per-story invocation has already reset that story's frontmatter `status: ready` (best effort). Record the error/reason.
7. After all batches complete, print the final summary table:
   ```
   | Story  | Branch               | PR                           | Outcome              |
   |--------|----------------------|------------------------------|----------------------|
   | US-001 | feat/US-001-login    | https://github.com/…/pull/42 | ✓ done               |
   | US-002 | feat/US-002-profile  | https://github.com/…/pull/43 | ✓ done               |
   | US-003 | feat/US-003-settings | —                            | ✗ failed: <error>    |
   ```
8. Stop. The individual story steps below were already executed inside each Agent call.

---

## Step 1 — Resolve the workspace

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, surface that and stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.
3. Verify the working tree is clean (`git status --porcelain` is empty). If not, refuse with: *"Working tree is dirty. Stash or commit your local changes, then re-run."* (This guard applies in both interactive and autonomous mode — a dirty tree is structural, not an interaction.)

## Step 1.5 — Resolve interaction mode

Read `$REPO_ROOT/conclave/config.md` frontmatter and extract `commands.dev.interactive` if present. Apply the coercion table from `skills/conclave/templates/config.template.md` (§"Command configuration"):

- `true` (boolean) → `CONFIG_INTERACTIVE = true`, no warning.
- `false` (boolean) → `CONFIG_INTERACTIVE = false`, no warning.
- `"true"` / `"false"` (strings, case-insensitive) → boolean equivalent + `WARNING: commands.dev.interactive should be a boolean; treating "<value>" as <resolved>.`
- Non-zero integer → `true` + warning. `0` → `false` + warning.
- Any other value → `true` (fallback) + warning.
- Field absent (or `commands:` block absent) → `CONFIG_INTERACTIVE = true`, silent.

Then:

```
INTERACTIVE = true
if CONFIG_INTERACTIVE == false:  INTERACTIVE = false
if CLI_NO_INTERACTION == true:   INTERACTIVE = false     # CLI always wins
```

If `INTERACTIVE == false`, print one line: `Mode: autonomous`. If `INTERACTIVE == true`, print nothing (silent default). Also compute `RUN_START_ISO = date -u +%Y-%m-%dT%H:%M:%SZ` — used later for the run-report timestamp.

## Step 2 — Resolve the story

1. Parse the `US-NNN` argument. If missing or malformed:
   - **Interactive**: ask the user via `AskUserQuestion` to pick from the list of `ready` and `in-progress` stories in the active sprint.
   - **Autonomous**: refuse with `AUTONOMOUS_ABORT: US-NNN argument required; command cannot pick a story without input.` Do not proceed.
2. List `$REPO_ROOT/conclave/sprints/` and read each `meta.md`'s frontmatter to find the sprint with `status: active`.
   - No active sprint → refuse with: *"No active sprint. Run `/conclave-planning` to lock the latest draft sprint first."*
   - Multiple active sprints → refuse and ask the user to pick (this should not happen in normal flow).
3. Locate `$REPO_ROOT/conclave/sprints/$SPRINT_ID/stories/US-NNN-*.md`. If not found, refuse.
4. Read the story frontmatter:
   - `status: ready` → continue.
   - `status: in-progress` → this is a resume. Continue but warn the user.
   - `status: review` or `status: done` → refuse (already past the dev gate). Suggest `/conclave-qa US-NNN` if it's `review`.
   - `status: retired` → refuse: *"Story is retired and cannot be developed. Retired stories are terminal — un-retire by hand-editing the frontmatter if this was a mistake, then re-run."*
   - `status: backlog` → refuse (story has not been pulled into a sprint — needs planning).
5. Read the `assignee`. Compute `RUNNER_NAME = git config user.name` and `RUNNER_EMAIL = git config user.email`. If the story's `assignee` does not match `RUNNER_NAME` (best effort):
   - **Interactive**: surface the mismatch and use `AskUserQuestion` to ask whether to take over (`Yes, reassign to me` / `No, abort`).
   - **Autonomous default**: **take over.** Set the story's `assignee` to `RUNNER_NAME`. Record `assignee_takeover: <old> → <new>` for the run report's `autonomous_decisions` section. Rationale: whoever is executing the batch is the effective operator; ownership follows execution.

## Step 3 — Load context (in parallel)

Read:

- `$REPO_ROOT/conclave/config.md` — `team_profile`, `ceremonies.peer_pr_review.required`, and `models.*`. Resolve models for all three execution charters:
  - `MODEL_FOR_DEVELOPER` = resolve `models.overrides.developer` → `models.default` → null (session)
  - `MODEL_FOR_DESIGNER`  = resolve `models.overrides.designer`  → `models.default` → null
  - `MODEL_FOR_DEVOPS`    = resolve `models.overrides.devops`    → `models.default` → null

  Resolution rule: if the configured value is not one of `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, print `WARNING: Unknown model '<value>' for role <role>. Falling back to <next_fallback>.` and continue. If the `models:` block is absent, all three resolve to null — no warning, no change from v0.6.0 behavior.

  Print one line: `Models: developer=<id or 'session'>, designer=<id or 'session'>, devops=<id or 'session'>`. Omit roles that resolve to null (session default).
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
4. Run `git checkout -b $BRANCH` from a freshly updated integration branch. If `$BRANCH` already exists locally:
   - **Interactive**: ask the user via `AskUserQuestion` whether to (a) switch and resume, (b) delete and recreate, or (c) abort.
   - **Autonomous**: inspect the branch's commit history to pick a default per the §5.2 catalog in `docs/specs/conclave-dev-autonomous-mode/spec.md`:
     - Check `git log $INTEGRATION_BRANCH..$BRANCH --oneline` for commit subjects.
       - **No commits** (empty tree matches integration) → **delete and recreate**. Record `branch_recreated: from origin/$INTEGRATION_BRANCH` in `autonomous_decisions`.
       - **Commits present, all authored by `RUNNER_EMAIL` and all referencing `US-NNN`** → **switch and resume**. Record `branch_resumed: from <last_sha>`.
       - **Any commit authored by a different `git config user.email`** → **refuse**. Return `AUTONOMOUS_ABORT: story branch has commits from another dev (<their email>); manual coordination required`. Do not modify the branch, do not push, do not open a PR.
     - Use `git log $INTEGRATION_BRANCH..$BRANCH --format=%ae` to enumerate author emails cheaply.

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

- **Model**: the resolved model for this story's charter (`MODEL_FOR_DEVELOPER`, `MODEL_FOR_DESIGNER`, or `MODEL_FOR_DEVOPS` per the routing table). Omit the parameter entirely if the resolved value is null.
- Prompt prefix: full content of the charter resolved above.
- **Task preamble** — when `INTERACTIVE == false`, prepend this exact line as the first line of the task:
  > `Autonomous mode. Do not call AskUserQuestion. Follow the "How you operate in autonomous mode" section of your charter — apply documented defaults or return exactly one line: AUTONOMOUS_ABORT: <one-line reason>. Include an autonomous_decisions list in your final payload.`
  When `INTERACTIVE == true`, do not prepend anything — the subagent runs in its default interactive mode.
- Task body: implement the story end-to-end per the charter.
- Inputs to embed in the prompt:
  - Story file content
  - Acceptance file content with full Gherkin scenarios
  - `architecture.md` content
  - `definition-of-done.md` content
  - Resolved `team_profile` and `peer_pr_review.required` flag
  - Current branch name and integration branch name
  - Full path to `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/pr-body.template.md`
- Expected output:
  - **Success path**: a structured payload containing `branch`, `commits` (list of commit subjects authored), `tests_added` (paths), `pr_body` (the fully rendered PR body string), and optionally `adr_proposal` (the markdown of any proposed ADR change). In autonomous mode, also `autonomous_decisions` (list of `{ decision, chosen, reason }` — may be empty). The subagent commits the code itself; the orchestrator does not need to commit further.
  - **Autonomous abort path**: a single line `AUTONOMOUS_ABORT: <reason>` — the orchestrator recognises this and moves to run-report emission (Step 8.5) with `outcome: aborted`.

Wait for the subagent. Handle its return:
- **Agent tool error / crash / checklist failure**: surface verbatim, reset story to `status: ready`. In autonomous mode, jump to Step 8.5 with `outcome: blocked` and blocker = `Agent tool error: <upstream>`. In interactive mode, stop as today.
- **First line begins with `AUTONOMOUS_ABORT:`** (autonomous mode only): capture the full first line as `ABORT_REASON`. Ignore any additional lines. Reset story to `status: ready`. Jump to Step 8.5 with `outcome: aborted`, blocker = the verbatim `AUTONOMOUS_ABORT:` line.
- **Structured payload returned**: continue with Step 7.

## Step 7 — Push and open the PR

1. `git push -u origin $BRANCH`. In autonomous mode, on push failure: reset story to `status: ready`, jump to Step 8.5 with `outcome: blocked`, blocker = `Push failed: <git error>`.
2. If `gh` is available, run `gh pr create --base <integration_branch> --head $BRANCH --title "$STORY_ID: $STORY_TITLE" --body "$PR_BODY"`. The body comes from the subagent's `pr_body` output. On failure in autonomous mode: reset story, jump to Step 8.5 with `outcome: blocked`, blocker = `PR create failed: <gh error>`.
3. If `peer_pr_review.required: true`: pick one reviewer from the roster who is not the assignee and tag them via `gh pr edit --add-reviewer @<handle>` (best effort; failure is non-fatal in both modes).
4. If `gh` is not available, do **not** open a PR. Instead, print the prepared `gh pr create` command for the user to run. In autonomous mode, treat this as `outcome: blocked` because a `done` outcome requires a real PR URL — proceed to Step 8.5 with blocker = `gh CLI unavailable; PR must be opened manually before this story can be marked done.`

## Step 8 — Update the story file

Set frontmatter `status: review`. Commit with `chore(US-NNN): ready for QA verification`. Push.

## Step 8.5 — Emit the autonomous run report (autonomous mode only)

Skip entirely when `INTERACTIVE == true`.

When `INTERACTIVE == false`, render `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/autonomous-run.template.md` and **append** it to the story file's body (never overwrite prior sections). Fill:

- `{{iso_timestamp}}` = `RUN_START_ISO`.
- `{{outcome}}` = `done` (Step 8 completed with a real PR URL) | `blocked` (any Step 7 / Step 6 failure that produced structured evidence but not a PR) | `aborted` (Step 6 returned `AUTONOMOUS_ABORT` or a hard-abort condition earlier).
- `{{branch}}` = `$BRANCH`.
- `{{pr_url_or_dash}}` = the real PR URL when `outcome == done`, else the literal `—`.
- `{{duration_human}}` = human-formatted duration between `RUN_START_ISO` and now (e.g. `4m 22s`).
- `{{runner_name}}` / `{{runner_email}}` = from `RUNNER_NAME` / `RUNNER_EMAIL` computed in Step 2.
- `{{config_source}}` = the resolved source of `INTERACTIVE == false`:
  - `config.md commands.dev.interactive = false` when `CLI_NO_INTERACTION` was false but config was.
  - `--no-interaction CLI flag` when the flag drove it.
  - `forced by /conclave-sprint Phase 2` when the parent invocation came from `/conclave-sprint` (the sprint orchestrator sets a specific token — see `commands/conclave-sprint.md` Step 6).
- `{{autonomous_decisions_bullets_or_none}}` = one bullet per entry from the subagent's `autonomous_decisions` list, plus any decisions the orchestrator itself recorded (assignee takeover, branch resume/recreate). Format: `- <decision>: <chosen> — <reason>`. When the list is empty: the single line `- (none)`.
- `{{files_touched_bullets_or_none}}` = one bullet per file from the subagent's `tests_added` + any files it committed (best effort — parse from `git log $INTEGRATION_BRANCH..$BRANCH --name-status`). Fallback for early aborts: `- (none — aborted before code writes)`.
- `{{scenarios_covered}}` / `{{scenarios_total}}` / `{{test_command}}` / `{{test_pass_count}}` / `{{test_fail_count}}` / `{{lint_summary}}` = from the subagent's structured payload. Fallback for early aborts: `0/0`, `n/a`, `0`, `0`, `n/a`.
- `{{blockers_section_or_omit}}`:
  - On `done`: omit the entire "### Blockers" subsection.
  - On `blocked`: render the subsection with a single bullet describing what failed (test summary, push error, PR-create error, or gh-unavailable message).
  - On `aborted`: render the subsection with one bullet — the verbatim first line the subagent returned (`AUTONOMOUS_ABORT: <reason>`) OR the orchestrator's abort line (from Step 2 assignee-argument case or Step 4 another-dev-branch case).

Commit the story-file edit with `chore(US-NNN): autonomous run report (<outcome>)`. Push.

Regardless of `outcome`, ensure the story frontmatter `status` reflects the outcome:
- `done` → `review` (already set by Step 8).
- `blocked` or `aborted` → `ready` (revert Step 8's setting if it happened, or set now if Step 8 was skipped due to a Step 6/7 abort).

## Step 9 — Report

Print a compact terminal summary. Shape depends on `INTERACTIVE`.

### Interactive mode (`INTERACTIVE == true`)

Print (same content as pre-v0.9.0):

- Story ID and title
- Discipline and which charter handled it (`developer.md` / `designer.md` / `devops.md`)
- Branch name and PR URL (or the prepared `gh pr create` command if no `gh`)
- Tests added (paths)
- Whether a peer reviewer was tagged (and who)
- Whether an ADR proposal was attached to the PR
- Next step: `/conclave-qa US-NNN` for QA to verify

### Autonomous mode (`INTERACTIVE == false`)

Print a bullet-list summary matching the run-report section that was appended in Step 8.5. Format:

```
Mode: autonomous
US-NNN: <✓ done | ✗ blocked | ✗ aborted>
+ Branch: feat/US-NNN-<slug>
+ PR: <url or "—">
+ Decisions: <count> (<label1>, <label2>, ...)   — or "0 (none)"
+ Tests: <passed>/<total> Gherkin, <lint_summary>
+ Duration: <human>
```

On `blocked` / `aborted`, also print:

```
+ Reason: <first blocker line, verbatim>
+ Story status reset to: ready
+ Full report: <path to story file> § "Autonomous run — <ISO>"
```

Next-step hint depends on outcome:
- `done` → `/conclave-qa US-NNN` for QA to verify.
- `blocked` → resolve the blocker (fix the test, retry the push, install `gh`) and re-run `/conclave-dev [--no-interaction] US-NNN`.
- `aborted` → run interactively (`/conclave-dev US-NNN` without `--no-interaction`) to answer whatever the subagent could not decide autonomously.

## Guardrails

- **Do not touch any file under `conclave/` except the single story file's frontmatter and (in autonomous mode) its body.** The `## Autonomous run —` section appended in Step 8.5 is the sole additional write allowed. Architecture changes still go in a separate ADR PR raised by the Tech Lead.
- **Do not merge the PR.** Even with `peer_pr_review.required: false`, QA approval is structurally required before the story is `done`.
- **Refuse a story only if that exact `US-NNN` is already `in-progress` on an existing branch** — not because other stories are concurrently in-progress on other branches. Parallel stories on separate branches are permitted and expected.
- **Idempotent on resume.** If the branch exists, the story is `in-progress`, and the resume path was chosen (interactively or by autonomous default): the Developer subagent must read what already exists in the branch before generating new code, not overwrite.
- **If any of `git push`, `gh pr create`, or `gh pr edit` fails, do NOT roll back local commits.** Surface the error and let the user retry the network step manually. The local branch and story-frontmatter changes are the durable output. In autonomous mode, record the failure as a `blocked` outcome in the run report.
- **Autonomous mode never bypasses the QA gate.** A `done` outcome still puts the story in `status: review`; `/conclave-qa` remains required to move to `verified` or `done`.
- **Autonomous mode never modifies prior run-report sections.** Each run appends a new `## Autonomous run — <ISO>` section; prior sections stay verbatim.
- **The `Mode: autonomous` line is the only signal that the command is running headless.** Interactive mode prints nothing extra — silence is the interactive-mode indicator.
