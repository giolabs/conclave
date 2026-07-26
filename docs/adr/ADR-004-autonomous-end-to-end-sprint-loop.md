# ADR-004: Autonomous End-to-End Sprint Loop with Merge, Scheduling Windows, and Budgets

- **Status**: accepted, partially superseded by ADR-006
- **Date**: 2026-07-24
- **Amended**: 2026-07-24 — added scheduling windows, run budgets (attempts / CI wait / tokens / wall clock), and explicit model routing for loop mode. Status unchanged (`proposed`).
- **Amended**: 2026-07-26 (0.15.0) — **the delivery-loop semantics of this ADR are superseded by ADR-006.** `/conclave-sprint --no-interaction` is no longer a self-healing, merging loop: it reverts to headless one-pass (planning defaults + batched Dev/QA/TL, no merge, no schedule gate, no budgets), and the single autonomous delivery loop is `/conclave-dev --loop` (three waves, no auto-merge). What survives from this ADR: the budget ledger and its precision disclosure, per-role model routing, the run-report-as-concurrency-lock protocol, the opt-in Slack surface, and the "Conclave gates, an external trigger fires" stance. What does not: auto-merge after QA+TL, serial-per-story delivery on the sprint command, the one-shot `window_start`/`window_end` schedule, and mechanical sprint close from a loop.
- **Deciders**: lucasgio, Iosvany Alvarez, Giolabs, <author>
- **Tags**: autonomous-loop, sprint-orchestration, merge-policy, self-healing, run-report, scheduling, budgets, token-budget, model-routing, slack-opt-in, lean, dual-platform
- **Stack**: Conclave Claude Code / Cursor plugin (markdown commands + prose-orchestrated subagents); target-repo `conclave/` markdown contract; GitHub CLI (`gh`) for PR/CI/merge; `date` for wall-clock accounting; optional Slack Incoming Webhook via env var name in config. Optional external triggers: Claude Code `/loop` (local interval) and `/schedule` (cloud, research preview), Cursor Automations / local interval skill. Docs site: Next.js 16 + Nextra 4 (`site/`). No plugin application runtime.
- **Spec input**: Product intent — complete sprint end-to-end without user interaction (dev → CI watch → QA → TL → merge into `develop` → close sprint → run report → optional Slack), **runnable unattended over a weekend** with configurable max attempts, per-role models, and a hard token budget; prior investigation recommended hybrid lean-first headless Conclave command (not Claude `/goal` / `/schedule` as a dependency, not full somnio-loop port).
- **Implements (when accepted)**: `docs/specs/conclave-sprint-autonomous-loop/spec.md`

## Context

`/conclave-sprint` (v0.7.0+) already drives a sprint in one invocation across four sequential phases (Planning → Dev → QA → PR Review). v0.9.0 forced **autonomous** `/conclave-dev` inside Phase 2 so batch dispatch never hangs on `AskUserQuestion`. Gaps that block a true unattended delivery loop:

1. **One-pass, not self-healing.** A failed CI check, QA `blocked`, or TL `request_changes` leaves the story where it is; the operator must re-run. There is no in-invocation loop of Dev → re-push → re-check → re-gate.
2. **Headless is incomplete.** Phase 1 Planning still asks for dates/facilitator; `/conclave-qa` still asks for CI-job proposals and branch-fetch choices. Phase 2 alone is headless.
3. **Hard “do not merge” guardrail.** `/conclave-sprint`, `/conclave-qa`, and `/conclave-pr-review` all forbid merging. Approval is the terminal automated action; merge is human. Solo/lean users who want overnight delivery need an **opt-in autonomous path** that merges only after QA pass + TL approve.
4. **No sprint close + durable sprint-level report.** `sprint-meta.template.md` still references a planned `/conclave-close-sprint` that was never shipped. There is no `conclave/` artifact summarizing a full autonomous run, and no optional Slack delivery of that report.
5. **Lean vs TL gate tension.** Lean profile sets `peer_pr_review.required: false` (QA pass → `done`). The product intent for this path explicitly wants a **Tech Lead PR Review** before merge — so the autonomous merge path must force the TL gate even when lean would normally skip it.
6. **Cursor parity.** ADR-002 requires dual-platform packaging. Cursor has no Claude `/goal`; the Conclave command must be the source of truth for parity. Do not depend on Claude `/schedule` or port somnio-loop.
7. **No scheduling or spend controls.** The product intent is “start it Friday, read the report Monday.” Today nothing in Conclave says *when* a run may work, and nothing stops a self-healing loop from burning an unbounded number of model tokens across a weekend. Iteration caps alone bound retries per story, not total spend across a sprint, and no artifact records what the run was allowed to consume.

Platform facts relevant to scheduling and budgets:

- **Claude Code** ships `/loop` (local, interval-based, runs while the session is open) and `/schedule` (cloud-triggered, **research preview**). Neither is guaranteed available to every Conclave user, and `/schedule` is Claude-only.
- **Cursor** has Automations and a local interval skill — conceptually equivalent triggers, different surface. There is no Cursor `/schedule`.
- **Token metering is not uniformly readable from inside a markdown-orchestrated command.** Neither runtime guarantees the orchestrator a reliable, in-run, cumulative token counter for itself *and* its subagents. Wall-clock time (`date`) and dispatch counts, by contrast, are exactly measurable in-run.

Codebase facts:

- Integration branch today: `/conclave-dev` detects `main` or `master` (default `main`). Product intent for this path: merge into **`develop`** as the integration/base branch (configurable).
- CI wait already exists for QA UAT: `ceremonies.qa_verification.ci_wait_timeout_minutes` (default `20`).
- Secrets pattern: `testing-environments.md` and config store **env var names only**, never secret values (`SKILL.md` / QA guardrails).
- ADR-001 rejected a *mandatory* Slack webhook for cross-session awareness (no-server philosophy). This ADR’s Slack surface is **opt-in report delivery** after a run — different concern; must remain off by default and never store webhook URLs in markdown.
- Bugs (`BUG-NNN`) are intentionally outside `/conclave-sprint` collection (v0.10.0).
- No automated test suite for plugin markdown (`CLAUDE.md`); smoke is manual.
- Conventions: `CLAUDE.md` + `skills/conclave/SKILL.md` only — no `.rules/` architecture files.

## Decision

**Ship an Autonomous Sprint Loop mode on `/conclave-sprint` (flag + config), lean/solo first, that runs the full delivery loop per story without prompts, merges into the integration branch only after QA + forced TL approval, closes the sprint when every non-retired story is `done`, writes a markdown run report under `conclave/`, and optionally posts that report to Slack via an Incoming Webhook env var.**

**Scheduling and spend are Conclave-owned config, not an external scheduler dependency.** The loop reads a `schedule` window and a `budgets` block from `conclave/config.md`, honors the existing `models:` block for every role dispatch, refuses to start (or drains and stops) outside the window, and hard-stops when a budget is exhausted — always writing the run report. Claude Code `/loop` / `/schedule` and Cursor Automations are documented as **optional triggers** that merely invoke `/conclave-sprint --no-interaction`; the same weekend run must work on both platforms with an operator-run trigger.

Concretely:

### 1. Command surface (locked recommendation)

- **Extend** `/conclave-sprint` with `--no-interaction` / `--headless` (same tokens as `/conclave-dev` v0.9.0).
- Sticky config: `commands.sprint.interactive: false` (default `true` / absent = today’s one-pass, no-merge behavior).
- **No new slash command** (`/conclave-loop`, `/conclave-sprint-loop`) in v1 — discoverability stays on the existing sprint runner; the flag name already means “headless” in Conclave. Docs must state clearly that on `/conclave-sprint` this flag activates **Autonomous Sprint Loop mode** (self-heal + merge + close + report), not merely “quiet one-pass.”

Without the flag / with interactive config: preserve today’s Phase 1–4 one-pass semantics and **Do not merge any PR** guardrail unchanged.

### 2. Version target

Ship as **0.13.0** (minor). Current released baseline: **0.12.0**. Lockstep Claude Code + Cursor manifests and `conclave_version` per ADR-002.

### 3. Orchestration model (lean / solo v1)

1. **Phase 1 — Planning (headless defaults)** if sprint is `draft`: start = today; end = start + sprint length from `ceremonies.md` (fallback 14 days); facilitator = `git config user.name`. Skip full-scrum-only planning questions. Planning failure remains a hard stop.
2. **Per-story serial delivery loop** (v1 default — safer for `develop` merge races than parallel full pipelines):
   - For each non-retired story still not `done`, in sprint story order:
     - **Dev** (always autonomous) → open/update PR against integration branch.
     - **Watch PR checks** (`gh pr checks` / `gh run list`) until green or timeout → on fail, re-dispatch Dev fix (iteration++) until green or max iterations.
     - **QA** (headless defaults at every Ask site) → on fail/block, Dev fix loop, then re-QA.
     - **TL PR Review** (forced on for this mode even if lean has `peer_pr_review.required: false`) → on `request_changes`, Dev fix → re-QA → re-TL.
     - On QA pass + TL approve: **`gh pr merge`** into integration branch; story already `done` from TL path (or ensure `done`); record merge SHA/URL in the run report.
3. When **all** non-retired sprint stories are `done`: set `meta.status: done` (mechanical close; does not invent full Review/Retro ceremonies — lean skips them). Full `/conclave-close-sprint` ceremony remains future work.
4. Write **sprint run report** (markdown) and optionally notify Slack.

**Bugs (`BUG-NNN`)**: out of v1 loop collection — same as `/conclave-sprint` today. Fix via `/conclave-dev BUG-NNN` separately.

**Full-scrum**: out of v1 support matrix (standup/grooming/review/retro automation). Document as future; refuse or warn if `team_profile: full-scrum` and recommend lean/solo for this mode in v1 (or allow run but still skip skippable ceremonies).

### 4. Merge policy change (explicit override)

| Mode | Merge? |
|---|---|
| `/conclave-sprint` (interactive / default) | **No** — existing guardrail |
| `/conclave-qa`, `/conclave-pr-review` standalone | **No** — unchanged |
| `/conclave-sprint --no-interaction` (Autonomous Sprint Loop) | **Yes**, only after QA pass **and** TL approve on that story’s PR |

- Integration branch resolution: `repo.integration_branch` if set; else prefer remote `develop` if it exists; else today’s `main`/`master` detection.
- Default merge method: **squash** (`commands.sprint.merge_method: squash | merge | rebase`, default `squash`); delete head branch after merge.
- Never merge on QA-only pass when TL gate is forced; never merge with failing required checks.

### 5. Forced TL gate for autonomous merge path

For the duration of an Autonomous Sprint Loop run, set **effective** `peer_pr_review = true` even when `config.md` has `peer_pr_review.required: false`. Do **not** permanently rewrite the user’s lean profile in `config.md` (ephemeral override recorded in the run report). Rationale: merging without a second role gate collapses “verify behavior” and “approve architecture/diff” into one verdict — unacceptable for an unattended merge into the integration branch.

### 6. Stop / abort / limits

All numeric limits live in one `commands.sprint.budgets` block (see §12 for the full budget model and token accounting). This supersedes the flat `max_story_iterations` / `pr_checks_timeout_minutes` keys sketched in the first draft of this ADR — nothing has shipped yet, so there is no migration burden.

| Knob | Default | Meaning |
|---|---|---|
| `budgets.max_attempts_per_story` | **3** | Max Dev↔CI / Dev↔QA / Dev↔TL fix cycles per story; then leave story incomplete and continue others |
| `budgets.max_ci_wait_minutes` | **20** (falls back to `ceremonies.qa_verification.ci_wait_timeout_minutes`) | Wait for PR status checks after push before treating CI as failed |
| `budgets.max_total_tokens` | **2000000** | Best-effort cumulative token ceiling for the whole run; exceeding it aborts the run (§12) |
| `budgets.max_wall_clock_hours` | **12** | Exactly-measured elapsed-time ceiling; exceeding it drains and aborts the run |
| `ceremonies.qa_verification.ci_wait_timeout_minutes` | **20** (existing, unchanged) | Still governs `/conclave-qa`'s own UAT CI wait |
| Sprint close | Only if every non-retired story is `done` | Partial completion → report `outcome: partial`, sprint stays `active` |
| Hard abort (stop whole run) | Dirty tree at start; no sprint; Phase 1 failure; missing `gh` when merge required; unresolvable merge conflict on `gh pr merge` after one conflict-abort; outside schedule window (§11); any budget exhausted (§12) | Record in report |
| Mobile `pending_uat` | Treat as story-level stop (cannot complete unattended) | Leave `review`, continue other stories |

**Stop semantics are “graceful drain,” never “kill mid-write.”** When a window elapses or a budget is exhausted, the orchestrator finishes the gate currently in flight (so story frontmatter, PR state, and reports stay consistent), stops dispatching new work, and writes the run report with the specific stop reason. It never leaves a story in a half-written state to save budget.

Re-runs remain safe: story frontmatter + open PRs are the recovery mechanism (same philosophy as today’s sprint runner). A re-run after a budget abort simply picks up where the statuses left off.

### 7. Run report artifact

- Path: `conclave/sprints/SPRINT-NNN/runs/RUN-NNN-<slug-or-timestamp>.md` (monotonic `RUN-NNN` under that sprint; markdown only — preserves `SKILL.md` §2).
- Template: `skills/conclave/templates/sprint-run-report.template.md`.
- Contents (minimum): frontmatter (`id`, `sprint_id`, `started_at`, `finished_at`, `outcome`, `mode`, `runner`, `integration_branch`, `peer_pr_review_forced`, `schedule_window`, `budgets`, `budget_usage`, `models`), summary table per story, attempt counts, PR/merge URLs, stop reasons, Slack delivery status.
- **Written at run start with `outcome: in_progress`, updated in place at run end.** Three reasons: (a) a scheduled/unattended run that dies mid-flight still leaves evidence; (b) budget and schedule aborts are guaranteed to produce a report because the file already exists; (c) it doubles as the **concurrency lock** — a second invocation (e.g. an hourly trigger firing while the previous run is still working) finds an `in_progress` report younger than `max_wall_clock_hours` and refuses with `another autonomous run is in progress`. Updating *this run's own* file in place does not violate the append-only invariant, which protects *prior* runs' artifacts.

### 8. Optional Slack delivery

- Config (opt-in, default off):

```yaml
notifications:
  slack:
    enabled: false
    webhook_env: SLACK_WEBHOOK_URL   # NAME of env var only — never the URL/secret
```

- Delivery: `curl` POST JSON to the resolved env value when `enabled: true` and the env var is set; if enabled but unset/empty → warn, skip, still succeed the Conclave run.
- **Not** Slack MCP as the primary path (availability differs across Claude Code / Cursor; webhook is portable).
- Never write webhook URLs or tokens into `conclave/` markdown.

### 9. Cursor parity

**Same release (0.13.0)** — port `platforms/cursor/commands/conclave-sprint.md`, sync templates/`SKILL.md`, dual smoke. Conclave command is the source of truth; no Claude `/goal` wrapper required for v1.

### 10. Boards

Do not replace or redefine `/conclave-board` or `/conclave-sprint-board`. Loop may optionally remind the operator to refresh boards; no auto-hook required in v1.

### 11. Scheduling — window in Conclave config, trigger outside it

Conclave does **not** embed a scheduler. It owns *when work is allowed to happen*; something else owns *when the command fires*. Two layers, both documented:

**Layer A — the trigger (optional, platform-specific).** Any mechanism that invokes `/conclave-sprint --no-interaction` on a timer:

| Platform | Trigger options |
|---|---|
| Claude Code | `/loop <interval> /conclave-sprint --no-interaction` (local, session must stay open) or `/schedule` (cloud, **research preview** — do not depend on it) |
| Cursor | Automation, or the local interval loop skill, invoking the same command |
| Neither / CI | `cron`, `launchd`, or a GitHub Actions job running the agent CLI — out of scope to ship, documented as possible |

**Layer B — the window (authoritative, Conclave-owned, cross-platform).** `commands.sprint.schedule` declares an ISO-8601 window with explicit offsets:

```yaml
commands:
  sprint:
    schedule:
      window_start: "2026-07-25T09:00:00-03:00"
      window_end:   "2026-07-27T08:00:00-03:00"
      enforce: true        # default true when the block is present
```

Orchestrator behavior:

- **Before start**: `now < window_start` or `now > window_end` → refuse to start, print the window, exit cleanly (exit is *not* an error — a recurring trigger firing outside the window must be a cheap no-op, not a failure alarm). No run report is written for a no-op refusal; the terminal line is enough.
- **Mid-run**: crossing `window_end` → graceful drain (finish in-flight gate, no new dispatch), report `outcome: partial`, stop reason `schedule_window_elapsed`.
- **Escape hatch**: `--ignore-schedule` CLI flag for an ad-hoc run inside a configured window-gated repo. No config knob for this — a flag keeps the bypass visible in the invocation.
- **Absent block** = no window = run whenever invoked (today's behavior).

**Window, not cron, for v1.** A weekend run is naturally a window (“from Friday 21:00 to Monday 07:00”), and a window is unambiguous to evaluate with `date` in prose. Recurrence is delegated to Layer A: an hourly trigger plus a window gate produces “work only during the weekend window, resume automatically after each pause,” which is exactly the requested behavior without Conclave implementing cron semantics. **Cron expressions and recurring windows are explicitly deferred** to a follow-up once real usage shows the window is insufficient.

**The canonical weekend recipe** (documented in the spec and the docs site): set the window + budgets in `config.md`, point an hourly trigger at `/conclave-sprint --no-interaction`, and let the run-report lock prevent overlapping runs. Works identically on Claude Code and Cursor because the only platform-specific part is the trigger.

### 12. Budgets — attempts, CI wait, wall clock, and a best-effort token ceiling

```yaml
commands:
  sprint:
    budgets:
      max_attempts_per_story: 3
      max_ci_wait_minutes: 20
      max_total_tokens: 2000000
      max_wall_clock_hours: 12
```

Budgets are evaluated **between dispatches** (the only points where a markdown orchestrator can act), and each has a defined enforcement strength — stating this honestly matters more than pretending all four are equally precise:

| Budget | Enforcement | Measurement |
|---|---|---|
| `max_attempts_per_story` | **Hard, exact** | Orchestrator counts its own fix cycles |
| `max_ci_wait_minutes` | **Hard, exact** | `date` deltas while polling `gh pr checks` |
| `max_wall_clock_hours` | **Hard, exact** | `date` delta from `started_at` |
| `max_total_tokens` | **Best-effort** | See accounting model below |

**Token accounting model (locked, and deliberately modest).** The orchestrator maintains a **dispatch ledger** in the run report: one row per role dispatch (Dev, QA, TL, Planning), each with an estimated token cost. The estimate comes from `budgets.token_estimates` (per-role defaults documented in the spec, overridable per repo) — a coarse but deterministic and auditable proxy. When the runtime *does* expose real usage for a dispatch (some sessions surface usage data; Cursor and Claude Code differ, and this may change), the real number replaces the estimate for that row and the ledger notes it as `measured` rather than `estimated`.

Hard stop: when the ledger total ≥ `max_total_tokens`, drain and abort with `outcome: aborted_budget`, stop reason `token_budget_exhausted`, and a report line disclosing whether the total was `estimated`, `measured`, or `mixed`.

**Honest limitation, stated in the docs, not buried:** a markdown orchestrator cannot guarantee a byte-accurate token count for itself and its subagents on every platform. `max_total_tokens` is therefore a **guardrail, not a billing control** — treat it as “stop somewhere around here,” and use `max_wall_clock_hours` (exact) as the reliable weekend safety net. Users who need a strict spend cap should also set provider-side limits. Rejecting the budget feature because the measurement is imperfect would be worse: an approximate ceiling that drains gracefully and writes a report is strictly better than no ceiling at all.

**Every budget abort still writes the run report** (guaranteed by the write-at-start design in §7) and still triggers Slack delivery when enabled — a weekend run that stopped early must tell the operator why on Monday morning.

### 13. Model routing in loop mode

The loop **honors the existing `models:` block** (v0.7.0) rather than inventing a parallel configuration:

- Resolve `MODEL_FOR_DEVELOPER` / `MODEL_FOR_QA` / `MODEL_FOR_TL` / `MODEL_FOR_PM` / `MODEL_FOR_SM` / designer / devops exactly as today: `models.overrides.<role>` → `models.default` → parent session model.
- Resolve **once** at loop start, print one line, and record the resolved map in the run-report frontmatter so a Monday-morning reader knows which models produced the merged code.
- Discipline-based routing for Dev (`design` → designer, `devops` → devops, else developer) is unchanged.

No new `commands.sprint.models` block. Model choice is a team-level decision, not a per-command one, and duplicating it would let the two drift. Cost guidance (cheaper model for Dev fix iterations, strongest model for the TL gate that authorizes a merge) belongs in docs and in `budgets.token_estimates`, not in a second schema.

## Alternatives Considered

| Option | Pros | Cons | Fit with detected stack |
|--------|------|------|------------------------|
| **A. Extend `/conclave-sprint --no-interaction` (chosen)** | Matches v0.9 flag pattern; one discoverable entry; backward compatible without flag | Flag semantics richer than “quiet” — must document | Best fit with existing autonomous patterns |
| **B. New `/conclave-sprint-loop` command** | Clearer name for merge+loop | Second command to maintain + dual-platform port; splits mental model from `/conclave-sprint` | Acceptable; deferred — can alias later if docs prove confusing |
| **C. New `/conclave-loop` + somnio-loop port** | Powerful generic loop | Out of scope; Cursor parity harder; methodology drift | Rejected by prior investigation |
| **D. Claude `/goal` wrap only** | Nice Claude DX | Cursor has no `/goal`; breaks ADR-002 parity | Rejected as primary |
| **E. Keep never-merge; only headless one-pass** | Safer | Does not meet locked product intent | Rejected |
| **F. Force-edit lean `peer_pr_review: true` in config.md** | Persistent | Mutates user profile unexpectedly | Rejected — ephemeral override + report note |
| **G. Slack MCP as primary notify** | Rich formatting | Not guaranteed on both platforms | Rejected as primary; webhook+curl chosen |
| **H. Schedule window in `config.md` + external trigger (chosen)** | Same weekend behavior on Claude Code and Cursor; window is trivially evaluable; recurrence delegated to the trigger | Requires the operator to set up a trigger; window without a trigger only *gates*, never *starts* | Fits ADR-002 parity and the no-server philosophy |
| **I. Depend on Claude `/schedule`** | Zero Conclave scheduling code | Research preview, Claude-only — breaks parity and bets the feature on a preview surface | Rejected as a dependency; kept as one documented trigger |
| **J. Cron expression in config for v1** | Familiar, expressive recurrence | Prose-evaluating cron in markdown is error-prone; “this weekend” is a window, not a schedule | Deferred to a follow-up |
| **K. Conclave ships its own daemon / background scheduler** | Fully self-contained | Violates the no-server, local-first philosophy (ADR-001); huge surface for a markdown plugin | Rejected |
| **L. No token budget, only wall clock** | Everything measurable is exact | Wall clock is a poor proxy for spend — a slow CI wait costs nothing, a fast retry storm costs a lot | Rejected — ship both, and disclose the token ceiling's precision |
| **M. Refuse to ship a token budget until exact metering exists** | Never misleads the user | Leaves the loop with no spend guardrail at all for an unattended weekend | Rejected — best-effort + explicit disclosure beats no ceiling |
| **N. New `commands.sprint.models` block** | Per-run model tuning | Duplicates the v0.7.0 `models:` block and invites drift | Rejected — loop honors the existing block |

## Trade-offs

- **Autonomy vs. safety**: merging unattended is powerful and dangerous. Mitigated by forced TL gate, CI green requirement, iteration caps, and opt-in flag (default remains no-merge).
- **Serial vs. parallel throughput**: serial per-story loops are slower but avoid concurrent merges to `develop`. Parallel batch-of-3 remains available in interactive one-pass `/conclave-sprint`.
- **Ephemeral TL force vs. profile honesty**: lean configs still say `peer_pr_review: false` on disk while the loop behaves as if true — must be loud in terminal + run report.
- **Slack opt-in vs. ADR-001**: does not reintroduce a mandatory external dependency; webhook is optional post-run delivery only.
- **Mechanical sprint close vs. full Review/Retro**: lean users get `meta.status: done` without ceremony theater; full-scrum close remains future.
- **Token budget precision vs. usefulness**: an estimated ceiling can stop a run early or late. Accepted deliberately — the alternative (no ceiling on an unattended weekend) is worse, and `max_wall_clock_hours` provides an exact backstop.
- **Window gating vs. “why didn't it run?”**: a trigger firing outside the window exits silently by design, which can look like a broken automation. Mitigated by always printing the resolved window and the reason for the no-op.
- **Config surface growth**: `schedule` + `budgets` + existing `models`/`ceremonies` make `config.md` noticeably larger. Mitigated by keeping every new key optional with documented defaults, and by refusing to add a second models block.

## Technical Gaps

- [ ] Exact `gh pr merge` flags (admin bypass, auto-merge wait) when branch protection requires human — document abort if merge API refuses — Owner: implementer
- [ ] Headless defaults catalog for every `/conclave-qa` and `/conclave-planning` Ask site — Owner: implementer (spec lists them)
- [ ] Conflict strategy when squash-merge fails — abort story, no force-push — Owner: implementer
- [ ] Cursor `AskQuestion` absence already covered by headless mode — verify Task concurrency for serial loop — Owner: implementer
- [ ] **Per-platform token-usage readability** — confirm what, if anything, Claude Code and Cursor expose to an in-run orchestrator; upgrade ledger rows from `estimated` to `measured` wherever possible — Owner: implementer
- [ ] **Calibrate `token_estimates` defaults** from a few real loop runs before publishing them as recommended values — Owner: implementer
- [ ] **Verify the run-report lock** behaves correctly when a trigger fires while a previous run is mid-flight (and when a crashed run leaves a stale `in_progress` older than `max_wall_clock_hours`) — Owner: implementer
- [ ] **Timezone/DST handling** for window comparison — require explicit ISO offsets; document behavior for a window that spans a DST change — Owner: implementer
- [ ] Full-scrum autonomous close (Review/Retro) — **out of v1** — Owner: future ADR
- [ ] Cron / recurring windows — **out of v1** — Owner: future ADR
- [ ] `/conclave-close-sprint` as standalone ceremony command — still planned separately; loop only does mechanical `meta.status: done` — Owner: future

## Coding Proposal

Conventions consulted: `CLAUDE.md` (“Adding a new slash command”), `skills/conclave/SKILL.md` §§2–6, sibling commands `commands/conclave-sprint.md` / `conclave-dev.md` / `conclave-qa.md` / `conclave-pr-review.md`, ADR-002 dual-platform rules, v0.9 autonomous-mode pattern.  
`[inferred from CLAUDE.md / SKILL.md only — no .rules/ or architecture skill found]`

### Command (entry)

Extend `commands/conclave-sprint.md`:

```markdown
---
description: ... Autonomous Sprint Loop via --no-interaction / commands.sprint.interactive: false ...
allowed-tools: ... existing ..., Bash(gh pr merge:*), Bash(gh pr checks:*), Bash(curl:*)
---
# /conclave-sprint [--no-interaction|--headless]
# If INTERACTIVE: today's four-phase one-pass, do-not-merge.
# If not: Autonomous Sprint Loop (planning defaults → per-story self-heal → merge → close → report → optional Slack).
```

### Config / template surface

```yaml
# conclave/config.md (additive — every block optional)
repo:
  integration_branch: develop          # optional; autonomous loop prefers develop if unset+exists

commands:
  sprint:
    interactive: true                  # false = Autonomous Sprint Loop
    merge_method: squash               # squash | merge | rebase
    schedule:                          # optional; omit = run whenever invoked
      window_start: "2026-07-25T09:00:00-03:00"
      window_end:   "2026-07-27T08:00:00-03:00"
      enforce: true
    budgets:
      max_attempts_per_story: 3
      max_ci_wait_minutes: 20
      max_total_tokens: 2000000        # best-effort ceiling (see ADR §12)
      max_wall_clock_hours: 12         # exact ceiling
      token_estimates:                 # optional per-role proxy costs for the ledger
        planning: 60000
        developer: 180000
        qa: 90000
        tech_lead: 70000

models:                                # EXISTING v0.7.0 block — the loop honors it as-is
  default: claude-sonnet-4-6
  overrides:
    developer: claude-haiku-4-5-20251001
    qa: claude-sonnet-4-6
    tech_lead: claude-opus-4-6

notifications:
  slack:
    enabled: false
    webhook_env: SLACK_WEBHOOK_URL     # env var NAME only
```

### Orchestrator contract (prose)

```text
resolve INTERACTIVE from CLI + commands.sprint.interactive
if INTERACTIVE: run legacy phases; forbid merge; exit

# --- schedule gate (ADR §11) ---
if schedule present and enforce and not --ignore-schedule:
  if now outside [window_start, window_end]: print window; exit 0 (no-op, no report)

# --- start-of-run bookkeeping ---
refuse if an in_progress RUN-*.md younger than max_wall_clock_hours exists
MODELS = resolve_models_block()            # ADR §13, existing v0.7.0 chain
BUDGETS = resolve_budgets()                # ADR §12, defaults when absent
write RUN-NNN report with outcome: in_progress, window, budgets, models

EFFECTIVE_PEER_PR_REVIEW = true            # ephemeral
INTEGRATION = resolve_integration_branch()
planning_headless_if_draft()               # ledger += estimate(planning)

for story in ordered_non_retired_incomplete:
  loop until done or attempts == budgets.max_attempts_per_story:
    if budget_or_window_exhausted(): drain and break outer
    dev_autonomous → wait_pr_checks(max_ci_wait_minutes) → qa_headless → tl_review
    ledger += estimate_or_measured(each dispatch)
    on gate fail: continue loop
  if qa+tl ok: gh pr merge --<merge_method> --delete-branch

if all done: meta.status = done
finalize RUN-NNN report (outcome: completed | partial | aborted_budget | aborted)
maybe slack_webhook_curl()                 # also fires on budget/window aborts
```

### Templates

- `skills/conclave/templates/sprint-run-report.template.md` — new.
- Update `config.template.md` with `repo:`, `commands.sprint:`, `notifications.slack:`.

### Module wiring

- `SKILL.md` §3 / §5 / §6 — document Autonomous Sprint Loop, merge-policy exception, forced TL gate, run path.
- Cursor twin + sync (ADR-002).
- Docs EN/ES + CHANGELOG + manifests → **0.13.0** at ship time (not at ADR authoring).

### Rules Fit-Check

| Convention source | Requirement | How the proposal complies |
|---|---|---|
| `SKILL.md` §2 | Markdown only inside `conclave/` | Run reports are `.md` under `sprints/.../runs/` |
| `SKILL.md` §6 | Structural gates Planning + QA | Both still run (headless); never skipped |
| v0.9 autonomous pattern | `--no-interaction` + config interactive flag | Same tokens on `/conclave-sprint` |
| QA/PR guardrails | Env var names, never secrets | Slack `webhook_env` name only |
| ADR-002 | Dual Claude/Cursor | Same-release Cursor port |
| ADR-001 | No mandatory Slack server | Slack default off; opt-in only |
| ADR-001 | Local-first, no daemon | Scheduling is a config window + external trigger; Conclave ships no scheduler |
| v0.7.0 `models:` block | One team-level model config | Loop honors it; no second models schema |
| `SKILL.md` §2 append-only | Never clobber prior artifacts | Only *this* run's report is updated in place; prior `RUN-*.md` untouched |
| Existing sprint guard | Do not merge | Preserved unless Autonomous Sprint Loop mode |

## Acceptance Criteria

- [ ] GIVEN an active lean sprint with 3 `ready` stories and `develop` on origin WHEN `/conclave-sprint --no-interaction` runs THEN each story is developed, CI-watched, QA’d, TL-approved, and squash-merged into `develop` without `AskUserQuestion` `[to be validated]`
- [ ] GIVEN lean `peer_pr_review.required: false` WHEN Autonomous Sprint Loop runs THEN TL review still executes and is recorded as forced in the run report `[to be validated]`
- [ ] GIVEN PR checks fail twice then pass WHEN the loop runs THEN Dev is re-dispatched ≤ `budgets.max_attempts_per_story` and the story can still merge `[to be validated]`
- [ ] GIVEN QA or TL fails until iterations exhaust WHEN the loop finishes THEN sprint stays `active`, report `outcome: partial`, no silent close `[to be validated]`
- [ ] GIVEN all stories `done` WHEN the loop finishes THEN `meta.status: done` and `conclave/sprints/SPRINT-NNN/runs/RUN-*.md` exists `[to be validated]`
- [ ] GIVEN `notifications.slack.enabled: true` and env var set WHEN the run completes THEN a webhook POST is attempted; secrets never appear in `conclave/**` `[to be validated]`
- [ ] GIVEN `/conclave-sprint` without the flag WHEN run THEN behavior matches pre-0.13.0 (no merge) `[to be validated]`
- [ ] GIVEN Cursor package 0.13.0 WHEN the same flag is used THEN parity behavior holds against the same `conclave/` tree `[to be validated]`
- [ ] GIVEN `BUG-NNN` files under `product/bugs/` WHEN the loop collects work THEN bugs are not auto-collected `[to be validated]`
- [ ] GIVEN a `schedule` window and an invocation before `window_start` WHEN the loop is triggered THEN it prints the window, does nothing, exits cleanly, and writes no run report `[to be validated]`
- [ ] GIVEN a run in flight when `window_end` passes WHEN the current gate finishes THEN no new dispatch occurs and the report records `outcome: partial`, stop reason `schedule_window_elapsed` `[to be validated]`
- [ ] GIVEN `--ignore-schedule` on a window-gated repo WHEN the loop runs outside the window THEN it proceeds and the report records the bypass `[to be validated]`
- [ ] GIVEN `budgets.max_total_tokens` reached mid-run WHEN the ledger crosses the ceiling THEN the run drains, writes `outcome: aborted_budget` with the estimated/measured disclosure, and Slack (if enabled) is still notified `[to be validated]`
- [ ] GIVEN `budgets.max_wall_clock_hours` elapsed WHEN the current gate finishes THEN the run drains and reports `wall_clock_exhausted` `[to be validated]`
- [ ] GIVEN a `models:` block with per-role overrides WHEN the loop dispatches Dev/QA/TL THEN each uses its resolved model and the report frontmatter records the resolved map `[to be validated]`
- [ ] GIVEN an `in_progress` run report younger than `max_wall_clock_hours` WHEN a second trigger fires THEN the second invocation refuses without touching story state `[to be validated]`
- [ ] GIVEN no `schedule` and no `budgets` blocks WHEN the loop runs THEN documented defaults apply and behavior matches the pre-amendment design `[to be validated]`

## Consequences

### Positive

- Solo/lean teams can run a full sprint unattended with auditable markdown evidence.
- **A weekend run is a supported, documented product capability** — window + budgets + trigger recipe — instead of an informal “leave it running” hack.
- Merge is explicit, gated, and opt-in — default Conclave stays safe.
- Spend has a ceiling and an audit trail: the run report shows what was budgeted, what was consumed, and how it was measured.
- Reuses v0.9 autonomous Dev, the v0.7.0 `models:` block, and existing QA/TL commands instead of inventing a parallel runtime.
- Cursor parity without Claude-only `/goal` or `/schedule`.

### Negative

- Unattended merge can land bad code if TL/QA subagents err — attempt caps and forced TL mitigate but do not eliminate risk.
- Serial loops are slower than today’s parallel Phase 2/3 batches, which matters more when a wall-clock budget is in play.
- Ephemeral `peer_pr_review` force can surprise lean users who only read `config.md`.
- **The token ceiling is approximate.** Users may read `max_total_tokens` as a billing guarantee; docs must repeatedly frame it as a guardrail.
- Scheduling requires an external trigger the operator sets up per platform — Conclave gates but never starts itself.
- `config.md` grows a `schedule` and a `budgets` block, adding onboarding surface.

### Neutral

- `/conclave-close-sprint` ceremony command remains unshipped; mechanical close is enough for lean v1.
- Interactive `/conclave-sprint` documentation must carefully distinguish one-pass vs loop mode.
- Cron-style recurrence stays a future option; the window + recurring trigger combination covers the requested use case.

### Worked example — the weekend run

`conclave/config.md` on a solo lean repo:

```yaml
commands:
  sprint:
    interactive: false
    merge_method: squash
    schedule:
      window_start: "2026-07-25T19:00:00-03:00"   # Friday evening
      window_end:   "2026-07-27T07:00:00-03:00"   # Monday morning
    budgets:
      max_attempts_per_story: 3
      max_ci_wait_minutes: 20
      max_total_tokens: 2000000
      max_wall_clock_hours: 24
models:
  default: claude-sonnet-4-6
  overrides:
    developer: claude-haiku-4-5-20251001
    tech_lead: claude-opus-4-6
notifications:
  slack:
    enabled: true
    webhook_env: SLACK_WEBHOOK_URL
```

Friday, the operator starts an hourly trigger (Claude Code `/loop`, Cursor Automation, or `cron` running the agent CLI) pointed at `/conclave-sprint --no-interaction`. Every hour the command wakes up:

- before 19:00 Friday or after 07:00 Monday → prints the window and exits, costing nothing;
- inside the window with a run already in flight → refuses on the `in_progress` report lock;
- inside the window and idle → resumes the sprint from current story statuses, developing, watching CI, running QA and the forced TL gate, and squash-merging each story into `develop`.

The run ends when every story is `done` (sprint closes, `outcome: completed`), when a budget is exhausted (`aborted_budget`), or when the window elapses (`partial`). In all three cases `conclave/sprints/SPRINT-NNN/runs/RUN-NNN-*.md` is finalized and posted to Slack, so Monday morning starts with a report rather than an investigation.

## PR / Branch Conflicts

No open PRs conflict with this decision (`gh pr list --state open` returned none at ADR authoring time on `giolabs/conclave`).

Historical local branches (`feat/v0.7.0-model-config-sprint-orchestrator`, `feat/v0.9.0-conclave-dev-autonomous-mode`) are related precedents already merged or superseded; no active HIGH duplicate-intent PR for “autonomous merge sprint loop.”

## Links

- Related: ADR-001 Discipline-Based Team Roles (`docs/adr/ADR-001-discipline-based-roles-and-solo-team-setup.md`) — lean/solo; Slack mandatory rejection (contrast with this ADR’s opt-in notify)
- Related: ADR-002 Dual-Platform Conclave (`docs/adr/ADR-002-cursor-platform-adaptation.md`) — Cursor parity obligation
- Related: ADR-003 Visual Sprint Board (`docs/adr/ADR-003-local-self-contained-visual-sprint-board.md`) — boards remain complementary, not replaced
- Related specs: `docs/specs/conclave-dev-autonomous-mode/spec.md`, `docs/specs/model-config-and-sprint-orchestrator/spec.md` (the `models:` block this loop honors)
- Implementation spec: `docs/specs/conclave-sprint-autonomous-loop/spec.md` — §5.4 schedule gate, §5.5 budget ledger, §10 locked decisions, §11 edge cases
- Optional triggers (documented recipes, not dependencies): Claude Code `/loop` (local interval) and `/schedule` (cloud, research preview); Cursor Automations / local interval skill
