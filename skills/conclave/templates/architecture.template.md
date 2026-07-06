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

Each row references a standalone ADR file under `conclave/product/adr/`. To author a new one, run `/conclave-adr "<decision topic>"` (topic-directed) or `/conclave-adr` (discovery mode — the Tech Lead proposes candidates).

| ID | Title | Status | Date |
|---|---|---|---|
| [ADR-001](adr/ADR-001-{{adr_1_slug}}.md) | {{adr_1_title}} | proposed | {{iso_date}} |
| [ADR-002](adr/ADR-002-{{adr_2_slug}}.md) | {{adr_2_title}} | proposed | {{iso_date}} |
| [ADR-003](adr/ADR-003-{{adr_3_slug}}.md) | {{adr_3_title}} | proposed | {{iso_date}} |

> `/conclave-spec` creates this table with initial ADR rows and writes the corresponding standalone files under `adr/`. Later `/conclave-adr` runs append rows here for each new ADR.

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

## 7. How ADRs are added

New ADRs are authored via `/conclave-adr`:

- **Topic-directed**: `/conclave-adr "Redis vs Postgres for caching"` — the Tech Lead researches the decision (read-only exploration of the codebase, this document, and existing ADRs), writes a full ADR file under `conclave/product/adr/`, and appends a row to the section 4 table above.
- **Discovery mode**: `/conclave-adr` with no arguments — the Tech Lead scans recent sprint activity and gaps in this document, proposes 1–3 candidate decisions that would benefit from an ADR, and the user picks one via `AskUserQuestion`. If nothing surfaces, the command exits cleanly with a "no candidates" message.

ADR files live at `conclave/product/adr/ADR-NNN-<slug>.md`. Numbering is monotonic and never reused; retired or replaced ADRs stay in place with `status: superseded`.

The Tech Lead only ever writes `status: proposed` ADRs — promoting to `accepted` is a team decision made when the PR that introduces the ADR is approved and merged (a reviewer edits the frontmatter in the same or a follow-up PR).

## How this document changes

- New ADRs are added via `/conclave-adr` (see section 7). Rows are appended to section 4 with the next sequential number (ADR-NNN+1). Old ADRs are not deleted; a superseding ADR marks the older one via its own `supersedes:` field and the older's `superseded_by:`.
- The Tech Lead owns the document. Any team member can propose changes via PR; the TL approves.
- Major changes that affect already-in-progress stories must be discussed in the next standup before merging.
