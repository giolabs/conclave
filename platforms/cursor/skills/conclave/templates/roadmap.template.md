---
status: living
sprint_length_weeks: {{sprint_length_weeks}}
launch_date: "{{launch_date}}"
mvp_slot: "{{mvp_slot}}"            # SPRINT-NNN where the MVP is expected to be complete
last_replanned_at: "{{iso_date}}"
generated_by: conclave
---

# Roadmap — {{project_name}}

> Written at inception by `/conclave-init` (Scrum Master subagent) and re-planned by `/conclave-close` when velocity moves the dates. Each row is a **slot**: a future sprint and the epic(s) it is expected to pull stories from. `/conclave-planning` always plans the lowest slot whose status is `planned`.

Product Goal: **{{product_goal}}** (see [`vision.md`](vision.md))

## Slots

<!-- Slot 0 row only when config sprint.sprint_zero: true; otherwise the table starts at slot 1 / SPRINT-001. -->

| Slot | Sprint | Epics | Slot goal | Target dates | Status |
|------|--------|-------|-----------|--------------|--------|
| 0 | SPRINT-000 | {{enabler_epic}} | Walking skeleton: repo scaffold, test framework, CI, integration branch | {{dates_0}} | planned |
| 1 | SPRINT-001 | {{epics_1}} | {{goal_1}} | {{dates_1}} | planned |
| 2 | SPRINT-002 | {{epics_2}} | {{goal_2}} | {{dates_2}} | planned |

Status: `planned` (slot not yet planned) → `active` (sprint locked by `/conclave-planning`) → `closed` (sprint closed by `/conclave-close`).

## Burnup

> Appended by `/conclave-close` — one row per closed sprint. `Scope` is the total estimate units of every non-retired story and candidate story mapped to the MVP; `Done` is cumulative units delivered.

| Sprint | Velocity | Done (cum.) | Scope | Sprint Goal met | Notes |
|--------|----------|-------------|-------|-----------------|-------|

## Forecast

{{forecast}}

> Based on average velocity of the last 3 closed sprints (or the fixed capacity formula before any sprint closes). States the slot in which the MVP is expected and whether `launch_date` is at risk.

## Re-plan log

| Date | Trigger | Change |
|------|---------|--------|
| {{iso_date}} | inception | initial roadmap |
