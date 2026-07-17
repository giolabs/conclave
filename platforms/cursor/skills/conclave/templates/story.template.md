---
id: "US-{{id}}"
title: "{{title}}"
priority: "{{priority}}"        # must | should | could | wont
estimate: "{{estimate}}"        # XS | S | M | L | XL
status: backlog                 # backlog | ready | in-progress | review | verified | done | retired
dependencies: []
assignee: ""
discipline: ""                  # frontend | backend | qa | design | devops | mobile | multi — set by the Tech Lead during /conclave-planning
sprint: "{{sprint_id}}"
created_at: "{{iso_date}}"
# Optional retirement / lineage fields (populated by /conclave-story retire | split)
# retirement_reason: ""         # free-form; set by /conclave-story retire (or by /conclave-story split on the parent)
# retired_at: ""                # ISO date; set by /conclave-story retire (or by /conclave-story split on the parent)
# superseded_by: []             # list of child story IDs; set by /conclave-story split on the parent
# split_from: ""                # parent story ID; set by /conclave-story split on each child
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

- `backlog` — exists in the Product Backlog but not yet ready. `discipline` is typically still empty at this point.
- `ready` — passes the Definition of Ready (including a non-empty `discipline`, assigned by the Tech Lead during `/conclave-planning`); can be pulled into a sprint.
- `in-progress` — assigned and being implemented (`/conclave-dev`).
- `review` — PR open, awaiting QA verification.
- `verified` — QA passed the acceptance criteria; awaiting Tech Lead PR approval. **Used only when `ceremonies.peer_pr_review.required: true`** in `conclave/config.md`. When the flag is `false`, QA pass jumps directly to `done`.
- `done` — QA verified, Tech Lead approved (when applicable), DoD met, PR mergeable.
- `retired` — **parallel terminal state to `done`**. Entered via `/conclave-story retire` (explicit retirement, with `retirement_reason` and `retired_at` set) or `/conclave-story split` (on the parent, when it is decomposed into children — `superseded_by:` also populated). A retired story is excluded from every command's story collection (`/conclave-planning`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, `/conclave-sprint`) and is a historical record only. There is no un-retire command; to reverse, hand-edit the frontmatter — git preserves the audit trail.
