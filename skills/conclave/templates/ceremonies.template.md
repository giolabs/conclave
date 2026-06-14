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

| Ceremony | Required | Day | Time | Duration | Who attends |
|----------|----------|-----|------|----------|-------------|
| Sprint Planning | **always** | Monday (sprint start) | 10:00 | 90 min | PM, TL, SM, all Devs, QA |
| QA Verification (per story) | **always** | rolling | — | per story | QA (+ Dev for fixes) |
| Daily Standup | {{daily_standup_label}} | Every weekday | 09:30 | 15 min | All Devs, TL, QA (SM facilitates) |
| Backlog Grooming | {{backlog_grooming_label}} | Wednesday mid-sprint | 11:00 | 45 min | PM, TL, optional Devs |
| Peer PR Review | {{peer_pr_review_label}} | rolling | — | per PR | one non-author teammate |
| Sprint Review | {{sprint_review_label}} | Friday (sprint end) | 14:00 | 60 min | Whole team + stakeholders |
| Sprint Retrospective | {{sprint_retrospective_label}} | Friday (after Review) | 15:30 | 60 min | Whole team |

Legend: **always** = structural, never skippable. `required` = enforced by the team's profile. `optional` = skippable (the team chose `lean` or set this ceremony off in `custom`).

## Working agreement

- All ceremonies happen on video. Async-only ceremonies have lower bandwidth and lose nuance.
- Standup is **status + blockers**, not problem-solving. Anything that needs a discussion goes to a follow-up.
- Planning ends when the sprint goal is locked, the selected stories total fits the team's velocity, and every story is `ready` per the DoR.
- If the team misses a ceremony, the Scrum Master logs why and proposes a recovery.

## How to update

Edit the table, commit, open a PR. Cadence changes should usually come out of a retro experiment.
