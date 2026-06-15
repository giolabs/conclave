# {{story_id}}: {{story_title}}

Implements [{{story_id}}](../conclave/sprints/{{sprint_id}}/stories/{{story_id}}-{{slug}}.md) from sprint [{{sprint_id}}](../conclave/sprints/{{sprint_id}}/spec.md).

## Summary

{{one_paragraph_summary}}

## Scenario → test mapping

Every Gherkin scenario in [`AC-{{story_id}}.md`](../conclave/sprints/{{sprint_id}}/acceptance/AC-{{story_id}}.md) must be covered. The QA agent (`/conclave-qa {{story_id}}`) will re-derive pass/fail from these.

| Scenario | Test file | Test name |
|----------|-----------|-----------|
| {{scenario_1_name}} | `{{test_file_1}}` | `{{test_name_1}}` |
| {{scenario_2_name}} | `{{test_file_2}}` | `{{test_name_2}}` |
| {{scenario_3_name}} | `{{test_file_3}}` | `{{test_name_3}}` |

## Definition of Done — author self-check

Structural items (always required):

- [ ] All Gherkin scenarios have at least one passing automated test
- [ ] Unit tests added for new code paths
- [ ] Test suite passes locally
- [ ] Linter / typechecker passes with no new warnings
- [ ] No new TODO / FIXME without a tracked follow-up
- [ ] No architectural deviation from `conclave/product/architecture.md` (or an ADR proposal is included below)
- [ ] Story file's frontmatter `status` set to `review`

Conditional items (apply only if the flag in `conclave/config.md` says `required: true`):

- [ ] Peer reviewer assigned and aware *(governed by `ceremonies.peer_pr_review.required`)*

## Architectural deviations

{{adr_proposal_or_none}}

## Notes for QA

{{notes_for_qa}}
