---
title: Roles
description: The five role charters Conclave ships and which commands invoke each.
category: methodology
order: 4
lang: en
---

# Roles

Conclave ships **five role charters** — markdown files under `skills/conclave/agents/` that the slash commands load as system-prompt prefixes when they spawn subagents.

| Role | Charter | Invoked by |
|---|---|---|
| Product Manager | `agents/product-manager.md` | `/conclave-spec` (backlog), `/conclave-planning` (scope review) |
| Tech Lead | `agents/tech-lead.md` | `/conclave-spec` (architecture), `/conclave-planning` (feasibility), `/conclave-pr-review` (code review) |
| Scrum Master | `agents/scrum-master.md` | `/conclave-planning` (facilitator) |
| Developer | `agents/developer.md` | `/conclave-dev` |
| QA | `agents/qa.md` | `/conclave-qa` |

## Product Manager

Functionally the **Product Owner** in Scrum terms. Owns the Product Backlog, prioritizes, defines acceptance criteria.

- **Input**: idea + context + clarifications + (optionally) Tech Lead's architectural draft.
- **Output**: ordered Product Backlog as INVEST stories with MoSCoW priority, T-shirt estimate, Gherkin acceptance criteria.
- **Quality checklist**: every story testable, every criterion verifiable, backlog ordered by value, acceptance criteria written before estimation.

## Tech Lead

Owns architectural decisions, technical risks, and the code-level PR approval gate.

- **Input**: idea + context + clarifications (for spec); PR diff + architecture + ADRs (for pr-review).
- **Output**:
  - `/conclave-spec` → Architectural Foundation: overview + ADRs + risks + cross-cutting concerns + mermaid diagram.
  - `/conclave-planning` → feasibility findings per story.
  - `/conclave-pr-review` → structured verdict (approved / request-changes) + per-file findings (blocker / non-blocking) + ADR proposal evaluation.

## Scrum Master

Facilitates ceremonies, surfaces blockers, protects the team's process. Does not write code, does not own the backlog or architecture.

- **Input**: sprint draft + roster + backlog + DoR + (optionally) previous retro.
- **Output**: meeting record for the current ceremony (sprint planning today; standup / review / retro in future iterations).

## Developer

Picks up a story, breaks it into technical tasks, implements with tests, prepares a PR.

- **Input**: story file + acceptance file + architecture + DoD + current branch.
- **Output**: code + tests + commits + PR body (rendered from `templates/pr-body.template.md`) + story-frontmatter status update.

**Hard rules**: every Gherkin scenario maps to at least one test; no architectural deviation without an ADR proposal in the PR body; never modifies acceptance criteria; never merges own PR.

## QA

Adversarial verification against acceptance criteria.

- **Input**: story file + acceptance file + DoD + PR diff + CI status.
- **Output**: verification report (appended to `acceptance/AC-US-NNN.md`) + story-status update (`verified` or `done` depending on profile, or `review` with blockers).

**Hard rules**: verifies the criteria, not the code; never approves or requests changes on the PR (that is the TL's job); never approves a story whose DoD is unmet; never deletes prior verification sections.
