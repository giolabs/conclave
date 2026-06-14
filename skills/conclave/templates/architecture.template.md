---
status: living
generated_by: conclave
generated_at: "{{iso_date}}"
---

# Architectural Foundation

> Authored by the Tech Lead, refined by the team. This is the source of truth for cross-cutting technical decisions. Story-level decisions belong in story files or in their own ADR amendments.

## 1. Overview

{{overview}}

## 2. Confirmed stack

- **Language(s)**: {{languages}}
- **Framework(s)**: {{frameworks}}
- **Datastore(s)**: {{datastores}}
- **Infrastructure**: {{infrastructure}}
- **Key libraries / SDKs**: {{libraries}}

## 3. Component diagram

```mermaid
{{mermaid_diagram}}
```

## 4. Architectural Decision Records

### ADR-001: {{adr_1_title}}
**Context.** {{adr_1_context}}
**Decision.** {{adr_1_decision}}
**Consequences.** {{adr_1_consequences}}

### ADR-002: {{adr_2_title}}
**Context.** {{adr_2_context}}
**Decision.** {{adr_2_decision}}
**Consequences.** {{adr_2_consequences}}

### ADR-003: {{adr_3_title}}
**Context.** {{adr_3_context}}
**Decision.** {{adr_3_decision}}
**Consequences.** {{adr_3_consequences}}

## 5. Cross-cutting concerns

### 5.1 Authentication and authorization
{{auth}}

### 5.2 Observability (logging, metrics, tracing)
{{observability}}

### 5.3 Error handling and resilience
{{error_handling}}

### 5.4 Performance budgets
{{performance}}

### 5.5 Security posture
{{security}}

## 6. Technical risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {{risk_1}} | {{likelihood_1}} | {{impact_1}} | {{mitigation_1}} |
| {{risk_2}} | {{likelihood_2}} | {{impact_2}} | {{mitigation_2}} |
| {{risk_3}} | {{likelihood_3}} | {{impact_3}} | {{mitigation_3}} |

## How this document changes

- New ADRs are appended with the next sequential number (ADR-004, ADR-005, …). Old ADRs are not deleted; they are amended with a new ADR that supersedes them.
- The Tech Lead owns the document. Any team member can propose changes via PR; the TL approves.
- Major changes that affect already-in-progress stories must be discussed in the next standup before merging.
