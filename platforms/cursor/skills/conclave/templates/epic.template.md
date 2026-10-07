---
id: "EP-{{id}}"
title: "{{title}}"
status: proposed               # proposed | active | done | retired
size: "{{size}}"               # S (≈1 sprint) | M (≈2 sprints) | L (≈3+ sprints — split before it enters the roadmap)
priority: "{{priority}}"       # must | should | could
type: "{{type}}"               # feature | enabler
dependencies: []               # other EP-NNN ids
roadmap_slots: []              # SPRINT-NNN ids this epic is planned into (set by the roadmap step)
stories: []                    # US-NNN ids generated from this epic (appended by /conclave-planning)
created_at: "{{iso_date}}"
# Optional retirement / lineage fields (populated by /conclave-epic retire | split)
# retirement_reason: ""
# retired_at: ""
# superseded_by: []
# split_from: ""
---

# EP-{{id}}: {{title}}

## Goal

{{goal}}

> One sentence: the user outcome this epic delivers, and which part of the Product Goal it moves.

## Scope

**In:**
{{scope_in}}

**Out:**
{{scope_out}}

## Success criterion

{{success_criterion}}

> Observable and binary. The epic is `done` when every non-retired story is `done` **and** this criterion holds — `/conclave-close` checks both.

## Candidate stories

{{candidate_stories}}

> Rough one-liners only. `/conclave-planning` turns them into INVEST stories with Gherkin acceptance criteria when this epic's roadmap slot is planned — refinement happens just in time, not up front.

## Technical notes (from Tech Lead)

{{technical_notes}}

## Status transitions

- `proposed` — created at inception or by `/conclave-epic new`; not yet in a planned sprint.
- `active` — at least one of its stories is in an `active` sprint (set by `/conclave-planning`).
- `done` — all its non-retired stories are `done` and the success criterion holds (set by `/conclave-close`).
- `retired` — dropped or split (`/conclave-epic retire | split`). Terminal; excluded from roadmap and planning.
