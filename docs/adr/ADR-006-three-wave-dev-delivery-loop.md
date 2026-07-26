# ADR-006: Three-Wave Autonomous Delivery Loop on `/conclave-dev`, Without Auto-Merge

- **Status**: accepted
- **Date**: 2026-07-26
- **Deciders**: lucasgio, Iosvany Alvarez, Giolabs, <author>
- **Tags**: autonomous-loop, waves, dev-command, merge-policy, human-in-the-loop, scheduling, recurring-window, budgets, run-report, agent-productivity, slack-templates, conflict-detection, dual-platform
- **Stack**: Conclave Claude Code / Cursor plugin (markdown commands + prose-orchestrated subagents); target-repo `conclave/` markdown contract; GitHub CLI (`gh`) for PR/CI/review; `date` + IANA timezone for local-time gating; optional Slack Incoming Webhook via env var name. External triggers only: Claude Code `/loop` / `/schedule`, Cursor Automations, `cron`.
- **Supersedes**: ADR-005 (item-scoped loop that merged), and the delivery-loop semantics of ADR-004
- **Implements**: this ADR is implemented directly in 0.15.0; ADR-004's spec (`docs/specs/conclave-sprint-autonomous-loop/spec.md`) remains the reference for the shared budget/ledger machinery

## Context

Two loop surfaces shipped in quick succession:

- **ADR-004 (0.13.0)** — `/conclave-sprint --no-interaction`: serial per story, Dev → CI → QA → forced TL → **merge** into the integration branch, then close the sprint.
- **ADR-005 (0.14.0)** — `/conclave-dev --loop <IDs>`: the same machinery narrowed to the invoked IDs, also merging.

Operating that design surfaced four problems:

1. **Auto-merge is the wrong terminal state.** Both loops end by merging into `develop`. In practice the person who owns the branch wants to read the PRs before they land — an approved PR is a fine unattended outcome, a merged one is not. Merge is the single irreversible action in the pipeline, and it is the one an unattended run should not take.
2. **Two loop surfaces that only differ in scope.** ADR-005 explicitly accepted "two loop surfaces, drift is mitigated by shared config". That mitigation held for a week; the real cost is that every change to the pipeline has to be written twice, and users have to learn which command merges what.
3. **Serial-per-story hides the gate structure.** Both loops walk a single story all the way to the end before starting the next. That makes QA and TL invisible as *phases*: there is no point at which "all the code is written" or "everything QA touched is verified" is true, so a human reading the run cannot tell where the sprint slice actually stands. It also means a TL that would have batched five related PRs reviews them one at a time, out of context.
4. **The schedule window is a one-shot ISO pair.** `window_start` / `window_end` describes exactly one weekend. Re-running next weekend means editing two timestamps. There is no way to express "Friday through Sunday, 19:00 to 07:00, local time, for the next three days", which is the actual shape of the request.

Additional gaps carried over from ADR-004/005:

- **No conflict awareness between stories.** `dependencies: []` exists on `story.template.md` and `/conclave-planning` asks the Tech Lead to list cross-story dependencies, but no loop reads either. Two stories touching the same file are dispatched with nothing watching.
- **The run report is thin.** It records outcome, attempts, and a token ledger, but nothing about *how the agents performed*: first-pass success, rework caused by QA or TL, tokens attributable per role, cycle time.
- **Slack is a bare `curl` with a `text` string.** There is no distinction between "the loop finished, here is what to merge" and "the loop is stuck and needs a human right now", and the latter is only sent at finalize — long after the operator could have acted.

Platform facts unchanged from ADR-004: neither Claude Code nor Cursor guarantees an in-run cumulative token counter, so token totals stay best-effort with disclosed precision, while wall-clock and dispatch counts are exact. Conclave still ships no scheduler; an external trigger invokes the command.

## Decision

**Make `/conclave-dev --loop` the single autonomous delivery loop. It runs three ordered waves over the active sprint — Wave 1 Dev (+ green CI), Wave 2 QA, Wave 3 Tech Lead review — never merges, and leaves approved PRs for a human. Failure in any wave sends the affected stories back to Wave 1. Scheduling becomes a recurring local-time window (days, hours, timezone, campaign length), and the run report becomes the loop's full audit surface, including agent-productivity statistics. Slack notifications move to versioned templates with a distinct human-in-the-loop alert emitted at the moment of the blocking event.**

Concretely:

### 1. Waves replace serial-per-story

| Wave | Work | Advances when | On failure |
|---|---|---|---|
| **W0 — Conflict analysis** | Order the scope by declared `dependencies:`; serialize stories that would touch the same paths | An execution order exists | Dependency cycle → hard abort with the cycle named |
| **W1 — Dev** | Autonomous dev leg per story: implement, push, open PR, poll CI to green | Every in-scope story is `review` with green checks | Retry Dev up to `max_attempts_per_story`; a structural `AUTONOMOUS_ABORT` marks the story incomplete without burning retries |
| **W2 — QA** | Headless `/conclave-qa` per story | Every story is `verified` | Only the failing stories return to W1 |
| **W3 — TL** | `/conclave-pr-review` per story | Every story is `done` with an approving review | Failing stories return to **W1**, then re-enter W2 → W3 |

A wave starts only when the previous wave has resolved for every story still in scope. Within W1, independent stories may run in batches of ≤ 3; stories never run concurrently *across* waves.

**Rollback is always to Wave 1.** A Tech Lead asking for changes is asking for code to change, and code changes invalidate the QA verdict that preceded them. Sending a TL rejection back to QA alone would re-verify behavior against code that nobody had fixed yet.

### 2. No merge, ever

No Conclave path runs `gh pr merge`. The loop's terminal state is: stories `done`, PRs open with an approving review, listed in the report and the Slack message with their URLs. The human merges.

This removes the merge-policy exception ADR-004 introduced and ADR-005 widened. `repo.integration_branch` keeps its meaning as the **base branch for PRs**.

### 3. `/conclave-sprint` stops being a delivery loop

`--no-interaction` / `commands.sprint.interactive: false` reverts to **headless one-pass**: planning defaults, then batched Dev/QA/TL, no self-heal, no schedule gate, no budgets, no merge. It prints a line pointing at `/conclave-dev --loop`. Interactive `/conclave-sprint` is unchanged.

The sprint command keeps ownership of sprint close; the loop never closes a sprint.

### 4. Recurring schedule in local time

`commands.dev.schedule` replaces the ISO pair with `timezone` (IANA), `days` (`mon`..`sun`), `start_time` / `end_time` (local wall clock, may cross midnight), `duration_days`, `active_from`, `enforce`. A firing is eligible only when the local date is inside the campaign, the weekday is listed, and the local time is inside the window. Outside → exit 0, one line, no writes, no report.

The legacy `window_start` / `window_end` schema is **not** honored by the delivery loop: it warns once and refuses to infer a recurring window from a one-shot pair. Guessing "every day at these hours, forever" from two timestamps would silently widen an unattended, token-spending run.

### 5. The run report carries productivity statistics

One report per invocation covers the whole loop including re-entries: token ledger per dispatch (wave, story, role, model, estimated vs measured), budget usage, per-role productivity (dispatches, first-pass success rate, rework count, tokens per story, outcome mix), per-story cycle time and re-entry counts, conflicts resolved, and the list of PRs awaiting human merge. `mode: autonomous-dev-three-wave`, `sprint_closed: false` always.

### 6. Slack templates, with HITL emitted immediately

Three versioned templates — success, partial, human-in-the-loop — rendered into Block Kit. HITL alerts fire **at the moment** the blocking condition occurs (structural abort, dependency cycle, another dev's commits, missing `gh`, attempts exhausted, `pending_uat`), not only at finalize, so the operator can act while the run continues on other stories. Only the env var *name* lives in config; a delivery failure never fails the run.

### 7. Version target

Ship as **0.15.0** (minor). Lockstep Claude Code + Cursor per ADR-002.

## Alternatives Considered

| Alternative | Pro | Con | Verdict |
|---|---|---|---|
| **A. Keep auto-merge behind a flag** (`--merge`) | Preserves 0.13.0/0.14.0 behavior for whoever wanted it | Keeps the irreversible action in an unattended path and forces every guardrail, doc, and report field about merging to stay; the request was explicitly "no auto-merge" | Rejected |
| **B. Keep both loops, add waves to each** | No deprecation churn | Doubles the wave prose in two commands — exactly the drift ADR-005 accepted and this ADR is paying off | Rejected |
| **C. Waves on `/conclave-dev`, sprint loop deprecated (chosen)** | One pipeline, one place to change it; gate structure visible; sprint command keeps ceremony ownership | Breaking change for 0.13.0/0.14.0 users; "dev" now drives QA and TL | **Accepted** |
| **D. TL rejection returns to Wave 2 (QA)** | Cheaper — skips a Dev dispatch when the TL's objection is non-functional | QA would re-verify code that has not changed; the loop would report `verified` against a state the TL rejected | Rejected (decision 2A) |
| **E. Fully parallel stories across all waves** | Fastest wall-clock | Concurrent QA/TL on interdependent branches with no conflict watcher; and waves stop meaning anything | Rejected — batch ≤ 3 inside W1 only |
| **F. Cron-expression schedule** (`"0 19 * * 5,6,0"`) | Compact, familiar to ops | Unreadable for the solo/lean audience, no natural place for `duration_days`, and no timezone without a second field anyway | Rejected in favor of explicit `days` / `start_time` / `end_time` / `timezone` |
| **G. Auto-migrate legacy `window_start`/`window_end`** | No config edit on upgrade | Inferring a recurring window from a one-shot pair silently widens an unattended spend | Rejected — warn and require the new schema |
| **H. Infer conflicts by pre-reading the codebase** | Catches overlaps before any dispatch | Requires a repo-wide static analysis Conclave has no business owning; declared `dependencies:` plus observed touched paths is the honest signal | Rejected for v1 |

## Trade-offs

- **Breaking change vs. coherence.** Users on 0.13.0/0.14.0 who configured a merging loop get a loop that stops one step earlier and a config schema that moved. The alternative was carrying two loop surfaces and a merge exception nobody wanted.
- **Waves cost wall-clock.** Waiting for every story to clear W1 before starting W2 is slower than pipelining. It buys a legible state at each boundary and a TL that reviews a coherent batch.
- **Rollback to W1 is conservative.** A purely cosmetic TL comment still costs a Dev dispatch. Cheaper than reporting a QA verdict that no longer matches the code.
- **Conflict detection is best-effort.** Declared dependencies are reliable; path overlap is observed after the fact. Conclave serializes what it can see and records what it did in the report rather than claiming a guarantee.
- **Productivity statistics inherit token imprecision.** "Tokens per story per role" is only as good as the ledger. The report labels precision; the metrics that matter for process health (first-pass rate, rework count, cycle time) are exact.

## Consequences

### Positive

- One command, one pipeline, one config surface for unattended delivery.
- The irreversible step stays with a human; an unattended run can at worst leave approved PRs.
- Wave boundaries make sprint state legible: "all code written", "all verified", "all approved".
- A weekend campaign is expressible once, in local time, and reusable.
- The report answers process questions (where is rework coming from, which role burns budget) that the previous one could not.
- HITL alerts reach Slack when the block happens, not hours later.

### Negative / risks

- Breaking change for 0.13.0/0.14.0 installs: `commands.dev.schedule` must be rewritten, and merging stops happening.
- `/conclave-sprint --no-interaction` loses self-heal — users who relied on it must switch commands.
- More Slack traffic: a noisy repo can generate several HITL messages per run. Mitigated by the per-event-type toggles.
- Waves make a single blocked story delay the whole scope's progression to the next wave; the report's per-story table is what keeps that visible.

### Neutral

- Interactive `/conclave-dev` and `/conclave-dev --no-interaction` (no `--loop`) are unchanged: they end at `review`.
- Budgets, model routing, the report-as-lock protocol, and the "external trigger only" stance carry over from ADR-004 unchanged.
- Cursor parity ships in the same release (ADR-002).

## Links

- ADR-004 — Autonomous End-to-End Sprint Loop (delivery-loop semantics superseded here; budget/ledger machinery retained)
- ADR-005 — Item-Scoped Autonomous Delivery Loop (superseded in full)
- ADR-002 — Cursor platform adaptation (dual-platform requirement)
- `docs/specs/conclave-sprint-autonomous-loop/spec.md` — budget ledger, model routing, report shape
- `commands/conclave-dev.md`, `commands/conclave-sprint.md`
- `skills/conclave/templates/sprint-run-report.template.md`, `skills/conclave/templates/config.template.md`
- `skills/conclave/templates/slack-loop-{success,partial,hitl}.template.json`
- Docs site: Scheduling (EN/ES), `/conclave-dev`, Configuration reference
