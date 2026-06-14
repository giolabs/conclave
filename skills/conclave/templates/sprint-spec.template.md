---
sprint: "{{sprint_id}}"
status: draft               # draft | active | done | archived
generated_by: conclave
generated_at: "{{iso_date}}"
---

# {{sprint_id}} — Plan

## Sprint goal

{{sprint_goal}}

> One sentence. If you cannot say it in one sentence, the sprint is trying to do too much.

## Selected stories

| Story | Title | Priority | Estimate | Assignee | Status |
|-------|-------|----------|----------|----------|--------|
| [US-{{id_1}}](stories/US-{{id_1}}-{{slug_1}}.md) | {{title_1}} | {{priority_1}} | {{estimate_1}} | unassigned | ready |
| [US-{{id_2}}](stories/US-{{id_2}}-{{slug_2}}.md) | {{title_2}} | {{priority_2}} | {{estimate_2}} | unassigned | ready |
| [US-{{id_3}}](stories/US-{{id_3}}-{{slug_3}}.md) | {{title_3}} | {{priority_3}} | {{estimate_3}} | unassigned | ready |

## Acceptance scope

Each story's acceptance criteria are in `acceptance/AC-US-NNN.md`. A story is `done` when its Gherkin scenarios all pass AND the sprint's Definition of Done is met.

## Definition of Done

See `../../product/definition-of-done.md`.

## Architectural references

See `../../product/architecture.md`. If a story in this sprint requires an architectural deviation, that deviation must land as an ADR amendment in the same PR that closes the story.

## Out of scope this sprint

{{out_of_scope}}

## Next steps

- [ ] Run `/conclave-planning` to lock the sprint (assign stories, confirm capacity, move status to `active`).
- [ ] Each Dev runs `/conclave-dev US-NNN` to pick up their assigned story. *(planned, not yet shipped)*
- [ ] QA runs `/conclave-qa US-NNN` to verify each story. *(planned, not yet shipped)*
- [ ] Run `/conclave-review` and `/conclave-retro` at sprint end. *(planned, not yet shipped)*

For the MVP, after this file is generated:

```bash
git add conclave/
git commit -m "conclave: founding artifacts for {{project_name}}"
gh pr create --title "Conclave: founding artifacts" --body "Review the backlog, architecture, and Sprint 1 plan."
```
