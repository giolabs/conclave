---
name: conclave
description: Scrum methodology for distributed engineering teams that work with Claude Code or Cursor. Use whenever the user wants to run Scrum on a project — initialize the Scrum workspace and run inception (vision, Product Goal, epics, roadmap) from an idea, plan a sprint, close a sprint (review, retro), pick up a user story, or verify acceptance criteria. Trigger on /conclave-*, "start a sprint", "create a backlog", "plan this project as a team", or when the user mentions Scrum roles (Product Owner, Tech Lead, Scrum Master, Developer, QA) in the context of organizing team work. Conclave artifacts live as plain markdown under a visible conclave/ directory at the repo root.
---

# Conclave — Scrum for Claude Code and Cursor Teams

Conclave is the methodology layer this plugin implements: **Scrum, executed by a distributed engineering team where every team member uses Claude Code or Cursor locally, and the shared state is plain markdown committed to git**.

This repository ships **two installable packages** (see ADR-002): the Claude Code plugin at the repo root (`conclave`) and the Cursor plugin under `platforms/cursor/` (`conclave-cursor`). Both read and write the same target-repo `conclave/` contract. This `SKILL.md` is the canonical methodology source; the Cursor package receives a synced copy via `scripts/sync-cursor-platform.sh`.

This skill documents:
1. The Scrum model Conclave assumes
2. The directory layout Conclave reads and writes
3. The role-to-subagent mapping
4. How slash commands invoke role subagents

The slash commands (`/conclave-init`, `/conclave-planning`, `/conclave-close`, etc.) consume this skill for context. Role charters under `agents/` are loaded by name from those slash commands (Claude Code: `skills/conclave/agents/`; Cursor: `platforms/cursor/agents/`).

---

## 1. The Scrum model Conclave assumes

Conclave v2 runs a **reduced Scrum cycle** ("Scrum Lite"): the artifacts and commitments of the Scrum Guide, with the fewest ceremonies that keep the loop closed.

```
/conclave-discovery   optional, once       → docs/product/ package: discovery · tech stack · data model · BLOC · MVP
/conclave-init        inception, once      → vision (Product Goal) · epics (risk: uncertainty, needs_spec, open questions)
                                             · architecture + ADRs · roadmap (how many sprints, spikes ahead of risky epics)
/conclave-roadmap     anytime              → release plan: re-sequence future slots, change the number of sprints
/conclave-spike       anytime              → timeboxed spike story: one question → findings + proposed ADR / draft SPEC
/conclave-spec        before an epic's slot → SPEC-NNN: the epic's technical design, composed from its ADRs
/conclave-adr         anytime              → one architectural decision
/conclave-planning    every sprint start   → refine next roadmap slot into stories · lock sprint
/conclave-dev → /conclave-qa → /conclave-pr-review    build
/conclave-close       every sprint end     → review · retro · velocity · roadmap re-plan
```

Hierarchy: **Product Goal → Epic (`EP-NNN`) → Story (`<PREFIX>-NNN`)**. Refinement is just in time: epics stay coarse until their roadmap slot is planned. There is no standup or grooming ceremony — the board and story statuses are the daily view; refinement happens inside planning.

**Knowledge before code (v2.0.0+).** An epic carries the Tech Lead's risk assessment: `uncertainty` (low / medium / high), `needs_spec`, and open questions. The path from an epic to its stories is:

```
Epic (what · why)  →  Spike(s) (unknowns, timeboxed)  →  ADR(s) (one decision each)  →  SPEC (how: the epic's design)  →  Stories (/conclave-planning)
```

Every step is optional for a well-understood epic and enforced only where the epic says so: `uncertainty: high` → the roadmap schedules `spike:EP-NNN` one slot ahead and planning offers the spike first; `needs_spec: true` → planning requires (or warns about, per `delivery.spec_gate`) an approved SPEC, and refines the stories from its §11 breakdown. A spike is a story (`type: spike`) — planned, sized by its timebox, counted in velocity, verified by QA on its deliverable — but it ships knowledge, not code.

Mapping to Scrum, with a small accommodation for real engineering teams:

| Scrum concept | Conclave term | Notes |
|---|---|---|
| Development Team | **Disciplines: Tech Lead, Frontend, Backend, QA, Designer, DevOps** | Always present in the roster, whether or not they map to six different people (v0.2.0+). This is the primary roster axis — see `conclave/team/roster.md`'s `Discipline` column. |
| Product Owner | **Product Manager (PM)** | An **optional process role** (v0.2.0+), not a discipline — any discipline-holder can additionally carry it. Same responsibilities when someone does (own the backlog, prioritize, define acceptance). We call it PM because most teams in practice do. |
| Scrum Master | **Scrum Master (SM)** | An **optional process role** (v0.2.0+), not a discipline. Facilitates ceremonies, removes blockers, when someone holds it. If nobody does, the Tech Lead and team decide process by consensus. |
| Product Goal | `conclave/product/vision.md` (`product_goal`) | Commitment of the Product Backlog. Written at inception. |
| Epics | `conclave/product/epics/EP-NNN-<slug>.md` | Coarse chunks of value with a binary success criterion. `proposed → active → done \| retired`. |
| Release plan | `conclave/product/roadmap.md` | How many sprints (`horizon`: auto or fixed N), epics and spike entries sequenced into sprint slots, epics beyond the horizon, burnup, forecast against `launch_date`. Re-planned by `/conclave-roadmap`. |
| Spike | Story with `type: spike` | Timeboxed (XS–M) research answering one question; produces `sprints/SPRINT-NNN/spikes/<ID>-findings.md` and, when declared, a proposed ADR or draft SPEC. Run by the Tech Lead. |
| Architecture decision | `conclave/product/adr/ADR-NNN-<slug>.md` | One decision with alternatives and evidence tiers. `proposed → accepted \| superseded`. |
| Technical specification | `conclave/product/specs/SPEC-NNN-<slug>.md` | The design of one epic composed from its ADRs: contracts, data, tests, rollout, story breakdown. `draft → approved \| superseded`. |
| Product Backlog | `conclave/product/backlog.md` | Ordered list of user stories (with their epic). |
| Sprint Backlog | `conclave/sprints/SPRINT-NNN/spec.md` selected stories table | Snapshot at planning time. |
| Sprint Goal | `meta.md` / `planning.md` | One sentence, traceable to the roadmap slot goal. |
| Increment | Stories `done` in the sprint | Listed in `review.md`. Merge state is reported; merging is a human action. |
| Sprint Planning (+ refinement) | `/conclave-planning` | Structural. Refines the slot's epics, sizes against velocity, locks the sprint. |
| Daily Scrum | — | Not a Conclave ceremony. `/conclave-board` + story statuses; blockers raised when they happen. |
| Sprint Review | `/conclave-close` | Structural. Sprint Goal verdict, epic/Product Goal progress, velocity, roadmap re-plan. |
| Sprint Retrospective | `/conclave-close` | When `ceremonies.close.retro: true`. Keep / change / try, ≤ 3 action items into the next planning. |
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
│   ├── ceremonies.md                 # sprint length and ceremony cadence (planning, close)
│   ├── testing-environments.md       # CI env-var/secret NAMES the generated UAT tests read — never real values
│   ├── board.md                      # branding for conclave-board/ (company name, logo, colors) — no secrets
│   └── PR_REVIEW_TEMPLATE.md         # PR review checklist template for team use (written by /conclave-init)
├── product/                          # persists across sprints
│   ├── vision.md                     # problem, personas, Product Goal, metrics, MVP scope (inception)
│   ├── epics/                        # EP-NNN-<slug>.md — one file per epic (inception, /conclave-epic)
│   ├── roadmap.md                    # epics → sprint slots, burnup, forecast (inception, /conclave-close)
│   ├── backlog.md                    # ordered Product Backlog (stories)
│   ├── architecture.md               # living architectural doc (ADR index)
│   ├── adr/                          # ADR-NNN-<slug>.md standalone ADRs (inception, /conclave-adr, /conclave-spec, spikes)
│   ├── specs/                        # SPEC-NNN-<slug>.md technical spec per epic (/conclave-spec, spikes) — v2.0.0+
│   ├── definition-of-ready.md        # team-agreed DoR
│   ├── definition-of-done.md         # team-agreed DoD
│   └── bugs/                         # BUG-NNN-<slug>.md via /conclave-bug report — flat, no index
├── context/                          # frozen snapshots of inputs used (auditable)
│   ├── idea.md                       # raw idea typed at inception (when no document was used)
│   ├── claude-md.snapshot.md
│   ├── skills.inventory.md
│   └── rules.inventory.md
├── report/                           # sprint closing reports and DORA data (v0.16.0+)
│   ├── SPRINT-NNN/
│   │   ├── report.md                 # sprint closing report (written by /conclave-close)
│   │   ├── UAT.md                    # functional UAT guide for the sprint (written by /conclave-close)
│   │   └── dora-data.yml             # DORA raw data snapshot for /conclave-dora to aggregate
│   └── dora/
│       └── DORA-NNN-<period>-<date>.md  # generated by /conclave-dora
├── runs/                             # delivery-loop run reports, only in repos with no sprint at all
│   └── RUN-NNN-dev-loop.md           # written by /conclave-dev --loop on a bug-only repo
└── sprints/
    └── SPRINT-NNN/
        ├── meta.md                   # goal, slot, epics, dates, status (draft|active|closed), velocity
        ├── spec.md                   # sprint plan
        ├── planning.md               # planning ceremony record
        ├── review.md                 # sprint review (/conclave-close)
        ├── retro.md                  # retrospective (/conclave-close, when retro is on)
        ├── stories/
        │   └── US-NNN-<slug>.md
        ├── acceptance/
        │   └── AC-US-NNN.md
        ├── spikes/                   # <PREFIX>-NNN-findings.md — one per spike run (v2.0.0+)
        ├── bugs/                     # QA-detected bugs (v0.16.0+) — BUG-NNN-<slug>.md
        │                             # linked to story + acceptance + PR that introduced them
        │                             # Critical bugs block sprint close
        └── runs/                     # delivery-loop run reports
            └── RUN-NNN-dev-loop.md   # /conclave-dev --loop (v0.15.0+; RUN-NNN-autonomous-loop.md
                                      # files from 0.13.0/0.14.0 stay on disk, never rewritten)
```

Product documentation package written by `/conclave-discovery` (outside `conclave/`, owned by the team, not part of this contract — `/conclave-init` reads it once at inception and `/conclave-planning` reads `03-bloc.md` at every planning):

```
docs/product/                         # default; --out changes it; config.md product_doc_path points here
├── README.md                         # index, frontmatter conclave_product_package: true
├── 00-discovery.md                   # problem, ICP, personas, business model, competitors, UVP, features
├── 01-tech-stack.md                  # choice per layer + rejected alternatives; stack: frontmatter
├── 02-data-model.md                  # ER diagram, entities, structural decisions
├── 03-bloc.md                        # invariants INV-n, use cases UC-n, edge cases EC-n, state machines
└── 04-mvp.md                         # Product Goal, metrics, scope, candidate epics, Sprint 0, sequencing
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
- **One active sprint, closed by a ceremony (v2.0.0+).** Sprint status is `draft → active → closed`. Exactly one sprint is `active`; `/conclave-planning` refuses while one is, and only `/conclave-close` sets `closed` (after the critical-bug gate). v1 `done`/`archived` values are rewritten to `closed` by `/conclave-init --upgrade`.
- **Sprint 0 is `SPRINT-000` (v2.0.0+).** When `sprint.sprint_zero: true` the first sprint is `SPRINT-000`, a walking skeleton of `type: enabler` stories. Otherwise numbering starts at `SPRINT-001`.
- **Epics are the planning unit (v2.0.0+).** `EP-NNN` IDs are monotonic and never reused. Every story created through planning carries `epic: EP-NNN`; `/conclave-planning` only refines stories for epics in the current roadmap slot.
- **Spikes, ADRs and SPECs (v2.0.0+).** A spike is a story with `type: spike`, a `question` and a `timebox` ≤ `delivery.spike_max_timebox`; its PR holds only markdown under `conclave/` (prototypes stay on a lab branch or worktree). ADRs are always written `proposed` and SPECs `draft` by agents; only humans accept an ADR or approve a SPEC (`/conclave-spec approve`). `SPEC-NNN` IDs are monotonic and never reused, like `ADR-NNN`. Epic fields `uncertainty`, `needs_spec`, `spec`, `adrs`, `spikes` are optional — absent means `low`, `false`, none.
- **Release horizon (v2.0.0+).** `sprint.planned_sprints` (`auto` or N) sets how many slots the roadmap holds; with a number, what does not fit is listed under *Beyond the horizon*, never silently dropped. Only `/conclave-init` and `/conclave-roadmap replan` change it.
- **Snapshot context.** Every artifact-generating command writes a fresh snapshot under `conclave/context/` so the artifact is auditable against the inputs that produced it.
- **Reference, don't duplicate.** Stories reference their acceptance file (`See acceptance/AC-<PREFIX>-NNN.md`); sprint spec references `product/definition-of-done.md` rather than copying it.
- **Numbering is sticky.** `SPRINT-NNN` and `<story_prefix>-NNN` IDs increment monotonically and are never reused.
- **`story_prefix` governs story IDs (v1.1.0+).** The `story_prefix` field in `config.md` (default `US`) is the prefix for all story and acceptance file names: `US-001-slug.md` / `AC-US-001.md`, or `TASK-001-slug.md` / `AC-TASK-001.md` if overridden. Set once by `/conclave-init`; hand-edit if the team decides to change it (existing files are not renamed).
- **Vision, epics and roadmap are the planning source of truth (v2.0.0+).** `product_doc_path` is now optional: an existing document — or a `/conclave-discovery` package folder — used as input to inception. `/conclave-init` scans the repo for product documents, scores them on five coverage signals (problem, users, goal/metrics, features/scope, MVP boundary), and offers `/conclave-discovery` when none exists or the chosen one covers fewer than 4. After `/conclave-init`, planning reads `product/vision.md`, `product/epics/`, and `product/roadmap.md`, never the original document.
- **Roster schema degrades gracefully.** A `roster.md` written before v0.2.0 (no `Discipline` column) is not rejected — commands that read it treat every member as `multi`-discipline and print a one-time compatibility hint. No auto-migration is provided; a team opts into discipline-based assignment by re-running `/conclave-init` or hand-editing the roster.
- **UAT config degrades gracefully.** A `testing-environments.md` that doesn't exist yet, or still has every row `TBD` (v0.2.0 installs, or a fresh `/conclave-init` before the team fills it in), is not a hard failure — `/conclave-qa` skips UAT generation entirely and verifies acceptance criteria exactly as it did before v0.3.0.
- **`conclave-board/` (v0.5.0+) is application code, not part of this contract.** `/conclave-board` scaffolds a Next.js app as a *sibling* of `conclave/`, not inside it — the markdown-only invariant above applies only to `conclave/` itself. The board reads `conclave/` but never writes to it.
- **Bugs (v0.10.0+) skip Sprint Planning by design.** A `BUG-NNN` reported via `/conclave-bug report` is written directly in `status: ready` under `conclave/product/bugs/` — not under any `sprints/SPRINT-NNN/`. `/conclave-planning` and `/conclave-sprint` never look inside `conclave/product/bugs/`; a bug is picked up directly via `/conclave-dev BUG-NNN`, and driven all the way to an approved PR via `/conclave-dev --loop BUG-NNN` (v0.15.0+).
- **QA-detected bugs (v0.16.0+) go in the sprint's own bugs folder.** When `/conclave-qa` finds a blocking defect during verification on the integration branch, it writes `BUG-NNN-<slug>.md` to `conclave/sprints/SPRINT-NNN/bugs/` (not `conclave/product/bugs/`). These bugs are linked to the story, acceptance criteria, and the PR that introduced the regression. Critical sprint bugs block `/conclave-close` — the sprint cannot close until they are resolved.
- **`project_language` governs all generated prose (v0.16.0+).** The `project_language` field in `config.md` (ISO 639-1 code, default `es`) is read by every command that generates human-readable markdown. Role subagents receive it as an explicit instruction to write stories, acceptance criteria, reports, bug descriptions, and comments in that language. Stack/code identifiers, DORA metric names, and frontmatter keys remain in English.
- **Sprint close reports and UAT guides** live under `conclave/report/SPRINT-NNN/`. Since v2.0.0 they are generated by `/conclave-close` (previously `/conclave-sprint`), after the critical-bug gate passes, together with `dora-data.yml` for `/conclave-dora`.
- **Velocity feeds capacity (v2.0.0+).** `/conclave-close` records `velocity` (done estimate units) in `meta.md` and a burnup row in `roadmap.md`; `/conclave-planning` sizes the next sprint on the average of the last 3 closed sprints, falling back to `devs × weeks × 5` only before any sprint has closed. `--all` multi-sprint planning was removed in v2.0.0 — the roadmap is the multi-sprint view.
- **Run reports are append-only and double as locks.** `runs/RUN-NNN-*.md` files are never deleted or rewritten by a later run; `RUN-NNN` increments monotonically within its directory. A report with `outcome: in_progress` blocks a second run whose scope overlaps it. `conclave/runs/` exists only as the fallback home for a dev-loop report in a repo that has no `sprints/` at all (bug-only work) — when any sprint exists, reports live under that sprint.
- **No command merges a pull request.** Since v0.15.0 (ADR-006) nothing in Conclave runs `gh pr merge`. QA verification and Tech Lead approval are gates; landing the code is a human action.

---

## 3. Role-to-subagent mapping

Role charters are markdown files under `skills/conclave/agents/`. They have no frontmatter — they are pure prose loaded by slash commands when delegating work.

| Subagent file | Used by |
|---|---|
| `agents/product-manager.md` | `/conclave-discovery` (`00-discovery.md`, `04-mvp.md`), `/conclave-init` (inception: vision + feature epics; upgrade: group existing stories into epics), `/conclave-planning` (Wave 1 refinement: Sprint Goal + stories for the slot's epics), `/conclave-close` (review, including spike outcomes), `/conclave-spec` (scope check of the SPEC against the epic), `/conclave-epic` (new / edit / split), `/conclave-story` (new / edit / split — `retire` is mechanical) |
| `agents/tech-lead.md` | `/conclave-discovery` (`01-tech-stack.md`, `02-data-model.md`, `03-bloc.md`), `/conclave-init` (architecture, initial ADRs, Sprint 0 enabler epic, risk pass over the PM's epics), `/conclave-epic` (risk pass), `/conclave-spike` (spike authoring), `/conclave-spec` (SPEC authoring + any missing ADRs), `/conclave-dev` (**every `type: spike` story**, whatever its discipline — findings, proposed ADR, draft SPEC, docs-only PR), `/conclave-planning` (Wave 1 enabler stories when the slot has an enabler epic, spike stories for `spike:EP-NNN` entries; Wave 2 feasibility + discipline + `SPIKE_NEEDED`), `/conclave-pr-review` (code review + approval), `/conclave-adr` |
| `agents/scrum-master.md` | `/conclave-init` (roadmap: horizon, slots, spike entries), `/conclave-roadmap replan`, `/conclave-planning` (Wave 3 planning record: capacity from velocity, assignments, retro actions), `/conclave-close` (retro), `/conclave-epic` (roadmap insert) |
| `agents/developer.md` | `/conclave-dev US-NNN\|BUG-NNN [US-NNN\|BUG-NNN ...]` (items with `discipline: frontend \| backend \| mobile \| multi`, or unset) — one Agent call per item, ≤ 3 concurrent per batch, story and bug IDs may be mixed in one invocation. For a `BUG-NNN`, reproduces via the bug file's inline Gherkin repro steps before fixing, and the rendered PR body includes `Fixes #<github_issue_number>` (v0.10.0+). **Autonomous mode (v0.9.0+)**: `--no-interaction` CLI flag or `commands.dev.interactive: false` in `config.md` makes the command run headless — no `AskUserQuestion` prompts; defaults or `AUTONOMOUS_ABORT: <reason>`; per-run report appended to the file; ends at `review`, never merges. `/conclave-sprint` Phase 2 always forces autonomous (stories only — see below). **Autonomous Three-Wave Delivery Loop (v0.15.0+)**: `--loop` or `commands.dev.loop: true` takes the active sprint (or the IDs passed) and runs **W1 Dev + green CI → W2 QA → W3 forced TL review**, with any wave failure returning the affected stories to W1; W0 orders the scope by `dependencies:` and serializes file overlaps. Recurring local-time schedule + budgets from `commands.dev.*`, run report `RUN-NNN-dev-loop.md` with token and agent-productivity statistics, Slack templates. Implies autonomous; accepts `BUG-NNN`; **never merges**; never closes a sprint. See ADR-006. |
| `agents/designer.md` | `/conclave-dev US-NNN [US-NNN ...]` (stories with `discipline: design`) |
| `agents/devops.md` | `/conclave-dev US-NNN [US-NNN ...]` (stories with `discipline: devops`) |
| `agents/qa.md` | `/conclave-qa US-NNN\|BUG-NNN [US-NNN\|BUG-NNN ...]` — one Agent call per item, ≤ 3 concurrent per batch, story and bug IDs may be mixed. A bug's repro steps are verified exactly like a story's Gherkin scenarios. A spike's scenarios are checked against its findings report and declared outputs (no UAT, no CI wait). |
| `agents/qa.md` (again) | `/conclave-bug report` (v0.10.0+) — one Agent call per invocation, authors Gherkin repro steps + an advisory severity note from the report's raw input. `/conclave-bug list` is mechanical (frontmatter-only) and skips the agent, same precedent as `/conclave-story retire`. |
| *(all of the above)* | `/conclave-sprint` — sequential four-phase one-pass runner over the build phase (Planning of the next slot if no sprint is active → Dev batch-of-3 → QA batch-of-3 → PR review if `peer_pr_review.required`). Never closes the sprint — that is `/conclave-close`. **Headless one-pass** (`--no-interaction` / `commands.sprint.interactive: false`) is the same pass with documented planning defaults and zero prompts. Neither mode merges, self-heals, reads a schedule, or spends a budget — since v0.15.0 unattended delivery is `/conclave-dev --loop` (ADR-006). Each Agent/Task call uses the role model from `models:`. |
| `agents/product-manager.md` (again) | `/conclave-story <new\|edit\|split>` — one Agent call per invocation. `/conclave-story retire` is mechanical (frontmatter-only) and skips the agent. Available in every `team_mode` (solo, lean, full-scrum). |
| `agents/tech-lead.md` (again) | `/conclave-adr [topic]` — topic-directed mode writes a full ADR to `conclave/product/adr/ADR-NNN-<slug>.md`; discovery mode (no args) proposes 1–3 candidates then authors the picked one. Migrates any pre-0.8.0 inline ADRs in `architecture.md` on first run (per-ADR atomic, resumable, idempotent). Available in every `team_mode`. |
| `agents/tech-lead.md` or `agents/product-manager.md` | `/conclave-dora [--period <type>] [--from <date>] [--to <date>]` (v0.16.0+) — generates a DORA metrics report aggregating sprint close data from `conclave/report/`. Uses TL for `full-scrum` profiles (engineering-depth analysis), PM for `lean`/`solo` profiles (product-centric insights). Lean/solo output omits individual contributor breakdown. |

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
- `product-discovery.template.md`, `product-tech-stack.template.md`, `product-data-model.template.md`, `product-bloc.template.md`, `product-mvp.template.md`, `product-docs-readme.template.md` — the `docs/product/` package written by `/conclave-discovery`
- `vision.template.md` — `product/vision.md`, written at inception by `/conclave-init`
- `epic.template.md` — `product/epics/EP-NNN-<slug>.md`, written by `/conclave-init` and `/conclave-epic`; risk fields (`uncertainty`, `needs_spec`, `spec`, `adrs`, `spikes`, open questions) since v2.0.0
- `tech-spec.template.md` — `product/specs/SPEC-NNN-<slug>.md`, written by `/conclave-spec` (and spikes that declare a `spec` output); approved by `/conclave-spec approve`
- `spike-findings.template.md` — `sprints/SPRINT-NNN/spikes/<PREFIX>-NNN-findings.md`, written by the Tech Lead when `/conclave-dev` runs a `type: spike` story
- `roadmap.template.md` — `product/roadmap.md`, written by `/conclave-init`, updated by `/conclave-planning`, `/conclave-close`, `/conclave-epic`, `/conclave-roadmap`
- `sprint-review.template.md` — `sprints/SPRINT-NNN/review.md`, written by `/conclave-close`
- `retro.template.md` — `sprints/SPRINT-NNN/retro.md`, written by `/conclave-close`
- `sprint-closing-report.template.md`, `sprint-uat-summary.template.md` — `report/SPRINT-NNN/`, written by `/conclave-close`
- `dora-report.template.md` — written by `/conclave-dora`
- `lab-config.template.md`, `lab-test.template.md` — lab tests (`lab_test:` config block)
- `pr-template-github.template.md`, `bug-report-github.template.md`, `pr-review-template-github.template.md` — GitHub/team templates written by `/conclave-init`
References (read by role subagents only in the step that needs them):
- `references/discovery-methodology.md` — 10-step discovery checklist (PM, `/conclave-discovery`)
- `references/tech-stack-decision-tree.md` — adaptive stack heuristics by project type (TL, `/conclave-discovery`)

---

## 6. What is mandatory vs skippable

Conclave separates **structural invariants** (you cannot do Scrum without them) from **ceremonies** (process gates the team chooses to commit to).

### Always required (structural — never skippable)

- **Inception artifacts.** A Product Goal (`vision.md`), epics, and a roadmap. Without them `/conclave-planning` refuses — there is nothing to plan from.
- **A Sprint Plan.** Without a goal and a locked story list, there is no sprint. Enforced by `/conclave-planning` and the existence of `conclave/sprints/SPRINT-NNN/spec.md`.
- **A Sprint Review.** Without inspecting the Increment the sprint never closes, velocity is never recorded, and the next sprint cannot be planned. Enforced by `/conclave-close`, which runs the review in every profile.
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
- **Spikes (`type: spike`, v2.0.0+) reuse this exact state machine.** `/conclave-dev` routes them to the Tech Lead, `review` means the docs-only PR is open, QA checks the findings and declared outputs against the spike's Gherkin, and `done` means the knowledge exists — not that a feature shipped. `outcome: not-answered` can still be `done` when the report is honest about why; `/conclave-close` writes the findings back into the epic.
- **`BUG-NNN` artifacts (v0.10.0+) reuse this exact state machine.** A bug reported via `/conclave-bug report` is written directly in `status: ready` — bugs never pass through `backlog` or Sprint Planning; `/conclave-bug report` is the only way one is created, and it always starts dev-ready. From there it follows the identical path a story does (`/conclave-dev` → `/conclave-qa` → `/conclave-pr-review` if applicable), including `retired` as a manual escape hatch (no `/conclave-bug retire` sub-action yet — hand-edit the frontmatter).

### Skippable per team profile

| Setting | Where it runs | `lean` | `full-scrum` | Key |
|---|---|---|---|---|
| Tech Lead PR approval | `/conclave-pr-review` | off | on | `ceremonies.peer_pr_review.required` |
| Retrospective | inside `/conclave-close` | off | on | `ceremonies.close.retro` |

`custom` sets both keys by hand. The v1 keys `daily_standup`, `backlog_grooming`, `sprint_review`, `sprint_retrospective` were removed in v2.0.0: commands warn once and ignore them; `/conclave-init --upgrade` deletes them and maps `sprint_retrospective.required` to `ceremonies.close.retro`.

The always-required gates (`sprint_planning`, `qa_verification`) cannot be flagged off — attempting to set `required: false` for them is rejected with a clear error.

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

- **Inception.** `/conclave-init` after setup: the PM writes the vision (Product Goal) and feature epics, the TL the architecture, ADRs and Sprint 0 enabler epic, the SM the roadmap. One user checkpoint before anything is written.
- **Roadmap slot.** One row of `roadmap.md`: a future sprint and the epic(s) it pulls stories from. `/conclave-planning` always plans the lowest slot still `planned`.
- **Enabler story.** `type: enabler` — technical work with no direct user (scaffold, CI, integration branch), written as "In order to / We need".
- **Walking skeleton / Sprint 0.** `SPRINT-000`: the enabler stories that leave a repo with a passing test, lint, and CI so feature sprints can be verified from day one.
- **Sprint spec.** The locked plan for one sprint: goal + selected stories + reference to DoD. Lives at `conclave/sprints/SPRINT-NNN/spec.md`.
- **Context snapshot.** A point-in-time copy of `CLAUDE.md`, available skills, and detected rules, written to `conclave/context/` whenever an artifact-generating command runs.
- **`/conclave-discovery`** — optional product-documentation generator (adapted discovery → tech stack → data model + BLOC → MVP flow, no stakeholder phase) that writes `docs/product/`; offered by `/conclave-init` when no product document exists.
- **`/conclave-init`** — setup wizard plus inception (vision, epics, architecture, roadmap). `--upgrade` migrates a v1.x workspace. (`/conclave-spec` was removed in v2.0.0.)
- **`/conclave-planning`** — Sprint Planning for the next roadmap slot, with inline refinement and velocity-based capacity.
- **`/conclave-close`** — Sprint Review + Retro; the only command that closes a sprint.
