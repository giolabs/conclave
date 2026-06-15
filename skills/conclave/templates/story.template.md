---
id: "US-{{id}}"
title: "{{title}}"
priority: "{{priority}}"        # must | should | could | wont
estimate: "{{estimate}}"        # XS | S | M | L | XL
status: backlog                 # backlog | ready | in-progress | review | verified | done
dependencies: []
assignee: ""
sprint: "{{sprint_id}}"
created_at: "{{iso_date}}"
---

# US-{{id}}: {{title}}

## User story

**As a** {{role}}
**I want** {{capability}}
**So that** {{benefit}}

## Acceptance criteria

See [`acceptance/AC-US-{{id}}.md`](../acceptance/AC-US-{{id}}.md).

## Technical notes (from Tech Lead)

{{technical_notes}}

## Dependencies

{{dependencies_prose}}

## Out of scope

{{out_of_scope}}

## Status transitions

- `backlog` — exists in the Product Backlog but not yet ready.
- `ready` — passes the Definition of Ready; can be pulled into a sprint.
- `in-progress` — assigned and being implemented (`/conclave-dev`).
- `review` — PR open, awaiting QA verification.
- `verified` — QA passed the acceptance criteria; awaiting Tech Lead PR approval. **Used only when `ceremonies.peer_pr_review.required: true`** in `conclave/config.md`. When the flag is `false`, QA pass jumps directly to `done`.
- `done` — QA verified, Tech Lead approved (when applicable), DoD met, PR mergeable.
