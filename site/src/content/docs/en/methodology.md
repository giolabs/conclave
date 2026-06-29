---
title: Methodology
description: The Scrum model Conclave assumes, with the small accommodations real engineering teams need.
category: methodology
order: 1
lang: en
---

# Methodology

Conclave assumes standard **Scrum** with two practical accommodations real engineering teams make: explicit **Tech Lead** and **QA** roles, and **git** as the team's coordination substrate.

## The Scrum mapping

| Scrum concept | Conclave term | Notes |
|---|---|---|
| Product Owner | **Product Manager (PM)** | Same responsibilities — owns the backlog, prioritizes, defines acceptance. Most teams call it PM in practice. |
| Scrum Master | **Scrum Master (SM)** | Facilitates ceremonies, surfaces blockers. |
| Development Team | **Developers (Dev) + QA + Tech Lead (TL)** | TL and QA are named as distinct roles for clarity. They are still part of the Dev Team in pure Scrum. |
| Product Backlog | `conclave/product/backlog.md` | Ordered list of user stories. |
| Sprint Backlog | `conclave/sprints/SPRINT-NNN/spec.md` selected stories table | Snapshot at planning time. |
| Increment | The merged PRs that close stories | Conclave does not track this — git does. |

## The artifact tree

At the root of the team's repo, Conclave maintains a visible `conclave/` directory. Everything is markdown.

```
conclave/
├── README.md                         # explains the directory on GitHub
├── config.md                         # project type, stack, team profile
├── team/
│   ├── roster.md                     # who plays which role
│   └── ceremonies.md                 # cadence
├── product/                          # persists across sprints
│   ├── backlog.md
│   ├── architecture.md               # living ADRs
│   ├── definition-of-ready.md
│   └── definition-of-done.md
├── context/                          # frozen snapshots of inputs
└── sprints/
    └── SPRINT-NNN/
        ├── meta.md                   # name, dates, status
        ├── spec.md                   # sprint plan
        ├── stories/
        │   └── US-NNN-<slug>.md
        └── acceptance/
            └── AC-US-NNN.md
```

## Invariants every Conclave command respects

- **Markdown only.** Structured fields live in YAML frontmatter. The body is human-readable prose.
- **Visible directory.** `conclave/` is not hidden — it renders on GitHub and is discoverable.
- **Append, do not clobber.** A second `/conclave-spec` run creates `SPRINT-002/` and updates `product/backlog.md` additively; it never overwrites previous work.
- **Snapshot context.** Every artifact-generating command writes a fresh snapshot under `conclave/context/` so the artifact is auditable against the inputs that produced it.
- **Reference, do not duplicate.** Stories reference their acceptance file; sprint spec references `product/definition-of-done.md` rather than copying it.
- **Numbering is sticky.** `SPRINT-NNN` and `US-NNN` IDs increment monotonically and are never reused.

## How slash commands invoke role subagents

Each slash command is a markdown orchestrator. Its body says, in prose: *"Spawn a subagent loaded with `skills/conclave/agents/<role>.md` to produce X."*

Claude reads the role charter file, dispatches an `Agent` tool call with that content as the system-prompt prefix, and continues when the subagent returns. Two roles can run in parallel (PM + TL in `/conclave-spec`, SM + PM + TL in `/conclave-planning`) by issuing both `Agent` calls in a single message.

There is no DSL. The pattern is the same one Anthropic's own `code-review` plugin uses for its parallel review agents.

## How teams coordinate

Each team member runs their own local Claude Code. The shared state lives in `conclave/` and is committed to git. Coordination happens through pull requests:

- PM grooms the backlog → opens a PR to `conclave/product/backlog.md`.
- Dev picks up a story → branches `feat/US-NNN-<slug>` → implements → opens a PR.
- QA verifies → appends a verification report to the acceptance file → PR comment.
- TL approves the code → runs `gh pr review --approve`.

There is no central server, no proprietary state, no surface for vendor lock-in. The team owns the workflow because the workflow is just files in their own repo.
