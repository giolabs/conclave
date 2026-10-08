---
doc: mvp
product: "{{product_name}}"
generated_by: conclave-discovery
generated_at: "{{iso_date}}"
feeds: [vision.md (Product Goal, MVP scope), epics/, roadmap.md]
product_goal: "{{product_goal}}"
sprint_length_weeks: {{sprint_length_weeks}}
team_assumption: "{{team_assumption}}"
---

# 04 — MVP Definition

> **Product:** {{product_name}}
> **Team assumed:** {{team_assumption}}
> **Sprint length:** {{sprint_length_weeks}} week(s)
> **Estimated time to MVP:** {{timeline_estimate}} (±25%)

## What the MVP is

{{mvp_narrative}}

<!-- 3–5 sentences: the smallest version an ICP user can use end to end. Rule: if it cannot be demoed in 3 minutes, it is not the MVP. -->

## Product Goal

> **{{product_goal}}**

<!-- One sentence, measurable, reachable by the MVP. Becomes product_goal in conclave/product/vision.md. -->

## Success metrics

| Metric | Baseline | Target | How it is measured |
|---|---|---|---|
| {{metric}} | {{baseline}} | {{target}} | {{measure}} |

## MVP scope

**In:**
{{mvp_in}}

**Out (v1):**
{{mvp_out}}

## Candidate epics

<!--
Every MVP feature lands in exactly one candidate epic. /conclave-init inception turns each block into conclave/product/epics/EP-NNN-<slug>.md.
Size: S ≈ 1 sprint, M ≈ 2, L ≈ 3+ (split L before it enters the roadmap). Priority: must | should | could — at most half must.
-->

### {{epic_title}}

- **Goal:** {{epic_goal}}
- **Features:** {{epic_features}}
- **Success criterion:** {{epic_success_criterion}}
- **Size / priority:** {{epic_size}} / {{epic_priority}}
- **Depends on:** {{epic_dependencies}}
- **BLOC references:** {{epic_bloc_refs}}   <!-- INV-n / UC-n / EC-n this epic must honour -->

## Sprint 0 — walking skeleton

{{sprint_zero}}

<!-- The enablers from 01-tech-stack.md: scaffold, test framework + one passing test, lint, CI, integration branch, migrations tool if relational. Write "not needed — repo already has code, tests and CI" when that is the case. -->

## Sequencing hint

| Order | Candidate epic(s) | Why this order |
|---|---|---|
| 0 | Walking skeleton | Everything else is verified against it |
| 1 | {{epics_1}} | {{why_1}} |

<!-- 6–8 sprints at most. The Scrum Master turns this into conclave/product/roadmap.md with real dates. -->

## MVP Definition of Done

{{mvp_dod}}

<!-- 3–5 binary criteria for the whole MVP. -->

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| {{risk}} | {{likelihood}} | {{impact}} | {{mitigation}} |

## Post-MVP

{{post_mvp}}
