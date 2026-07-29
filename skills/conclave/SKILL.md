---
name: conclave
description: Scrum methodology for distributed engineering teams that work with Claude Code or Cursor. Use whenever the user wants to run Scrum on a project — initialize the Scrum workspace, generate a Product Backlog and Architectural Foundation from an idea, plan a sprint, run a ceremony (planning, daily, review, retro), pick up a user story, or verify acceptance criteria. Trigger on /conclave-*, "start a sprint", "create a backlog", "plan this project as a team", or when the user mentions Scrum roles (Product Owner, Tech Lead, Scrum Master, Developer, QA) in the context of organizing team work. Conclave artifacts live as plain markdown under a visible conclave/ directory at the repo root.
---

# Conclave — Scrum for Claude Code and Cursor Teams

Conclave is the methodology layer this plugin implements: **Scrum, executed by a distributed engineering team where every team member uses Claude Code or Cursor locally, and the shared state is plain markdown committed to git**.

This repository ships **two installable packages** (see ADR-002): the Claude Code plugin at the repo root (`conclave`) and the Cursor plugin under `platforms/cursor/` (`conclave-cursor`). Both read and write the same target-repo `conclave/` contract. This `SKILL.md` is the canonical methodology source; the Cursor package receives a synced copy via `scripts/sync-cursor-platform.sh`.

This skill documents:
1. The Scrum model Conclave assumes
2. The directory layout Conclave reads and writes
3. The role-to-subagent mapping
4. How slash commands invoke role subagents

The slash commands (`/conclave-init`, `/conclave-planning`, `/conclave-standup`, etc.) consume this skill for context. Role charters under `agents/` are loaded by name from those slash commands (Claude Code: `skills/conclave/agents/`; Cursor: `platforms/cursor/agents/`).

---

## 1. The Scrum model Conclave assumes

Conclave assumes a standard Scrum setup with a small accommodation for real engineering teams:

| Scrum concept | Conclave term | Notes |
|---|---|---|
| Development Team | **Disciplines: Tech Lead, Frontend, Backend, QA, Designer, DevOps** | Always present in the roster, whether or not they map to six different people (v0.2.0+). This is the primary roster axis — see `conclave/team/roster.md`'s `Discipline` column. |
| Product Owner | **Product Manager (PM)** | An **optional process role** (v0.2.0+), not a discipline — any discipline-holder can additionally carry it. Same responsibilities when someone does (own the backlog, prioritize, define acceptance). We call it PM because most teams in practice do. |
| Scrum Master | **Scrum Master (SM)** | An **optional process role** (v0.2.0+), not a discipline. Facilitates ceremonies, removes blockers, when someone holds it. If nobody does, the Tech Lead and team decide process by consensus. |
| Product Backlog | `conclave/product/backlog.md` | Ordered list of user stories. |
| Sprint Backlog | `conclave/sprints/SPRINT-NNN/spec.md` selected stories table | Snapshot at planning time. |
| Increment | The merged PRs that close stories | Conclave does not track this directly; git does. |
| Sprint Planning | `/conclave-planning` (out of MVP scope) | Locks the sprint. |
| Daily Scrum | `/conclave-standup` per dev (out of MVP scope) | Logs into `sprints/SPRINT-NNN/daily/`. |
| Sprint Review | `/conclave-review` (out of MVP scope) | Demo + acceptance. |
| Sprint Retrospective | `/conclave-retro` (out of MVP scope) | What to keep, change, start. |
| Definition of Ready | `conclave/product/definition-of-ready.md` | Team-customized checklist. |
| Definition of Done | `conclave/product/definition-of-done.md` | Team-customized checklist. |
| User story | One file under `sprints/SPRINT-NNN/stories/` | INVEST format. |
| Acceptance criteria | One file under `sprints/SPRINT-NNN/acceptance/` | Gherkin Given/When/Then. |

---

## 2. Directory layout Conclave reads and writes

At the root of the team's repo:

```
conclave/                             # VISIBLE top-level directory, all markdown
├── README.md                         # explains the directory to anyone browsing on GitHub
├── config.md                         # project type, stack, paths, project_language (frontmatter + prose)
├── team/
│   ├── roster.md                     # team members, discipline(s), optional PM/SM process role(s)
│   ├── ceremonies.md                 # sprint length, planning day, standup time, retro day
│   ├── testing-environments.md       # CI env-var/secret NAMES the generated UAT tests read — never real values
│   ├── board.md                      # branding for conclave-board/ (company name, logo, colors) — no secrets
│   └── PR_REVIEW_TEMPLATE.md         # PR review checklist template for team use (written by /conclave-init)
├── product/                          # persists across sprints
│   ├── backlog.md                    # ordered Product Backlog
│   ├── architecture.md               # living architectural doc (ADRs)
│   ├── definition-of-ready.md        # team-agreed DoR
│   ├── definition-of-done.md         # team-agreed DoD
│   └── bugs/                         # BUG-NNN-<slug>.md via /conclave-bug report — flat, no index
├── context/                          # frozen snapshots of inputs used (auditable)
│   ├── claude-md.snapshot.md
│   ├── skills.inventory.md
│   └── rules.inventory.md
├── report/                           # sprint closing reports and DORA data (v0.16.0+)
│   ├── SPRINT-NNN/
│   │   ├── report.md                 # sprint closing report (written by /conclave-sprint at close)
│   │   ├── UAT.md                    # functional UAT guide for the sprint (written by /conclave-sprint)
│   │   └── dora-data.yml             # DORA raw data snapshot for /conclave-dora to aggregate
│   └── dora/
│       └── DORA-NNN-<period>-<date>.md  # generated by /conclave-dora
├── runs/                             # delivery-loop run reports, only in repos with no sprint at all
│   └── RUN-NNN-dev-loop.md           # written by /conclave-dev --loop on a bug-only repo
└── sprints/
    └── SPRINT-NNN/
        ├── meta.md                   # name, dates, goal, status
        ├── spec.md                   # sprint plan
        ├── planning.md               # planning ceremony record
        ├── stories/
        │   └── US-NNN-<slug>.md
        ├── acceptance/
        │   └── AC-US-NNN.md
        ├── bugs/                     # QA-detected bugs (v0.16.0+) — BUG-NNN-<slug>.md
        │                             # linked to story + acceptance + PR that introduced them
        │                             # Critical bugs block sprint close
        └── runs/                     # delivery-loop run reports
            └── RUN-NNN-dev-loop.md   # /conclave-dev --loop (v0.15.0+; RUN-NNN-autonomous-loop.md
                                      # files from 0.13.0/0.14.0 stay on disk, never rewritten)
```

GitHub templates written by `/conclave-init` (outside `conclave/`, not part of this contract):

```
.github/
├── ISSUE_TEMPLATE/
│   └── bug_report.md                 # GitHub bug report form (Conclave-linked)
└── PULL_REQUEST_TEMPLATE.md          # GitHub PR template (Conclave-linked)
```

### Invariants every Conclave command must respect

- **Markdown only.** Structured data lives in YAML frontmatter at the top of each file. The body below is human-readable prose. No JSON-only files, no SQLite, no binaries.
- **Visible directory.** `conclave/` is committed and renders on GitHub.
- **Append, do not clobber.** A second `/conclave-planning` run on a new sprint creates `SPRINT-002/`, not overwriting `SPRINT-001/`. The backlog is updated additively.
- **Snapshot context.** Every artifact-generating command writes a fresh snapshot under `conclave/context/` so the artifact is auditable against the inputs that produced it.
- **Reference, don't duplicate.** Stories reference their acceptance file (`See acceptance/AC-<PREFIX>-NNN.md`); sprint spec references `product/definition-of-done.md` rather than copying it.
- **Numbering is sticky.** `SPRINT-NNN` and `<story_prefix>-NNN` IDs increment monotonically and are never reused.
- **`story_prefix` governs story IDs (v1.1.0+).** The `story_prefix` field in `config.md` (default `US`) is the prefix for all story and acceptance file names: `US-001-slug.md` / `AC-US-001.md`, or `TASK-001-slug.md` / `AC-TASK-001.md` if overridden. Set once by `/conclave-init`; hand-edit if the team decides to change it (existing files are not renamed).
- **`product_doc_path` is the planning source of truth (v1.1.0+).** The `product_doc_path` field in `config.md` points to the product planning document (e.g. `docs/mvp.md`). `/conclave-planning` reads this file to generate the backlog, architecture, stories, and acceptance criteria. It is set by `/conclave-init` and can be updated to point to a different document at any time.
- **Roster schema degrades gracefully.** A `roster.md` written before v0.2.0 (no `Discipline` column) is not rejected — commands that read it treat every member as `multi`-discipline and print a one-time compatibility hint. No auto-migration is provided; a team opts into discipline-based assignment by re-running `/conclave-init` or hand-editing the roster.
- **UAT config degrades gracefully.** A `testing-environments.md` that doesn't exist yet, or still has every row `TBD` (v0.2.0 installs, or a fresh `/conclave-init` before the team fills it in), is not a hard failure — `/conclave-qa` skips UAT generation entirely and verifies acceptance criteria exactly as it did before v0.3.0.
- **`conclave-board/` (v0.5.0+) is application code, not part of this contract.** `/conclave-board` scaffolds a Next.js app as a *sibling* of `conclave/`, not inside it — the markdown-only invariant above applies only to `conclave/` itself. The board reads `conclave/` but never writes to it.
- **Bugs (v0.10.0+) skip Sprint Planning by design.** A `BUG-NNN` reported via `/conclave-bug report` is written directly in `status: ready` under `conclave/product/bugs/` — not under any `sprints/SPRINT-NNN/`. `/conclave-planning` and `/conclave-sprint` never look inside `conclave/product/bugs/`; a bug is picked up directly via `/conclave-dev BUG-NNN`, and driven all the way to an approved PR via `/conclave-dev --loop BUG-NNN` (v0.15.0+).
- **QA-detected bugs (v0.16.0+) go in the sprint's own bugs folder.** When `/conclave-qa` finds a blocking defect during verification on the integration branch, it writes `BUG-NNN-<slug>.md` to `conclave/sprints/SPRINT-NNN/bugs/` (not `conclave/product/bugs/`). These bugs are linked to the story, acceptance criteria, and the PR that introduced the regression. Critical sprint bugs block `/conclave-sprint` from generating the closing report — the sprint cannot close until they are resolved.
- **`project_language` governs all generated prose (v0.16.0+).** The `project_language` field in `config.md` (ISO 639-1 code, default `es`) is read by every command that generates human-readable markdown. Role subagents receive it as an explicit instruction to write stories, acceptance criteria, reports, bug descriptions, and comments in that language. Stack/code identifiers, DORA metric names, and frontmatter keys remain in English.
- **Sprint close reports and UAT guides (v0.16.0+)** live under `conclave/report/SPRINT-NNN/`. They are generated by `/conclave-sprint` when the sprint closes, after the critical-bug gate passes. The DORA data snapshot (`dora-data.yml`) is also written there for `/conclave-dora` to aggregate.
- **Multi-sprint planning (v0.16.0+, redesigned v1.1.0+).** `/conclave-planning --all` reads the product document, generates stories for all sprints, and plans every sprint in one pass. The first sprint becomes `active`; the rest remain `draft` with their planning records written, ready to be activated when the prior sprint closes.
- **Run reports are append-only and double as locks.** `runs/RUN-NNN-*.md` files are never deleted or rewritten by a later run; `RUN-NNN` increments monotonically within its directory. A report with `outcome: in_progress` blocks a second run whose scope overlaps it. `conclave/runs/` exists only as the fallback home for a dev-loop report in a repo that has no `sprints/` at all (bug-only work) — when any sprint exists, reports live under that sprint.
- **No command merges a pull request.** Since v0.15.0 (ADR-006) nothing in Conclave runs `gh pr merge`. QA verification and Tech Lead approval are gates; landing the code is a human action.

---

## 3. Role-to-subagent mapping

Role charters are markdown files under `skills/conclave/agents/`. They have no frontmatter — they are pure prose loaded by slash commands when delegating work.

| Subagent file | Used by (shipped) | Used by (planned) |
|---|---|---|
| `agents/product-manager.md` | `/conclave-planning` (Phase A: backlog generation from product doc; Phase B: scope review Wave 1), `/conclave-story` (new / edit / split — `retire` is mechanical and skips this agent) | `/conclave-groom`, `/conclave-review` |
| `agents/tech-lead.md` | `/conclave-planning` (Phase A: architectural foundation from product doc; Phase B: feasibility review + discipline assignment, Wave 1), `/conclave-pr-review` (code review + approval), `/conclave-adr` (topic-directed and discovery ADR authoring) | `/conclave-substack` |
| `agents/scrum-master.md` | `/conclave-planning` (facilitator + assignment, Wave 2 — runs after PM/TL) | `/conclave-standup`, `/conclave-review`, `/conclave-retro` |
| `agents/developer.md` | `/conclave-dev US-NNN\|BUG-NNN [US-NNN\|BUG-NNN ...]` (items with `discipline: frontend \| backend \| mobile \| multi`, or unset) — one Agent call per item, ≤ 3 concurrent per batch, story and bug IDs may be mixed in one invocation. For a `BUG-NNN`, reproduces via the bug file's inline Gherkin repro steps before fixing, and the rendered PR body includes `Fixes #<github_issue_number>` (v0.10.0+). **Autonomous mode (v0.9.0+)**: `--no-interaction` CLI flag or `commands.dev.interactive: false` in `config.md` makes the command run headless — no `AskUserQuestion` prompts; defaults or `AUTONOMOUS_ABORT: <reason>`; per-run report appended to the file; ends at `review`, never merges. `/conclave-sprint` Phase 2 always forces autonomous (stories only — see below). **Autonomous Three-Wave Delivery Loop (v0.15.0+)**: `--loop` or `commands.dev.loop: true` takes the active sprint (or the IDs passed) and runs **W1 Dev + green CI → W2 QA → W3 forced TL review**, with any wave failure returning the affected stories to W1; W0 orders the scope by `dependencies:` and serializes file overlaps. Recurring local-time schedule + budgets from `commands.dev.*`, run report `RUN-NNN-dev-loop.md` with token and agent-productivity statistics, Slack templates. Implies autonomous; accepts `BUG-NNN`; **never merges**; never closes a sprint. See ADR-006. | — |
| `agents/designer.md` | `/conclave-dev US-NNN [US-NNN ...]` (stories with `discipline: design`) | — |
| `agents/devops.md` | `/conclave-dev US-NNN [US-NNN ...]` (stories with `discipline: devops`) | — |
| `agents/qa.md` | `/conclave-qa US-NNN\|BUG-NNN [US-NNN\|BUG-NNN ...]` — one Agent call per item, ≤ 3 concurrent per batch, story and bug IDs may be mixed. A bug's repro steps are verified exactly like a story's Gherkin scenarios. | — |
| `agents/qa.md` (again) | `/conclave-bug report` (v0.10.0+) — one Agent call per invocation, authors Gherkin repro steps + an advisory severity note from the report's raw input. `/conclave-bug list` is mechanical (frontmatter-only) and skips the agent, same precedent as `/conclave-story retire`. | — |
| *(all of the above)* | `/conclave-sprint` — sequential four-phase one-pass runner (Planning → Dev batch-of-3 → QA batch-of-3 → PR review if `peer_pr_review.required`). **Headless one-pass** (`--no-interaction` / `commands.sprint.interactive: false`) is the same pass with documented planning defaults and zero prompts. Neither mode merges, self-heals, reads a schedule, or spends a budget — since v0.15.0 unattended delivery is `/conclave-dev --loop` (ADR-006). Each Agent/Task call uses the role model from `models:`. | — |
| `agents/product-manager.md` (again) | `/conclave-story <new\|edit\|split>` — one Agent call per invocation. `/conclave-story retire` is mechanical (frontmatter-only) and skips the agent. Available in every `team_mode` (solo, lean, full-scrum). | — |
| `agents/tech-lead.md` (again) | `/conclave-adr [topic]` — topic-directed mode writes a full ADR to `conclave/product/adr/ADR-NNN-<slug>.md`; discovery mode (no args) proposes 1–3 candidates then authors the picked one. Migrates any pre-0.8.0 inline ADRs in `architecture.md` on first run (per-ADR atomic, resumable, idempotent). Available in every `team_mode`. | — |
| `agents/tech-lead.md` or `agents/product-manager.md` | `/conclave-dora [--period <type>] [--from <date>] [--to <date>]` (v0.16.0+) — generates a DORA metrics report aggregating sprint close data from `conclave/report/`. Uses TL for `full-scrum` profiles (engineering-depth analysis), PM for `lean`/`solo` profiles (product-centric insights). Lean/solo output omits individual contributor breakdown. | — |

**Model configuration (v0.7.0+)**: commands read an optional `models:` block from `conclave/config.md` frontmatter. Resolution per Agent call: `models.overrides.<role>` → `models.default` → parent session model (silent no-op when block is absent). Invalid model name → warn once and fall back. Role keys: `product_manager`, `tech_lead`, `scrum_master`, `developer`, `designer`, `devops`, `qa`.

A slash command delegates by spawning an Agent subagent and passing the **full content of the role charter file** as the system prompt prefix, followed by the task-specific instructions and the context the role needs.

**Multi-story concurrency**: When `/conclave-dev` or `/conclave-qa` is invoked with multiple `US-NNN`/`BUG-NNN` arguments (v0.10.0+ accepts either kind, mixed freely), the orchestrator validates all items upfront (direct file reads — no Agent calls), partitions them into batches of ≤ 3, and issues all Agent calls within a batch in a single message so they run concurrently. Failures are isolated per item: a failed item is reset to `ready` (dev) or left at its last known state (QA) and reported in the final summary table; other items in the batch continue unaffected. `/conclave-pr-review` (single-ID only, no batching) also accepts either `US-NNN` or `BUG-NNN`.

---

## 4. How slash commands invoke role subagents

The orchestration pattern is the same one `code-review` uses: prose instructions inside the slash command's markdown body. There is no DSL.

- **Claude Code**: when the body says *"Spawn a subagent loaded with `skills/conclave/agents/tech-lead.md`…"*, Claude reads the role charter, dispatches an `Agent` tool call with that content as context, and continues when the subagent returns. Two role subagents can run in parallel by issuing both `Agent` tool calls in a single message.
- **Cursor** (`platforms/cursor/`): the same ceremony steps use the `Task` tool (or Cursor custom agents under `agents/<role>.md`) and prefer `AskQuestion` for structured prompts in top-level Agent chat. Methodology and templates are identical (synced from this canonical tree).

---

## 5. Templates

All Conclave-managed artifacts are produced by filling in templates from `skills/conclave/templates/`. The orchestrator reads the template, replaces `{{placeholders}}`, and writes the resulting markdown to the team's `conclave/` directory.

Templates available:
- `conclave-readme.template.md`
- `config.template.md`
- `roster.template.md`
- `ceremonies.template.md`
- `definition-of-ready.template.md`
- `definition-of-done.template.md`
- `product-backlog.template.md`
- `architecture.template.md`
- `sprint-meta.template.md`
- `sprint-spec.template.md`
- `story.template.md`
- `acceptance.template.md`
- `planning.template.md`
- `pr-body.template.md`
- `verification-report.template.md`
- `testing-environments.template.md`
- `uat-report.template.md`
- `board.template.md`
- `adr.template.md`
- `autonomous-run.template.md`
- `bug.template.md`
- `sprint-run-report.template.md` — filled by `/conclave-dev --loop` (`mode: autonomous-dev-three-wave`, `scope: sprint` or the invoked IDs); carries the token ledger, agent-productivity table, conflicts, and the PRs awaiting a human merge
- `slack-loop-success.template.json` — posted when the loop completes with everything approved
- `slack-loop-partial.template.json` — posted when the loop finishes with stories incomplete or drained on budget/schedule
- `slack-loop-hitl.template.json` — posted the moment a blocker needs a human (structural abort, dependency cycle, missing `gh`, attempts exhausted, `pending_uat`)
---

## 6. What is mandatory vs skippable

Conclave separates **structural invariants** (you cannot do Scrum without them) from **ceremonies** (process gates the team chooses to commit to).

### Always required (structural — never skippable)

- **A Sprint Plan.** Without a goal and a locked story list, there is no sprint. Enforced by `/conclave-planning` and the existence of `conclave/sprints/SPRINT-NNN/spec.md`.
- **Acceptance criteria on every story.** Every story file must reference a non-empty `acceptance/AC-US-NNN.md` with Gherkin scenarios. Stories without them fail the DoR.
- **QA verification of acceptance criteria.** Every `done` story carries a verification report appended to its acceptance file. Without this, `done` means nothing. Enforced by `/conclave-qa`.
- **Definition of Done compliance.** The team-customized DoD checklist must be met for every story. The structural items of the DoD are non-negotiable; some items become conditional (see below).

### Who approves the PR (two gates, two roles)

Conclave separates two distinct checks on a finished story:

1. **QA verification** — does the implementation match the acceptance criteria behaviorally? Owned by the QA role, run via `/conclave-qa US-NNN`. Always required.
2. **Tech Lead PR approval** — does the code meet the architecture, ADRs, and code-level DoD items? Owned by the Tech Lead role, run via `/conclave-pr-review US-NNN`. Required only when `ceremonies.peer_pr_review.required: true`.

The two gates do NOT collapse. QA never runs `gh pr review --approve`. The TL does. When the flag is off (typical for `lean`), QA's pass implicitly approves the PR because there is no separate technical gate — **except** in the **three-wave delivery loop** (`/conclave-dev --loop`, v0.15.0+, ADR-006), which **ephemerally forces** TL review for the run without rewriting `config.md`.

**Neither gate authorizes a merge.** Since v0.15.0 no Conclave command runs `gh pr merge`: the loop's terminal state is an approved PR listed in the run report, and a human lands it.

### The three-wave delivery loop: waves, scheduling, budgets (v0.15.0+)

`/conclave-dev --loop` (or `commands.dev.loop: true`) is the only autonomous delivery loop. It runs **W0** conflict ordering, **W1** Dev to green CI, **W2** headless QA, **W3** forced Tech Lead review, and returns any failing story to W1 — a Tech Lead asking for changes invalidates the QA verdict that preceded it, so QA always re-runs after Dev. Waves never overlap; batch-of-3 concurrency exists only inside W1 for stories with no dependency or file overlap between them.

`commands.dev.schedule` is a **recurring local-time gate**: `timezone` (IANA), `days`, `start_time` / `end_time` (may cross midnight), `duration_days`, `active_from`, `enforce`. Outside the window the command no-ops with no writes at all. The pre-0.15.0 `window_start` / `window_end` pair is refused with a migration message rather than reinterpreted. `commands.dev.budgets` caps attempts, CI wait, wall-clock, and a best-effort token ledger; the report discloses whether token totals are `estimated`, `measured`, or `mixed`.

Conclave still ships **no scheduler** — an external trigger (Claude `/loop` / `/schedule`, a Cursor Automation, `cron`) invokes the command and the gate decides whether it does anything. Budget and window aborts still finalize the run report at `SPRINT-NNN/runs/RUN-NNN-dev-loop.md` (or `conclave/runs/` in a repo with no sprint). A report with `outcome: in_progress` is the concurrency lock; two loops with non-overlapping scopes may run at once.

Slack is optional and template-driven: success, partial, and human-in-the-loop. HITL alerts are posted **at the moment** the blocker occurs so the operator can act while the run continues elsewhere. Only the env var *name* lives in config; a delivery failure never fails the run.

The loop requires the GitHub CLI (`gh`) installed and authenticated with repo access (push, PRs, review). Conclave declares the tools it uses but does not install or configure `gh`, and does not manage repository permissions.

### Story status transitions, profile-aware

```
backlog → ready → in-progress → review → [verified] → done
                                              ↘
                                                retired  (parallel terminal — via /conclave-story)
```

- `review → verified`: only happens when `peer_pr_review.required: true`. QA pass moves the story here while waiting for TL approval.
- `review → done`: direct, when `peer_pr_review.required: false`. QA pass and PR approval collapse into the same step.
- `verified → done`: TL approves the PR via `/conclave-pr-review`.
- Any failure: back to `review`. The dev fixes, pushes, then QA re-verifies (and TL re-reviews if applicable).
- **`retired` (v0.8.0+)** — a parallel terminal state to `done`. Entered via `/conclave-story retire` (explicit retirement with `retirement_reason` and `retired_at` set) or `/conclave-story split` (on the parent, when it is decomposed into children — `superseded_by:` also populated). A retired story is **excluded from every command's story collection** (`/conclave-planning`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, `/conclave-sprint`) — it is a historical record only. There is no un-retire command; teams that change their mind hand-edit the frontmatter (git preserves the audit trail). `/conclave-planning` (Phase A) is intentionally exempt from the filter — it authors new stories rather than collecting existing ones.
- **UAT pending (v0.3.0+, no new status value).** When `testing-environments.md` is configured, `/conclave-qa` generates CI-runnable UAT tests (Playwright/Newman for `frontend`/`backend`/`multi`, a manual checklist for `mobile`) and folds the result into its verdict. A `mobile` story whose checklist is awaiting or mid-completion produces `verdict: pending_uat` — the story frontmatter stays `review`, same as a real failure, but the appended section is `## QA pending`, not `## QA blockers`, since nothing has actually failed yet. A failed CI run on the generated tests is treated exactly like a failing Gherkin scenario.
- **`BUG-NNN` artifacts (v0.10.0+) reuse this exact state machine.** A bug reported via `/conclave-bug report` is written directly in `status: ready` — bugs never pass through `backlog` or Sprint Planning; `/conclave-bug report` is the only way one is created, and it always starts dev-ready. From there it follows the identical path a story does (`/conclave-dev` → `/conclave-qa` → `/conclave-pr-review` if applicable), including `retired` as a manual escape hatch (no `/conclave-bug retire` sub-action yet — hand-edit the frontmatter).

### Skippable per team profile

The team chooses a profile in `conclave/config.md` (`team_profile: lean | full-scrum | custom`) and Conclave's ceremony commands read it. Skipped ceremonies are silently a no-op; required ceremonies are enforced.

| Ceremony | Command | `lean` default | `full-scrum` default | Notes |
|---|---|---|---|---|
| Daily Standup | `/conclave-standup` | off | on | Logs to `sprints/SPRINT-NNN/daily/`. |
| Backlog Grooming | `/conclave-groom` | off | on | When off, grooming happens inside `/conclave-planning`. |
| Peer PR Review | (DoD check) | off | on | Solo devs and small teams often skip this. The Dev agent still self-reviews. |
| Sprint Review | `/conclave-review` | off | on | Required when there are stakeholders to demo to. |
| Sprint Retrospective | `/conclave-retro` | off | on | First thing to get dropped under pressure; team should opt back in when it stabilizes. |

### Profile semantics

- **`lean`** — only the structural invariants are enforced. Intended for solo devs, very small teams (2–3), and internal/tooling work.
- **`full-scrum`** — every ceremony is required. Intended for cross-functional teams that ship to external stakeholders.
- **`custom`** — the team sets each `ceremonies.*.required` flag individually. The profile is recorded as `custom` so it is obvious nobody is following a preset.

### How commands respect the profile

When a future ceremony command runs (e.g. `/conclave-standup`), the first thing it does is read `conclave/config.md` and check its `required:` flag.

- If `required: true`, the command runs normally.
- If `required: false` and the user invoked the command explicitly, it still runs but prints a hint that it is optional in this profile.
- If `required: false` and the command is triggered indirectly (e.g. as a step inside `/conclave-close-sprint`), it is skipped silently.

The two always-required gates (`sprint_planning`, `qa_verification`) cannot be flagged off — attempting to set `required: false` for them is rejected with a clear error.

---

## 7. Visual boards

Conclave ships **two complementary boards**. Neither replaces the other; neither writes story/sprint source-of-truth under `conclave/` (except `/conclave-board` may create `team/board.md` once).

### 7.1 Status Kanban — `/conclave-board` (v0.5.0+)

`/conclave-board` is **not** a prose-orchestrated subagent — it's a one-time scaffold plus a deterministic background sync, with no `Agent`/`Task` call anywhere in its update loop:

- **Scaffold, once**: copies a Next.js + shadcn/ui boilerplate into `conclave-board/` (a sibling of `conclave/`) and renders `conclave/team/board.md` for branding. A second run refuses, same idempotency posture as `/conclave-init`.
- **Stay current, automatically**: a `PostToolUse` / Cursor `afterFileEdit` hook re-runs `conclave-board/scripts/generate-data.mjs` when paths under `conclave/` change and a board is scaffolded.
- **Read-only** toward stories: status changes still only happen through `/conclave-dev`, `/conclave-qa`, and `/conclave-pr-review`.
- **Local only**: no CI pipeline, no hosting, no cross-machine sync.

See `docs/specs/conclave-board/spec.md`.

## Glossary

- **Founding artifacts.** The minimum set a team needs to start working in Scrum: roster, ceremonies, DoR, DoD, Product Backlog, Architectural Foundation, and Sprint 1 plan. Conclave's MVP produces all of these.
- **Sprint spec.** The locked plan for one sprint: goal + selected stories + reference to DoD. Lives at `conclave/sprints/SPRINT-NNN/spec.md`.
- **Context snapshot.** A point-in-time copy of `CLAUDE.md`, available skills, and detected rules, written to `conclave/context/` whenever an artifact-generating command runs.
- **Setup wizard.** `/conclave-init` — one-time project initialization wizard (no AI agents). Collects project name, story prefix, stack, launch date, and product document path. Creates the workspace. (`/conclave-spec` is a deprecated alias that redirects here.)
- **Sprint planner.** `/conclave-planning` — reads the product document and generates the full backlog, architectural foundation, stories, and acceptance criteria (Phase A, first run only), then runs the planning ceremony and activates the sprint (Phase B, every run). Use `--all` to plan every sprint from the document at once.
