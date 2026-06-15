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
| Product Owner | **Product Manager (PM)** | Same responsibilities (own the backlog, prioritize, define acceptance). We call it PM because most teams in practice do. |
| Scrum Master | **Scrum Master (SM)** | Facilitates ceremonies, removes blockers. |
| Development Team | **Developers (Dev) + QA + Tech Lead (TL)** | We treat TL and QA as named roles for clarity. They are still part of the Dev Team in pure Scrum. |
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
│   ├── roster.md                     # team members + Scrum roles
│   └── ceremonies.md                 # sprint length, planning day, standup time, retro day
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

---

## 3. Role-to-subagent mapping

Role charters are markdown files under `skills/conclave/agents/`. They have no frontmatter — they are pure prose loaded by slash commands when delegating work.

| Subagent file | Used by (shipped) | Used by (planned) |
|---|---|---|
| `agents/product-manager.md` | `/conclave-spec` (backlog), `/conclave-planning` (scope review) | `/conclave-groom`, `/conclave-review` |
| `agents/tech-lead.md` | `/conclave-spec` (architecture), `/conclave-planning` (feasibility review) | `/conclave-substack` |
| `agents/scrum-master.md` | `/conclave-planning` (facilitator) | `/conclave-standup`, `/conclave-review`, `/conclave-retro` |
| `agents/developer.md` | `/conclave-dev US-NNN` | — |
| `agents/qa.md` | `/conclave-qa US-NNN` | — |

A slash command delegates by spawning an Agent subagent and passing the **full content of the role charter file** as the system prompt prefix, followed by the task-specific instructions and the context the role needs.

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

---

## 6. What is mandatory vs skippable

Conclave separates **structural invariants** (you cannot do Scrum without them) from **ceremonies** (process gates the team chooses to commit to).

### Always required (structural — never skippable)

- **A Sprint Plan.** Without a goal and a locked story list, there is no sprint. Enforced by `/conclave-planning` and the existence of `conclave/sprints/SPRINT-NNN/spec.md`.
- **Acceptance criteria on every story.** Every story file must reference a non-empty `acceptance/AC-US-NNN.md` with Gherkin scenarios. Stories without them fail the DoR.
- **QA verification of acceptance criteria.** Every `done` story carries a verification report appended to its acceptance file. Without this, `done` means nothing. Enforced by `/conclave-qa`.
- **Definition of Done compliance.** The team-customized DoD checklist must be met for every story. The structural items of the DoD are non-negotiable; some items become conditional (see below).

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

## Glossary

- **Founding artifacts.** The minimum set a team needs to start working in Scrum: roster, ceremonies, DoR, DoD, Product Backlog, Architectural Foundation, and Sprint 1 plan. Conclave's MVP produces all of these.
- **Sprint spec.** The locked plan for one sprint: goal + selected stories + reference to DoD. Lives at `conclave/sprints/SPRINT-NNN/spec.md`.
- **Context snapshot.** A point-in-time copy of `CLAUDE.md`, available skills, and detected rules, written to `conclave/context/` whenever an artifact-generating command runs.
- **MVP main command.** `/conclave-spec`. Generates the founding artifacts.
