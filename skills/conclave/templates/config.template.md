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
conclave_version: "0.15.0"

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

# Optional base branch for PRs the loop opens (default: develop, then main).
# Conclave never merges into it — a human does.
# repo:
#   integration_branch: develop

# Command behavior (optional). Omit this block entirely to keep interactive mode for every command.
# /conclave-dev honors commands.dev.interactive (v0.9.0+) and commands.dev.loop (v0.15.0+ —
# Autonomous Three-Wave Delivery Loop over the active sprint: W1 Dev+CI → W2 QA → W3 Tech Lead,
# any failure returns to W1, and NO PR is ever merged; approved PRs are left for a human).
# /conclave-sprint honors commands.sprint.interactive — false = headless one-pass (planning defaults
# + batched Dev/QA/TL). Since 0.15.0 it is NOT a delivery loop: no self-heal, no schedule, no merge.
# commands:
#   dev:
#     interactive: true                # false = never call AskUserQuestion; apply sensible defaults or abort with a reason
#     loop: false                      # true = Autonomous Three-Wave Delivery Loop; implies interactive: false
#     schedule:                        # optional recurring local-time window — Conclave gates; you supply the trigger
#       timezone: "America/Argentina/Buenos_Aires"  # IANA name; required when the schedule block is present
#       days: [fri, sat, sun]          # mon | tue | wed | thu | fri | sat | sun
#       start_time: "19:00"            # local wall clock, 24h
#       end_time: "07:00"              # may cross midnight (19:00 → 07:00 = overnight)
#       duration_days: 3               # how many calendar days this campaign runs
#       active_from: "2026-07-25"      # local date the campaign starts; omit = first eligible day
#       enforce: true                  # default true when the schedule block is present
#     budgets:
#       max_attempts_per_story: 3      # per story, counting every return to W1
#       max_ci_wait_minutes: 20        # falls back to ceremonies.qa_verification.ci_wait_timeout_minutes
#       max_total_tokens: 2000000      # best-effort ledger; not a billing guarantee
#       max_wall_clock_hours: 12       # exact backstop
#       # token_estimates:             # optional per-dispatch proxy costs
#       #   developer: 180000
#       #   qa: 90000
#       #   tech_lead: 70000
#   sprint:
#     interactive: true                # false = headless one-pass; never merges, no schedule, no budgets

# Optional Slack delivery for the delivery loop (webhook URL via env var NAME only).
# notifications:
#   slack:
#     enabled: false
#     webhook_env: SLACK_WEBHOOK_URL   # name of the env var holding the Incoming Webhook URL — never paste the URL here
#     on_success: true                 # loop finished, everything approved and waiting for a human merge
#     on_partial: true                 # loop finished with stories left incomplete
#     on_hitl: true                    # a blocker needs a human — sent the moment it happens, not at the end
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

Set to `false` when running `/conclave-dev` from CI, from `/conclave-sprint` (Phase 2 forces autonomous regardless of this setting), or when you want a hands-off "just run it" flow. Interactive mode remains the default for direct terminal use where a human is watching. Autonomous mode on its own **stops at `status: review`** — QA and the Tech Lead still run separately, and nothing is merged.

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

### `commands.dev.loop` (v0.15.0+)

Default: `false`. When `true` — or when `--loop` is passed — `/conclave-dev` runs the **Autonomous Three-Wave Delivery Loop** (ADR-006) over the active sprint:

| Wave | Work | Advances when | On failure |
|---|---|---|---|
| **W0** | Order the scope by declared `dependencies:`; serialize stories that would collide on the same files | An execution order exists | Dependency cycle → abort, cycle named |
| **W1 — Dev** | Implement, push, open the PR, poll CI to green | Every story is `review` with green checks | Retry up to `max_attempts_per_story` |
| **W2 — QA** | Headless `/conclave-qa` per story | Every story is `verified` | Failing stories go back to **W1** |
| **W3 — Tech Lead** | `/conclave-pr-review` per story | Every story is `done` with an approving review | Failing stories go back to **W1**, then re-enter W2 → W3 |

- **No PR is ever merged.** The loop's terminal state is approved PRs waiting for a human. `repo.integration_branch` is only the PRs' base branch.
- **Implies `interactive: false`** — a loop that prompts is not a loop.
- **Forces the Tech Lead gate** for the run even when `peer_pr_review.required: false`, without rewriting this file.
- **Never closes the sprint.** It prints a hint when every non-retired story is `done`; closing stays with `/conclave-sprint` / `/conclave-review`.
- Accepts `BUG-NNN` when passed explicitly (the sprint scan never picks bugs up).
- Writes `RUN-NNN-dev-loop.md` under the active sprint's `runs/`, or `conclave/runs/` in a repo with no sprint. The report is also the concurrency lock: a run whose scope shares an ID with a live run is refused; non-overlapping scopes may run in parallel.

**Prerequisite:** install the [GitHub CLI](https://cli.github.com/) (`gh`) and authenticate (`gh auth login`) with an account that has access to this repository (push, PRs, review). Conclave does not install or configure `gh`; the loop refuses to start without it.

**Ad-hoc override** (recommended over the config key — see the warning below):

```
/conclave-dev --loop                             # every non-done story in the active sprint
/conclave-dev --loop US-042 US-043               # a subset, same three waves
/conclave-dev --loop --ignore-schedule US-042    # bypass the window gate for this run
```

> **`commands.dev.loop: true` makes *every* `/conclave-dev` invocation in this repo a full three-wave run**, including a quick single-story run. Prefer the `--loop` flag unless this repo exists to be driven unattended. There is no flag to disable a configured loop for one invocation — the same asymmetry as `interactive`, so a scheduled trigger cannot be silently degraded by a stray flag.

Value coercion follows the same table as `interactive`, with inverted polarity: absent or unrecognised → `false` (no loop) rather than `true`.

### `commands.sprint.interactive`

Default: `true`. When set to `false`, `/conclave-sprint` runs **headless one-pass**: planning with documented defaults, then batched Dev → QA → TL, with zero prompts.

Since **0.15.0** this is *not* a delivery loop (ADR-006 supersedes ADR-004's loop semantics). It does not self-heal, does not read a schedule or budgets, and **never merges**. For unattended delivery use `/conclave-dev --loop`.

```
/conclave-sprint --no-interaction
/conclave-sprint --headless
```

## Scheduling and budgets (`/conclave-dev --loop`, v0.15.0+)

`commands.dev.schedule` is a **recurring local-time gate**. Conclave does **not** start itself on a timer — you supply a trigger (Claude Code `/loop` or `/schedule`, a Cursor Automation, `cron`). A firing runs only when all three hold:

1. The local date is within `[active_from, active_from + duration_days)`.
2. The local weekday is listed in `days`.
3. The local time is within `[start_time, end_time)` — a window where `end_time` is earlier than `start_time` crosses midnight.

| Key | Meaning | Default |
|---|---|---|
| `timezone` | IANA name (`America/Argentina/Buenos_Aires`, `Europe/Madrid`) | **required** when the block is present |
| `days` | `mon`..`sun`, any subset | all seven |
| `start_time` / `end_time` | Local 24h wall clock | `00:00` / `23:59` |
| `duration_days` | Campaign length in calendar days | `1` |
| `active_from` | Local date the campaign starts | first eligible day |
| `enforce` | `false` prints the window and runs anyway | `true` |

Outside the window the command is a cheap no-op: exit 0, one line, **no report and no writes**. Mid-run, crossing the window end drains after the in-flight gate and finalizes the report. `--ignore-schedule` bypasses the gate for one invocation and is recorded in the report.

> **The pre-0.15.0 `window_start` / `window_end` pair is no longer honored.** A config still carrying it gets one warning and the loop refuses to infer a recurring window from a one-shot pair — guessing would silently widen an unattended, token-spending run. Rewrite it using the keys above.

`commands.dev.budgets` caps the loop:

| Key | Strength | Default |
|---|---|---|
| `max_attempts_per_story` | Exact | `3` — per story, counting every return to W1 |
| `max_ci_wait_minutes` | Exact | `20` (or `ceremonies.qa_verification.ci_wait_timeout_minutes`) |
| `max_wall_clock_hours` | Exact | `12` |
| `max_total_tokens` | **Best-effort** ledger | `2000000` |

`max_total_tokens` is a **guardrail, not a billing control**. The run report discloses whether totals were `estimated`, `measured`, or `mixed`. Set provider-side limits if you need a hard spend cap. Budgets are **per run** — an hourly trigger can spend the token budget on every firing; size the window and `max_wall_clock_hours` to bound the campaign.

The loop reuses the existing `models:` block for per-role routing (`developer`, `designer`, `devops`, `qa`, `tech_lead`). There is no `commands.dev.models` schema.

See the docs site **Scheduling** page for a full weekend recipe.

## Notifications

`notifications.slack.enabled: true` posts delivery-loop messages to a Slack Incoming Webhook using three versioned templates:

| Template | Sent when | Toggle |
|---|---|---|
| `slack-loop-success` | The loop finished and every in-scope story is approved and waiting for a human merge | `on_success` (default `true`) |
| `slack-loop-partial` | The loop finished with stories left incomplete, or drained on budget/schedule | `on_partial` (default `true`) |
| `slack-loop-hitl` | A blocker needs a human — **sent the moment it happens**, not at the end | `on_hitl` (default `true`) |

Put only the **env var name** in `webhook_env` (default `SLACK_WEBHOOK_URL`). Never paste the webhook URL or any secret into `conclave/` markdown, and never into a Slack payload. If enabled but the env var is unset, the run still succeeds and records `slack_delivery: failed`.

## Repo / integration branch

`repo.integration_branch` (optional) — the **base branch** for PRs the delivery loop opens, and the branch its feature branches fork from. Prefer `develop`. If unset, the orchestrator tries `develop`, then `main`. Outside loop mode, `/conclave-dev` keeps detecting `main`/`master` itself.

Conclave never merges into this branch. Since 0.15.0 no command runs `gh pr merge` — the loop leaves approved PRs and a human merges them.

## Full example: unattended weekend campaign

Everything the three-wave loop reads, in one place:

```yaml
repo:
  integration_branch: develop        # PR base; Conclave never merges into it

commands:
  dev:
    interactive: false
    loop: true                       # or pass --loop and leave this false
    schedule:
      timezone: "America/Argentina/Buenos_Aires"
      days: [fri, sat, sun]
      start_time: "19:00"            # Friday 19:00 local ...
      end_time: "07:00"              # ... through 07:00 next morning
      duration_days: 3
      active_from: "2026-07-31"
      enforce: true
    budgets:
      max_attempts_per_story: 3
      max_ci_wait_minutes: 20
      max_total_tokens: 2000000
      max_wall_clock_hours: 12
      token_estimates:
        developer: 180000
        qa: 90000
        tech_lead: 70000
  sprint:
    interactive: true                # headless one-pass when false; never a delivery loop

models:
  default: claude-sonnet-4-6
  overrides:
    developer: claude-haiku-4-5-20251001
    qa: claude-sonnet-4-6
    tech_lead: claude-opus-4-6

notifications:
  slack:
    enabled: true
    webhook_env: SLACK_WEBHOOK_URL
    on_success: true
    on_partial: true
    on_hitl: true
```

Then export the webhook and start a recurring trigger — the trigger only invokes the command; the gate above decides whether it does anything:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."   # environment only, never in markdown

/loop 1h /conclave-dev --loop        # Claude Code (session stays open)
# Cursor: an Automation on an hourly interval running the same command
# Any runtime: cron / launchd invoking your agent CLI hourly
```

## How to update this file

Edit it directly. The next `/conclave-*` command will pick up the changes. Commit the edit so the rest of the team sees it.
