---
sprint: "{{sprint_id}}"
date: "{{iso_date}}"
sprint_goal_met: {{sprint_goal_met}}      # true | false | partial
committed_units: {{committed_units}}
done_units: {{done_units}}                 # = velocity recorded in meta.md
generated_by: conclave
---

# Sprint Review — {{sprint_id}}

> Produced by `/conclave-close`. Inspects the Increment against the Sprint Goal and adapts the backlog and roadmap.

## Sprint Goal

> {{sprint_goal}}

**Met:** {{sprint_goal_met}} — {{goal_verdict_reason}}

## Increment (done)

| Story | Title | Epic | Estimate | PR | QA report |
|-------|-------|------|----------|----|-----------|
{{done_rows}}

## Not done

| Story | Title | Status | Decision | Reason |
|-------|-------|--------|----------|--------|
{{not_done_rows}}

> `Decision` is one of `next-sprint` (carried into the next slot) or `backlog` (returned to `status: backlog`, unassigned). Chosen by the user during `/conclave-close`.

## Epic progress

| Epic | Stories done / total | Success criterion | Status after review |
|------|----------------------|-------------------|---------------------|
{{epic_rows}}

## Progress toward the Product Goal

{{product_goal_progress}}

## Bugs

{{bugs_summary}}

## Backlog and roadmap adaptations

{{adaptations}}
