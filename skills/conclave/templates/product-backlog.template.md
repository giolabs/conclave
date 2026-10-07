---
status: living
last_groomed_at: "{{iso_date}}"
generated_by: conclave
---

# Product Backlog

> Ordered by value. The team pulls from the top.

Product Goal and vision: see [`vision.md`](vision.md). Epics: [`epics/`](epics/). Sequencing: [`roadmap.md`](roadmap.md).

## Backlog

| Order | Story | Epic | Title | Priority | Estimate | Status | In sprint |
|------:|-------|------|-------|----------|----------|--------|-----------|
| 1 | [US-001](../sprints/SPRINT-000/stories/US-001-{{slug}}.md) | EP-001 | {{title_1}} | must | M | ready | SPRINT-000 |
| 2 | US-002 | EP-002 | {{title_2}} | should | L | backlog | — |
| ... | ... | ... | ... | ... | ... | ... | — |

## How this list is maintained

- New stories are appended at the bottom of the table with `status: backlog`.
- The Product Manager reorders by editing the `Order` column.
- When a story is selected for a sprint, its `In sprint` cell is filled and its `Status` moves to `ready` or `in-progress`.
- Stories are added just in time: `/conclave-planning` refines the next roadmap slot's epic(s) into stories and appends them here; `/conclave-story new` adds ad-hoc ones.
- The `last_groomed_at` field at the top is updated by `/conclave-planning` (inline refinement) or by hand whenever the backlog is reorganized.

## Legend

- **Priority**: MoSCoW — `must`, `should`, `could`, `wont`.
- **Estimate**: T-shirt — `XS`, `S`, `M`, `L`, `XL`. XL must be split before entering a sprint.
- **Status**: `backlog` → `ready` (passes DoR) → `in-progress` → `review` → `verified` (when `peer_pr_review.required: true`) → `done`. Terminal parallel: `retired` (via `/conclave-story retire` or `/conclave-story split` on the parent) — excluded from every command's collection queries.
