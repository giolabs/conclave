---
doc: data-model
product: "{{product_name}}"
generated_by: conclave-discovery
generated_at: "{{iso_date}}"
feeds: [architecture.md, stories (technical notes)]
---

# 02 — Data Model

> **Product:** {{product_name}}
> **Datastore:** {{db_engine}}

## Overview

{{data_model_overview}}

<!-- 2–3 sentences: multi-tenancy, soft-delete convention, audit strategy. -->

## ER diagram

```mermaid
erDiagram
{{er_diagram}}
```

## Entities

<!-- One block per entity. Core entities in full; auxiliary tables in one line. -->

### {{entity_name}}

**Purpose:** {{entity_purpose}}
**Key attributes:** {{entity_attrs}}
**Relationships:** {{entity_relations}}
**Suggested indexes:** {{entity_indexes}}

## Structural decisions

| Concern | Decision | Why |
|---|---|---|
| Multi-tenancy | {{multitenancy}} | {{multitenancy_why}} |
| Soft delete | {{softdelete}} | {{softdelete_why}} |
| Audit trail | {{audit}} | {{audit_why}} |
| Migrations | {{migrations}} | {{migrations_why}} |

<!-- The migrations tool is a Sprint 0 enabler when the datastore is relational. -->

## Scale notes

{{scale_notes}}
