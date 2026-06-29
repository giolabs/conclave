---
title: Team profiles
description: How team profiles control which Scrum ceremonies are enforced.
category: methodology
order: 2
lang: en
---

# Team profiles

Conclave separates **structural invariants** (you cannot do Scrum without them) from **ceremonies** (process gates the team chooses to commit to). The split is controlled by the `team_profile` field in `conclave/config.md`.

## Always required (structural — never skippable)

These four checks are enforced by every team profile. They are the minimum Scrum needs to function:

- **Sprint Planning** — without a goal and a locked story list, there is no sprint. Enforced by `/conclave-planning` and the existence of `conclave/sprints/SPRINT-NNN/spec.md`.
- **Acceptance criteria on every story** — every story file must reference a non-empty `acceptance/AC-US-NNN.md` with Gherkin scenarios. Stories without them fail the DoR.
- **QA verification of acceptance criteria** — every `done` story carries a verification report appended to its acceptance file. Enforced by `/conclave-qa`.
- **Definition of Done compliance** — the team-customized DoD checklist must be met for every story.

## Skippable per profile

The team picks a profile in `conclave/config.md`. Conclave's ceremony commands read it and silently skip the gates the profile turns off.

| Ceremony | Command | `lean` default | `full-scrum` default | Notes |
|---|---|---|---|---|
| Daily Standup | `/conclave-standup` | off | on | Logs to `sprints/SPRINT-NNN/daily/`. |
| Backlog Grooming | `/conclave-groom` | off | on | When off, grooming happens inside `/conclave-planning`. |
| Peer / TL PR Review | `/conclave-pr-review` | off | on | Solo devs and small teams often skip this. |
| Sprint Review | `/conclave-review` | off | on | Required when there are stakeholders to demo to. |
| Sprint Retrospective | `/conclave-retro` | off | on | First to get dropped under pressure; opt back in when stable. |

## Profile semantics

- **`lean`** — only the structural invariants are enforced. For solo devs, very small teams (2–3), and internal tooling work.
- **`full-scrum`** — every ceremony is required. For cross-functional teams that ship to external stakeholders.
- **`custom`** — the team sets each `ceremonies.*.required` flag individually. Recorded as `custom` so nobody assumes a preset.

## Two gates cannot be turned off

`sprint_planning` and `qa_verification` cannot be flagged off — attempting to set `required: false` for either is rejected with a clear error. These are structural.

## The PR-approval gate

When `peer_pr_review.required: true`, the **Tech Lead** (or designated approver) is the one who runs `gh pr review --approve` via `/conclave-pr-review US-NNN`. QA's job ends at the verification report and a PR comment — never an approval. See the [state machine](/conclave/en/docs/state-machine/) for how the story transitions.

When the flag is `false`, QA's pass is the merge signal. Story moves straight from `review` to `done`.

## Changing your profile

Edit `team_profile` in `conclave/config.md`. To override a single ceremony without changing the whole profile, set `team_profile: custom` and edit individual `ceremonies.*.required` flags.

Profile changes take effect on the next slash-command run. The current sprint is unaffected — flags are read at command invocation time.
