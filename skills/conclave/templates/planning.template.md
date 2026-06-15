---
sprint: "{{sprint_id}}"
date: "{{iso_date}}"
facilitator: "{{facilitator}}"
participants: {{participants_yaml}}
profile: "{{team_profile}}"
duration_min: {{duration_min}}
generated_by: conclave
---

# Sprint Planning — {{sprint_id}}

> Meeting record produced by `/conclave-planning`. After this is committed, the sprint is **locked**: stories listed below are the commitment, assignments are owned by the named devs, and the sprint `status` is `active`.

## Sprint goal (confirmed)

{{sprint_goal}}

> One sentence. If the team cannot say it in one sentence, the goal needs to be tightened.

## Capacity

- Team capacity for the sprint: {{team_capacity_summary}}
- Sum of selected story estimates: {{committed_total}}
- Headroom / buffer: {{buffer_summary}}

{{capacity_notes}}

## Selected stories and assignments

| Story | Title | Priority | Estimate | Assignee | DoR | Notes |
|-------|-------|----------|----------|----------|-----|-------|
| [US-{{id_1}}](stories/US-{{id_1}}-{{slug_1}}.md) | {{title_1}} | {{priority_1}} | {{estimate_1}} | {{assignee_1}} | {{dor_1}} | {{notes_1}} |
| [US-{{id_2}}](stories/US-{{id_2}}-{{slug_2}}.md) | {{title_2}} | {{priority_2}} | {{estimate_2}} | {{assignee_2}} | {{dor_2}} | {{notes_2}} |
| [US-{{id_3}}](stories/US-{{id_3}}-{{slug_3}}.md) | {{title_3}} | {{priority_3}} | {{estimate_3}} | {{assignee_3}} | {{dor_3}} | {{notes_3}} |

> `DoR` column: `✓` if the story passes the Definition of Ready, `✗` (with reason) otherwise. A story with `✗` cannot enter the sprint.

## DoR validation findings

{{dor_findings}}

## Technical feasibility findings (from Tech Lead)

{{feasibility_findings}}

## Scope findings (from Product Manager)

{{scope_findings}}

## Active experiments

> Carried in from `../SPRINT-{{prev_sprint_id}}/retro.md`. Each experiment has a hypothesis, a measure, and an end date. If there is no prior retro, this section says "none".

{{active_experiments}}

## Commitments and risks raised

{{commitments_and_risks}}

## Adjournment

- Sprint status moved from `draft` to `active`.
- Sprint dates: **{{start_date}}** → **{{end_date}}**
- Story files updated: `assignee` set, `status` moved to `ready`.
- Product Manager sign-off (scope): {{pm_signoff}}
- Tech Lead sign-off (feasibility): {{tl_signoff}}
- Scrum Master sign-off (process): {{sm_signoff}}

## Next steps

- Each assigned dev runs `/conclave-dev US-NNN` to start their story.
- QA runs `/conclave-qa US-NNN` as stories enter `review`.
- Tech Lead runs `/conclave-pr-review US-NNN` as stories enter `verified` *(only when `peer_pr_review.required: true` in `conclave/config.md`; in `lean` profile, QA's pass moves the story directly to `done`)*.
- The team runs `/conclave-standup` daily *(if `daily_standup.required: true`; otherwise silent — and the command itself is planned, not yet shipped)*.
