---
doc: discovery
product: "{{product_name}}"
generated_by: conclave-discovery
generated_at: "{{iso_date}}"
feeds: [vision.md]          # Conclave inception reads this for problem, personas, metrics
---

# 00 — Discovery

> **Product:** {{product_name}}
> **One-liner:** {{one_liner}}
> **Project type:** {{project_type}}

## 1. Problem statement

{{problem_statement}}

<!-- 2–4 sentences. A concrete pain, not "users struggle with X". -->

## 2. ICP — Ideal Customer Profile

| Field | Value |
|---|---|
| Role / position | {{icp_role}} |
| Industry / vertical | {{icp_industry}} |
| Organization size | {{icp_size}} |
| Geography | {{icp_geo}} |
| Usage context | {{icp_context}} |

**How they solve it today:** {{icp_current_solution}}

**Why that fails them:** {{icp_gap}}

**How we reach them:** {{icp_channel}}

## 3. Personas

<!-- 1–3 personas derived from the ICP. These become the personas table of conclave/product/vision.md. Never invent demographics the idea doesn't support. -->

| Persona | Who they are | What they need | How they do it today |
|---|---|---|---|
| {{persona_1}} | {{who_1}} | {{need_1}} | {{today_1}} |

## 4. Business model

**Primary model:** {{business_model}}
**Pricing hypothesis:** {{pricing_hypothesis}}
**Rationale:** {{pricing_rationale}}

## 5. Competitors

| Name | URL | Positioning | Pricing | Strength | Gap |
|---|---|---|---|---|---|
| {{comp_1_name}} | {{comp_1_url}} | {{comp_1_pos}} | {{comp_1_price}} | {{comp_1_strength}} | {{comp_1_gap}} |

**Competitive read:** {{competitive_read}}

<!-- Research is dated and sourced (Tier C). Zero competitors is a red flag, not a green light. -->

## 6. UVP — Unique Value Proposition

> {{uvp_statement}}

<!-- For [ICP], [product] is a [category] that [benefit] because [reason], unlike [main competitor]. -->

## 7. Feature list (full brainstorm)

**Must-have (MVP candidates):**
{{features_must}}

**Should-have (v1.x):**
{{features_should}}

**Could-have (backlog):**
{{features_could}}

**Won't-have:**
{{features_wont}}

<!-- 04-mvp.md filters this into the MVP and groups it into candidate epics. -->

## 8. Primary user journey

{{user_journey}}

## 9. Open questions

{{open_questions}}

<!-- Anything the idea did not answer. Inception copies these into vision.md; they are never invented away. -->
