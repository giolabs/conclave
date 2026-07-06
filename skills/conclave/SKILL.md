---
name: conclave
description: Scrum methodology for distributed engineering teams that work with Claude Code. Use whenever the user wants to run Scrum on a project — initialize the Scrum workspace, generate a Product Backlog and Architectural Foundation from an idea, plan a sprint, run a ceremony (planning, daily, review, retro), pick up a user story, or verify acceptance criteria. Trigger on /conclave-*, "start a sprint", "create a backlog", "plan this project as a team", or when the user mentions Scrum roles (Product Owner, Tech Lead, Scrum Master, Developer, QA) in the context of organizing team work. Conclave artifacts live as plain markdown under a visible conclave/ directory at the repo root.
---

# Conclave — Scrum for Claude Code Teams

Conclave is the methodology layer this plugin implements: **Scrum, executed by a distributed engineering team where every team member uses Claude Code locally, and the shared state is plain markdown committed to git**.

This skill documents:
1. The Scrum model Conclave assumes
2. The directory layout Conclave reads and writes
3. The role-to-subagent mapping
4. How slash commands invoke role subagents

The slash commands (`/conclave-init`, `/conclave-spec`, and later `/conclave-planning`, `/conclave-standup`, etc.) consume this skill for context. Role charters under `agents/` are loaded by name from those slash commands.

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
├── config.md                         # project type, stack, paths (frontmatter + prose)
├── team/
│   ├── roster.md                     # team members, discipline(s), optional PM/SM process role(s)
│   ├── ceremonies.md                 # sprint length, planning day, standup time, retro day
│   ├── testing-environments.md       # CI env-var/secret NAMES the generated UAT tests read — never real values
│   └── board.md                      # branding for conclave-board/ (company name, logo, colors) — no secrets
├── product/                          # persists across sprints
│   ├── backlog.md                    # ordered Product Backlog
│   ├── architecture.md               # living architectural doc (ADRs)
│   ├── definition-of-ready.md        # team-agreed DoR
│   └── definition-of-done.md         # team-agreed DoD
├── context/                          # frozen snapshots of inputs used (auditable)
│   ├── claude-md.snapshot.md
│   ├── skills.inventory.md
│   └── rules.inventory.md
└── sprints/
    └── SPRINT-NNN/
        ├── meta.md                   # name, dates, goal, status
        ├── spec.md                   # sprint plan
        ├── stories/
        │   └── US-NNN-<slug>.md
        └── acceptance/
            └── AC-US-NNN.md
```

### Invariants every Conclave command must respect

- **Markdown only.** Structured data lives in YAML frontmatter at the top of each file. The body below is human-readable prose. No JSON-only files, no SQLite, no binaries.
- **Visible directory.** `conclave/` is committed and renders on GitHub.
- **Append, do not clobber.** A second `/conclave-spec` run creates `SPRINT-002/`, not overwriting `SPRINT-001/`. It updates `product/backlog.md` additively.
- **Snapshot context.** Every artifact-generating command writes a fresh snapshot under `conclave/context/` so the artifact is auditable against the inputs that produced it.
- **Reference, don't duplicate.** Stories reference their acceptance file (`See acceptance/AC-US-NNN.md`); sprint spec references `product/definition-of-done.md` rather than copying it.
- **Numbering is sticky.** `SPRINT-NNN` and `US-NNN` IDs increment monotonically and are never reused.
- **Roster schema degrades gracefully.** A `roster.md` written before v0.2.0 (no `Discipline` column) is not rejected — commands that read it treat every member as `multi`-discipline and print a one-time compatibility hint. No auto-migration is provided; a team opts into discipline-based assignment by re-running `/conclave-init` or hand-editing the roster.
- **UAT config degrades gracefully.** A `testing-environments.md` that doesn't exist yet, or still has every row `TBD` (v0.2.0 installs, or a fresh `/conclave-init` before the team fills it in), is not a hard failure — `/conclave-qa` skips UAT generation entirely and verifies acceptance criteria exactly as it did before v0.3.0.
- **`conclave-board/` (v0.5.0+) is application code, not part of this contract.** `/conclave-board` scaffolds a Next.js app as a *sibling* of `conclave/`, not inside it — the markdown-only invariant above applies only to `conclave/` itself. The board reads `conclave/` but never writes to it.

---

## 3. Role-to-subagent mapping

Role charters are markdown files under `skills/conclave/agents/`. They have no frontmatter — they are pure prose loaded by slash commands when delegating work.

| Subagent file | Used by (shipped) | Used by (planned) |
|---|---|---|
| `agents/product-manager.md` | `/conclave-spec` (backlog), `/conclave-planning` (scope review, Wave 1) | `/conclave-groom`, `/conclave-review` |
| `agents/tech-lead.md` | `/conclave-spec` (architecture), `/conclave-planning` (feasibility review + discipline assignment, Wave 1), `/conclave-pr-review` (code review + approval) | `/conclave-substack` |
| `agents/scrum-master.md` | `/conclave-planning` (facilitator + assignment, Wave 2 — runs after PM/TL) | `/conclave-standup`, `/conclave-review`, `/conclave-retro` |
| `agents/developer.md` | `/conclave-dev US-NNN [US-NNN ...]` (stories with `discipline: frontend \| backend \| mobile \| multi`, or unset) — one Agent call per story, ≤ 3 concurrent per batch | — |
| `agents/designer.md` | `/conclave-dev US-NNN [US-NNN ...]` (stories with `discipline: design`) | — |
| `agents/devops.md` | `/conclave-dev US-NNN [US-NNN ...]` (stories with `discipline: devops`) | — |
| `agents/qa.md` | `/conclave-qa US-NNN [US-NNN ...]` — one Agent call per story, ≤ 3 concurrent per batch | — |
| *(all of the above)* | `/conclave-sprint` — sequential four-phase sprint runner: Phase 1 planning, Phase 2 dev (batch-of-3), Phase 3 QA (batch-of-3), Phase 4 PR review (batch-of-3, only if `peer_pr_review.required`). Each Agent call uses the role model resolved from `conclave/config.md`'s `models:` block. | — |

**Model configuration (v0.7.0+)**: commands read an optional `models:` block from `conclave/config.md` frontmatter. Resolution per Agent call: `models.overrides.<role>` → `models.default` → parent session model (silent no-op when block is absent). Invalid model name → warn once and fall back. Role keys: `product_manager`, `tech_lead`, `scrum_master`, `developer`, `designer`, `devops`, `qa`.

A slash command delegates by spawning an Agent subagent and passing the **full content of the role charter file** as the system prompt prefix, followed by the task-specific instructions and the context the role needs.

**Multi-story concurrency**: When `/conclave-dev` or `/conclave-qa` is invoked with multiple `US-NNN` arguments, the orchestrator validates all stories upfront (direct file reads — no Agent calls), partitions them into batches of ≤ 3, and issues all Agent calls within a batch in a single message so they run concurrently. Failures are isolated per story: a failed story is reset to `ready` (dev) or left at its last known state (QA) and reported in the final summary table; other stories in the batch continue unaffected.

---

## 4. How slash commands invoke role subagents

The orchestration pattern is the same one `code-review` uses: prose instructions inside the slash command's markdown body. There is no DSL. When the body says *"Spawn a subagent loaded with `skills/conclave/agents/tech-lead.md` to produce the Architectural Foundation..."*, Claude reads the role charter, dispatches an `Agent` tool call with that content as context, and continues when the subagent returns.

Two role subagents can run in parallel (e.g. PM and TL in `/conclave-spec`) by issuing both `Agent` tool calls in a single message.

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

The two gates do NOT collapse. QA never runs `gh pr review --approve`. The TL does. When the flag is off (typical for `lean`), QA's pass implicitly approves the PR because there is no separate technical gate.

### Story status transitions, profile-aware

```
backlog → ready → in-progress → review → [verified] → done
```

- `review → verified`: only happens when `peer_pr_review.required: true`. QA pass moves the story here while waiting for TL approval.
- `review → done`: direct, when `peer_pr_review.required: false`. QA pass and PR approval collapse into the same step.
- `verified → done`: TL approves the PR via `/conclave-pr-review`.
- Any failure: back to `review`. The dev fixes, pushes, then QA re-verifies (and TL re-reviews if applicable).
- **UAT pending (v0.3.0+, no new status value).** When `testing-environments.md` is configured, `/conclave-qa` generates CI-runnable UAT tests (Playwright/Newman for `frontend`/`backend`/`multi`, a manual checklist for `mobile`) and folds the result into its verdict. A `mobile` story whose checklist is awaiting or mid-completion produces `verdict: pending_uat` — the story frontmatter stays `review`, same as a real failure, but the appended section is `## QA pending`, not `## QA blockers`, since nothing has actually failed yet. A failed CI run on the generated tests is treated exactly like a failing Gherkin scenario.

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

## 7. The visual board (v0.5.0+)

`/conclave-board` is the one Conclave capability that is **not** a prose-orchestrated subagent — it's a one-time scaffold plus a deterministic background sync, with no `Agent` call anywhere in its update loop:

- **Scaffold, once**: `/conclave-board` copies a Next.js + shadcn/ui boilerplate into `conclave-board/` (a sibling of `conclave/`, not inside it — see the directory-layout invariants above) and renders `conclave/team/board.md` for branding. A second run refuses, same idempotency posture as `/conclave-init`.
- **Stay current, automatically**: this plugin ships a `PostToolUse` hook (`hooks/hooks.json` + `hooks/regenerate-board-data.sh`) that fires on every `Write`/`Edit` tool call. If the touched path is under `conclave/` **and** the current repo has a scaffolded board, it re-runs `conclave-board/scripts/generate-data.mjs` — a plain Node script, no LLM involved — which re-parses every story/sprint/roster file into `conclave-board/data/board-data.generated.json`. The board's own dev server (`npm run dev`) hot-reloads to show it. In every other repo (no board scaffolded, or the touched path isn't under `conclave/`), the hook is a fast no-op and never fails the underlying tool call.
- **Read-only**: the board never writes back to `conclave/`. Story-status changes still only happen through `/conclave-dev`, `/conclave-qa`, and `/conclave-pr-review`.
- **Local only**: no CI pipeline, no hosting, no cross-machine sync. Each teammate's board reflects their own local `conclave/` checkout.

See `docs/specs/conclave-board/spec.md` for the full design.

## Glossary

- **Founding artifacts.** The minimum set a team needs to start working in Scrum: roster, ceremonies, DoR, DoD, Product Backlog, Architectural Foundation, and Sprint 1 plan. Conclave's MVP produces all of these.
- **Sprint spec.** The locked plan for one sprint: goal + selected stories + reference to DoD. Lives at `conclave/sprints/SPRINT-NNN/spec.md`.
- **Context snapshot.** A point-in-time copy of `CLAUDE.md`, available skills, and detected rules, written to `conclave/context/` whenever an artifact-generating command runs.
- **MVP main command.** `/conclave-spec`. Generates the founding artifacts.
