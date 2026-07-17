# Conclave

**Scrum for Claude Code and Cursor teams.**

Conclave is a plugin that brings Scrum methodology to distributed engineering teams. Every Scrum role — Product Manager, Tech Lead, Scrum Master, Developer, QA — gets a specialized AI subagent that helps the human in that role execute their duties. The shared source of truth is plain markdown committed to git inside a visible `conclave/` directory at the root of your project.

This repository ships **two packages** (same `conclave/` contract — [ADR-002](docs/adr/ADR-002-cursor-platform-adaptation.md)):

| Runtime | Package | Install |
|---|---|---|
| **Claude Code** | `conclave` (repo root) | symlink into `~/.claude/plugins/conclave` |
| **Cursor** | `conclave-cursor` (`platforms/cursor/`) | `rsync` into `~/.cursor/plugins/local/conclave-cursor/` |

No central server, no proprietary format, no hidden state. The team coordinates through pull requests. Members can mix Claude Code and Cursor on the same repo.

---

## Install

### Claude Code

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave
```

Restart Claude Code. You should now see `/conclave-init` and `/conclave-spec` in the slash-command list.

### Cursor

**New to Conclave and using only Cursor?** Follow [Cursor from scratch](#cursor-from-scratch) below.

If you already have this repository checked out:

```bash
./scripts/install-cursor-local.sh
# or: rsync -a --delete platforms/cursor/ ~/.cursor/plugins/local/conclave-cursor/
```

Enable third-party/local plugins if required, then **Developer: Reload Window**. Details and Team/Enterprise caveats: [`platforms/cursor/README.md`](platforms/cursor/README.md).

### Cursor from scratch

Two different directories are involved:

| Directory | What it is |
|---|---|
| **Plugin repo** (`conclave`) | Where you install the Cursor package from — once per machine |
| **Your app repo** | Where `/conclave-init` creates `conclave/` — once per project |

**1. Get the plugin (once per machine)**

```bash
git clone https://github.com/giolabs/conclave.git
cd conclave
./scripts/install-cursor-local.sh
```

**2. Activate in Cursor**

1. Enable **Include third-party Plugins, Skills, and other configs** if your Cursor build requires it.
2. Run **Developer: Reload Window**.
3. In Agent chat, confirm `/conclave-init` appears.

On Team/Enterprise, if nothing loads after a correct install, ask your org admin to allow local plugins (`userLocal` may be false).

**3. Bootstrap your project (in your app repo, not the plugin repo)**

```bash
cd /path/to/your-app
```

In Cursor Agent chat:

```text
/conclave-init
/conclave-spec "your product idea"
/conclave-planning
```

Then use `/conclave-dev`, `/conclave-qa`, etc. as usual. You do **not** need Claude Code.

---

## Quick start

In your project repo:

```bash
# 1. Bootstrap the Scrum directory (once)
/conclave-init

# 2. Generate the founding artifacts from your product idea (once per project)
/conclave-spec "REST API for task management with JWT auth"

# 3. Lock the sprint (once per sprint, when you're ready to start)
/conclave-planning

# 4. Each dev picks up their assigned story (one story, or several at once)
/conclave-dev US-001
/conclave-dev US-001 US-002 US-003   # parallel — each gets its own branch and PR

# 5. QA verifies stories when they reach review (one or several at once)
/conclave-qa US-001
/conclave-qa US-001 US-002           # parallel — each verified on its own branch

# 6. Tech Lead approves the PR (only in profiles where peer_pr_review is on)
/conclave-pr-review US-001

# Or: run the entire sprint in one shot (steps 3–6 above, automated)
/conclave-sprint

# Autonomous /conclave-dev — no prompts, run report appended to the story file
/conclave-dev --no-interaction US-042    # ad-hoc CLI override
# Or set commands.dev.interactive: false in conclave/config.md to make it the default

# Mid-sprint story authoring — new, edit, split, retire
/conclave-story new                    # PM authors a new story
/conclave-story edit US-002            # revise a ready story
/conclave-story split US-004           # decompose a story into 2–4 children
/conclave-story retire US-005          # terminal — no LLM call

# Author a Tech Lead ADR
/conclave-adr "Postgres vs Redis for caching"   # topic-directed
/conclave-adr                                    # discovery — TL proposes 1–3 candidates

# Report a bug (post-merge regression) and fix it through the same pipeline
/conclave-bug report "checkout button throws 500 on mobile Safari"
/conclave-bug list                               # the open bug backlog, sorted by severity
/conclave-dev BUG-004                            # reproduces first, then fixes — same as a story
/conclave-qa BUG-004                             # same verification gate as a story
```

`/conclave-spec` invokes the Tech Lead and Product Manager subagents in parallel to produce:

- `conclave/product/backlog.md` — initial Product Backlog
- `conclave/product/architecture.md` — Architectural Foundation with ADRs
- `conclave/sprints/SPRINT-001/` — Sprint 1 draft with stories and Gherkin acceptance criteria

`/conclave-planning` then runs the Sprint Planning ceremony: Scrum Master facilitates, PM validates scope, TL validates feasibility, all in parallel. The output:

- Sprint goal confirmed (one sentence)
- Stories assigned to specific devs
- Definition-of-Ready check per story
- Capacity computed vs commitment
- `conclave/sprints/SPRINT-001/planning.md` — the meeting record
- Sprint status moves from `draft` → `active`

All markdown. All in git. Open it as a PR and let the team review it line by line.

---

## What lives in `conclave/`

```
conclave/
├── README.md                 # explains the directory
├── config.md                 # project type, stack, paths
├── team/
│   ├── roster.md             # who covers which discipline, plus optional PM/SM process roles
│   ├── ceremonies.md         # sprint length, planning day, retro day
│   ├── testing-environments.md # CI env-var/secret NAMES the generated UAT tests read — never real values
│   └── board.md               # branding for conclave-board/ (company name, logo, colors) — no secrets
├── product/                  # persists across sprints
│   ├── backlog.md            # ordered Product Backlog
│   ├── architecture.md       # living architecture doc
│   ├── definition-of-ready.md
│   ├── definition-of-done.md
│   └── bugs/                 # BUG-NNN-<slug>.md — flat, no index file
├── context/                  # frozen snapshots of what fed each spec
└── sprints/
    └── SPRINT-NNN/
        ├── meta.md
        ├── spec.md           # sprint plan
        ├── stories/          # one file per user story
        └── acceptance/       # one file per Gherkin acceptance set
```

---

## Roles and subagents

Every project has six disciplines — Tech Lead, Frontend, Backend, QA, Designer, DevOps — whether or not they map to six different people. Product Manager and Scrum Master are optional **process roles** any discipline-holder can additionally carry, not disciplines themselves.

| Discipline / process role | Conclave subagent | Status |
|---|---|---|
| Tech Lead | `tech-lead` | shipped |
| Frontend | `developer` | shipped |
| Backend | `developer` | shipped |
| QA | `qa` | shipped |
| Designer | `designer` | shipped |
| DevOps | `devops` | shipped |
| Product Manager (process role) | `product-manager` | shipped |
| Scrum Master (process role) | `scrum-master` | shipped |

The subagents are markdown role charters under `skills/conclave/agents/`. Slash commands invoke them by referencing their path in prose, the same pattern `code-review` and `skill-creator` use.

---

## Team profiles — skip what you don't need

Not every team needs every Scrum ceremony. Conclave separates **structural invariants** (sprint planning, acceptance criteria, QA verification, DoD) from **ceremonies the team chooses** (daily standup, backlog grooming, peer PR review, sprint review, retro).

Pick a profile in `conclave/config.md`:

- **`lean`** (default for solo / 2–3-person teams) — only Sprint Planning and QA Verification are enforced. Everything else is silently skippable.
- **`full-scrum`** (default for 4+-person teams) — every ceremony is required.
- **`custom`** — toggle each `ceremonies.*.required` flag individually.

You can change the profile any time by editing `conclave/config.md`. The ceremony commands (`/conclave-standup`, `/conclave-review`, `/conclave-retro`, etc.) read the flags and become silent no-ops when their flag is `false`. The two structural gates (`sprint_planning` and `qa_verification`) cannot be turned off.

### Model configuration (optional)

Assign a specific Claude model to each role subagent. Add a `models:` block to `conclave/config.md`:

```yaml
models:
  default: claude-sonnet-4-6
  overrides:
    tech_lead: claude-opus-4-6      # heavyweight reviews
    developer: claude-haiku-4-5-20251001  # fast bulk dev work
    qa: claude-sonnet-4-6
```

Valid model IDs: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`. Omit the block entirely to keep today's behavior — every Agent call uses the parent session model.

---

## Shipped so far

- `/conclave-init` — bootstrap the `conclave/` workspace, pick a team profile.
- `/conclave-spec <idea>` — produce the Product Backlog, Architectural Foundation, and Sprint 1 draft from an idea plus the project's `CLAUDE.md`, installed Skills, and detected stack signals.
- `/conclave-planning` — run Sprint Planning: confirm the goal, assign stories, validate the DoR, compute capacity, lock the sprint. Profile-aware: depth of the ceremony scales with `team_profile`.
- `/conclave-dev US-NNN` — Developer picks up a story: branches, implements with tests against each Gherkin scenario, opens a PR. Profile-aware peer-review tagging.
- `/conclave-qa US-NNN` — QA verifies a story in `status: review` adversarially: re-derives PASS/FAIL per scenario, probes edge cases, appends a verification report, leaves a PR comment with the verdict. Moves story to `verified` (when TL gate is on) or `done` (when off). **Structurally required — cannot be skipped by any profile.** QA does NOT approve the PR itself. When `conclave/team/testing-environments.md` is configured, QA also generates UAT test artifacts from the story's Gherkin scenarios — a Playwright spec (`frontend`/`multi`), the shared project-wide Postman collection run via Newman (`backend`/`multi`), or a manual functional checklist (`mobile`) — pushes them, and gates the verdict on the target repo's own CI actually running them (never executed locally by QA). A `mobile` checklist awaiting a human produces a distinct `pending_uat` outcome, not a failure.
- `/conclave-pr-review US-NNN` — Tech Lead reviews the code against the architecture, ADRs, and code-level DoD items, then runs `gh pr review --approve` or `--request-changes`. Only runs when `ceremonies.peer_pr_review.required: true`. Story moves from `verified` to `done` on approve.
- `/conclave-board` — one-time scaffold of a local, branded Kanban board (Next.js + shadcn/ui) at `conclave-board/`, a sibling of `conclave/`. Columns mirror the story state machine; cards show ID, title, discipline, assignee, priority, and estimate. A plugin hook regenerates the board's data automatically whenever `conclave/` changes — no CI, no server, no LLM in the update loop. Read-only; never writes back to `conclave/`.

- `/conclave-sprint` — run an entire active sprint end-to-end: planning → dev all ready stories → QA all review stories → Tech Lead PR review (if required). Each phase is profile-aware and failure-isolated per story.
- `/conclave-story <new | edit US-NNN | split US-NNN | retire US-NNN>` — Product Manager mid-sprint story authoring, in every team mode. `new` allocates the next monotonic ID and lands the story in backlog (default) or the active sprint; `edit` revises a `ready`/`backlog` story; `split` decomposes a parent into 2–4 children (with a hard scenario-coverage safety rule enforced by the PM subagent); `retire` is a mechanical status change with no LLM call. Introduces the `retired` terminal state — retired stories are excluded from every command's collection queries.
- `/conclave-adr [topic]` — Tech Lead ADR authoring. Topic-directed: `/conclave-adr "<decision>"` researches and writes a standalone ADR at `conclave/product/adr/ADR-NNN-<slug>.md`. Discovery: `/conclave-adr` (no args) has the TL propose 1–3 candidate decisions from sprint activity + architecture gaps, then authors the one the user picks. On first run in a repo with inline ADRs, migrates them to standalone files (atomic per ADR, resumable, idempotent). Every new ADR is `status: proposed`; the team promotes to `accepted` on PR merge.
- `/conclave-bug <report [text|url] | list>` — report a post-merge bug or list the open backlog. `report` turns free text (or a URL/ID from a connected logging/error-tracking MCP tool, detected generically — never a hardcoded vendor) into a `BUG-NNN` artifact with Gherkin repro steps and an explicit `severity`, mirrors it as a GitHub issue, and hands it straight to `/conclave-dev` — bugs are written directly `ready`, skipping Sprint Planning entirely. `list` is mechanical, no LLM call. `/conclave-dev`/`/conclave-qa` accept `BUG-NNN` IDs anywhere they accept `US-NNN`, including mixed batches; the Developer reproduces a bug via its repro steps before fixing it, and the PR includes `Fixes #<issue>` to auto-close the mirrored issue on merge.

### Autonomous mode for `/conclave-dev` (v0.9.0+)

```bash
# Ad-hoc, one-off
/conclave-dev --no-interaction US-042    # or --headless as a synonym

# Repo default — edit conclave/config.md
# commands:
#   dev:
#     interactive: false

# Sprint runs always use autonomous mode (Phase 2 forces it regardless of config.md)
/conclave-sprint
```

Autonomous mode never calls `AskUserQuestion`. Every prompt site applies a documented default (assignee takeover, branch recreate for stale local branches, branch resume when there is prior story work, refuse when another dev's commits are on the branch); ambiguities without a safe default abort with `AUTONOMOUS_ABORT: <reason>` and reset the story to `status: ready`. Every autonomous run appends a `## Autonomous run — <ISO>` section to the story file with outcome (`done` / `blocked` / `aborted`), decisions taken, files touched, test/lint summary, and blockers if any. This makes `/conclave-sprint` and CI-driven story runs hands-off without giving up auditability.

Sprint closeout ceremonies (review, retro) and stack-specific sub-specs are next.

## Roadmap

- `/conclave-standup` — daily standup logger
- `/conclave-review` and `/conclave-retro` — sprint closeout ceremonies
- `/conclave-groom` — backlog grooming
- `/conclave-dev US-NNN` and `/conclave-qa US-NNN` — per-story loops
- `/conclave-substack <stack>` — cascade Sprint spec into backend / frontend / mobile / devops sub-specs
- Jira / Linear MCP integration
- Pre-commit hook to validate artifact structure
- Velocity tracking and burndown chart generation

---

## License

See [LICENSE](LICENSE).
