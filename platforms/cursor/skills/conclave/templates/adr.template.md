---
id: "ADR-{{id}}"
title: "{{title}}"
status: proposed          # proposed | accepted | superseded — TL agent always writes "proposed"; team promotes to accepted on PR merge
date: "{{iso_date}}"
deciders: {{deciders_yaml_list}}
tags: {{tags_yaml_list}}
reversibility: type-2     # type-1 (one-way door: data model, public API, primary datastore, auth model)
                          # type-2 (two-way door: swappable library, internal module boundary, caching layer)
                          # If uncertain, treat as type-1 and say so.
applies_to: []            # file globs this decision governs — e.g. ["src/api/**", "lib/auth/*"]
                          # Narrowest globs that actually cover the decision. ["**/*"] means the field does nothing.
supersedes: null          # optional list of prior ADR IDs this one replaces; set MANUALLY when the team decides to supersede
superseded_by: null       # optional list of newer ADR IDs that replace this one; set MANUALLY
generated_by: conclave
---

# ADR-{{id}}: {{title}}

## Context

{{context}}
<!-- What situation forces this decision? What constraints, existing stack decisions, or observed
     system behaviour make this choice necessary now? Cite file paths or prior ADR IDs. -->

## Decision

{{decision}}
<!-- One sentence. "We will ___." Every load-bearing claim carries its evidence tier inline:
     (Tier A) = measured this session | (Tier B) = versioned docs fetched this session
     (Tier C) = dated secondary source | (Tier D) = model assumption → must appear in Unknowns -->

## Alternatives Considered

<!-- Every Pros/Cons cell must carry its evidence tier. "performant (Tier D)" is worse than
     "performant — p95 42ms at 500 concurrent (Tier A, bench/run.sh, SHA a3f21c)".
     Generate options BEFORE reading any stated preference. Always include the null option
     ("keep what we have"). Two viable options minimum; steel-man the option you reject. -->

| Option | Pros | Cons |
|--------|------|------|
| {{option_1}} | {{pros_1}} | {{cons_1}} |
| {{option_2}} | {{pros_2}} | {{cons_2}} |
| {{option_3}} | {{pros_3}} | {{cons_3}} |

## Trade-offs

{{trade_offs_prose}}
<!-- Name sensitivity points (small change → big quality-attribute shift) and tradeoff points
     (sensitivity for two+ attributes in opposite directions). An ADR with risks and no tradeoff
     points, on a genuinely hard decision, means the analysis stopped early. -->

## Unknowns and Assumptions

<!-- Mandatory. An empty table is a defect, not an achievement.
     Every Tier-D claim in this document must have a row here.
     Pair with a revisit trigger: the observable condition that should reopen this decision. -->

| # | Statement | Tier | If false | Resolved by | Confidence |
|---|-----------|------|----------|-------------|------------|
| A1 | {{assumption_1}} | D | {{consequence_if_false}} | {{resolution_method}} | low |

**Revisit trigger:** {{condition_that_reopens_this_decision}}

## Consequences

### Positive
- {{positive_bullet}}

### Negative
- {{negative_bullet}}

### Neutral
- {{neutral_bullet}}

## Rules

<!-- RFC-2119 normative constraints addressed to whoever implements this.
     Imperative, not narrative. Each rule must be short enough to hold while writing code.
     Derive from Decision and Consequences — cut any rule that cannot be traced to either. -->

- **MUST** {{rule_1}}
- **MUST NOT** {{rule_2}}
- **SHOULD** {{rule_3}}

### Confirmation

<!-- How compliance is checked. Prefer an executable command that returns non-zero when violated:
     a lint rule, a dependency-cruiser boundary, an import-linter constraint, or a plain rg query.
     If not executable, describe what a reviewer should look for and mark it as weaker. -->

**Verify:** `{{executable_compliance_check}}`

## Implementation Notes

<!-- Entry points: every file path listed here is verified to exist on the integration branch
     THIS SESSION (git show origin/<branch>:<path> or git ls-tree). A plausible path that does not
     exist costs more time than omitting it entirely.
     Steps end in a runnable verification. A step with no verification is a step nobody can tell is done. -->

### Entry points

- `{{verified_file_path_1}}` — {{what_changes_here}}
- `{{verified_file_path_2}}` — {{what_changes_here}}

### Ordered steps

1. {{step_1}} — **verify:** `{{verification_command}}`
2. {{step_2}} — **verify:** `{{verification_command}}`

### Contracts touched

- {{dto_endpoint_event_or_schema}}

### Migration and rollback

{{migration_and_rollback_notes}}
<!-- Is this reversible or one-way? Online or offline? What data implications does an undo carry? -->

### Out of scope for the implementer

- {{what_not_to_touch}}

## Coverage

**This ADR settles:** {{what_is_decided}}

**This ADR does not settle:** {{what_is_explicitly_out_of_scope}}

**Investigated but inconclusive:** {{what_was_examined_but_not_resolved_and_why}}

**Not investigated:** {{what_was_explicitly_skipped_and_who_owns_it}}

## Links

- Related sprint stories: {{story_ids_or_none}}
- Related ADRs: {{adr_ids_or_none}}
- References: {{external_links_or_none}}

---

<!--
Template notes (not rendered — for the TL agent and the human editor):

FRONTMATTER
- `reversibility` determines the evidence bar: type-2 → Tier B + revisit trigger is enough.
  type-1 (data model, public API, auth) → Tier A on the deciding driver + human gate before accepted.
- `applies_to` globs let a coding agent load only the ADRs governing the file it is editing.
  Set it; leaving it empty means the field does nothing.
- `status: proposed` always. Promoting to `accepted` is done on PR merge (edit frontmatter in the same PR).
- `superseded_by` / `supersedes`: write both sides in the same pass — a one-way link is how a superseded
  ADR keeps getting cited as current.

EVIDENCE TIERS
- (Tier A) = command + raw output + commit SHA — never a summary of measured results.
- (Tier B) = versioned URL (never /latest/) + retrieval date, fetched this session.
- (Tier C) = dated secondary source (undated tutorials are not usable).
- (Tier D) = model assumption → mandatory row in Unknowns table.
- No Tier-D claim in the Decision Outcome. If the separating driver is Tier D, it is a lab request.

ALTERNATIVES
- At least 2 rows. Always include the null option ("keep what we have").
- Generate options before reading any stated preference. Steel-man the option you reject.
- Delete rows rather than leaving `{{option_N}}` placeholders.

UNKNOWNS
- An empty Unknowns table is a defect. Every Tier-D claim must appear here.
- Include a revisit trigger: the observable condition that should reopen this decision.

RULES / CONFIRMATION
- Rules derive from Decision + Consequences only. Cut anything that cannot be traced.
- Confirm command must return non-zero on violation. Mark it explicitly if not executable.

IMPLEMENTATION NOTES
- Every path in Entry points is verified to exist this session — not plausible, verified.
- Every step ends in a runnable verification.

COVERAGE
- "Not investigated" requires discipline to write but is the most valuable line —
  without it, readers assume coverage you never had.
-->
