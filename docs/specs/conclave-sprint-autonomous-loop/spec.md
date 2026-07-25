# `/conclave-sprint` Autonomous Sprint Loop

> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.
>
> **ADR:** `docs/adr/ADR-004-autonomous-end-to-end-sprint-loop.md` (**accepted** — shipped in 0.13.0)
>
> **Amended 2026-07-24** — scheduling windows, run budgets (attempts / CI wait / tokens / wall clock), and explicit model routing added per the ADR-004 amendment. The flat `max_story_iterations` / `pr_checks_timeout_minutes` keys from the first draft are superseded by the `budgets:` block; nothing has shipped, so no migration is needed.
>
> **Validator:** Automated Sonnet `idea-spec-validator` subagent was **not** invoked (subagent nesting disallowed in this authoring pass). Manual PASS checklist against the generate-spec 20-section criteria is recorded in §Validator note at the end of this file.

## Locked decisions (authoring defaults)

These were locked by the product owner or recommended as defaults in ADR-004 where the owner did not decide. Implementers must not reopen them without a new ADR amendment.

| Decision | Value | Source |
|---|---|---|
| Command surface | Extend `/conclave-sprint` with `--no-interaction` / `--headless`; config `commands.sprint.interactive: false`. No new `/conclave-loop` / `/conclave-sprint-loop` in v1 | Recommended (aligns with v0.9 `/conclave-dev`) |
| Version bump | **0.13.0** (minor); lockstep Claude + Cursor | Recommended |
| Profile focus | **lean / solo** first; full-scrum out of v1 ceremony automation | Locked |
| TL gate | **Force** effective `peer_pr_review = true` for the autonomous merge path (ephemeral; do not rewrite lean config) | Recommended (owner asked for TL PR Review) |
| Merge | Allowed **only** in Autonomous Sprint Loop mode, after QA pass + TL approve, into integration branch (prefer `develop`) | Locked |
| Bugs (`BUG-NNN`) | **Out of v1** collection | Recommended (consistent with `/conclave-sprint`) |
| Cursor parity | **Yes**, same 0.13.0 release — including schedule window, budgets, and the trigger recipe | Recommended |
| Scheduling model | **Window** (`commands.sprint.schedule.window_start` / `window_end`, ISO-8601 with explicit offset). **Cron deferred** to a future ADR | Recommended |
| Schedule enforcement | **Two layers**: (A) external trigger (Claude `/loop` or `/schedule`, Cursor Automation, `cron`) merely *invokes* the command; (B) the Conclave orchestrator **refuses to start** outside the window and **drains + stops** when `window_end` passes mid-run | Locked by design constraint |
| Schedule bypass | CLI `--ignore-schedule` (flag only, no config knob) | Recommended |
| Recurrence | Delegated to the external trigger (e.g. hourly) + window gate; Conclave implements no cron semantics in v1 | Recommended |
| Max attempts / story | `commands.sprint.budgets.max_attempts_per_story: 3` (renames the draft `max_story_iterations`) | Recommended default |
| CI wait | `commands.sprint.budgets.max_ci_wait_minutes: 20`, falling back to existing `ceremonies.qa_verification.ci_wait_timeout_minutes` | Recommended default |
| Token budget | `commands.sprint.budgets.max_total_tokens: 2000000` — **best-effort** dispatch-ledger accounting, hard stop on exceed, precision disclosed in the report | Locked (user asked for a hard stop; honesty about measurement is the design constraint) |
| Wall-clock budget | `commands.sprint.budgets.max_wall_clock_hours: 12` — **exact**, the reliable weekend backstop | Recommended default |
| Models | Loop **honors the existing v0.7.0 `models:` block** (`overrides.<role>` → `default` → session). **No** `commands.sprint.models` block | Recommended |
| Run report | Written at start with `outcome: in_progress`, finalized at end; doubles as the concurrency lock; always written on budget/window abort | Recommended |
| Slack | Opt-in Incoming Webhook via env var **name** in config + `curl`; not Slack MCP primary; never store secrets in markdown; fires on aborts too | Recommended |
| Story processing | **Serial** full delivery loop per story in v1 | Recommended default |
| Boards | Do not replace `/conclave-board` or `/conclave-sprint-board` | Locked |

---

## 1. Objetivo *(Goal)*

Give lean/solo Conclave teams a way to run an **entire active sprint end-to-end without user prompts, optionally over a scheduled window such as a weekend, under an explicit budget**: for every non-retired story, develop → open/update PR → watch CI checks (self-heal on failure) → run QA → run Tech Lead PR review → self-heal on gate failure → **merge into the integration branch (`develop` preferred)** when both gates pass; when all stories are `done`, **close the sprint**; write a durable **sprint run report** under `conclave/`; optionally deliver that report to Slack.

The operator controls three things from `conclave/config.md`: **when** the loop may work (a schedule window), **how much** it may consume (max attempts per story, CI wait, total tokens, wall-clock hours), and **which model** each role uses (the existing `models:` block). A run that hits its window edge or a budget ceiling drains gracefully and still delivers a report explaining why it stopped.

This extends the v0.9 autonomous pattern from “headless Dev inside a one-pass sprint runner” to a true **self-healing, budgeted delivery loop with an explicit, opt-in merge-policy exception**. Interactive `/conclave-sprint` (no flag) remains the safe one-pass, do-not-merge runner.

## 2. Alcance *(Scope)*

### Incluido en esta fase

- **CLI flags** on `/conclave-sprint`: `--no-interaction`, synonym `--headless` (same tokens as `/conclave-dev`), and `--ignore-schedule`.
- **Config** (optional blocks, absent = today’s behavior):
  - `commands.sprint.interactive` (default `true`)
  - `commands.sprint.merge_method` (`squash` \| `merge` \| `rebase`, default `squash`)
  - `commands.sprint.schedule.window_start` / `window_end` / `enforce`
  - `commands.sprint.budgets.max_attempts_per_story` (default `3`)
  - `commands.sprint.budgets.max_ci_wait_minutes` (default `20`)
  - `commands.sprint.budgets.max_total_tokens` (default `2000000`)
  - `commands.sprint.budgets.max_wall_clock_hours` (default `12`)
  - `commands.sprint.budgets.token_estimates.<role>` (optional per-role ledger costs)
  - `repo.integration_branch` (optional string)
  - `notifications.slack.enabled` / `notifications.slack.webhook_env`
- **Autonomous Sprint Loop orchestration** when `INTERACTIVE = false`:
  - Schedule gate before any work; graceful drain when the window elapses mid-run
  - Run report written at start (`outcome: in_progress`) as evidence + concurrency lock
  - Headless Planning defaults if sprint is `draft`
  - Per-story serial loop: Dev (autonomous) → PR checks wait → QA (headless) → TL review (forced) → merge
  - Self-heal re-dispatch of Dev on CI / QA / TL failure until success or `max_attempts_per_story`
  - Budget ledger updated per dispatch; hard stop when any budget is exhausted
  - Per-role model resolution from the existing `models:` block, recorded in the report
  - Mechanical sprint close (`meta.status: done`) when all non-retired stories are `done`
  - Finalized sprint run report + optional Slack webhook POST (also on aborts)
- **Ephemeral force** of Tech Lead PR gate for the loop run
- **Merge policy exception** documented in command guardrails + `SKILL.md` §6
- Template `sprint-run-report.template.md`; updates to `config.template.md`, charters as needed for headless QA/TL notes
- **Scheduling recipes documented for both platforms** (Claude Code `/loop` or `/schedule`; Cursor Automation / local interval skill; `cron` as a generic fallback) in the docs site and README
- Cursor twin + sync; docs EN/ES; CHANGELOG; manifests → **0.13.0** at implementation ship time
- Preserve structural gates: Sprint Planning + QA Verification still execute (never skipped)

### Fuera de scope

- **New slash commands** `/conclave-loop`, `/conclave-sprint-loop`, Claude `/goal` wrapper, somnio-loop port
- **Shipping a scheduler inside Conclave** — no daemon, no background process, no cloud job. Conclave gates; an external trigger starts it
- **Depending on Claude `/schedule`** — documented as one optional trigger only (research preview + Claude-only; Cursor has no equivalent)
- **Cron expressions or recurring windows in config** — v1 is a single `window_start` / `window_end`; recurrence comes from the external trigger
- **Exact / billable token metering** — the token budget is a best-effort ledger with disclosed precision, not a spend guarantee; provider-side limits remain the user's responsibility
- **Per-run or per-command model overrides** (`commands.sprint.models`) — the existing `models:` block is the single source
- **Cost estimation in currency** — the ledger counts tokens, never money (prices change and vary per account)
- **Auto-tuning budgets** from historical runs
- **Bug (`BUG-NNN`) auto-collection** in the loop
- **Full-scrum ceremony automation** (standup, grooming, sprint review meeting, retro facilitation) inside the loop
- **Shipping standalone `/conclave-close-sprint`** as a full ceremony command (mechanical `meta.status: done` only)
- **Replacing** `/conclave-board` or `/conclave-sprint-board`; auto-hooks for board refresh
- **Parallel per-story full pipelines** (batch-of-3 through merge) in v1 — serial only
- **Permanent mutation** of `peer_pr_review.required` in lean `config.md`
- **Storing Slack webhook URLs/tokens** in any `conclave/` file
- **Force-push**, admin-bypass merge without documenting abort when branch protection refuses
- **Changing** interactive `/conclave-sprint` one-pass do-not-merge semantics
- **Autonomous mode for standalone** `/conclave-qa` / `/conclave-pr-review` CLI invocations outside the loop (loop embeds headless behavior; standalone commands may still Ask — follow-up OK later)
- **Dry-run / plan-only** mode

## 3. Tecnologias y convenciones del proyecto *(Technologies & conventions)*

### Stack

- **Plugin logic**: markdown slash commands + prose-orchestrated subagents (Claude Code `Agent` / Cursor `Task`).
- **Target state**: `conclave/` markdown + YAML frontmatter only.
- **GitHub**: `gh pr create|view|checks|review|merge`, `gh run list|view`.
- **Time**: `date` (ISO-8601 with offsets) for window comparison, CI-wait polling, and wall-clock budget.
- **Models**: existing `models:` block in `conclave/config.md` (v0.7.0), resolved per role.
- **Slack (optional)**: HTTP Incoming Webhook via `curl`; env var resolved at runtime.
- **External triggers (optional, not shipped)**: Claude Code `/loop` / `/schedule`, Cursor Automations / local interval skill, or `cron`.
- **Docs site**: Next.js 16 + Nextra 4 under `site/` (pin/patch rules unchanged).

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave plugin (Claude + Cursor) | 0.12.0 → **0.13.0** | `.claude-plugin/plugin.json`, `platforms/cursor/.cursor-plugin/plugin.json` |
| `conclave_version` in new installs | **0.13.0** | `skills/conclave/templates/config.template.md` |
| Existing autonomous Dev | 0.9.0 patterns reused | `commands/conclave-dev.md`, `autonomous-run.template.md` |
| Sprint runner baseline | 0.7.0+ / updated through 0.12.0 | `commands/conclave-sprint.md` |

### Patrones existentes a respetar

- **v0.9 `INTERACTIVE` resolution** — CLI flag overrides / forces autonomous; config `commands.*.interactive`; no flag to force interactive when config is autonomous.
- **`AUTONOMOUS_ABORT:` / sensible-defaults-else-abort** for Dev; extend the same philosophy to Planning/QA Ask sites inside the loop.
- **Append-only audit artifacts** — sprint run reports are new files (monotonic IDs); story-level `## Autonomous run —` sections continue to append.
- **Batch-of-3** remains the interactive sprint Phase 2/3 pattern; Autonomous Sprint Loop uses **serial** story pipelines instead.
- **Secrets**: env var **names** in markdown only (same as `testing-environments.md`).
- **Model resolution chain (v0.7.0)** — `models.overrides.<role>` → `models.default` → parent session; unknown ID → one `WARNING:` line and fall back. The loop reuses this verbatim; it does not define its own model config.
- **Config coercion pattern (v0.9.0)** — non-boolean `interactive` values coerce with a `WARNING:` line; the new numeric budget keys follow the same “warn and fall back to the documented default” philosophy.
- **ADR-002**: Cursor port in the same release; sync templates via `scripts/sync-cursor-platform.sh`.
- **Structural gates** (`SKILL.md` §6): Planning + QA never skipped.
- **Local-first (ADR-001)**: no daemon, no server. Scheduling is a config window plus an operator-owned trigger.

## 4. Dependencias previas *(Prerequisites)*

- [ ] `/conclave-sprint` one-pass runner exists (`commands/conclave-sprint.md`).
- [ ] `/conclave-dev` autonomous mode (v0.9.0+) exists.
- [ ] `/conclave-qa` and `/conclave-pr-review` exist with CI wait + TL approve flows.
- [ ] `skills/conclave/templates/config.template.md` has `commands:` / `ceremonies:` / `models:` blocks.
- [ ] `skills/conclave/templates/autonomous-run.template.md` exists (per-story Dev reports still used).
- [ ] Target repo has `gh` authenticated with permission to create, approve, and merge PRs into the integration branch.
- [ ] Integration branch exists on origin (`develop` preferred, or configured).
- [ ] For Slack opt-in: Incoming Webhook URL exported in the named env var at runtime.
- [ ] For scheduled runs: an external trigger the operator can run unattended — Claude Code `/loop` (session stays open) or `/schedule` (research preview), a Cursor Automation / local interval skill, or `cron`/`launchd` invoking the agent CLI. **Conclave does not provide one.**
- [ ] For scheduled runs: the machine running the trigger stays awake and authenticated for the whole window (no sleep, valid `gh` credentials, network access).
- [ ] `models:` block present in `conclave/config.md` if per-role model routing is wanted (absent = parent session model for every role, unchanged behavior).
- [ ] ADR-004 accepted (or explicitly implemented under `proposed` with changelog note) before shipping 0.13.0 — status remains **proposed** until ship review.

## 5. Arquitectura *(Architecture)*

### Patron

Prose-orchestrated subagents. Autonomous Sprint Loop is a **mode** of `/conclave-sprint`, not a separate runtime. It composes existing command flows with additional loop/merge/close/report steps.

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| Slash command `conclave-sprint.md` | Yes | Flag parse, mode branch, loop, merge, close, report, Slack |
| `/conclave-dev` | Minimal | Already autonomous; loop invokes it per iteration |
| `/conclave-qa` | Yes (embedded headless defaults) | Ask sites need defaults when called from loop |
| `/conclave-pr-review` | Yes (embedded; merge removed from “never”) | Loop calls TL path then merges |
| Config template | Yes | New keys (`schedule`, `budgets`) |
| New run-report template | Yes | Sprint-level report + budget ledger |
| `models:` block | Reused, unchanged | Loop resolves per role; no schema change |
| `SKILL.md` | Yes | §3/§5/§6 policy |
| Cursor twin | Yes | Parity incl. schedule/budgets |
| Docs site | Yes | Scheduling recipes per platform |
| Board apps | No | Unchanged |

### Flujo esperado

1. User (or a trigger) runs `/conclave-sprint --no-interaction` (or config `commands.sprint.interactive: false`).
2. Orchestrator resolves workspace, clean tree, config, `INTERACTIVE = false`, prints `Mode: autonomous-sprint-loop`.
3. **Schedule gate (§5.4)** — if a window is configured and enforced and `--ignore-schedule` was not passed, and `now` is outside `[window_start, window_end]`: print the window, exit cleanly as a no-op, write nothing.
4. **Lock + evidence** — refuse if an `in_progress` run report younger than `max_wall_clock_hours` exists. Otherwise allocate `RUN-NNN` and write the report immediately with `outcome: in_progress`.
5. Resolve `SPRINT_ID`, `INTEGRATION_BRANCH`, `BUDGETS` (§5.5), `MODELS` (§5.6), `MERGE_METHOD`, `EFFECTIVE_PEER_PR_REVIEW = true`. Print the resolved budgets, window, and models once.
6. If sprint `draft` → headless Planning (defaults) → must become `active` or hard-abort. Ledger += planning dispatch.
7. Build ordered list of non-retired stories where `status != done`.
8. For each story (serial):
   1. `attempts = 0`
   2. While story not `done` and `attempts < budgets.max_attempts_per_story`:
      - **Budget/window checkpoint** — if any budget is exhausted or `window_end` has passed, drain: stop dispatching, break out of both loops, and finalize the report with the specific stop reason.
      - `attempts++`
      - Ensure story is `ready` or resumable `in-progress`/`review`/`verified` per gate needs (re-entry rules below).
      - If needs Dev work (not yet `review`/`verified`/`done`, or returned to `ready`/`review` for fixes): run autonomous Dev with `MODEL_FOR_DEVELOPER` (discipline-routed) → PR against `INTEGRATION_BRANCH`. Ledger += dev dispatch.
      - Wait for PR checks up to `budgets.max_ci_wait_minutes`. On failure/timeout → record, continue loop (Dev again).
      - Run headless QA with `MODEL_FOR_QA`. Ledger += qa dispatch. On `blocked` → Dev fix path next attempt. On `pending_uat` (mobile) → story-level stop, break.
      - Run TL review with `MODEL_FOR_TL` (even if config `peer_pr_review: false`). Ledger += tl dispatch. On `request_changes` → next attempt.
      - On QA pass + TL approve (`status: done`): `gh pr merge` with configured method + `--delete-branch`. On merge failure → hard story stop (do not force).
   3. If still not `done` after max attempts → leave as-is; mark story `incomplete` in run report; continue to next story.
9. If every non-retired story is `done` → set `meta.status: done`.
10. Finalize `RUN-NNN` report in place: `outcome` (`completed` / `partial` / `aborted_budget` / `aborted`), per-story table, budget usage, ledger, stop reasons.
11. If Slack enabled → `curl` webhook with the summary (including abort reason); never log the webhook URL.
12. Print terminal summary + suggested `git add conclave/ && git commit`.

### 5.4 Schedule gate

Config:

```yaml
commands:
  sprint:
    schedule:
      window_start: "2026-07-25T19:00:00-03:00"   # ISO-8601, explicit offset required
      window_end:   "2026-07-27T07:00:00-03:00"
      enforce: true                                # default true when the block is present
```

| Situation | Behavior |
|---|---|
| No `schedule` block | No gating — run whenever invoked |
| `enforce: false` | Window is informational; print it, run anyway |
| `now < window_start` | Print `Outside schedule window (starts <ts>); nothing to do.` → exit 0, **no report** |
| `now > window_end` at start | Print `Schedule window ended <ts>; nothing to do.` → exit 0, **no report** |
| Inside window | Proceed |
| `window_end` passes mid-run | Graceful drain after the in-flight gate; `outcome: partial`, stop reason `schedule_window_elapsed` |
| `--ignore-schedule` | Bypass all of the above; report records `schedule_bypassed: true` |

A no-op exit must be **cheap and silent-ish**: one line, exit code 0, no report file, no git writes. A recurring trigger firing every hour outside the window must not produce noise or failure alarms.

**Recurrence is the trigger's job.** The documented weekend recipe is: configure the window, then run an hourly trigger. Each firing either no-ops (outside window), refuses (a run is already in flight), or resumes the sprint.

Platform recipes (documentation only — Conclave ships none of them):

| Platform | Recipe |
|---|---|
| Claude Code | `/loop 1h /conclave-sprint --no-interaction` (session must stay open), or `/schedule` where available (**research preview — do not rely on it**) |
| Cursor | Automation on an interval, or the local interval loop skill, invoking `/conclave-sprint --no-interaction` |
| Any | `cron` / `launchd` invoking the agent CLI with the same command |

### 5.5 Budget ledger

Config:

```yaml
commands:
  sprint:
    budgets:
      max_attempts_per_story: 3
      max_ci_wait_minutes: 20          # falls back to ceremonies.qa_verification.ci_wait_timeout_minutes
      max_total_tokens: 2000000        # best-effort
      max_wall_clock_hours: 12         # exact
      token_estimates:                 # optional; per-role proxy cost of one dispatch
        planning: 60000
        developer: 180000
        qa: 90000
        tech_lead: 70000
```

**Enforcement strength (stated honestly in docs, not only here):**

| Budget | Strength | How it is measured |
|---|---|---|
| `max_attempts_per_story` | Hard, exact | Orchestrator's own counter |
| `max_ci_wait_minutes` | Hard, exact | `date` delta while polling `gh pr checks` |
| `max_wall_clock_hours` | Hard, exact | `date` delta from `started_at` |
| `max_total_tokens` | **Best-effort** | Dispatch ledger (below) |

**Dispatch ledger.** Every role dispatch appends one row to a `## Budget ledger` table in the run report:

```markdown
| # | Phase | Role | Model | Tokens | Source |
|---|-------|------|-------|--------|--------|
| 1 | planning | scrum_master | claude-sonnet-4-6 | 60000 | estimated |
| 2 | US-001 attempt 1 | developer | claude-haiku-4-5-20251001 | 152340 | measured |
```

- `estimated` — from `token_estimates.<role>` (or the built-in default when unset).
- `measured` — used whenever the runtime exposes real usage for that dispatch; it replaces the estimate for that row.
- Running total is compared against `max_total_tokens` at every checkpoint (between dispatches — the only place a markdown orchestrator can act).

**Documented limitation.** A markdown-orchestrated command cannot guarantee byte-accurate cumulative token counts for itself and its subagents on every platform. `max_total_tokens` is a **guardrail, not a billing control**; the report always discloses whether the total was `estimated`, `measured`, or `mixed`, and the docs tell users to set provider-side limits if they need a strict cap. `max_wall_clock_hours` is the exact backstop.

**On exhaustion** (any budget): drain after the in-flight gate → finalize report with `outcome: aborted_budget` and stop reason (`token_budget_exhausted` / `wall_clock_exhausted`) → Slack notify if enabled. Never kill a dispatch mid-write to save budget; a corrupted story state costs more than the overshoot.

### 5.6 Model routing

Resolved **once** at loop start using the existing v0.7.0 chain (`models.overrides.<role>` → `models.default` → parent session), then applied to every dispatch:

| Dispatch | Model |
|---|---|
| Planning (PM / TL / SM waves) | `MODEL_FOR_PM` / `MODEL_FOR_TL` / `MODEL_FOR_SM` |
| Dev — `discipline: design` | `MODEL_FOR_DESIGNER` |
| Dev — `discipline: devops` | `MODEL_FOR_DEVOPS` |
| Dev — frontend / backend / mobile / multi / unset | `MODEL_FOR_DEVELOPER` |
| QA | `MODEL_FOR_QA` |
| TL PR review | `MODEL_FOR_TL` |

Unknown model ID → one `WARNING:` line and fall back (unchanged v0.7.0 behavior). The resolved map is printed once and recorded in the run-report frontmatter under `models:` so a reader knows which models produced merged code. Cost guidance (cheap model for Dev fix attempts, strongest for the TL merge-authorizing gate) belongs in docs, not in a second schema.

### Re-entry rules (per story status at loop start / mid-loop)

| Status | Action |
|---|---|
| `ready` | Start/continue Dev |
| `in-progress` | Resume Dev autonomous |
| `review` | Skip Dev; wait checks if needed; run QA |
| `verified` | Skip Dev/QA; run TL |
| `done` | Skip (already complete) |
| `retired` | Never collect |
| `backlog` | Skip (not in sprint commitment) |

### Layout de archivos nuevos

```
commands/
  conclave-sprint.md                         # MODIFICAR
platforms/cursor/commands/
  conclave-sprint.md                         # MODIFICAR (port)
skills/conclave/
  templates/
    config.template.md                       # MODIFICAR
    sprint-run-report.template.md            # NUEVO
  SKILL.md                                   # MODIFICAR
  agents/
    qa.md                                    # MODIFICAR (optional headless note)
    tech-lead.md                             # MODIFICAR (optional — merge happens in orchestrator)
docs/specs/conclave-sprint-autonomous-loop/
  spec.md                                    # this file
docs/adr/
  ADR-004-autonomous-end-to-end-sprint-loop.md
site/content/{en,es}/commands/sprint.mdx     # MODIFICAR (loop, schedule, budgets)
site/content/{en,es}/configuration.mdx       # MODIFICAR (schedule + budgets keys)
site/content/{en,es}/scheduling.mdx          # NUEVO (weekend recipe per platform)
README.md, CHANGELOG.md, manifests           # MODIFICAR at ship
```

Target-repo artifact (generated at runtime, not in plugin repo):

```
conclave/sprints/SPRINT-NNN/runs/RUN-NNN-autonomous-loop.md
```

## 6. Archivos a crear o modificar *(Files to create / modify)*

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `commands/conclave-sprint.md` | MODIFICAR | Flag parse (incl. `--ignore-schedule`), schedule gate, loop mode, budget ledger, model routing, merge, close, report, Slack | v0.9 changes in `conclave-dev.md` + existing sprint phases |
| `platforms/cursor/commands/conclave-sprint.md` | MODIFICAR | Cursor parity incl. schedule + budgets | ADR-002 port of sprint command |
| `skills/conclave/templates/config.template.md` | MODIFICAR | `repo:`, `commands.sprint:` (+ `schedule:` / `budgets:`), `notifications.slack:`, prose sections | Existing `commands.dev` block + `## Model configuration` prose |
| `skills/conclave/templates/sprint-run-report.template.md` | NUEVO | Sprint-level run report incl. window, budgets, ledger, models | `autonomous-run.template.md` shape |
| `skills/conclave/SKILL.md` | MODIFICAR | §3 catalog, §5 templates, §6 merge-policy exception + forced TL + scheduling/budget note | Existing §6 gates prose |
| `skills/conclave/agents/qa.md` | MODIFICAR | “How you operate in autonomous sprint loop” Ask-defaults | developer.md autonomous section |
| `README.md` | MODIFICAR | Autonomous Sprint Loop + weekend recipe snippet | Autonomous mode subsection pattern |
| `CHANGELOG.md` | MODIFICAR | 0.13.0 entry at ship | `[0.12.0]` / `[0.9.0]` style |
| `.claude-plugin/plugin.json` + `marketplace.json` | MODIFICAR | 0.13.0 | Prior bumps |
| `platforms/cursor/.cursor-plugin/plugin.json` | MODIFICAR | 0.13.0 lockstep | ADR-002 |
| `site/content/en/commands/sprint.mdx` + ES | MODIFICAR | Loop semantics, merge exception, budgets | `dev.mdx` autonomous docs |
| `site/content/en/configuration.mdx` + ES | MODIFICAR | New config keys + token-precision disclosure | `commands.dev` docs |
| `site/content/en/scheduling.mdx` + ES | NUEVO | Weekend recipe: window + budgets + per-platform trigger | `platforms.mdx` structure |
| `docs/adr/ADR-004-...md` | EXISTS (amended) | Decision record | ADR-003 |

### Detalle por archivo

#### `commands/conclave-sprint.md`

1. **Step 0 — Parse flags.** Extract `--no-interaction` / `--headless`; compute `INTERACTIVE` from flag + `commands.sprint.interactive` (same coercion table as `commands.dev.interactive`).
2. **Branch.** If `INTERACTIVE`: execute today’s Steps 1–11 unchanged (including **Do not merge**). If not: execute Autonomous Sprint Loop steps (this spec §5) instead of one-pass Phases 2–4; Phase 1 uses headless defaults.
3. **allowed-tools**: add `Bash(gh pr merge:*)`, ensure `gh pr checks`, `gh run *`, and `Bash(curl:*)` for Slack.
4. **Guardrails section**: replace absolute “Do not merge” with mode-conditional wording citing ADR-004.

**No mezclar**: do not change interactive batch-of-3 phase semantics; do not collect bugs.

#### `skills/conclave/templates/sprint-run-report.template.md` (NEW)

Written at run start with `outcome: in_progress` (evidence + concurrency lock) and finalized in place at run end.

```markdown
---
id: "{{run_id}}"
sprint_id: "{{sprint_id}}"
started_at: "{{started_at}}"
finished_at: "{{finished_at}}"          # empty while in_progress
outcome: "{{outcome}}"                   # in_progress | completed | partial | aborted_budget | aborted
mode: autonomous-sprint-loop
runner: "{{runner}}"
integration_branch: "{{integration_branch}}"
peer_pr_review_forced: true
merge_method: "{{merge_method}}"
schedule:
  window_start: "{{window_start}}"       # or "none"
  window_end: "{{window_end}}"
  bypassed: {{schedule_bypassed}}        # true when --ignore-schedule was used
budgets:
  max_attempts_per_story: {{max_attempts_per_story}}
  max_ci_wait_minutes: {{max_ci_wait_minutes}}
  max_total_tokens: {{max_total_tokens}}
  max_wall_clock_hours: {{max_wall_clock_hours}}
budget_usage:
  attempts_total: {{attempts_total}}
  tokens_total: {{tokens_total}}
  tokens_precision: "{{tokens_precision}}"   # estimated | measured | mixed
  wall_clock_hours: {{wall_clock_hours}}
models:
  developer: "{{model_developer}}"
  qa: "{{model_qa}}"
  tech_lead: "{{model_tech_lead}}"
slack_delivery: "{{slack_delivery}}"     # skipped | sent | failed | disabled
---

# Sprint run report — {{run_id}} ({{sprint_id}})

## Summary

- Stories targeted: {{story_count}}
- Completed (done + merged): {{done_count}}
- Incomplete: {{incomplete_count}}
- Sprint closed: {{sprint_closed}}
- Stopped because: {{primary_stop_reason}}

## Per-story results

| Story | Final status | Attempts | PR | Merge | Notes |
|-------|--------------|----------|----|-------|-------|
| US-NNN | done | 2 | url | sha | |

## Budget ledger

| # | Phase | Role | Model | Tokens | Source |
|---|-------|------|-------|--------|--------|
| 1 | planning | scrum_master | {{model}} | {{tokens}} | estimated |

> Token totals are **{{tokens_precision}}**. Estimated rows use `budgets.token_estimates`;
> they are a guardrail, not a billing figure. Wall-clock and attempt counts are exact.

## Stop conditions

{{stop_conditions}}   # e.g. token_budget_exhausted | wall_clock_exhausted |
                      # schedule_window_elapsed | max_attempts (US-NNN) | merge_conflict (US-NNN)

## Configuration snapshot

- team_profile: {{team_profile}}
- effective peer_pr_review: forced true
- config peer_pr_review.required: {{config_peer_pr_review}}
- schedule enforced: {{schedule_enforced}}
```

#### `skills/conclave/templates/config.template.md`

Add commented defaults for `repo.integration_branch`, `commands.sprint.*` (including the `schedule:` and `budgets:` sub-blocks), `notifications.slack.*`, plus prose sections mirroring `## Command configuration` and a new `## Scheduling and budgets` + `## Notifications` section. The prose must state: (a) Autonomous Sprint Loop forces TL review and may merge; (b) `max_total_tokens` is best-effort with disclosed precision while `max_wall_clock_hours` is exact; (c) Conclave gates the window but does not start itself — the operator supplies a trigger; (d) the loop uses the existing `models:` block, not a new one.

#### `skills/conclave/SKILL.md`

- §3: note Autonomous Sprint Loop on `/conclave-sprint`, including schedule/budget gating and model reuse.
- §5: list `sprint-run-report.template.md`.
- §6: add explicit exception — **Autonomous Sprint Loop may merge** after QA + TL; interactive paths must not. Document ephemeral TL force, the window gate, and budget aborts as legitimate non-failure outcomes.

#### `site/content/{en,es}/scheduling.mdx` (NEW)

One page covering the weekend recipe end to end: the `schedule` + `budgets` + `models` config, the per-platform trigger table (Claude Code `/loop` / `/schedule`, Cursor Automation / interval skill, `cron`), the no-op and lock behaviors, how to read the run report, and an explicit “what the token budget does and does not guarantee” callout. ES page mirrors EN; flag names and config keys stay in English.

## 7. API Contract

Sin API surface — no aplica. No HTTP API in the plugin. Slack webhook is an optional outbound POST from the operator environment, not a Conclave-hosted API. No `api-contract.md`.

## 8. Criterios de exito *(Success criteria)*

- [ ] No flag / interactive config → byte-compatible with pre-0.13.0 `/conclave-sprint` (no merge, one-pass).
- [ ] `--no-interaction` on lean sprint with 3 stories → all merged to `develop` (or configured branch) when gates pass; zero Ask prompts.
- [ ] Lean `peer_pr_review.required: false` → TL still runs; report shows `peer_pr_review_forced: true`.
- [ ] CI fail then fix within `max_attempts_per_story` → story can still complete.
- [ ] Exhausted attempts → `outcome: partial`, sprint remains `active`.
- [ ] All done → `meta.status: done` + `runs/RUN-*.md` finalized.
- [ ] Slack disabled → no curl; Slack enabled without env → warn + `slack_delivery: failed` or `skipped`; run still succeeds.
- [ ] Webhook URL never appears in any file under `conclave/`.
- [ ] Bugs not collected.
- [ ] Cursor twin behaves the same in 0.13.0, including schedule + budgets.
- [ ] Planning failure still hard-aborts before any Dev.
- [ ] Dirty tree at start still refuses.

**Scheduling:**

- [ ] Window configured, invoked before `window_start` → one-line no-op, exit 0, **no run report created**, no git writes.
- [ ] Window configured, invoked after `window_end` → same no-op behavior.
- [ ] Invoked inside window → runs normally.
- [ ] `window_end` crossed mid-run → in-flight gate finishes, no new dispatch, `outcome: partial`, stop reason `schedule_window_elapsed`.
- [ ] `--ignore-schedule` outside the window → runs; report records `schedule.bypassed: true`.
- [ ] `enforce: false` → window printed, run proceeds.
- [ ] No `schedule` block → no gating.
- [ ] Second invocation while an `in_progress` report younger than `max_wall_clock_hours` exists → refuses without touching story state.
- [ ] Stale `in_progress` report older than `max_wall_clock_hours` → new run proceeds and notes the stale lock.

**Budgets and models:**

- [ ] `max_total_tokens` crossed → drain, `outcome: aborted_budget`, stop reason `token_budget_exhausted`, ledger + precision disclosed, Slack still notified when enabled.
- [ ] `max_wall_clock_hours` crossed → drain, stop reason `wall_clock_exhausted`.
- [ ] `max_ci_wait_minutes` elapsed with checks pending → treated as CI failure for the attempt, not a crash.
- [ ] Budget ledger has one row per dispatch with `estimated` or `measured` source, and the total matches `budget_usage.tokens_total`.
- [ ] `budgets` block absent → documented defaults applied and printed.
- [ ] `models:` block with per-role overrides → each dispatch uses its resolved model; report frontmatter records the map.
- [ ] `models:` block absent → session model everywhere; no warnings.
- [ ] Unknown model ID → one `WARNING:` line, fallback per v0.7.0 chain, run continues.

### Tests requeridos

No automated plugin test suite (`CLAUDE.md`). Manual smoke matrix in a scratch target repo with `develop`, GitHub Actions, and 2–3 tiny stories. Budget and window cases are exercised by setting deliberately tiny limits (e.g. `max_total_tokens: 1`, a window five minutes wide) so the stop paths run in seconds.

### Comandos de verificacion

```bash
# Plugin package
claude plugin validate .

# Cursor tree freshness
./scripts/sync-cursor-platform.sh --check

# Scratch target repo smoke (manual):
# 1) Interactive control
/conclave-sprint
# → no merge; existing summary

# 2) Autonomous loop
/conclave-sprint --no-interaction
# → Mode: autonomous-sprint-loop; budgets/window/models printed; merges; run report

# 3) Partial failure
# Break CI on one story intentionally; confirm partial report + sprint stays active

# 4) Schedule no-op
# Set window_start in the future, then:
/conclave-sprint --no-interaction
# → one line, exit 0, no new file under conclave/sprints/*/runs/
ls conclave/sprints/SPRINT-001/runs/    # unchanged

# 5) Schedule bypass
/conclave-sprint --no-interaction --ignore-schedule
# → runs; report frontmatter shows schedule.bypassed: true

# 6) Budget abort
# Set budgets.max_total_tokens: 1, then:
/conclave-sprint --no-interaction
# → aborts after the first dispatch; outcome: aborted_budget; ledger present

# 7) Concurrency lock
# While a run is in flight, invoke again in a second session
# → refuses: "another autonomous run is in progress"

# 8) Slack
# notifications.slack.enabled: true; export SLACK_WEBHOOK_URL; confirm POST
grep -RIn 'hooks.slack.com' conclave/ && echo "LEAK" || echo "clean"
```

## 9. Criterios de UX *(UX criteria)*

### Loading

- Print `Mode: autonomous-sprint-loop` once when in loop mode, followed by one line each for the resolved window, budgets, and models:

```
Mode: autonomous-sprint-loop
Window: 2026-07-25T19:00:00-03:00 → 2026-07-27T07:00:00-03:00 (enforced)
Budgets: 3 attempts/story · 20m CI wait · 2,000,000 tokens (best-effort) · 12h wall clock
Models: developer=claude-haiku-4-5-20251001, qa=claude-sonnet-4-6, tech_lead=claude-opus-4-6
Run: RUN-003 (conclave/sprints/SPRINT-005/runs/RUN-003-autonomous-loop.md)
```

- Per-story progress lines name the gate and the attempt: `US-001 attempt 2/3 — QA`.
- Budget checkpoints print only when something changes materially (a budget crosses 80%, or a stop triggers) — not on every dispatch.
- No-op outside the window prints exactly one line and exits.
- Interactive mode: no new Mode line (silent default, same as today).

### Formularios

- Loop mode: **zero** `AskUserQuestion` / `AskQuestion` calls.
- Interactive mode: unchanged prompts (Planning dates, etc.).

### Passwords

No aplica — no password fields. Slack webhook is an env var, never prompted into chat as a secret to store.

### Errores

- Hard abort messages mirror today’s sprint runner (`dirty tree`, `Phase 1 failed`, `no sprint`).
- Story-level failures recorded in run report Notes; do not crash the whole sprint unless hard-abort condition.
- Merge refusal from GitHub: story incomplete; message includes `gh` error (redact tokens if present).
- **Budget and window stops are not errors.** They print a neutral, specific line and exit successfully — e.g. `Stopped: token budget exhausted (~2,010,000 of 2,000,000, mixed precision). Report: <path>`. Framing them as failures would train operators to ignore them.
- Concurrency refusal names the blocking run: `Another autonomous run is in progress (RUN-003, started <ts>). Re-run after it finishes.`

### Navegacion

No aplica — CLI/chat only.

### Accesibilidad

No aplica — text-only CLI.

## 10. Decisiones tomadas *(Decisions made — locked)*

| Decision | Why |
|---|---|
| Extend `/conclave-sprint --no-interaction` rather than a new command | Matches v0.9 discoverability; one mental entry for “run the sprint”; flag already known |
| Flag means full loop+merge, not quiet one-pass | Product intent requires self-heal + merge; document loudly to avoid surprise |
| Force TL gate ephemerally | Owner requires TL review before merge; lean config would otherwise skip it |
| Merge only in loop mode | Preserves safe default for humans supervising one-pass runs |
| Prefer `develop`, configurable | Owner locked `develop` as integration branch; other repos need escape hatch |
| Serial per-story pipelines in v1 | Avoid concurrent merges / develop races for solo lean |
| Bugs out | Consistent with current sprint collector; reduces v1 risk |
| Cursor same release | ADR-002; Cursor lacks `/goal` |
| Slack via webhook env name + curl | Portable across platforms; matches Conclave secrets pattern; ADR-001 remains intact (not mandatory) |
| `budgets.max_attempts_per_story = 3` | Enough for one CI flake plus one QA/TL fix cycle without unbounded spend; renames the draft `max_story_iterations` before anything ships |
| `budgets.max_ci_wait_minutes = 20` | Aligns with the existing QA CI wait default it falls back to |
| Mechanical sprint close only | `/conclave-close-sprint` still unshipped; lean does not need Review theater |
| Default merge_method squash | Cleaner history for solo feature branches |
| No somnio-loop; `/schedule` is a trigger, never a dependency | Prior investigation; Conclave owns orchestration and must behave identically on Cursor, which has no `/schedule` |
| Window (`window_start`/`window_end`) instead of cron for v1 | “This weekend” is naturally a window; a window is unambiguous to evaluate with `date` in prose, while cron semantics in markdown invite subtle bugs |
| Recurrence delegated to the external trigger | An hourly trigger + window gate already yields “work only during the window, resume after each pause” with zero scheduler code |
| Two-layer enforcement (trigger starts, Conclave gates) | The trigger differs per platform; the gate must not, or Claude and Cursor users get different products |
| `--ignore-schedule` as a flag, not a config key | A bypass should be visible in the invocation that used it, not hidden in a file |
| Schedule no-op writes no report and exits 0 | A recurring trigger firing outside the window must be free and silent, not an alarm or an artifact |
| Run report written at start as `in_progress` | Guarantees evidence for crashed/aborted unattended runs and doubles as the concurrency lock without adding a non-markdown lockfile |
| `max_total_tokens` best-effort, precision disclosed | Exact in-run token metering is not guaranteed on either platform; an approximate ceiling that drains gracefully beats no ceiling, provided the report never overstates its accuracy |
| `max_wall_clock_hours` as the exact backstop | Time is the one budget a markdown orchestrator can measure precisely with `date` |
| Ledger stores tokens, never currency | Prices vary per account and change over time; a token count stays true |
| Budgets evaluated between dispatches only | The only points where a prose orchestrator can act; killing mid-dispatch would corrupt story state |
| Loop honors the existing `models:` block; no `commands.sprint.models` | Model choice is a team-level decision; a second schema would drift from the first |
| Resolved models recorded in the report | A Monday-morning reader must know which models wrote and approved merged code |

## 11. Edge cases

### Datos invalidos

- Both `--no-interaction` and `--headless` → treat as one flag.
- `commands.sprint.interactive: "false"` (string) → coerce with WARNING (same table as dev).
- Unknown `merge_method` → warn, fall back to `squash`.
- `repo.integration_branch` set but missing on origin → hard abort before Dev.
- No `develop`/`main`/`master` detectable → hard abort.
- `window_start` / `window_end` missing an explicit UTC offset → warn and treat the window as **not enforced** (never guess the operator's timezone on an unattended weekend run).
- `window_end` earlier than `window_start` → warn, treat the window as unset (`enforce` ignored) rather than silently never running.
- Only one of `window_start` / `window_end` present → the missing bound is open-ended (`window_start` alone = “from then on”; `window_end` alone = “until then”). Print the interpretation.
- Window spans a DST transition → offsets are absolute instants, so comparison stays correct; document that a local wall-clock reading may shift by an hour.
- Budget value that is zero, negative, or non-numeric → warn, fall back to the documented default. A budget of `0` is treated as invalid rather than “never run”, because the latter is indistinguishable from a typo.
- `max_total_tokens` set absurdly low (below one dispatch estimate) → the run aborts after its first dispatch with a clear `token_budget_exhausted` reason; this is correct behavior, not a bug.
- `token_estimates` with an unknown role key → ignored with a warning; known roles keep their defaults.

### Schedule and lock

- Trigger fires outside the window → one-line no-op, exit 0, no report.
- Trigger fires inside the window while a run is in flight → refuse (lock), exit 0, no state change.
- Previous run crashed leaving `outcome: in_progress` **younger** than `max_wall_clock_hours` → refuse and name the blocking run; the operator can hand-edit the report's `outcome` to release the lock.
- Same, but **older** than `max_wall_clock_hours` → treat as stale, proceed, and note `stale_lock_ignored: RUN-NNN` in the new report.
- `window_end` passes while waiting on CI → finish the wait (it is already paid for), then drain without dispatching again.
- `--ignore-schedule` passed with no `schedule` block → no effect, no warning.

### API errors / Agent failures

- Dev `AUTONOMOUS_ABORT` → counts as a failed attempt; if attempts remain and status `ready`, retry only if the abort reason is transient (default: **do not retry** non-transient aborts such as “no test framework”; mark incomplete). Only CI/QA/TL gate failures consume fix attempts; a structural `AUTONOMOUS_ABORT` ends the story early.
- Agent tool crash → record, retry within the attempt budget once; then incomplete.
- `gh pr merge` conflict → incomplete; never `--admin` unless future config explicitly allows (out of v1).
- Runtime exposes no usage data for a dispatch → ledger row falls back to `estimated`; the run's `tokens_precision` becomes `mixed` (or stays `estimated`).
- Runtime returns implausible usage (zero or negative) → ignore it, use the estimate, note the anomaly in the ledger row.

### Sin conexion

- Network failure on push/checks/merge/Slack → record; story incomplete or `slack_delivery: failed`; do not corrupt frontmatter beyond last good write.

### Timeout

- PR checks still pending after `max_ci_wait_minutes` → treat as CI failure for loop purposes (trigger a Dev fix attempt, or incomplete if at max attempts).
- QA UAT CI timeout → existing blocked semantics; feeds the fix loop.
- Wall-clock budget reached while polling CI → stop polling at the boundary, drain, report `wall_clock_exhausted` (the PR is left open and healthy for the next run).

### Respuesta vacia o inesperada

- TL returns neither approve nor request_changes → treat as request_changes with note `malformed TL payload`.
- QA empty verdict → blocked.

### Doble submit / re-run

- Re-running `--no-interaction` after partial → continue from frontmatter statuses; new `RUN-NNN` file; prior runs preserved.
- Interactive run after partial autonomous → allowed; still must not merge.
- Re-run after a budget abort → budgets reset for the new run (they are per-run, not cumulative across runs). Document this clearly: an hourly trigger with a 2M-token budget can spend 2M tokens **per firing**, so weekend budgets should be sized per run, and `max_wall_clock_hours` plus the window bound the total.

### Mobile / pending_uat

- Story-level stop; do not spin iterations waiting for a human checklist.

### CI job proposal Ask in QA

- Headless default: **decline writing new workflow** (skip UAT generation for that proposal path; proceed Gherkin-only if possible). Record decision in run report. Never invent CI secrets.

## 12. Estados de UI requeridos *(Required UI states)*

No aplica — text-only CLI. Observable states:

| State | Terminal / artifact |
|---|---|
| idle (interactive default) | No Mode line; one-pass phases |
| no-op (outside window) | One line naming the window; exit 0; **no artifact** |
| locked (run in flight) | One line naming the blocking `RUN-NNN`; exit 0; no state change |
| loading (loop) | `Mode:` + window + budgets + models + run path; per-story progress lines |
| running (in flight) | Report exists with `outcome: in_progress` |
| success (completed) | All stories done; sprint closed; report finalized `completed` |
| partial | Report `outcome: partial` (attempts exhausted or `schedule_window_elapsed`); sprint `active` |
| budget-stopped | Report `outcome: aborted_budget`; stop reason names the budget; ledger + precision shown |
| aborted | Hard stop message; report finalized `aborted` if the run had started |
| slack disabled | `slack_delivery: disabled` |
| slack failed | Warning line (env name + HTTP status, never the URL); run still succeeds |

## 13. Validaciones *(Validations)*

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| `--no-interaction` / `--headless` | Optional; idempotent if repeated | (none) |
| `--ignore-schedule` | Optional; only meaningful with a `schedule` block | (none) |
| `commands.sprint.interactive` | Same coercion as `commands.dev.interactive` | `WARNING: commands.sprint.interactive should be a boolean; treating <value> as <resolved>.` |
| `budgets.max_attempts_per_story` | Integer ≥ 1; default 3 | `WARNING: budgets.max_attempts_per_story must be an integer ≥ 1; using 3.` |
| `budgets.max_ci_wait_minutes` | Integer ≥ 1; default 20 (falls back to `ceremonies.qa_verification.ci_wait_timeout_minutes`) | `WARNING: budgets.max_ci_wait_minutes must be an integer ≥ 1; using <fallback>.` |
| `budgets.max_total_tokens` | Integer ≥ 1; default 2000000 | `WARNING: budgets.max_total_tokens must be an integer ≥ 1; using 2000000.` |
| `budgets.max_wall_clock_hours` | Number > 0; default 12 | `WARNING: budgets.max_wall_clock_hours must be > 0; using 12.` |
| `budgets.token_estimates.<role>` | Known role key + integer ≥ 0 | `WARNING: unknown token_estimates role '<key>'; ignored.` |
| `schedule.window_start` / `window_end` | ISO-8601 **with explicit offset**; end after start | `WARNING: schedule.<field> must be ISO-8601 with an explicit offset; window not enforced.` / `WARNING: schedule.window_end precedes window_start; window not enforced.` |
| `schedule.enforce` | Boolean; default `true` when the block is present | Same coercion + WARNING as other booleans |
| `merge_method` | `squash`\|`merge`\|`rebase` | WARNING + fallback squash |
| `models.*` | Existing v0.7.0 validation, unchanged | `WARNING: Unknown model '<value>' for role <role>. Falling back to <next_fallback>.` |
| `notifications.slack.webhook_env` | Non-empty env var **name** matching `[A-Z][A-Z0-9_]*` when enabled; must not look like a URL | Refuse Slack send; warn (`looks like a URL — put the NAME of an env var here, never the URL itself`) |
| Working tree | Must be clean at start | Same dirty-tree refuse as today |
| `gh` available | Required in loop mode | Hard abort: `gh is required for Autonomous Sprint Loop (PR checks + merge)` |
| Concurrency | No `in_progress` report younger than `max_wall_clock_hours` | `Another autonomous run is in progress (RUN-NNN, started <ts>).` |

### Validaciones de servidor

No aplica (no Conclave server). GitHub merge/branch-protection errors are handled as story incomplete.

## 14. Seguridad y permisos *(Security & permissions)*

- **Never store** Slack webhook URLs, bot tokens, or GitHub tokens in `conclave/` markdown or run reports. The `schedule` and `budgets` blocks contain no secrets by construction (timestamps and integers only).
- Run report may include PR URLs and commit SHAs (public to the repo).
- Merge requires the operator’s local `gh` auth — Conclave does not embed credentials.
- Autonomous loop **must not** weaken QA: no merge without QA pass.
- Autonomous loop **must not** skip TL when merging (forced gate).
- Interactive commands retain **Do not merge**.
- Do not print webhook URL on failure (print `webhook_env name` + HTTP status only).
- **Unattended runs raise the blast radius of a compromised environment**: a weekend run merges to the integration branch with no human watching. Mitigations documented for operators: keep branch protection on, scope the `gh` token to the repo, and prefer a short window plus a wall-clock budget over an open-ended run.
- The concurrency lock is a safety control, not just hygiene — two overlapping loops could merge conflicting work. Never bypass it silently.

## 15. Observabilidad y logging *(Observability & logging)*

- Terminal phase/story progress lines, plus the one-time window/budgets/models banner.
- Per-story `## Autonomous run —` sections (existing Dev template) on each Dev dispatch.
- Sprint-level `runs/RUN-NNN-*.md` as the primary durable audit for the loop — written at start, finalized at end, so an unattended run that dies still leaves a trace.
- **Budget ledger** inside that report: one row per dispatch with role, model, tokens, and whether the number was `estimated` or `measured`. This is the audit surface for “what did the weekend cost, and how confident are we in that number?”
- Stop reasons are always explicit strings (`token_budget_exhausted`, `wall_clock_exhausted`, `schedule_window_elapsed`, `max_attempts (US-NNN)`, `merge_conflict (US-NNN)`) — never a bare “stopped”.
- Never log secret values.
- Warnings for config coercion stay terminal-only unless relevant to stop conditions (then copy reason text into report without secrets).

## 16. i18n / textos visibles *(i18n / user-facing copy)*

No translation-key system in the plugin. Command/terminal strings in English. Site MDX: EN + ES prose; keep flag names and sentinels in English (`--no-interaction`, `Mode: autonomous-sprint-loop`).

| Key (conceptual) | Texto |
|---|---|
| mode_line | `Mode: autonomous-sprint-loop` |
| merge_ok | `Merged US-NNN into <branch> (@<sha>)` |
| sprint_closed | `Sprint <id> closed (meta.status: done)` |
| slack_skipped_unset | `WARNING: notifications.slack.enabled but env <NAME> is unset; skipping Slack delivery` |
| tl_forced | `Effective peer_pr_review: forced true (Autonomous Sprint Loop)` |
| window_banner | `Window: <start> → <end> (enforced\|informational)` |
| window_noop_before | `Outside schedule window (starts <ts>); nothing to do.` |
| window_noop_after | `Schedule window ended <ts>; nothing to do.` |
| window_elapsed | `Schedule window ended; draining after the current gate.` |
| budgets_banner | `Budgets: <n> attempts/story · <n>m CI wait · <n> tokens (best-effort) · <n>h wall clock` |
| budget_stop_tokens | `Stopped: token budget exhausted (~<used> of <max>, <precision> precision).` |
| budget_stop_clock | `Stopped: wall-clock budget exhausted (<used>h of <max>h).` |
| lock_refused | `Another autonomous run is in progress (<RUN-NNN>, started <ts>). Re-run after it finishes.` |
| stale_lock | `Ignoring stale in-progress run <RUN-NNN> (older than max_wall_clock_hours).` |

## 17. Performance

- Serial loops trade wall-clock for safety; acceptable for lean/solo v1, and now bounded explicitly by `max_wall_clock_hours`.
- PR checks polling: reuse QA-style poll interval (document ~15–30s sleep); avoid tight loops. Polling consumes wall clock but negligible tokens — worth stating, since the two budgets behave very differently during a CI wait.
- Schedule gate is a couple of `date` comparisons before any file read — a no-op firing costs effectively nothing, which is what makes the hourly-trigger recipe practical.
- Budget bookkeeping is arithmetic plus one markdown append per dispatch; negligible next to a model call.
- Report is rewritten in place at finalization only (plus ledger appends), not on every progress line.
- Slack POST: single request at end; truncate the summary to ~3k chars if needed.
- Do not re-read the entire plugin skill tree per attempt beyond the role charter loads already used today.

## 18. Restricciones *(Restrictions / hard "do not" rules)*

The implementer must NOT:

- [ ] Merge from interactive `/conclave-sprint`, `/conclave-qa`, or `/conclave-pr-review` standalone paths.
- [ ] Skip Planning (when draft) or QA verification in loop mode.
- [ ] Collect `BUG-NNN` into the loop.
- [ ] Rewrite `conclave/config.md` to permanently flip `peer_pr_review.required`.
- [ ] Write webhook URLs or tokens into any artifact under `conclave/`.
- [ ] Replace or break `/conclave-board` / `/conclave-sprint-board`.
- [ ] Port somnio-loop, or make Claude `/goal` / `/schedule` a **requirement** for scheduled runs (they are optional triggers only).
- [ ] Ship a scheduler, daemon, or background process inside the plugin.
- [ ] Implement cron parsing in v1.
- [ ] Force-push or `--admin` merge bypass in v1.
- [ ] Infinite retry without `budgets.max_attempts_per_story`.
- [ ] Present `max_total_tokens` as an exact or billing-grade limit anywhere in docs, config comments, or the run report.
- [ ] Kill a dispatch mid-flight to enforce a budget — always drain after the current gate.
- [ ] Skip writing the run report when a run stops on a budget, a window edge, or an abort.
- [ ] Write a non-markdown lockfile under `conclave/` (the `in_progress` report is the lock).
- [ ] Add a `commands.sprint.models` block or any second model-configuration surface.
- [ ] Guess a timezone when a window timestamp has no offset.
- [ ] Treat a schedule no-op as an error, or emit an artifact for it.
- [ ] Close the sprint while any non-retired story is not `done`.
- [ ] Ship without Cursor twin + CHANGELOG + version lockstep.
- [ ] Leave absolute “Do not merge” wording that contradicts loop mode without mode-conditional clarification.

## 19. Entregables *(Deliverables)*

- [ ] ADR-004 proposed and amended (done at authoring) → accepted at ship review.
- [ ] `commands/conclave-sprint.md` Autonomous Sprint Loop mode, incl. `--ignore-schedule`, schedule gate, budget ledger, model routing.
- [ ] Config template keys (`repo`, `commands.sprint.schedule`, `commands.sprint.budgets`, `notifications.slack`) + prose incl. the token-precision disclosure.
- [ ] `sprint-run-report.template.md` with window, budgets, `budget_usage`, ledger, models, stop reasons.
- [ ] `SKILL.md` updates (§3/§5/§6).
- [ ] QA charter headless notes (minimal).
- [ ] Cursor command port + sync.
- [ ] Site EN/ES sprint + configuration docs.
- [ ] Site EN/ES `scheduling.mdx` with the weekend recipe and per-platform triggers.
- [ ] README + CHANGELOG 0.13.0.
- [ ] Manifest version bumps 0.13.0.
- [ ] Manual smoke per §8, including schedule no-op, bypass, budget abort, and lock cases.

## 20. Checklist final para el agente *(Final agent checklist)*

Before delivering the implementation:

- [ ] Read this spec + ADR-004 end-to-end.
- [ ] Confirmed prerequisites (§4).
- [ ] Modified only files listed in §6 (plus synced Cursor copies).
- [ ] Interactive path still never merges.
- [ ] Loop path never prompts; Planning/QA Ask sites have defaults.
- [ ] TL forced; merge only after QA + TL; base branch resolution correct.
- [ ] Attempt cap, CI wait, token budget, and wall-clock budget all enforced at between-dispatch checkpoints.
- [ ] Schedule gate: no-op outside window (exit 0, no artifact), drain at `window_end`, `--ignore-schedule` recorded.
- [ ] Concurrency lock honored; stale locks released after `max_wall_clock_hours` with a note.
- [ ] Run report written at start and finalized on every terminal path, including budget and window stops (markdown only, under `conclave/sprints/.../runs/`).
- [ ] Budget ledger discloses `estimated` vs `measured`; no doc or message claims exact token accounting.
- [ ] Models resolved from the existing `models:` block only, and recorded in the report.
- [ ] Slack opt-in safe (env name only) and still fires on aborts.
- [ ] Bugs excluded; boards untouched.
- [ ] Cursor parity + `sync-cursor-platform.sh --check` clean.
- [ ] CHANGELOG + manifests 0.13.0.
- [ ] No secrets in fixtures; no unjustified TODOs.

---

## Validator note (manual)

Automated `idea-spec-validator` was not run (authoring agent could not nest the Sonnet validator subagent). Manual checklist, re-run after the 2026-07-24 scheduling/budgets amendment:

| Dimension | Verdict |
|---|---|
| All 20 sections present in order | PASS |
| Locked decisions explicit (incl. schedule/budgets/models) | PASS |
| No raw `[...]` placeholders | PASS |
| Paths cite real repo files | PASS |
| Out-of-scope exhaustive (cron, daemon, exact metering, currency, second models block) | PASS |
| Success criteria verifiable (schedule/budget cases have concrete smoke steps) | PASS |
| Security/secrets rules (schedule/budgets carry no secrets; unattended blast radius called out) | PASS |
| Matches example tone (`conclave-dev-autonomous-mode`) | PASS |
| API contract correctly N/A | PASS |
| UX sections marked N/A where CLI-only | PASS |
| Naming consistency after rename (`max_attempts_per_story`) | PASS — no stray `max_story_iterations` / `pr_checks_timeout_minutes` outside the supersession note |
| Honest limitations stated, not buried | PASS — token precision disclosed in ADR §12, spec §5.5, the report template, and §18 restrictions |

**Manual verdict: PASS** (implementation-time smoke remains `[to be validated]`).
