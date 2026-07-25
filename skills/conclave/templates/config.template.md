---
project_name: "{{project_name}}"
project_type: "{{project_type}}"        # backend | frontend | mobile | devops | multi
stack:
  language: "{{language}}"
  framework: "{{framework}}"
  datastore: "{{datastore}}"
  infrastructure: "{{infrastructure}}"
repo_url: "{{repo_url}}"
claude_md_path: "CLAUDE.md"
initialized_at: "{{iso_date}}"
conclave_version: "0.13.0"

# Optional. Which agent runtime(s) this install expects. Informational only —
# unset means either Claude Code or Cursor is fine (mixed teams OK).
# runtime: both                            # claude-code | cursor | both

# Whether this is a solo developer or a real team. Set once by /conclave-init.
# solo forces team_profile to lean and renders a single-person roster.
team_mode: "{{team_mode}}"              # solo | team

# Which ceremonies / quality gates the team commits to.
# Profiles set sensible defaults; the per-ceremony flags override them.
team_profile: "{{team_profile}}"        # lean | full-scrum | custom

ceremonies:
  sprint_planning:
    required: true                      # ALWAYS required (structural — no sprint without a plan)
  qa_verification:
    required: true                      # ALWAYS required (structural — no done without a quality gate)
    ci_wait_timeout_minutes: 20          # how long /conclave-qa polls CI for a UAT run's conclusion before treating it as blocked
  daily_standup:
    required: {{daily_standup_required}}
  backlog_grooming:
    required: {{backlog_grooming_required}}
  peer_pr_review:
    required: {{peer_pr_review_required}}
  sprint_review:
    required: {{sprint_review_required}}
  sprint_retrospective:
    required: {{sprint_retrospective_required}}

# Model configuration (optional). Omit this block entirely to use the parent session model for all roles.
# Valid model IDs: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001
# models:
#   default: claude-sonnet-4-6        # fallback for any role not listed below
#   overrides:
#     # product_manager: claude-opus-4-6
#     # tech_lead: claude-opus-4-6
#     # scrum_master: claude-sonnet-4-6
#     # developer: claude-haiku-4-5-20251001
#     # designer: claude-sonnet-4-6
#     # devops: claude-sonnet-4-6
#     # qa: claude-sonnet-4-6

# Optional integration branch for PRs / Autonomous Sprint Loop merges (default: develop, then main).
# repo:
#   integration_branch: develop

# Command behavior (optional). Omit this block entirely to keep interactive mode for every command.
# /conclave-dev honors commands.dev.interactive (v0.9.0+).
# /conclave-sprint honors commands.sprint.interactive (v0.13.0+) — false enables Autonomous Sprint Loop
# (self-heal → QA → forced TL → merge). Interactive /conclave-sprint Phase 2 still forces
# dev.interactive: false for batched Dev regardless of commands.dev.interactive.
# commands:
#   dev:
#     interactive: true                # false = never call AskUserQuestion; apply sensible defaults or abort with a reason
#   sprint:
#     interactive: true                # false = Autonomous Sprint Loop (merge allowed after QA+TL)
#     merge_method: squash             # squash | merge | rebase
#     schedule:                        # optional weekend / off-hours window — Conclave gates; you supply the trigger
#       window_start: "2026-07-25T19:00:00-03:00"   # ISO-8601 with explicit offset
#       window_end:   "2026-07-27T07:00:00-03:00"
#       enforce: true                  # default true when the schedule block is present
#     budgets:
#       max_attempts_per_story: 3
#       max_ci_wait_minutes: 20        # falls back to ceremonies.qa_verification.ci_wait_timeout_minutes
#       max_total_tokens: 2000000      # best-effort ledger; not a billing guarantee
#       max_wall_clock_hours: 12       # exact backstop
#       # token_estimates:             # optional per-dispatch proxy costs
#       #   planning: 60000
#       #   developer: 180000
#       #   qa: 90000
#       #   tech_lead: 70000

# Optional Slack delivery for Autonomous Sprint Loop run reports (webhook URL via env var NAME only).
# notifications:
#   slack:
#     enabled: false
#     webhook_env: SLACK_WEBHOOK_URL   # name of the env var holding the Incoming Webhook URL — never paste the URL here
---

# Conclave configuration

This file captures the project-level configuration Conclave uses to generate and verify artifacts. It is read by every `/conclave-*` command.

## Team mode

`{{team_mode}}` — `solo` if this is a one-person project (forces `team_profile: lean`, roster is a single row covering every discipline), `team` otherwise. Set once by `/conclave-init`; not meant to be hand-edited afterward (growing from solo to a team is a manual `roster.md` edit plus flipping this field — see `conclave/team/roster.md`).

## Runtime (optional)

`runtime` — when set, records which agent platform(s) this install expects: `claude-code`, `cursor`, or `both`. Informational only; commands do not refuse a mismatched runtime. Unset means either Claude Code or Cursor is fine (mixed teams OK). Invalid values: warn once and treat as unset.

## Project type
`{{project_type}}`

## Confirmed stack
- **Language**: `{{language}}`
- **Framework**: `{{framework}}`
- **Datastore**: `{{datastore}}`
- **Infrastructure**: `{{infrastructure}}`

## Team profile

`{{team_profile}}` — sets which ceremonies and quality gates this team commits to. Three options:

| Profile | When to use | Standup | Grooming | Peer PR review | Sprint review | Retro |
|---------|-------------|---------|----------|----------------|----------------|-------|
| `lean` | Solo devs, small (2–3) teams, internal tools | off | off | off | off | off |
| `full-scrum` | Cross-functional teams, stakeholders to demo to | required | required | required | required | required |
| `custom` | Mixed needs | per-ceremony flags below | | | | |

Two gates are **always required** regardless of profile because they are structural to Scrum:

- **Sprint Planning** — without a plan there is no sprint.
- **QA verification** — without a quality gate there is no Definition of Done.

Anything Conclave generates (stories with Gherkin acceptance criteria, DoD checklist, ADR-based architecture) is also non-negotiable — it is the structure that makes everything else work.

To change the profile, edit `team_profile` in the frontmatter above. To override a single ceremony without changing the profile, edit its `required:` flag under `ceremonies:` and set `team_profile: custom`. Conclave's ceremony commands (`/conclave-planning`, `/conclave-standup`, `/conclave-review`, `/conclave-retro`) read these flags and skip silently when `required: false`.

## UAT / CI gate

`ceremonies.qa_verification.ci_wait_timeout_minutes` (default `20`) bounds how long a single `/conclave-qa` run polls the target repo's CI for the conclusion of the UAT tests QA generated and pushed. If CI hasn't concluded when the timeout elapses, that run is treated as blocked — see `conclave/team/testing-environments.md` for the environment-variable/secret names the generated tests read (never real values).

## Conventions

### Branch naming
Use `feat/US-NNN-<slug>` for stories, `fix/<short-slug>` for bugs, `chore/<short-slug>` for maintenance.

### Commit messages
Reference the story ID in the commit: `feat(US-001): add JWT middleware`.

### PR titles
Mirror the story title: `US-001: Add JWT middleware`.

## Model configuration

The optional `models:` block lets the team assign a specific Claude model to each Conclave role subagent. When absent, every Agent call uses the parent session model (current default behavior — no change from v0.6.0).

**Fallback chain (per Agent call):**
1. `models.overrides.<role>` if set and a known model ID.
2. `models.default` if set and a known model ID.
3. Parent session model if neither is set (or if the block is absent).

**Known valid model IDs** (update this list when new models ship):
- `claude-opus-4-6` — highest capability, highest cost
- `claude-sonnet-4-6` — balanced capability and cost (recommended default)
- `claude-haiku-4-5-20251001` — fastest, lowest cost (good for bulk dev work)

**Invalid model name**: if a role's configured model is not in the list above, the command prints one warning and falls back to `models.default` (or the session model if `default` is also invalid).

**Role keys**: `product_manager`, `tech_lead`, `scrum_master`, `developer`, `designer`, `devops`, `qa`.

To activate, uncomment the `models:` block in the frontmatter above and fill in the values your team wants.

## Command configuration

The optional `commands:` block controls per-command interaction behavior.

### `commands.dev.interactive` (v0.9.0+)

Default: `true` (interactive — the historical behavior). When set to `false`, `/conclave-dev` runs in **autonomous mode**:

- **No `AskUserQuestion` prompts.** Every current prompt site applies a documented sensible default (assignee takeover, branch recreate for stale local branches, branch resume when there is prior story work, refuse when another dev's commits are on the branch).
- **Ambiguous decisions with no safe default abort.** The Developer subagent returns `AUTONOMOUS_ABORT: <one-line reason>` — no test framework detected, new dependency required that no ADR authorised, ambiguous Gherkin scenario, architecture change required. The story resets to `status: ready`; nothing is pushed.
- **Per-run report appended to the story file** — `## Autonomous run — <ISO>` section with outcome (`done`/`blocked`/`aborted`), decisions taken, files touched, test/lint summary, and blockers if any.

Set to `false` when running `/conclave-dev` from CI, from `/conclave-sprint` (interactive Phase 2 forces autonomous regardless of this setting), or when you want a hands-off "just run it" flow. Interactive mode remains the default for direct terminal use where a human is watching.

**Ad-hoc override** — force autonomous for a single invocation without editing this file:

```
/conclave-dev --no-interaction US-042
/conclave-dev --headless US-042            # synonym
```

There is no CLI flag to force interactive when the config is autonomous — the asymmetry is intentional so a CI job never hangs on a stray flag.

**Value coercion** — non-boolean values are coerced with a warning:

| Value in `config.md` | Resolved | Warning |
|---|---|---|
| `true` (boolean) | `true` — interactive | no |
| `false` (boolean) | `false` — autonomous | no |
| `"true"` / `"false"` (strings, case-insensitive) | boolean equivalent | yes |
| `1` (or any non-zero integer) | `true` | yes |
| `0` | `false` | yes |
| any other value | `true` (fallback) | yes |
| field absent | `true` (silent default) | no |

### `commands.sprint.interactive` (v0.13.0+)

Default: `true` (interactive one-pass runner — **never merges**). When set to `false`, `/conclave-sprint` runs the **Autonomous Sprint Loop** (ADR-004):

- Zero `AskUserQuestion` / `AskQuestion` prompts.
- Serial per-story pipeline: Dev → PR checks → QA → **forced Tech Lead PR review** (even when lean has `peer_pr_review.required: false`) → **merge** into `repo.integration_branch` (prefer `develop`).
- Self-heal on CI / QA / TL failure until `budgets.max_attempts_per_story`.
- Writes `conclave/sprints/SPRINT-NNN/runs/RUN-NNN-autonomous-loop.md` (lock + audit).
- Closes the sprint (`meta.status: done`) when every non-retired story is `done`.

**Prerequisite:** install the [GitHub CLI](https://cli.github.com/) (`gh`) and authenticate (`gh auth login`) with an account that has access to this repository. Conclave does not install or configure `gh`.

**Ad-hoc override:**

```
/conclave-sprint --no-interaction
/conclave-sprint --headless
/conclave-sprint --no-interaction --ignore-schedule   # bypass window gate for this run
```

Interactive `/conclave-sprint` (no flag, `interactive: true`) keeps the pre-0.13.0 one-pass semantics and **must not merge**.

## Scheduling and budgets (v0.13.0+)

`commands.sprint.schedule` is an optional **window gate**. Conclave does **not** start itself on a timer — you supply a trigger (Claude Code `/loop` or `/schedule`, Cursor Automation, `cron`). When the schedule block is present and `enforce: true` (default), invocations outside `[window_start, window_end]` exit as a cheap no-op (exit 0, no report). Mid-run, crossing `window_end` drains after the in-flight gate.

`commands.sprint.budgets` caps the loop:

| Key | Strength | Default |
|---|---|---|
| `max_attempts_per_story` | Exact | `3` |
| `max_ci_wait_minutes` | Exact | `20` (or `ceremonies.qa_verification.ci_wait_timeout_minutes`) |
| `max_wall_clock_hours` | Exact | `12` |
| `max_total_tokens` | **Best-effort** ledger | `2000000` |

`max_total_tokens` is a **guardrail, not a billing control**. The run report discloses whether totals were `estimated`, `measured`, or `mixed`. Set provider-side limits if you need a hard spend cap. Budgets are **per run** — an hourly trigger can spend the token budget on every firing; size the window + wall-clock to bound the weekend.

The loop reuses the existing `models:` block for per-role routing. There is no `commands.sprint.models` schema.

See the docs site **Scheduling** page for a weekend recipe.

## Notifications (v0.13.0+)

`notifications.slack.enabled: true` posts the Autonomous Sprint Loop run-report summary (including aborts) to a Slack Incoming Webhook. Put only the **env var name** in `webhook_env` (default `SLACK_WEBHOOK_URL`). Never paste the webhook URL or any secret into `conclave/` markdown. If enabled but the env var is unset, the run still succeeds and records `slack_delivery: failed` (or `skipped`).

## Repo / integration branch

`repo.integration_branch` (optional) — branch Autonomous Sprint Loop merges into and that Dev/QA target for PRs when resolved by the loop. Prefer `develop`. If unset, the orchestrator tries `develop`, then `main`.

## How to update this file

Edit it directly. The next `/conclave-*` command will pick up the changes. Commit the edit so the rest of the team sees it.
