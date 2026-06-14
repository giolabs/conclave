# Conclave

**Scrum for Claude Code teams.**

Conclave is a Claude Code plugin that brings Scrum methodology to distributed engineering teams. Every Scrum role — Product Manager, Tech Lead, Scrum Master, Developer, QA — gets a specialized AI subagent that helps the human in that role execute their duties. The shared source of truth is plain markdown committed to git inside a visible `conclave/` directory at the root of your project.

No central server, no proprietary format, no hidden state. The team coordinates through pull requests.

---

## Install

Conclave is a Claude Code plugin. Install it by symlinking this directory into your local plugin folder:

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave
```

Restart Claude Code. You should now see `/conclave-init` and `/conclave-spec` in the slash-command list.

---

## Quick start (Day 0)

In your project repo:

```bash
# 1. Bootstrap the Scrum directory
/conclave-init

# 2. Generate the founding artifacts from your product idea
/conclave-spec "REST API for task management with JWT auth"
```

You will be asked a few clarifying questions (stack, sprint length, team size, constraints). Conclave then invokes the Tech Lead and Product Manager subagents in parallel to produce:

- `conclave/product/backlog.md` — initial Product Backlog
- `conclave/product/architecture.md` — Architectural Foundation with ADRs
- `conclave/sprints/SPRINT-001/` — Sprint 1 plan with stories and Gherkin acceptance criteria

All markdown. All in git. Open it as a PR and let the team review it line by line.

---

## What lives in `conclave/`

```
conclave/
├── README.md                 # explains the directory
├── config.md                 # project type, stack, paths
├── team/
│   ├── roster.md             # who plays which Scrum role
│   └── ceremonies.md         # sprint length, planning day, retro day
├── product/                  # persists across sprints
│   ├── backlog.md            # ordered Product Backlog
│   ├── architecture.md       # living architecture doc
│   ├── definition-of-ready.md
│   └── definition-of-done.md
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

| Scrum role | Conclave subagent | MVP? |
|---|---|---|
| Product Owner (PM) | `product-manager` | yes |
| Tech Lead / Architect | `tech-lead` | yes |
| Scrum Master | `scrum-master` | charter defined, used in next iteration |
| Developer | `developer` | charter defined, used in next iteration |
| QA | `qa` | charter defined, used in next iteration |

The subagents are markdown role charters under `skills/conclave/agents/`. Slash commands invoke them by referencing their path in prose, the same pattern `code-review` and `skill-creator` use.

---

## MVP scope

This release ships the **Day 0 founding-artifacts flow** only:

- `/conclave-init` bootstraps `conclave/`.
- `/conclave-spec <idea>` produces the Product Backlog, Architectural Foundation, and Sprint 1 plan from an idea plus the project's `CLAUDE.md`, installed Skills, and detected stack signals.

Live ceremonies (planning, daily, review, retro), per-story dev/QA loops, and stack-specific sub-specs are out of scope for this iteration. They are listed as next-iteration work in [the plan](#roadmap).

## Roadmap

- `/conclave-planning` — Sprint Planning ceremony
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
