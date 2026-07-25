---
id: "{{run_id}}"
sprint_id: "{{sprint_id}}"
started_at: "{{started_at}}"
finished_at: "{{finished_at}}"
outcome: "{{outcome}}"
mode: autonomous-sprint-loop
runner: "{{runner}}"
integration_branch: "{{integration_branch}}"
peer_pr_review_forced: true
merge_method: "{{merge_method}}"
schedule:
  window_start: "{{window_start}}"
  window_end: "{{window_end}}"
  bypassed: {{schedule_bypassed}}
budgets:
  max_attempts_per_story: {{max_attempts_per_story}}
  max_ci_wait_minutes: {{max_ci_wait_minutes}}
  max_total_tokens: {{max_total_tokens}}
  max_wall_clock_hours: {{max_wall_clock_hours}}
budget_usage:
  attempts_total: {{attempts_total}}
  tokens_total: {{tokens_total}}
  tokens_precision: "{{tokens_precision}}"
  wall_clock_hours: {{wall_clock_hours}}
models:
  developer: "{{model_developer}}"
  qa: "{{model_qa}}"
  tech_lead: "{{model_tech_lead}}"
slack_delivery: "{{slack_delivery}}"
---

# Sprint run report — {{run_id}} ({{sprint_id}})

## Summary

- Stories targeted: {{story_count}}
- Completed (done + merged): {{done_count}}
- Incomplete: {{incomplete_count}}
- Sprint closed: {{sprint_closed}}
- Stopped because: {{primary_stop_reason}}

## Per-story results

| Story | Final status | Attempts | PR | Merge | Notes |
|-------|--------------|----------|----|-------|-------|
{{per_story_rows}}

## Budget ledger

| # | Phase | Role | Model | Tokens | Source |
|---|-------|------|-------|--------|--------|
{{budget_ledger_rows}}

> Token totals are **{{tokens_precision}}**. Estimated rows use `budgets.token_estimates`;
> they are a guardrail, not a billing figure. Wall-clock and attempt counts are exact.

## Stop conditions

{{stop_conditions}}

## Configuration snapshot

- team_profile: {{team_profile}}
- effective peer_pr_review: forced true
- config peer_pr_review.required: {{config_peer_pr_review}}
- schedule enforced: {{schedule_enforced}}

<!--
Orchestrator placeholder legend (not rendered):

- `{{run_id}}` — `RUN-NNN` monotonic under the sprint's `runs/` directory.
- `{{outcome}}` — `in_progress` | `completed` | `partial` | `aborted_budget` | `aborted`.
- `{{finished_at}}` — empty while `in_progress`; ISO-8601 when finalized.
- `{{window_start}}` / `{{window_end}}` — ISO-8601 or the literal string `none`.
- `{{schedule_bypassed}}` — boolean `true` when `--ignore-schedule` was used.
- `{{tokens_precision}}` — `estimated` | `measured` | `mixed`.
- `{{slack_delivery}}` — `skipped` | `sent` | `failed` | `disabled`.
- `{{per_story_rows}}` — one markdown table row per targeted story.
- `{{budget_ledger_rows}}` — one row per role dispatch.
- `{{stop_conditions}}` — free-form bullets or a single reason code
  (`token_budget_exhausted` | `wall_clock_exhausted` | `schedule_window_elapsed` |
  `max_attempts (US-NNN)` | `merge_conflict (US-NNN)` | `completed` | …).
- `{{primary_stop_reason}}` — one-line summary of why the run ended.

Write this file at run start with `outcome: in_progress` (concurrency lock). Finalize in place at end.
Never delete prior RUN-* files. Never store Slack webhook URLs/tokens in this file.
-->
