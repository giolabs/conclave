---
story: "{{story_id}}"            # the type: spike story this report closes
epic: "{{epic_id}}"              # EP-NNN the spike de-risks (may be empty)
question: "{{question}}"
timebox: "{{timebox}}"            # XS | S | M — what was planned
time_spent: "{{time_spent}}"      # within | exceeded — honest
outcome: "{{outcome}}"            # answered | partially-answered | not-answered
recommendation: "{{recommendation_short}}"
produced_adrs: []                 # ADR-NNN ids proposed by this spike
produced_spec: ""                 # SPEC-NNN drafted or revised by this spike
generated_at: "{{iso_date}}"
generated_by: conclave
---

# Spike findings — {{story_id}}: {{title}}

## Question

{{question}}

> One question, phrased as a decision the team needs to make ("Can we / Should we / Which of …"). A spike that answers a different question than the one planned says so here.

## Approach

{{approach}}

<!-- What was read, measured or prototyped, and where. Prototypes run in a disposable worktree or
     lab branch and are never merged — name the branch/commit if the team may want to look. -->

## Evidence

| # | Claim | Evidence | Tier |
|---|-------|----------|------|
| {{evidence_rows}} |

> Tier A = measured this session (command + output), B = versioned docs fetched this session, C = dated secondary source, D = assumption. A recommendation that rests only on Tier D is not an answer — mark `outcome: not-answered`.

## Options considered

{{options}}

## Recommendation

{{recommendation}}

<!-- One decision, stated as "We should ___ because ___." If it is architectural it is also
     written as a proposed ADR (linked below). -->

## Impact on the backlog

- **Epic**: {{epic_impact}}
- **Estimate changes**: {{estimate_changes}}
- **New candidate stories**: {{new_candidates}}
- **Uncertainty after the spike**: {{uncertainty_after}}   <!-- low | medium | high -->

## Artifacts produced

- ADRs: {{adr_links}}
- SPEC: {{spec_link}}

## Follow-ups

{{follow_ups}}

<!-- Anything left open: another spike, a PM decision, an accepted risk. Never silently dropped. -->
