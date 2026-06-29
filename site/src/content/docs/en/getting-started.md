---
title: Getting started
description: Install Conclave and run the Day-0 founding-artifacts flow in under two minutes.
category: overview
order: 1
lang: en
---

# Getting started

Conclave is a Claude Code plugin that brings **Scrum** to distributed engineering teams. Six AI subagents — one per Scrum role — coordinate through plain markdown committed to git. No central server, no proprietary format.

## Three commands to get going

Inside any git repo:

```bash
# 1. Bootstrap the conclave/ workspace
/conclave-init

# 2. Generate the founding artifacts from your product idea
/conclave-spec "REST API for task management with JWT auth"

# 3. Lock Sprint 1
/conclave-planning
```

That's it. After step 3 the sprint is `active`, every story has an assignee, and the team can open a PR with the entire `conclave/` directory.

## What gets created

After `/conclave-spec` runs, your repo gains a `conclave/` directory at the root:

```
conclave/
├── README.md
├── config.md                         # team profile + ceremony flags
├── team/
│   ├── roster.md
│   └── ceremonies.md
├── product/
│   ├── backlog.md                    # ordered Product Backlog
│   ├── architecture.md               # ADRs + mermaid diagram
│   ├── definition-of-ready.md
│   └── definition-of-done.md
├── context/                          # frozen snapshots of inputs used
└── sprints/
    └── SPRINT-001/
        ├── meta.md
        ├── spec.md                   # sprint plan
        ├── stories/                  # one file per user story
        └── acceptance/               # Gherkin acceptance criteria
```

Every file is markdown. Every change is a normal git diff your team can review in a PR.

## Continuing the loop

Once Sprint 1 is locked:

```bash
# Each dev picks up an assigned story
/conclave-dev US-001

# QA verifies the story when it reaches review
/conclave-qa US-001

# Tech Lead approves the PR (only when peer_pr_review.required is on)
/conclave-pr-review US-001
```

When all the sprint's stories are `done`, you're ready for the next planning cycle. Re-run `/conclave-spec` or move directly to `/conclave-planning` for SPRINT-002.

## Next steps

- Read the [methodology](/conclave/en/docs/methodology/) to understand the Scrum model Conclave assumes.
- Pick the right [team profile](/conclave/en/docs/profiles/) for your situation.
- Dig into the [per-command reference](/conclave/en/docs/commands/init/).
