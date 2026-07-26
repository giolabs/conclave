---
id: "{{run_id}}"
sprint_id: "{{sprint_id}}"
scope: "{{scope}}"
started_at: "{{started_at}}"
finished_at: "{{finished_at}}"
outcome: "{{outcome}}"
mode: "autonomous-dev-three-wave"
runner: "{{runner}}"
integration_branch: "{{integration_branch}}"
peer_pr_review_forced: true
merged: "none (by design — ADR-006)"
sprint_closed: false
waves:
  reached: {{wave_reached}}
  completed: "{{waves_completed}}"
conflicts_detected: {{conflicts_count}}
prs_ready_for_human_merge:
{{prs_ready_yaml_list}}
schedule:
  timezone: "{{schedule_timezone}}"
  days: "{{schedule_days}}"
  start_time: "{{schedule_start_time}}"
  end_time: "{{schedule_end_time}}"
  duration_days: {{schedule_duration_days}}
  active_from: "{{schedule_active_from}}"
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
  ci_wait_minutes: {{ci_wait_minutes}}
models:
  developer: "{{model_developer}}"
  qa: "{{model_qa}}"
  tech_lead: "{{model_tech_lead}}"
slack_delivery: "{{slack_delivery}}"
---

# Delivery loop run report — {{run_id}} ({{sprint_id}})

## Summary

- Scope: {{scope}}
- Stories targeted: {{item_count}}
- Completed (`done`, approved, **awaiting human merge**): {{done_count}}
- Incomplete: {{incomplete_count}}
- Highest wave reached: {{wave_reached}} of 3
- Conflicts handled: {{conflicts_count}}
- Sprint closed: false — this loop never closes a sprint
- Stopped because: {{primary_stop_reason}}

## PRs ready for human merge

| Story | PR | Approved at | Merge command |
|-------|----|-------------|---------------|
{{prs_ready_rows}}

Conclave does not merge. Review these and merge them yourself.

## Per-story results

| Story | Final state | W1 entries | W2 entries | W3 entries | QA→Dev | TL→Dev | Cycle time | PR | Notes |
|-------|-------------|-----------|-----------|-----------|--------|--------|------------|----|-------|
{{per_item_rows}}

## Conflicts and ordering

| Kind | Stories | Detail | Action taken |
|------|---------|--------|--------------|
{{conflict_rows}}

## Agent productivity

| Role | Dispatches | Stories touched | First-pass success | Rework caused | Tokens / story (avg) | Outcome mix |
|------|-----------|-----------------|--------------------|---------------|----------------------|-------------|
{{agent_productivity_rows}}

- **First-pass success** — stories that cleared this role's wave on their first entry.
- **Rework caused** — returns to Wave 1 attributable to this role (for `developer`, Wave 1 re-entries it had to absorb).
- Token columns carry the run's precision label; dispatch, story, and rework counts are exact.

## Loop productivity

- Cycle time (first Wave 1 entry → Tech Lead approval): min {{cycle_min}} / median {{cycle_median}} / max {{cycle_max}}
- Re-entries: QA→Dev {{reentries_qa_total}}, TL→Dev {{reentries_tl_total}}
- CI wait accumulated: {{ci_wait_minutes}} min
- Attempts total: {{attempts_total}} (cap {{max_attempts_per_story}} per story)
- Wall clock: {{wall_clock_hours}} h of {{max_wall_clock_hours}} h
- Tokens: {{tokens_total}} of {{max_total_tokens}} ({{tokens_pct}} %, {{tokens_precision}})

## Token ledger

| # | Wave | Story | Role | Model | Tokens | Source |
|---|------|-------|------|-------|--------|--------|
{{budget_ledger_rows}}

> Token totals are **{{tokens_precision}}**. Estimated rows use `budgets.token_estimates`;
> they are a guardrail, not a billing figure. Wall-clock, attempt, and dispatch counts are exact.

## Stop conditions

{{stop_conditions}}

## Configuration snapshot

- team_profile: {{team_profile}}
- effective peer_pr_review: forced true (this run only)
- config peer_pr_review.required: {{config_peer_pr_review}}
- schedule enforced: {{schedule_enforced}}
- PR base branch: {{integration_branch}} (never merged into by Conclave)

<!--
Orchestrator placeholder legend (not rendered):

Written by `/conclave-dev --loop` (ADR-006) — the only autonomous delivery loop.
Path: `conclave/sprints/SPRINT-NNN/runs/RUN-NNN-dev-loop.md`, or `conclave/runs/` when the
repo has no sprint at all (`sprint_id` is then the literal `none`).

Reports written by 0.13.0/0.14.0 loops (`autonomous-sprint-loop`, `autonomous-dev-loop`)
stay on disk untouched; nothing rewrites history.

- `{{run_id}}` — `RUN-NNN`, monotonic across all reports in the same `runs/` directory.
- `{{scope}}` — the literal `sprint` or a comma-separated ID list (`US-001, BUG-004`).
  Two runs whose scopes intersect must not execute concurrently — this file is the lock.
- `{{outcome}}` — `in_progress` | `completed` | `partial` | `aborted_budget` | `aborted`.
- `{{finished_at}}` — empty while `in_progress`; ISO-8601 when finalized.
- `{{wave_reached}}` — highest wave any story reached (0–3). `{{waves_completed}}` — e.g. `W1, W2`.
- `{{prs_ready_yaml_list}}` — `  - https://github.com/…/pull/42` lines, or `  []` when none.
- `{{prs_ready_rows}}` — same PRs as a table; merge command column is a copyable
  `gh pr merge <n> --squash --delete-branch` for the human.
- Schedule fields — the resolved recurring window, or the literal `none` when unconfigured.
- `{{schedule_bypassed}}` — boolean `true` when `--ignore-schedule` was used.
- `{{tokens_precision}}` — `estimated` | `measured` | `mixed`.
- `{{slack_delivery}}` — `skipped` | `sent` | `failed` | `disabled`.
- `{{per_item_rows}}` — one row per targeted story/bug, with per-wave entry counts and
  re-entry counts so rework is visible per story.
- `{{conflict_rows}}` — one row per ordering decision:
  `dependency` | `unmet_dependency` | `path_overlap`, the IDs, the evidence, and what was done.
  Empty scope-wide → a single `| — | — | none detected | — |` row.
- `{{agent_productivity_rows}}` — one row per role dispatched
  (`developer` | `designer` | `devops` | `qa` | `tech_lead`).
- `{{budget_ledger_rows}}` — one row per role dispatch, tagged with the wave it happened in.
- `{{stop_conditions}}` — free-form bullets or a reason code (`completed` | `partial` |
  `token_budget_exhausted` | `wall_clock_exhausted` | `schedule_window_elapsed` |
  `dependency_cycle` | `max_attempts (US-NNN)` | `gh_unavailable` | …).
- `{{primary_stop_reason}}` — one-line summary of why the run ended.

Write this file at run start with `outcome: in_progress` (concurrency lock). Finalize in place
at the end — success, partial, or abort. Never delete or rewrite a prior RUN-* file.
Never store Slack webhook URLs, API tokens, or CI secrets in this file.
Every figure a Slack message quotes must come from this file, so the two never disagree.
-->
