---
sprint_length_weeks: 2
timezone: "{{timezone}}"
last_updated_at: "{{iso_date}}"
---

# Ceremony cadence

## Sprint length
**{{sprint_length_weeks}} week(s)**

## Schedule

The `Required` column reflects the team's `team_profile` in `conclave/config.md`. Required ceremonies are enforced by Conclave's slash commands; optional ones can be skipped silently. To change what's required, edit `config.md`, not this file.

| Ceremony | Command | Required | Day | Duration | Who attends |
|----------|---------|----------|-----|----------|-------------|
| Sprint Planning (with inline refinement) | `/conclave-planning` | **always** | sprint start | 60–90 min | PM, TL, SM, Devs, QA |
| QA Verification (per story) | `/conclave-qa` | **always** | rolling | per story | QA (+ Dev for fixes) |
| Peer PR Review | `/conclave-pr-review` | {{peer_pr_review_label}} | rolling | per PR | Tech Lead |
| Sprint Close — Review | `/conclave-close` | **always** | sprint end | 30–60 min | Whole team + stakeholders |
| Sprint Close — Retro | `/conclave-close` | {{retro_label}} | sprint end, after Review | 30 min | Whole team |

Legend: **always** = structural, never skippable. `required` / `optional` = set by the team's profile (`ceremonies.peer_pr_review.required`, `ceremonies.close.retro`).

Conclave v2 runs a reduced Scrum cycle: there is no separate daily standup or grooming ceremony. The board (`/conclave-board`) and story statuses are the daily view; backlog refinement happens just in time inside `/conclave-planning`.

## Working agreement

- All ceremonies happen on video. Async-only ceremonies have lower bandwidth and lose nuance.
- Blockers are raised as soon as they happen (PR comment, story `## Blockers` section, or Slack HITL alert) — not saved for a meeting.
- Planning ends when the sprint goal is locked, the selected stories total fits the team's velocity, and every story is `ready` per the DoR.
- If the team misses a ceremony, the Scrum Master logs why and proposes a recovery.

## How to update

Edit the table, commit, open a PR. Cadence changes should usually come out of a retro experiment.
