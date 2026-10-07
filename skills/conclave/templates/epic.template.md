---
id: "EP-{{id}}"
title: "{{title}}"
status: proposed               # proposed | active | done | retired
size: "{{size}}"               # S (≈1 sprint) | M (≈2 sprints) | L (≈3+ sprints — split before it enters the roadmap)
priority: "{{priority}}"       # must | should | could
type: "{{type}}"               # feature | enabler
uncertainty: "{{uncertainty}}" # low | medium | high — set by the Tech Lead risk pass; high = schedule a spike before the epic's first slot
needs_spec: {{needs_spec}}     # true = /conclave-planning requires an approved SPEC (/conclave-spec) before refining this epic
spec: ""                       # SPEC-NNN technical spec for this epic (set by /conclave-spec)
adrs: []                       # ADR-NNN ids this epic depends on (inception, /conclave-spec, spikes)
spikes: []                     # spike story ids that de-risk this epic (set by /conclave-spike and /conclave-planning)
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

## Open questions (spike candidates)

{{open_questions}}

> Unknowns the Tech Lead could not resolve from the inputs, each phrased as a decision ("Can we / Should we / Which of …"). An epic with `uncertainty: high` has at least one. The roadmap schedules a `spike:EP-NNN` entry ahead of the epic; `/conclave-planning` (or `/conclave-spike`) turns each question into a timeboxed `type: spike` story. Empty when the epic is well understood.

## Status transitions

- `proposed` — created at inception or by `/conclave-epic new`; not yet in a planned sprint. A spike for it may already have run.
- `active` — at least one of its stories is in an `active` sprint (set by `/conclave-planning`).
- `done` — all its non-retired stories are `done` and the success criterion holds (set by `/conclave-close`).
- `retired` — dropped or split (`/conclave-epic retire | split`). Terminal; excluded from roadmap and planning.
