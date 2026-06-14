---
sprint_length_weeks: 2
timezone: "{{timezone}}"
last_updated_at: "{{iso_date}}"
---

# Ceremony cadence

## Sprint length
**{{sprint_length_weeks}} week(s)**

## Schedule

| Ceremony | Day | Time | Duration | Who attends |
|----------|-----|------|----------|-------------|
| Sprint Planning | Monday (sprint start) | 10:00 | 90 min | PM, TL, SM, all Devs, QA |
| Daily Standup | Every weekday | 09:30 | 15 min | All Devs, TL, QA (SM facilitates) |
| Backlog Grooming | Wednesday mid-sprint | 11:00 | 45 min | PM, TL, optional Devs |
| Sprint Review | Friday (sprint end) | 14:00 | 60 min | Whole team + stakeholders |
| Sprint Retrospective | Friday (sprint end, after Review) | 15:30 | 60 min | Whole team |

## Working agreement

- All ceremonies happen on video. Async-only ceremonies have lower bandwidth and lose nuance.
- Standup is **status + blockers**, not problem-solving. Anything that needs a discussion goes to a follow-up.
- Planning ends when the sprint goal is locked, the selected stories total fits the team's velocity, and every story is `ready` per the DoR.
- If the team misses a ceremony, the Scrum Master logs why and proposes a recovery.

## How to update

Edit the table, commit, open a PR. Cadence changes should usually come out of a retro experiment.
