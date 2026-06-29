---
title: /conclave-planning
description: Profile-aware Sprint Planning ceremony. SM facilitates, PM validates scope, TL validates feasibility.
category: commands
order: 3
lang: en
---

# /conclave-planning

Run **Sprint Planning** for the current draft sprint. When this finishes, the sprint moves from `draft` to `active` and the team is committed to the selected stories.

```
/conclave-planning
```

This is one of the two **structural** Scrum gates Conclave enforces — required in every profile, cannot be skipped.

## What it does

1. Locates the draft sprint (highest-numbered `SPRINT-NNN` with `status: draft`).
2. Loads context: `config.md`, roster, backlog, DoR, architecture, current sprint files, optionally the previous sprint's retro.
3. Asks the team for inputs — depth scales with the profile:
   - Always: sprint dates, facilitator name.
   - Full-scrum: per-dev capacity adjustments, carryover commitments.
   - When grooming is off: whether to refine top-of-backlog inside planning.
4. **Delegates to SM, PM and TL in parallel.**
5. Reconciles their outputs:
   - PM scope swaps → surfaces to user for accept/reject.
   - TL feasibility findings → records as recommendations.
   - DoR validation → drops stories that fail (or refuses to lock in full-scrum).
   - Capacity check → warns on over-commit > 20%.
6. Writes outputs (see below).

## What it produces

- `conclave/sprints/SPRINT-NNN/meta.md` updated with `status: active`, target dates.
- `conclave/sprints/SPRINT-NNN/spec.md` updated with assignees, `status: active`.
- Each `stories/US-NNN-*.md` frontmatter updated: `assignee` set, `status: ready`.
- `conclave/sprints/SPRINT-NNN/planning.md` — the meeting record (goal, capacity, assignments, DoR findings, experiments imported from prior retro).
- `conclave/product/backlog.md` updated to show selected stories as `in-progress` in the active sprint.

## Profile awareness

| Profile | Capacity questions | Backlog grooming | Carryover questions |
|---|---|---|---|
| `lean` | skipped | absorbed into planning | skipped |
| `full-scrum` | asked per-dev | separate (assumed already done) | asked |
| `custom` | depends on flags | depends on flags | depends on flags |

## Guardrails

- Refuses to run if no sprint exists in `draft`.
- Refuses to run if `sprint_planning.required` is somehow `false` in `config.md` — it is structural.
- Cannot re-run on the same sprint after it goes `active` — a second invocation is refused.
- Never commits.

## After it runs

Each assigned dev runs [`/conclave-dev US-NNN`](/conclave/en/docs/commands/dev/) for their story.
