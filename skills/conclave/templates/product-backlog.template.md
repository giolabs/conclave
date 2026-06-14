---
status: living
last_groomed_at: "{{iso_date}}"
generated_by: conclave
---

# Product Backlog

> Ordered by value. The team pulls from the top.

## Vision

{{vision}}

## Backlog

| Order | Story | Title | Priority | Estimate | Status | In sprint |
|------:|-------|-------|----------|----------|--------|-----------|
| 1 | [US-001](../sprints/SPRINT-001/stories/US-001-{{slug}}.md) | {{title_1}} | must | M | in-progress | SPRINT-001 |
| 2 | [US-002](../sprints/SPRINT-001/stories/US-002-{{slug}}.md) | {{title_2}} | must | S | ready | SPRINT-001 |
| 3 | US-003 | {{title_3}} | should | L | backlog | — |
| 4 | US-004 | {{title_4}} | could | M | backlog | — |
| ... | ... | ... | ... | ... | ... | — |

## How this list is maintained

- New stories are appended at the bottom of the table with `status: backlog`.
- The Product Manager reorders by editing the `Order` column.
- When a story is selected for a sprint, its `In sprint` cell is filled and its `Status` moves to `ready` or `in-progress`.
- The `last_groomed_at` field at the top is updated by `/conclave-groom` (planned, not yet shipped) or by hand whenever the backlog is reorganized.

## Legend

- **Priority**: MoSCoW — `must`, `should`, `could`, `wont`.
- **Estimate**: T-shirt — `XS`, `S`, `M`, `L`, `XL`. XL must be split before entering a sprint.
- **Status**: `backlog` → `ready` (passes DoR) → `in-progress` → `review` → `done`.
