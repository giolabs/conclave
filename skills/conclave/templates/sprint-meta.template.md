---
id: "{{sprint_id}}"
title: "{{sprint_title}}"
status: draft               # draft | active | closed
slot: {{slot}}                     # roadmap slot number (0 = Sprint 0 / walking skeleton)
epics: []                   # EP-NNN ids this sprint pulls stories from
committed_units: 0          # set by /conclave-planning (XS=1 S=2 M=3 L=5 XL=8)
velocity: null              # done units — set by /conclave-close
sprint_goal_met: null       # true | false | partial — set by /conclave-close
closed_at: ""               # ISO date — set by /conclave-close
created_at: "{{iso_date}}"
target_start: "{{start_date}}"
target_end: "{{end_date}}"
context_snapshot: conclave/context/
generated_by: conclave
---

# {{sprint_id}}: {{sprint_title}}

## Goal

{{sprint_goal}}

## Stories included

- US-{{id_1}}
- US-{{id_2}}
- US-{{id_3}}

## Status transitions

- `draft` — created by `/conclave-planning` from the next roadmap slot; stories being refined.
- `active` — locked by `/conclave-planning`; the team is working on it. Only one sprint is `active` at a time.
- `closed` — closed by `/conclave-close` after Review (and Retro when enabled). Velocity recorded; historical from here on.

## Audit trail

The context snapshot at `conclave/context/` reflects the state of `CLAUDE.md`, available Skills, and detected project rules at the moment this sprint was generated. Compare against the current state when re-grooming to see what changed.
