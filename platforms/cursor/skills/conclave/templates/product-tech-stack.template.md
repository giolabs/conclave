---
doc: tech-stack
product: "{{product_name}}"
generated_by: conclave-discovery
generated_at: "{{iso_date}}"
feeds: [config.md stack, architecture.md, adr/]   # each choice becomes an ADR during inception
stack:                                            # read by /conclave-init to pre-fill the stack confirmation
  language: "{{stack_language}}"
  framework: "{{stack_framework}}"
  datastore: "{{stack_datastore}}"
  infrastructure: "{{stack_infrastructure}}"
---

# 01 — Tech Stack

> **Product:** {{product_name}}
> **Project type:** {{project_type}}
> **Team size assumed:** {{team_size}}

## Summary

{{stack_summary}}

## Recommendation

<!-- One block per layer. Each: Choice / Why here / Reconsider when. Delete layers that do not apply (e.g. no frontend for a pure API). -->

### Frontend
**Choice:** {{frontend_choice}}
**Why here:** {{frontend_why}}
**Reconsider when:** {{frontend_reconsider}}

### Backend
**Choice:** {{backend_choice}}
**Why here:** {{backend_why}}
**Reconsider when:** {{backend_reconsider}}

### Database
**Choice:** {{db_choice}}
**Why here:** {{db_why}}
**Reconsider when:** {{db_reconsider}}

### Auth
**Choice:** {{auth_choice}}
**Why here:** {{auth_why}}
**Reconsider when:** {{auth_reconsider}}

### Hosting / infra
**Choice:** {{hosting_choice}}
**Why here:** {{hosting_why}}
**Reconsider when:** {{hosting_reconsider}}

### Test, lint and CI
**Choice:** {{testing_choice}}
**Why here:** {{testing_why}}

<!-- Required: Sprint 0 enabler stories install exactly this. -->

### Key integrations
{{integrations}}

### Observability
{{observability}}

## Rejected alternatives

{{rejected_alternatives}}

<!-- 2–3 serious alternatives with the reason each lost. Becomes "Alternatives considered" in the ADRs. -->

## Technical risks

{{technical_risks}}

## Evidence

{{evidence}}

<!-- Per choice: the source and its tier (B = versioned docs fetched this run, C = dated secondary source, D = assumption). Greenfield repos have no Tier A. -->
