# {{story_id}}: {{story_title}}

{{fixes_issue_line_or_empty}}

Implements [{{story_id}}]({{item_link_target}}){{sprint_clause_or_empty}}.

<!--
  {{item_link_target}} and {{sprint_clause_or_empty}} are resolved by the
  ORCHESTRATOR (commands/conclave-dev.md Step 6), not the subagent, since
  this template has no conditional syntax of its own:
    - US-NNN: item_link_target = "../conclave/sprints/{{sprint_id}}/stories/{{story_id}}-{{slug}}.md"
              sprint_clause_or_empty = " from sprint [{{sprint_id}}](../conclave/sprints/{{sprint_id}}/spec.md)"
    - BUG-NNN: item_link_target = "../conclave/product/bugs/{{story_id}}-{{slug}}.md"
               sprint_clause_or_empty = "" (a bug has no sprint)
  {{fixes_issue_line_or_empty}} is "Fixes #{{github_issue_number}}" for a bug
  with a known issue number, otherwise an empty string (v0.10.0+).
-->

## Summary

{{one_paragraph_summary}}

## Scenario → test mapping

Every Gherkin scenario in [{{scenario_source_label}}]({{scenario_source_link}}) must be covered. The QA agent (`/conclave-qa {{story_id}}`) will re-derive pass/fail from these.

<!--
  {{scenario_source_label}} / {{scenario_source_link}} — also orchestrator-resolved:
    - US-NNN: label = "AC-{{story_id}}.md", link = "../conclave/sprints/{{sprint_id}}/acceptance/AC-{{story_id}}.md"
    - BUG-NNN: label = "{{story_id}}-{{slug}}.md", link = "../conclave/product/bugs/{{story_id}}-{{slug}}.md"
      (a bug has no separate acceptance file — its repro steps live inline in the bug file itself)
-->

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

- [ ] Tech Lead assigned as PR reviewer and aware. The TL will approve via `/conclave-pr-review US-NNN` after QA verifies. *(Governed by `ceremonies.peer_pr_review.required`. When the flag is off, QA verification is the merge signal.)*

## Architectural deviations

{{adr_proposal_or_none}}

## Notes for QA

{{notes_for_qa}}
