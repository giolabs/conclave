---
id: "BUG-{{id}}"
title: "{{title}}"
severity: "{{severity}}"        # critical | high | medium | low — distinct from priority; measures incident impact, not feature work order
status: ready                    # backlog | ready | in-progress | review | verified | done | retired — reuses the story state machine verbatim; always starts at ready (bugs skip backlog/Sprint Planning by design)
discipline: "{{discipline}}"    # frontend | backend | qa | design | devops | mobile | multi
assignee: ""
related_story: "{{related_story_or_empty}}"    # optional — US-NNN this bug relates to, if known
suspected_code_area: "{{suspected_code_area_or_empty}}"  # optional — file path(s) or module the Haiku refiner identified as likely culprit; verified by TL when generating the lab test
lab_test_path: "{{lab_test_path_or_empty}}"    # path to BUG-NNN-lab.md once generated; empty until TL generates it
github_issue_number: {{issue_number_or_null}}
github_issue_url: "{{issue_url_or_empty}}"
created_at: "{{iso_date}}"
reported_via: "{{manual_or_mcp_tool_name}}"     # how the report originated — manual | mcp:<tool-name> | lab_test
# Optional retirement fields, same shape as story.template.md, set only via hand-edit (no /conclave-bug retire in this phase)
# retirement_reason: ""
# retired_at: ""
---

# BUG-{{id}}: {{title}}

## Reported

{{original_report_text_or_summary}}

## Reproduction

```gherkin
Given {{precondition}}
When {{action}}
Then {{unexpected_result}}
```

## Needs more info

{{gaps_the_qa_subagent_flagged_or_omit_section}}

## Status transitions

Reuses the story state machine exactly (see `story.template.md`) — this file starts at `ready` (bugs skip `backlog`/Sprint Planning by design) and follows the same `ready → in-progress → review → [verified] → done` path via `/conclave-dev` and `/conclave-qa`, with `retired` available as a manual escape hatch (hand-edit only in this phase — no `/conclave-bug retire` sub-action yet).
