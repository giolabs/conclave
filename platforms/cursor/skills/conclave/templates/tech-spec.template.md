---
id: "SPEC-{{id}}"
title: "{{title}}"
epic: "{{epic_id}}"             # EP-NNN this spec designs
status: draft                   # draft | approved | superseded — /conclave-spec always writes "draft"; the team approves it with /conclave-spec approve SPEC-NNN (or by hand on merge)
adrs: []                        # ADR-NNN ids this spec relies on (accepted or proposed)
spikes: []                      # spike story ids whose findings fed this spec
authors: []                     # Tech Lead(s) from the roster
created_at: "{{iso_date}}"
approved_at: ""
approved_by: ""
supersedes: null                # SPEC-NNN this one replaces (set by /conclave-spec when re-authoring an approved spec)
superseded_by: null
generated_by: conclave
---

# SPEC-{{id}}: {{title}}

> Technical specification for [{{epic_id}}](../epics/{{epic_file}}). The epic says **what** and **why**; this spec says **how**. ADRs record the individual decisions; this document composes them into a design the team can split into stories. `/conclave-planning` refines this epic's stories from §11 once the spec is `approved`.

## 1. Context and goal

{{context}}

<!-- The epic goal in one sentence, the part of the Product Goal it moves, and the current state
     of the system this spec changes (cite files, modules, prior ADRs). -->

## 2. Scope

**In:**
{{scope_in}}

**Out:**
{{scope_out}}

## 3. Decisions

| ADR | Decision | Status | Why it matters here |
|-----|----------|--------|---------------------|
| {{adr_rows}} |

> Every architectural choice this spec depends on is an ADR. A choice that is not yet an ADR is listed in §12 as an open question, never decided silently in prose.

## 4. Design

{{design}}

<!-- Components touched or added, responsibilities, and one Mermaid diagram (component or
     sequence) for the main flow. Name real modules/paths from architecture.md. -->

## 5. Interfaces and contracts

{{interfaces}}

<!-- APIs (method, path, request/response shape, errors), events, CLI flags, UI routes.
     Mark breaking changes explicitly. -->

## 6. Data changes

{{data_changes}}

<!-- Entities and fields added/changed, migrations, backfills, retention. Reference
     02-data-model.md when a discovery package exists. "None" is a valid answer. -->

## 7. Domain rules covered

{{domain_rules}}

<!-- BLOC invariants (INV-n), use cases (UC-n), edge cases (EC-n) this epic must honour, and
     where in the design each is enforced. Omit when there is no BLOC. -->

## 8. Non-functional requirements

{{nfr}}

<!-- Only the budgets that apply: latency, throughput, security/authz, privacy, observability,
     accessibility. Each one measurable. -->

## 9. Test strategy

{{test_strategy}}

<!-- Unit / integration / UAT split, fixtures and seed data needed, what each story's Gherkin
     scenarios will exercise. -->

## 10. Rollout and migration

{{rollout}}

<!-- Feature flags, backward compatibility, ordering constraints between stories, rollback. -->

## 11. Story breakdown

| # | Candidate story | Type | Size | Depends on | Implements |
|---|-----------------|------|------|------------|------------|
| {{story_rows}} |

> One row per story `/conclave-planning` will refine. `Type` is `feature` or `enabler`; `Size` is XS–L (never XL); `Implements` names the spec section(s) and ADR(s) the story realises. The rows, taken together, deliver the epic's success criterion.

## 12. Risks and open questions

| # | Question / risk | Impact | Resolve by |
|---|-----------------|--------|------------|
| {{risk_rows}} |

> `Resolve by` is one of: `spike` (create it with `/conclave-spike`), `ADR` (`/conclave-adr`), `PM decision`, or `accept risk`. A spec with an open question marked `spike` should not be approved until the spike is done.

## 13. Approval

- Status: **{{status}}**
- Approved by: {{approved_by}} on {{approved_at}}

<!-- /conclave-spec approve SPEC-NNN fills this section. Approving a spec does not accept its
     ADRs — they keep their own lifecycle. -->
