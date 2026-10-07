---
sprint: "{{sprint_id}}"
date: "{{iso_date}}"
participants: {{participants_yaml}}
generated_by: conclave
---

# Retrospective — {{sprint_id}}

> Produced by `/conclave-close` when `ceremonies.close.retro: true`. Inspects how the team worked, not what it built. The action items below are imported automatically by the next `/conclave-planning`.

## Signals from the sprint

{{signals}}

> Facts gathered by the Scrum Master before asking anyone: velocity vs. commitment, stories bounced back from QA or TL review, blocked/aborted autonomous runs, bugs filed, carry-over count.

## Keep

{{keep}}

## Change

{{change}}

## Try

{{try}}

## Action items

| # | Action | Owner | Measure | Status |
|---|--------|-------|---------|--------|
{{action_rows}}

> At most 3. Each one is concrete, has an owner and a measure the next retro can check. `Status`: `open` → `done` | `dropped`. `/conclave-planning` lists every `open` item in the next planning record; the next `/conclave-close` asks whether each one was done.

## Previous action items

{{previous_actions}}
