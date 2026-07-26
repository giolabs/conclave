---
description: Pick up one or more stories and/or bugs (US-NNN or BUG-NNN) and implement them. Each gets its own feature branch, Developer subagent, and PR. Multiple IDs run in concurrent batches of ≤ 3, story/bug IDs may be mixed. Profile-aware peer-review handling. Supports autonomous (no-interaction) mode via `--no-interaction` CLI flag or `commands.dev.interactive: false` in config.md, and the Autonomous Three-Wave Delivery Loop via `--loop` / `commands.dev.loop: true` — W1 Dev+CI → W2 QA → W3 forced Tech Lead over the active sprint, any failure returns to W1, recurring local-time schedule, budgets, run report with agent productivity, Slack templates. No PR is ever merged (ADR-006).
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(git checkout:*), Bash(git switch:*), Bash(git branch:*), Bash(git push:*), Bash(git stash:*), Bash(git fetch:*), Bash(git add:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*), Bash(git config:*), Bash(ls:*), Bash(mkdir:*), Bash(cat:*), Bash(date:*), Bash(curl:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr edit:*), Bash(gh pr comment:*), Bash(gh pr checks:*), Bash(gh pr review:*), Bash(gh pr diff:*), Bash(gh pr list:*), Bash(gh run list:*), Bash(gh run view:*), Bash(gh auth status:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-dev [--no-interaction] [--loop] [--ignore-schedule] [US-NNN|BUG-NNN ...]

Pick up user stories and/or bugs and drive them through implementation. Without `--loop`, every ID ends in `status: review` with its own feature branch and PR ready for QA verification. With `--loop`, the command runs the whole sprint slice through three ordered waves and leaves **approved PRs waiting for a human to merge**.

- **Single ID** (`/conclave-dev US-001` or `/conclave-dev BUG-004`): identical flow either way — a `BUG-NNN`'s frontmatter has the same `discipline`/`status`/`assignee` shape a story's does, so nothing about this command needs to know which kind of ID it's holding beyond where to look it up (§Step 2).
- **Multiple, and mixed** (`/conclave-dev US-001 US-002 BUG-004`): each ID gets its own branch and PR; IDs run in concurrent batches of ≤ 3 regardless of kind.
- **Autonomous mode** (`/conclave-dev --no-interaction US-001` OR `commands.dev.interactive: false` in `conclave/config.md`): the command never calls `AskUserQuestion`. Every prompt site applies a documented sensible default (assignee takeover, branch recreate/resume) or aborts with `AUTONOMOUS_ABORT: <reason>` when no safe default exists. A `## Autonomous run — <ISO>` section is appended to the file with outcome, decisions, files touched, and blockers if any. Synonym: `--headless`. **This mode stops at `status: review` and never merges.**
- **Autonomous Three-Wave Delivery Loop** (v0.15.0+, `/conclave-dev --loop` OR `commands.dev.loop: true`): the single autonomous delivery loop in Conclave. It takes the **active sprint** (or the IDs you pass), orders the work by dependencies and file conflicts, then runs **W1 Dev + green CI → W2 QA → W3 forced Tech Lead review**. A failure in any wave sends the affected stories back to **W1**. Gated by a recurring local-time schedule and budgets, and it writes a run report with token and agent-productivity statistics. `--loop` implies `--no-interaction`. See §"Autonomous Three-Wave Delivery Loop" below and ADR-006.
- **No PR is ever merged.** No mode of this command runs `gh pr merge`. The loop's terminal state is an approved PR; the human merges it.
- **Bugs (`BUG-NNN`) reproduce before they fix.** The Developer subagent confirms the bug is still present using its Gherkin repro steps before writing any fix code, and the PR body includes `Fixes #<github_issue_number>` so the mirrored GitHub issue closes when a human merges. See Step 6.

Outside loop mode, at least one `US-NNN`/`BUG-NNN` argument is required; every `US-NNN` must match a story file under the active sprint, every `BUG-NNN` must match a bug file under `conclave/product/bugs/`. In loop mode the argument list is optional — with no IDs the loop collects the active sprint.

## Modes

| Mode | How | Behavior |
|---|---|---|
| **Interactive** (default) | No flag; `commands.dev.interactive` absent or `true` | Prompts where needed. Ends at `status: review`. |
| **Autonomous** (v0.9.0+) | `--no-interaction` / `--headless`, or `commands.dev.interactive: false` | Zero prompts, sensible defaults, per-item run-report section. Ends at `status: review`. |
| **Three-Wave Delivery Loop** (v0.15.0+) | `--loop`, or `commands.dev.loop: true` | W1 Dev+CI → W2 QA → W3 forced TL over the active sprint, failures return to W1, run report + Slack. Implies autonomous. Never closes the sprint. |

None of them merge.

Follow these steps in order.

---

## Step 0 — Multi-story dispatch (skip entirely if only one story ID is provided)

1. **Parse the CLI flags first.** Scan the arg list and set, then remove, these tokens before parsing IDs (each is idempotent — repeats are a no-op):
   - `--no-interaction` / `--headless` → `CLI_NO_INTERACTION = true`
   - `--loop` → `CLI_LOOP = true`
   - `--ignore-schedule` → `IGNORE_SCHEDULE = true` (default `false`; only meaningful in loop mode)
2. Parse all `US-NNN` and `BUG-NNN` arguments from the (post-flag-removal) arg list (order-preserving, IDs of either kind may be mixed in one invocation). If exactly one ID is present **and loop mode is off**, skip this step entirely and continue with Step 1 as today (the `CLI_NO_INTERACTION` value is carried forward and used by Step 1.5 below). An ID with any other prefix is invalid — refuse it individually with `Unrecognized ID prefix: <id>. Expected US-NNN or BUG-NNN.` (folded into the per-ID validation table in point 4). **In loop mode an empty ID list is valid** — the scope comes from the active sprint (Step W1 collection); skip to Step 1.5 and let the loop resolve it.
3. If duplicate IDs are present, deduplicate silently and print one warning line: *"Duplicate IDs removed: `US-NNN`/`BUG-NNN`, ... — each will only be worked once."*
4. **Validate all IDs upfront** — direct file reads by the orchestrator, no Agent calls. For each ID run the equivalent of Steps 1–3 (workspace check, resolution per §Step 2's prefix branching, status check, branch check). Collect per-ID results. If ANY ID fails validation, print a per-ID table and stop — no Agent call is dispatched:
   ```
   US-001  — PASS (ready)
   BUG-004 — PASS (ready)
   US-002  — FAIL: story not found in active sprint
   US-003  — FAIL: status is in-progress (already claimed on feat/US-003-foo)
   Refusing all IDs. Fix the above and re-run.
   ```
5. **If loop mode is on** (`CLI_LOOP` or `commands.dev.loop: true` — resolved in Step 1.5): do **not** batch here. Print `Mode: autonomous-dev-three-wave` and hand the validated ID list to §"Autonomous Three-Wave Delivery Loop" (Steps W0–W5), which owns its own scheduling of the work across waves. Skip points 6–8 of this step entirely. Every ID, including a single-ID invocation, goes through that path.
6. Partition the validated IDs into **batches of ≤ 3** (preserve order, story/bug IDs mixed freely).
7. For each batch:
   - Issue one `Agent` tool call per ID **in the same message** (concurrent). Each Agent call encapsulates all single-ID steps (Steps 1–9 of this command) for that ID. **Propagate `CLI_NO_INTERACTION`** into each per-ID invocation so they resolve `INTERACTIVE` identically to the parent.
   - Wait for all calls in the batch to return.
   - For each result record `{ id, outcome: ok|failed|aborted, branch, pr_url, error }`. On failure or `AUTONOMOUS_ABORT`: the per-ID invocation has already reset that story's/bug's frontmatter `status: ready` (best effort). Record the error/reason.
8. After all batches complete, print the final summary table:
   ```
   | ID      | Branch                | PR                           | Outcome              |
   |---------|-----------------------|-------------------------------|----------------------|
   | US-001  | feat/US-001-login     | https://github.com/…/pull/42 | ✓ done               |
   | BUG-004 | feat/BUG-004-checkout | https://github.com/…/pull/43 | ✓ done               |
   | US-003  | feat/US-003-settings  | —                             | ✗ failed: <error>    |
   ```
9. Stop. The individual steps below were already executed inside each Agent call.

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

Also read `commands.dev.loop` through the **same coercion table** (absent → `false`; note the polarity is inverted relative to `interactive` — the safe default is "no loop", so any unrecognised value coerces to `false` with a warning). Then:

```
INTERACTIVE = true
if CONFIG_INTERACTIVE == false:  INTERACTIVE = false
if CLI_NO_INTERACTION == true:   INTERACTIVE = false     # CLI always wins

LOOP = false
if CONFIG_LOOP == true:          LOOP = true
if CLI_LOOP == true:             LOOP = true             # CLI always wins
if LOOP == true:                 INTERACTIVE = false     # a loop that prompts is not a loop
```

There is no flag to force interactive or to disable a configured loop for one invocation — the same asymmetry as `interactive`, for the same reason (a scheduled trigger must never hang or silently degrade on a stray flag). To run one item without the loop, remove `commands.dev.loop` from `config.md`.

Print exactly one mode line:

- `LOOP == true` → `Mode: autonomous-dev-three-wave`
- `LOOP == false` and `INTERACTIVE == false` → `Mode: autonomous`
- `INTERACTIVE == true` → print nothing (silence is the interactive-mode indicator)

Also compute `RUN_START_ISO = date -u +%Y-%m-%dT%H:%M:%SZ` — used later for the run-report timestamp.

When `LOOP == true`, continue with §"Autonomous Three-Wave Delivery Loop" (Steps W0–W5) instead of falling through to Step 2. That section reuses Steps 2–9 as the per-story **dev leg** inside Wave 1.

## Step 2 — Resolve the story or bug

1. Parse the `US-NNN`/`BUG-NNN` argument. If missing or malformed:
   - **Interactive**: ask the user via `AskUserQuestion` to pick from the list of `ready` and `in-progress` stories in the active sprint (bugs are not offered in this picker — a human reporting a bug already knows its ID from `/conclave-bug list`).
   - **Autonomous**: refuse with `AUTONOMOUS_ABORT: US-NNN or BUG-NNN argument required; command cannot pick a story or bug without input.` Do not proceed.
2. **Branch resolution by ID prefix**:
   - **`US-NNN`**: list `$REPO_ROOT/conclave/sprints/` and read each `meta.md`'s frontmatter to find the sprint with `status: active`.
     - No active sprint → refuse with: *"No active sprint. Run `/conclave-planning` to lock the latest draft sprint first."*
     - Multiple active sprints → refuse and ask the user to pick (this should not happen in normal flow).
   - **`BUG-NNN`**: no sprint lookup — bugs are not sprint-scoped (§`/conclave-bug`, they skip Sprint Planning by design).
   - Any other prefix → refuse that ID with `Unrecognized ID prefix: <id>. Expected US-NNN or BUG-NNN.`
3. Locate the file:
   - **`US-NNN`**: `$REPO_ROOT/conclave/sprints/$SPRINT_ID/stories/US-NNN-*.md`. If not found, refuse.
   - **`BUG-NNN`**: `$REPO_ROOT/conclave/product/bugs/BUG-NNN-*.md`. If not found, refuse.
4. Read the frontmatter (same status enum for both — bugs reuse the story state machine verbatim):
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

1. Compute `SLUG` from the title (lowercase, dash-separated ASCII, ~40 chars) — same computation for a story or a bug.
2. Branch name: `BRANCH=feat/$ID-$SLUG` (e.g. `feat/US-NNN-$SLUG` or `feat/BUG-NNN-$SLUG` — the same `feat/`-prefixed convention regardless of ID kind, so every branch-parsing step below stays prefix-agnostic. `config.md`'s `fix/<short-slug>` convention note is guidance for *manual* branches a human creates outside Conclave's own commands, not a constraint on what this command generates).
3. Determine the integration branch (`main` or `master`, default `main` if both absent — pick whatever the repo uses). **In loop mode this is already resolved** to `INTEGRATION_BRANCH` (Step W0: `repo.integration_branch` → `develop` → `main`); use that value instead of re-detecting, so every story in the run forks from and targets the same base branch.
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

Read the `discipline` field (present on both stories and bugs — same frontmatter shape) and select the charter to load:

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
- **Bug preamble** — when the ID is a `BUG-NNN`, additionally prepend (after the autonomous preamble, if both apply): *"This is BUG-NNN, not a story. First reproduce the failure using its Gherkin repro steps before writing any fix — treat a failure to reproduce as grounds to pause and ask (interactive mode) or `AUTONOMOUS_ABORT: could not reproduce BUG-NNN's repro steps` (autonomous mode)."*
- Task body: implement the story or bug fix end-to-end per the charter.
- Inputs to embed in the prompt:
  - Story (or bug) file content
  - Acceptance file content with full Gherkin scenarios (a bug's repro steps live inline in its own file instead — see `bug.template.md`)
  - `architecture.md` content
  - `definition-of-done.md` content
  - Resolved `team_profile` and `peer_pr_review.required` flag
  - Current branch name and integration branch name
  - Full path to `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/pr-body.template.md`
  - **The orchestrator-resolved PR-body link targets and `Fixes #` line, precomputed here (not left to the subagent to guess) because `pr-body.template.md` has no conditional syntax of its own**:
    - For `US-NNN`: link targets are unchanged from today (`../conclave/sprints/$SPRINT_ID/stories/US-NNN-$SLUG.md`, `.../spec.md`, `.../acceptance/AC-US-NNN.md`); no `Fixes #` line.
    - For `BUG-NNN`: the "Implements" line targets `../conclave/product/bugs/BUG-NNN-$SLUG.md` and drops the "from sprint ..." clause (a bug has no sprint); the "Scenario → test mapping" intro targets that same bug file instead of a separate acceptance file (bugs have none); and, when the bug file's `github_issue_number` is populated, a `Fixes #<github_issue_number>` line is included directly under the title heading (omitted entirely — not even blank — when no issue number is on file, e.g. `gh` was unavailable at report time).
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
  - `forced by /conclave-dev three-wave delivery loop (Wave 1)` when the dev leg ran inside loop mode (Step W1).
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

---

# Autonomous Three-Wave Delivery Loop (v0.15.0+ — ADR-006)

Execute Steps W0–W5 when `LOOP == true`. Steps 1 and 1.5 (workspace, mode resolution) — plus Step 0's upfront validation when IDs were passed — still run first.

This is the **only** autonomous delivery loop in Conclave. It runs three ordered waves over the scope and **never merges a pull request**: its terminal state is `status: done` stories with approved PRs waiting for a human.

```
W0  gate + scope + conflict ordering
W1  Dev  → push → PR → CI green         ── every story in `review`, checks green
W2  QA   → /conclave-qa headless        ── every story `verified`      (fail → back to W1)
W3  TL   → /conclave-pr-review          ── every story `done`+approved (fail → back to W1)
W4  finalize report + Slack
W5  terminal summary (+ sprint hint, never closes)
```

A wave starts only once the previous wave has resolved for every story still in scope. **Any wave failure returns the affected stories to Wave 1** — a Tech Lead asking for changes is asking for code to change, and changed code invalidates the QA verdict that preceded it, so QA re-runs after Dev.

**Prerequisite:** the GitHub CLI (`gh`) must be installed and authenticated (`gh auth login`) with an account that has access to this repository (push, PRs, review). Conclave does not install or configure `gh`.

## Step W0 — Gate, config, scope, conflicts

### W0.1 Schedule gate

Read `commands.dev.schedule` (there is no inheritance from `commands.sprint` — since 0.15.0 the sprint command has no delivery schedule). Print the source: `schedule: commands.dev` or `schedule: none`.

- No `schedule` block → no gating; continue.
- Block present but carrying only the pre-0.15.0 `window_start` / `window_end` keys → print once: *"`commands.dev.schedule.window_start`/`window_end` is no longer honored (0.15.0). Rewrite it as `timezone` + `days` + `start_time` + `end_time` + `duration_days`."* Then **stop** (exit 0, no writes). Do not infer a recurring window from a one-shot pair — guessing would silently widen an unattended, token-spending run.
- `enforce: false` → print the resolved window as informational; continue.
- `IGNORE_SCHEDULE == true` → print `Schedule: bypassed (--ignore-schedule)`; set `SCHEDULE_BYPASSED = true`; continue.
- Else (`enforce` true or absent-with-block → treat as true), evaluate all three conditions in `timezone` local time:
  1. **Campaign** — local date ∈ `[active_from, active_from + duration_days)`. `active_from` absent → the campaign starts on the first eligible day; record that resolved date in the report.
  2. **Weekday** — local weekday ∈ `days` (`mon`..`sun`; absent → all seven).
  3. **Window** — local time ∈ `[start_time, end_time)`. When `end_time <= start_time` the window crosses midnight: `19:00–07:00` means 19:00 through 23:59 on a listed day plus 00:00 through 07:00 on the following morning. The **listed day is the day the window opens**, so `days: [fri]` with `19:00–07:00` covers Friday evening into Saturday morning.

  Invalid `timezone` (not an IANA name the system resolves), malformed times, or `duration_days <= 0` → hard abort with a clear error naming the offending key. Never invent a window.

  Outside any of the three → print one line (`Outside delivery window (next opening: <local ts>); nothing to do.`) → **exit 0**, write nothing, stop.

A no-op exit must not touch any story file and must not write a run report — an hourly trigger firing outside the window has to stay cheap and silent.

Compute `WINDOW_END_AT` (the absolute instant this window closes) for the Step W4.5 checkpoint.

### W0.2 Resolve loop config

1. Verify `gh` is available and authenticated (`gh auth status`). Unavailable → refuse before touching any story, emit a **HITL Slack alert** (§Slack), and stop: *"The delivery loop requires the GitHub CLI (`gh`) installed and authenticated with repo access. Install it, run `gh auth login`, then re-run."* Without `gh` there is no PR, no checks, no review — the loop cannot reach its terminal state, so failing fast beats writing code that can never be reviewed.
2. Set:
   - `EFFECTIVE_PEER_PR_REVIEW = true` (ephemeral for this run — **do not** rewrite `config.md`).
   - `INTEGRATION_BRANCH` = `repo.integration_branch` → else `develop` if it exists on origin → else `main`. Print it. This **overrides** Step 4's `main`/`master` detection for the whole run, so every story forks from and targets the same base branch. It is a **PR base only** — nothing in this command merges into it.
   - Budgets from `commands.dev.budgets.<key>` → default (warn + default on invalid / ≤ 0 / non-numeric):
     - `max_attempts_per_story` default `3` — total Wave 1 entries per story, counting every return from W2 or W3
     - `max_ci_wait_minutes` default `ceremonies.qa_verification.ci_wait_timeout_minutes` else `20`
     - `max_total_tokens` default `2000000`
     - `max_wall_clock_hours` default `12`
     - `token_estimates` — config overrides or built-ins: `developer: 180000`, `qa: 90000`, `tech_lead: 70000` (designer/devops dispatches use the developer estimate).
   - Models: `MODEL_FOR_DEVELOPER` / `MODEL_FOR_DESIGNER` / `MODEL_FOR_DEVOPS` per Step 3, plus `MODEL_FOR_QA` = `models.overrides.qa` → `models.default` → null and `MODEL_FOR_TL` = `models.overrides.tech_lead` → `models.default` → null.
   - Slack: `notifications.slack.enabled` (default false); `webhook_env` default `SLACK_WEBHOOK_URL`; `on_success` / `on_partial` / `on_hitl` each default `true` when enabled.
   - `STARTED_AT` = now (ISO-8601); start the wall-clock timer. `TOKENS_TOTAL = 0`; `TOKENS_PRECISION = estimated`; empty ledger; `ATTEMPTS_TOTAL = 0`; empty per-role productivity counters.
3. If `commands.dev.merge_method` is still present in config, print one line: *"`commands.dev.merge_method` is ignored since 0.15.0 — the loop never merges."* It is a no-op, not an error.

### W0.3 Collect the scope

- **IDs on the command line** → that exact list, in the order given, is the scope. `BUG-NNN` is allowed here and only here.
- **No IDs** → read `conclave/sprints/` for the `active` sprint (`meta.md` `status: active`; no active sprint → refuse with *"No active sprint. Pass explicit IDs or run /conclave-planning first."* and stop). Collect every story under its `stories/` whose `status` is **not** `done`, `retired`, or `backlog`. The sprint scan never picks up bugs.
- Empty scope → print `Nothing to deliver (every story is already done).` and stop without writing a report.

### W0.4 Conflict analysis

Before dispatching any Dev work, compute an execution order:

1. Read each story's `dependencies:` frontmatter list.
2. Story A depending on B, both in scope → B is ordered before A, and they are **never** batched together.
3. A dependency on a story **not** in scope that is not yet `done` → note `conflict: unmet_dependency` for A, keep A in scope but order it last; if it later fails Wave 1 for a reason that names the dependency, mark it incomplete rather than retrying.
4. **Dependency cycle** → **abort the whole run** before any write: print the cycle verbatim (`US-003 → US-005 → US-003`), emit a HITL Slack alert, and stop. Never invent an order to break a cycle.
5. **File-overlap heuristic** (best effort): after each story's first Wave 1 attempt, record the paths it touched (`git log $INTEGRATION_BRANCH..$BRANCH --name-only`). If a not-yet-dispatched story is expected to touch a path already claimed by a story in this run — from an explicit path in its acceptance criteria or architecture notes, or from a previous attempt — **serialize** it after the claimant and record `conflict: path_overlap` with both IDs and the path.

Record every ordering decision in the run report's Conflicts section. Conclave serializes what it can see; it does not claim to have proven the stories are independent.

### W0.5 Report location, lock, open the run report

1. Resolve `RUNS_DIR`:
   - An `active` or `draft` sprint exists → `$SPRINT_PATH/runs` (even for a bug-only scope — the sprint in flight is the natural home for the audit trail).
   - No sprint directory at all → `$REPO_ROOT/conclave/runs`.
2. `mkdir -p $RUNS_DIR`.
3. Glob existing `RUN-*-*.md` there. For any report with frontmatter `outcome: in_progress` and `started_at` younger than `max_wall_clock_hours` ago, compare its `scope` against this run's scope:
   - **Scopes intersect** (shared ID, or either scope is the whole sprint) → refuse: *"`<ID>` is already being delivered by an in-progress run (RUN-NNN). Wait for it to finish or mark the stale report aborted."* Stop without touching any story.
   - **No intersection** → proceed. Two operators looping unrelated stories must not block each other.
4. A stale `in_progress` report older than `max_wall_clock_hours` does not block; note it in this run's stop conditions.
5. Allocate the next monotonic `RUN_ID` (`RUN-001`, `RUN-002`, …) across all reports in `RUNS_DIR`.
6. Fill `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/sprint-run-report.template.md` with `mode: autonomous-dev-three-wave`, `scope:` = `sprint` (whole-sprint run) or the comma-separated ID list, `outcome: in_progress`, `wave_reached: 0`, `sprint_closed: false`, empty `finished_at`, the config snapshot, the conflict findings from W0.4, and placeholder tables. Write `$RUNS_DIR/${RUN_ID}-dev-loop.md` **immediately** — it is both the lock and the evidence that a run started.
7. Print one line summarizing scope, execution order, budgets, window (or `none`), models, and PR base branch.

## The wave engine

Maintain one bucket per story: `{ id, kind, status, branch, pr_url, attempts, wave_entries: {w1, w2, w3}, reentries: {qa_to_dev, tl_to_dev}, first_wave1_at, approved_at, conflicts, notes, final_state }`.

Two working sets drive the engine:

- `PENDING_W1` — stories that need Dev work (initially the whole scope, in the W0.4 order).
- `PENDING_W2` / `PENDING_W3` — filled as the previous wave clears.

Run this cycle until every story is finished (`done` or `incomplete`) or a budget/window drain fires:

```
while PENDING_W1 not empty:
    Wave 1 over PENDING_W1        → survivors go to PENDING_W2
    Wave 2 over PENDING_W2        → survivors go to PENDING_W3; failures go back to PENDING_W1
    if PENDING_W1 not empty: continue     # re-heal before the TL sees a moving target
    Wave 3 over PENDING_W3        → survivors are finished; failures go back to PENDING_W1
```

Call the Step W4.5 checkpoint before every dispatch and during every poll. A story reaching `max_attempts_per_story` Wave 1 entries is marked `incomplete` with its last failure and removed from every working set. **No wave ever runs concurrently with another wave.**

## Step W1 — Wave 1: Dev to green CI

For each story in `PENDING_W1`, in the W0.4 execution order. Stories with **no dependency and no recorded path overlap between them** may be dispatched in concurrent batches of ≤ 3; anything ordered or conflicting runs alone.

1. Checkpoint. Then `attempts++`; `ATTEMPTS_TOTAL++`; `wave_entries.w1++`.
2. Re-read the story's `status` and skip the legs already satisfied:
   - `ready` / `in-progress` → full dev leg
   - `review` with an open PR → skip Dev, go straight to the checks poll
   - `verified` / `done` → should not be in `PENDING_W1`; note and drop it
   - `retired` / `backlog` → drop with a note
3. **Dev leg**: run Steps 2–9 of this command for this single ID with `INTERACTIVE = false`, branching from `INTEGRATION_BRANCH`. Set the run-report `Config source` field to `forced by /conclave-dev three-wave delivery loop (Wave 1)`. Ledger += one `developer` (or `designer` / `devops`) row.
   - **On re-entry from W2 or W3**, pass the failure verbatim as the primary context: the QA verification report's blockers, or the Tech Lead's `request_changes` findings. The Developer addresses those first and pushes to the **same branch and PR** — never open a second PR for the same story.
   - Structural `AUTONOMOUS_ABORT` (no test framework, unauthorised dependency, ambiguous Gherkin, architecture change required, another dev's commits on the branch) → mark the story `incomplete`, emit a **HITL Slack alert** immediately, and **stop retrying it**. A retry cannot resolve a decision that needs a human.
   - Any other failure → retry while attempts remain.
4. **PR + CI**: resolve the PR URL via `gh pr view` (the dev leg opened it against `INTEGRATION_BRANCH`). Poll `gh pr checks` until every check succeeds, any check fails, or `max_ci_wait_minutes` / wall-clock / window elapses. Accumulate the polled minutes for the report.
   - Green → the story leaves `PENDING_W1` and enters `PENDING_W2`.
   - Red or timed out → record the failing check names in notes and re-enter Wave 1 while attempts remain. Attempts exhausted with red CI → `incomplete`, HITL alert.
5. **Wave 1 closes** only when `PENDING_W1` is empty. Every surviving story is `status: review` with an open PR and green checks.

## Step W2 — Wave 2: QA verification

For each story in `PENDING_W2`, serially. Checkpoint first; `wave_entries.w2++`.

Encapsulate `/conclave-qa` for this story with **no `AskUserQuestion`**, model `MODEL_FOR_QA`, ledger += `qa`:

- ID is known → no picker.
- Missing local branch → `git fetch` then switch (default yes).
- CI-job proposal → **decline** writing a new workflow; proceed Gherkin-only when possible and record it in notes.
- **Pass** → the story moves to `verified` (because `EFFECTIVE_PEER_PR_REVIEW == true` for this run) and enters `PENDING_W3`.
- **`blocked`** → `reentries.qa_to_dev++`; move the story back to `PENDING_W1` carrying QA's blockers. It does **not** enter Wave 3 in this cycle.
- **`pending_uat`** (mobile / device-dependent UAT) → mark `incomplete`, emit a HITL alert, drop it from the working sets. Spinning attempts cannot produce a device.

QA never approves a PR and never merges — see `skills/conclave/agents/qa.md`.

**Wave 2 closes** when every story it received has either advanced to `PENDING_W3`, gone back to `PENDING_W1`, or been marked `incomplete`. If anything went back to Wave 1, return to Wave 1 now — the Tech Lead reviews a settled batch, not a moving one.

## Step W3 — Wave 3: Tech Lead PR review

Only when `PENDING_W1` and `PENDING_W2` are both empty. For each story in `PENDING_W3`, serially. Checkpoint first; `wave_entries.w3++`.

Encapsulate `/conclave-pr-review` for this story's PR, model `MODEL_FOR_TL`, ledger += `tech_lead`.

- **Approve** → set the story's frontmatter `status: done`, record `approved_at` and the PR URL in `prs_ready_for_human_merge`. The story is finished. **Do not merge.**
- **`request_changes`** or a malformed verdict → `reentries.tl_to_dev++`; move the story back to `PENDING_W1` carrying the Tech Lead's findings verbatim. It re-enters **Wave 2 after Wave 1**, because the code it was verified against no longer exists.
- Attempts exhausted → `incomplete` with the last review verdict, HITL alert.

**Wave 3 closes** when `PENDING_W3` is empty. If anything returned to Wave 1, the whole cycle repeats from Wave 1.

**No path in this command runs `gh pr merge`.** When a story is finished its PR stays open, approved, and listed for a human.

## Step W4.5 — Budget / window checkpoint helper

Call before each new dispatch and during CI polling:

1. Schedule enforced, not bypassed, and `now > WINDOW_END_AT` → stop reason `schedule_window_elapsed`; drain.
2. Wall-clock hours ≥ `max_wall_clock_hours` → `wall_clock_exhausted`; drain.
3. Before adding an estimated dispatch cost: `TOKENS_TOTAL + next_estimate > max_total_tokens` → `token_budget_exhausted`; drain **without** starting that dispatch. After a measured row, `TOKENS_TOTAL > max_total_tokens` → same, letting the in-flight write finish.
4. Drain means: no new Dev / QA / TL dispatches; finish the in-flight write; finalize the report; Slack; stop. Stories mid-wave keep whatever status their last completed leg set — nothing is rolled back.

Use measured usage for a ledger row when the runtime exposes it for that Agent call; otherwise estimate. Any mix of measured and estimated rows → `tokens_precision: mixed`.

## Step W4 — Finalize the run report + Slack

1. Compute `finished_at`, wall-clock hours, `tokens_total`, `tokens_precision`, total CI wait minutes, and per-story cycle time (`first_wave1_at` → `approved_at`).
2. Compute the **agent productivity** table, one row per role that was dispatched (`developer`, `designer`, `devops`, `qa`, `tech_lead`):
   - **Dispatches** — Agent calls for that role in this run.
   - **Stories touched** — distinct stories it processed.
   - **First-pass success rate** — stories that cleared that role's wave on their first entry ÷ stories it saw.
   - **Rework count** — for `qa` / `tech_lead`, how many returns to Wave 1 that role caused; for `developer`, how many Wave 1 entries were re-entries rather than first entries.
   - **Tokens / story (avg)** — that role's ledger total ÷ stories touched, carrying the run's precision label.
   - **Outcome mix** — approve / blocked / request_changes / abort counts.
3. Determine `outcome`:
   - `completed` — every in-scope story is `done` with an approving review, PR open and awaiting a human
   - `partial` — some stories incomplete, or stop reason `schedule_window_elapsed`
   - `aborted_budget` — `token_budget_exhausted` or `wall_clock_exhausted`
   - `aborted` — a hard abort (dependency cycle, missing `gh`) before any story was attempted
4. Rewrite the RUN file in place (same path) with the final per-story table, wave-entry counts, re-entry heatmap, conflicts, token ledger, productivity table, budget usage, stop reason, and `prs_ready_for_human_merge`. `sprint_closed: false` always, `merged: none (by design)`.
5. **Slack** (when `notifications.slack.enabled`) — see §"Slack notifications" below. Pick the template by outcome: `completed` → success (`on_success`), anything else → partial (`on_partial`). HITL alerts were already sent at the moment each blocker occurred.

## Step W5 — Terminal summary (never closes the sprint)

Print `## Delivery loop complete — ${RUN_ID} (scope: <sprint | ID list>, waves reached: <n>)` followed by:

```
| Story   | Final state | W1 | W2 | W3 | PR                           | Ready to merge | Notes         |
|---------|-------------|----|----|----|------------------------------|----------------|---------------|
| US-001  | done        | 1  | 1  | 1  | https://github.com/…/pull/42 | yes            | —             |
| US-002  | done        | 2  | 2  | 1  | https://github.com/…/pull/43 | yes            | QA blocked ×1 |
| US-003  | review      | 3  | 1  | 0  | https://github.com/…/pull/44 | no             | CI red ×3     |
```

Then budget usage (attempts, tokens + precision, wall clock, CI wait), the stop reason, the run-report path, the PRs awaiting a human with a copyable hint, and the `conclave/` commit hint:

```bash
gh pr merge 42 --squash --delete-branch    # you merge — Conclave never does

git add conclave/
git commit -m "conclave: delivery loop ${RUN_ID}"
```

Do **not** commit and do **not** merge for the user.

If a sprint was in scope, re-read every non-retired story under `$SPRINT_PATH/stories/`. When **all** of them are now `status: done`, print:

```
All non-retired stories in ${SPRINT_ID} are done, with PRs awaiting human merge.
This command does not close sprints — merge the PRs, then run /conclave-review (or
/conclave-sprint) to close it.
```

Never set `meta.md`'s `status: done` from here. A delivery loop has no mandate over the sprint's commitment as a whole (ADR-006).

## Slack notifications

Three versioned templates under `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/`, posted to the Incoming Webhook whose URL is read from the env var **named** by `notifications.slack.webhook_env`:

| Template | Sent when | Toggle |
|---|---|---|
| `slack-loop-success.template.json` | Step W4 with `outcome: completed` | `on_success` |
| `slack-loop-partial.template.json` | Step W4 with any other outcome | `on_partial` |
| `slack-loop-hitl.template.json` | **Immediately** when a blocker needs a human | `on_hitl` |

HITL triggers, each emitted at the moment it happens so the operator can act while the run continues on other stories: structural `AUTONOMOUS_ABORT`; dependency cycle in W0.4; another dev's commits on a story branch; `gh` missing or unauthenticated at start; CI still red after `max_attempts_per_story`; QA `pending_uat`; a run-wide budget or schedule abort that leaves work a human must pick up.

Delivery rules:

- Substitute every `{{placeholder}}` in the template, then POST: `curl -sS -X POST -H 'Content-type: application/json' --data @<rendered> "$WEBHOOK_URL"`.
- Slack rejecting the Block Kit payload → retry **once** with `{"text":"<the same summary as mrkdwn>"}`.
- Env var unset, or both attempts failing → warn, record `slack_delivery: failed` in the report, and **continue**. A notification failure never fails the run. Disabled → `slack_delivery: disabled`.
- **Never** put the webhook URL, an API token, or CI secrets in the payload, the transcript, or any `conclave/` file — a redacted success/fail line is all that gets printed.
- Every number in a Slack message must come from the run report, so the two never disagree.

---

## Guardrails

- **Do not touch any file under `conclave/` except the single story/bug file's frontmatter and (in autonomous mode) its body.** The `## Autonomous run —` section appended in Step 8.5 is the sole additional write allowed. In loop mode, the run report under `runs/` is the one further exception — every other `conclave/` path stays untouched, and QA's `tests/uat/` writes plus git operations on feature branches remain as they are outside `conclave/`. Architecture changes still go in a separate ADR PR raised by the Tech Lead.
- **Never merge a PR, in any mode.** No path in this command runs `gh pr merge`. QA approval and Tech Lead approval are gates, not merge authorizations; the loop's terminal state is an approved PR and a human does the merge (ADR-006). Never `--admin`, never force-push.
- **Loop mode forces the Tech Lead gate** for the run even when `ceremonies.peer_pr_review.required: false`. Never permanently mutate that flag in `config.md`.
- **Loop mode never closes a sprint.** It prints a hint when the sprint looks complete; `/conclave-review` (or `/conclave-sprint`) owns the close.
- **Waves never overlap.** Wave N+1 starts only once wave N has resolved for every story in scope. Batch-of-3 concurrency exists only inside Wave 1, and only for stories with no dependency and no recorded path overlap between them.
- **Every wave failure returns to Wave 1.** QA blocked → Wave 1. Tech Lead `request_changes` → Wave 1, then Wave 2 again. Never re-run QA against code nobody changed, and never let the Tech Lead approve a story QA has not seen in its current state.
- **A dependency cycle aborts the run.** Print the cycle, alert, stop. Never invent an execution order.
- **Schedule no-ops must be free.** Outside the window, exit 0 with one line, no story writes, no run report. The legacy `window_start`/`window_end` schema is refused with a migration message rather than reinterpreted.
- **Refuse an ID only if that exact `US-NNN`/`BUG-NNN` is already `in-progress` on an existing branch** — not because other IDs are concurrently in-progress on other branches. Parallel work on separate branches is permitted and expected.
- **Idempotent on resume.** If the branch exists, the story is `in-progress`, and the resume path was chosen (interactively or by autonomous default): the Developer subagent must read what already exists in the branch before generating new code, not overwrite.
- **If any of `git push`, `gh pr create`, or `gh pr edit` fails, do NOT roll back local commits.** Surface the error and let the user retry the network step manually. The local branch and story-frontmatter changes are the durable output. In autonomous mode, record the failure as a `blocked` outcome in the run report.
- **No mode ever bypasses the QA gate.** Without the loop, a `done` outcome still puts the story in `status: review` and `/conclave-qa` is required to reach `verified`/`done`. In loop mode the gate is not skipped — it is Wave 2, executed headless.
- **Autonomous mode never modifies prior run-report sections.** Each run appends a new `## Autonomous run — <ISO>` section; prior sections stay verbatim. Loop runs likewise never delete or rewrite a previous `RUN-*` file.
- **Never store Slack webhook URLs, API tokens, or CI secrets** in any `conclave/` file or Slack payload.
- **The `Mode:` line is the only signal that the command is running headless.** `Mode: autonomous` (dev leg only) or `Mode: autonomous-dev-three-wave` (full delivery loop). Interactive mode prints nothing extra — silence is the interactive-mode indicator.
