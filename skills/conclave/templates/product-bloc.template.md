---
doc: bloc
product: "{{product_name}}"
generated_by: conclave-discovery
generated_at: "{{iso_date}}"
feeds: [stories (Gherkin acceptance criteria), architecture.md]   # /conclave-planning turns invariants and edge cases into scenarios
---

# 03 — BLOC (Business Logic Component)

> **Product:** {{product_name}}

The domain rules a new engineer reads before touching code. `/conclave-planning` hands this file to the Product Manager during refinement: every invariant and edge case below that a story touches must appear as a Gherkin scenario on that story.

## Domain philosophy

{{domain_philosophy}}

## Ubiquitous language

| Term | Meaning |
|---|---|
| {{term}} | {{term_meaning}} |

## Invariants

<!-- Things that must ALWAYS be true. Numbered — stories reference them as INV-n. -->

1. **INV-1 {{invariant_name}}** — {{invariant_desc}}

## Main use cases

### UC-1 {{use_case_name}}

**Actor:** {{actor}}
**Preconditions:** {{pre}}
**Flow:** {{flow}}
**Postconditions:** {{post}}
**Rules applied:** {{rules}}

## State machines

<!-- Only for entities whose state is not linear. -->

### {{stateful_entity}}

```mermaid
stateDiagram-v2
{{state_diagram}}
```

**Transition rules:** {{transition_rules}}

## Calculations

<!-- Only when the domain has quantitative logic: fees, quotas, thresholds. Delete otherwise. -->

{{calculations}}

## Authorization

| Action | {{role_1}} | {{role_2}} |
|---|---|---|
{{auth_matrix}}

## Edge cases and hard decisions

<!-- Numbered — stories reference them as EC-n. Situation, decision, reason. -->

- **EC-1 {{edge_title}}** — Situation: {{edge_situation}}. Decision: {{edge_decision}}. Reason: {{edge_reason}}.

## Domain events

<!-- Only if the design is event-driven. Delete otherwise. -->

{{events}}

## Open decisions

{{open_decisions}}
