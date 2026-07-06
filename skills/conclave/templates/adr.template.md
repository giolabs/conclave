---
id: "ADR-{{id}}"
title: "{{title}}"
status: proposed          # proposed | accepted | superseded — TL agent always writes "proposed"; team promotes to accepted on PR merge
date: "{{iso_date}}"
deciders: {{deciders_yaml_list}}
tags: {{tags_yaml_list}}
supersedes: null          # optional list of prior ADR IDs this one replaces; set MANUALLY when the team decides to supersede
superseded_by: null       # optional list of newer ADR IDs that replace this one; set MANUALLY (or by a future /conclave-adr-supersede — out of scope in v0.8.0)
generated_by: conclave
---

# ADR-{{id}}: {{title}}

## Context

{{context}}

## Decision

{{decision}}

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| {{option_1}} | {{pros_1}} | {{cons_1}} |
| {{option_2}} | {{pros_2}} | {{cons_2}} |
| {{option_3}} | {{pros_3}} | {{cons_3}} |

## Trade-offs

{{trade_offs_prose}}

## Consequences

### Positive
- {{positive_bullet}}

### Negative
- {{negative_bullet}}

### Neutral
- {{neutral_bullet}}

## Links

- Related sprint stories: {{story_ids_or_none}}
- Related ADRs: {{adr_ids_or_none}}
- References: {{external_links_or_none}}

---

<!--
Template notes (not rendered — for the TL agent and the human editor):

- The TL agent produces `status: proposed`. Moving to `accepted` is done by hand on PR merge:
  a reviewer edits this file's frontmatter `status: accepted` in the same PR that introduces the ADR,
  or a follow-up PR after the team accepts it.

- `superseded` is set automatically by a follow-up ADR that names this one in its `supersedes:` field.
  Until `/conclave-adr-supersede` ships (out of scope in v0.8.0), teams that want to supersede
  an ADR by hand edit BOTH files' frontmatter at once — this one's `superseded_by:` and the new
  one's `supersedes:` — and rely on git history to preserve the audit trail.

- The Alternatives table should have at least 2 rows. If there is truly only one viable option,
  say so in Trade-offs and delete the extra rows — do not leave `{{option_2}}` placeholders.

- Every Decision claim should cite a file path or existing ADR ID. Every Alternatives Cons cell
  should cite at least one piece of evidence (existing code, dependency, prior ADR).

- Consequences must have at least one bullet in Positive and one in Negative. Neutral is optional.
-->
