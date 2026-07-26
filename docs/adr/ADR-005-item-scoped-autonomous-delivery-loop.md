# ADR-005: Item-Scoped Autonomous Delivery Loop on `/conclave-dev`

- **Status**: superseded by ADR-006 (2026-07-26, never released outside 0.14.0)
- **Date**: 2026-07-25
- **Superseded**: 2026-07-26 — ADR-006 keeps the premise (`/conclave-dev` owns the autonomous delivery loop) and discards the mechanics. Gone: auto-merge after QA+TL, serial item-by-item delivery, the item-only scope, and inheritance from `commands.sprint.*`. Replaced by: three ordered waves (Dev → QA → TL) over the active sprint, no merge at all, a recurring local-time schedule owned by `commands.dev.schedule`, and a run report with agent-productivity statistics. Read this ADR only for the historical reasoning about why the loop belongs on `/conclave-dev` rather than on a new command.
- **Deciders**: lucasgio, Iosvany Alvarez, Giolabs, <author>
- **Tags**: autonomous-loop, dev-command, merge-policy, self-healing, scheduling, budgets, bugs, run-report, lean, dual-platform
- **Stack**: Conclave Claude Code / Cursor plugin (markdown commands + prose-orchestrated subagents); target-repo `conclave/` markdown contract; GitHub CLI (`gh`) for PR/CI/merge; `date` for wall-clock accounting; optional Slack Incoming Webhook via env var name. Optional external triggers: Claude Code `/loop` / `/schedule`, Cursor Automations, `cron`.
- **Extends**: ADR-004 (Autonomous End-to-End Sprint Loop)
- **Implements**: this ADR is implemented directly in 0.14.0 (no separate spec file; ADR-004's spec covers the shared loop machinery)

## Context

ADR-004 shipped the **Autonomous Sprint Loop** in 0.13.0: `/conclave-sprint --no-interaction` runs the full delivery loop (Dev → CI checks → QA → forced Tech Lead review → merge into the integration branch) for every non-retired story in the active sprint, under a schedule window and budgets, and writes a run report.

That surface is **sprint-scoped only**. Three concrete gaps surfaced immediately:

1. **No way to loop a subset.** A solo operator who wants "finish these two stories end to end tonight" must either run the whole sprint loop (touching every non-`done` story) or drive `/conclave-dev` → `/conclave-qa` → `/conclave-pr-review` → manual merge by hand, one gate at a time.
2. **Bugs cannot be looped at all.** `BUG-NNN` artifacts are deliberately outside `/conclave-sprint` collection (v0.10.0, restated in ADR-004). `/conclave-dev` is the *only* command that accepts them, so today a post-merge regression can never be driven to merge autonomously — exactly the case where hands-off delivery is most valuable.
3. **Scheduling is only available at sprint granularity.** The weekend recipe (ADR-004 §11) invokes `/conclave-sprint --no-interaction`. An operator who wants an unattended window for a specific item has no equivalent.

Codebase facts:

- `/conclave-dev` (v0.9.0+) is already headless-capable: `--no-interaction` / `--headless`, `commands.dev.interactive: false`, documented sensible-defaults catalog, `AUTONOMOUS_ABORT:` contract, and a per-item `## Autonomous run —` report appended to the item file.
- `/conclave-dev` already dispatches per-item in concurrent batches of ≤ 3 and already resolves `models:` per discipline.
- The loop machinery from ADR-004 — schedule gate, budget ledger, forced TL gate, merge policy, run report as concurrency lock, Slack opt-in — lives in `commands/conclave-sprint.md` prose plus `sprint-run-report.template.md`. Nothing about it is intrinsically sprint-shaped except sprint collection and sprint close.
- `/conclave-dev`'s hard guardrail today is **"Do not merge the PR"**, matching every interactive path.
- Integration branch resolution already exists in two flavors: `/conclave-dev` Step 4 detects `main`/`master`; ADR-004 added `repo.integration_branch` (prefer `develop`).

## Decision

**Add an opt-in, item-scoped Autonomous Delivery Loop to `/conclave-dev` via `--loop` (config: `commands.dev.loop: true`), reusing ADR-004's loop machinery verbatim — schedule window, budgets, forced Tech Lead gate, merge-after-QA+TL, run report, optional Slack — for exactly the `US-NNN` / `BUG-NNN` IDs passed on the command line.**

Concretely:

### 1. Command surface

- `--loop` on `/conclave-dev`. **Implies `--no-interaction`** (a loop that prompts is not a loop); passing both is a no-op duplicate.
- `--ignore-schedule` bypasses the window for one invocation, same semantics as `/conclave-sprint`.
- Sticky config `commands.dev.loop: false` (default / absent = today's behavior: dev leg only, **never merges**).
- **No new slash command.** `/conclave-dev` already owns "drive these IDs"; the flag narrows *what* the loop covers, not *how* it works.

### 2. Scope semantics (what makes this different from ADR-004)

| Dimension | `/conclave-sprint --no-interaction` (ADR-004) | `/conclave-dev --loop` (this ADR) |
|---|---|---|
| Items | Every non-retired, non-`done` story in the active sprint | **Exactly the IDs passed** |
| Bugs (`BUG-NNN`) | Never collected | **Supported** (primary motivation) |
| Planning | Runs headless Planning when sprint is `draft` | Never runs Planning |
| Sprint close | Closes sprint when all stories `done` | **Never closes the sprint** — prints a hint instead |
| Processing | Serial per story | Serial per item (overrides batch-of-3) |
| Everything else | — | Identical: schedule, budgets, models, forced TL, merge policy, report, Slack |

Sprint close stays sprint-scoped because an item-scoped invocation has no mandate over the sprint's commitment as a whole; inferring "sprint done" from a two-item run would let a narrow command take a ceremony-level action.

### 3. Configuration inheritance

`commands.dev.schedule`, `commands.dev.budgets`, and `commands.dev.merge_method` are optional and **fall back to their `commands.sprint.*` equivalents**, then to the documented defaults. Rationale: an operator who already configured a weekend window and a token ceiling for the sprint loop should not have to duplicate them to loop a single bug. `models:`, `repo.integration_branch`, and `notifications.slack` are shared blocks already — no new schema.

### 4. Merge policy exception, restated

Merging remains forbidden on every interactive path and on `/conclave-dev --no-interaction` **without** `--loop`. In loop mode, a merge is allowed **only** when, for that item's PR: CI checks are green, QA passed, and the Tech Lead approved — with the TL gate **ephemerally forced** even when the lean profile has `peer_pr_review.required: false` (never rewriting `config.md`). No `--admin`, no force-push; a branch-protection refusal ends that item as incomplete.

### 5. Run report

Reuse `sprint-run-report.template.md` with a `scope:` frontmatter field naming the invoked IDs and `mode: autonomous-dev-loop`. Path resolution:

- Active/draft sprint exists → `conclave/sprints/SPRINT-NNN/runs/RUN-NNN-dev-loop.md`
- No sprint at all (bug-only repo) → `conclave/runs/RUN-NNN-dev-loop.md`

Written at start with `outcome: in_progress` so it doubles as the concurrency lock; a second invocation whose scope **intersects** a live run's scope is refused. Non-overlapping scopes may run concurrently — two operators fixing unrelated bugs must not block each other, and the per-item PRs are independent.

The per-item `## Autonomous run —` sections keep being appended by the dev leg, unchanged. The sprint-level report is the loop's audit surface.

### 6. Version target

Ship as **0.14.0** (minor), lockstep Claude Code + Cursor per ADR-002.

## Alternatives Considered

| Alternative | Pro | Con | Verdict |
|---|---|---|---|
| **A. New `/conclave-loop <IDs>` command** | Explicit name for the capability | Third loop surface to document and keep in sync; splits "drive these IDs" across two commands | Rejected |
| **B. Teach `/conclave-sprint` an ID filter** (`/conclave-sprint --no-interaction US-001`) | One loop implementation | Sprint command would have to accept bugs, contradicting v0.10.0's deliberate separation; "sprint" invocation that ignores the sprint is misleading | Rejected |
| **C. `--loop` on `/conclave-dev` (chosen)** | Reuses the command that already owns per-ID dispatch and already accepts bugs; flag opt-in keeps default safe | Two commands now contain loop prose; risk of drift | **Accepted** — drift is mitigated by pointing both at the same config keys, template, and ADR |
| **D. Make `--no-interaction` alone mean "loop"** on `/conclave-dev` | Fewer flags | Silently upgrades an existing, widely-documented 0.9.0 flag from "dev leg, no merge" to "merges to develop" — an unacceptable change in blast radius | Rejected |
| **E. Also close the sprint from the dev loop** | Fewer follow-up commands | A narrow, ID-scoped invocation taking a ceremony action over work it never inspected | Rejected |
| **F. Separate `commands.dev.schedule` / `budgets` with no inheritance** | Explicit per command | Duplicate weekend config; easy to configure one and forget the other | Rejected — inheritance with explicit override wins |
| **G. Allow parallel item pipelines (batch-of-3 through merge)** | Faster | Concurrent merges into the same integration branch invite conflicts nothing is watching; ADR-004 already locked serial | Rejected for v1 |

## Trade-offs

- **Convenience vs. blast radius**: a narrower loop is easier to reach for, which means merges to `develop` become easier to trigger. Mitigated by requiring an explicit `--loop` (or explicit config), the forced TL gate, green CI, and per-item attempt caps.
- **Two loop surfaces**: `/conclave-sprint` and `/conclave-dev` both describe loop behavior. Accepted deliberately; both reference this ADR and ADR-004, and share config keys, the report template, and defaults, so a change lands in one place conceptually.
- **Bug loops merge without sprint traceability**: a `BUG-NNN` merged by the loop is recorded in its own file, its PR, the mirrored GitHub issue, and the run report — but not in any sprint's planning artifacts. That is already true of the bug pipeline (v0.10.0); the loop does not make it worse.
- **Scope-intersection locking is coarser than per-item locking**: two runs sharing one ID out of five are fully serialized. Accepted for simplicity; the alternative (per-item locks) needs a second state surface.

## Consequences

### Positive

- Solo/lean operators can drive a specific story or bug from `ready` to **merged** in one unattended invocation, including over a scheduled window.
- Post-merge regressions (`BUG-NNN`) finally get a hands-off path to merge.
- No new config schema, no new template, no new command; budgets and windows configured once cover both loop surfaces.

### Negative / risks

- More paths that can merge unattended → the operator's `gh` scope and GitHub branch protection matter more. Documented alongside ADR-004's guidance.
- `commands.dev.loop: true` in a committed `config.md` makes *every* `/conclave-dev` invocation in that repo a merging loop. The docs call this out explicitly; the CLI flag is the recommended surface.
- Item-scoped loops can leave a sprint in a half-delivered state with no sprint-level close — intentional, but requires the operator to run `/conclave-sprint --no-interaction` (or close manually) to finish the sprint.

### Neutral

- Interactive `/conclave-dev` and `/conclave-dev --no-interaction` (without `--loop`) are byte-compatible with 0.13.0.
- Cursor parity ships in the same release (ADR-002), including flags, inheritance, and docs.

## Links

- ADR-004 — Autonomous End-to-End Sprint Loop (parent decision; shared machinery)
- `docs/specs/conclave-sprint-autonomous-loop/spec.md` — schedule gate, budget ledger, model routing, report shape
- ADR-002 — Cursor platform adaptation (dual-platform requirement)
- `commands/conclave-dev.md`, `commands/conclave-sprint.md`
- `skills/conclave/templates/sprint-run-report.template.md`, `skills/conclave/templates/config.template.md`
- Docs site: Scheduling (EN/ES), `/conclave-dev`, Configuration reference
