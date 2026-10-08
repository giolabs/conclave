---
status: living
last_updated_at: "{{iso_date}}"
---

# Definition of Ready (DoR)

A story is **Ready** to be pulled into a sprint when all of the following are true. The Product Manager confirms `must-have` items; the Tech Lead confirms `technical` items.

## Must-have (PM-owned)

- [ ] Story is written in INVEST form: *"As a X, I want Y, so that Z"* — or, for `type: enabler`, *"In order to X, we need Y"* — or, for `type: spike`, *"To decide X, we will investigate Y, within T"*.
- [ ] Story references its epic (`epic: EP-NNN`) unless it is an ad-hoc story or a bug.
- [ ] At least one Gherkin acceptance scenario is written.
- [ ] Priority is assigned (must / should / could / wont).
- [ ] The "So that" clause names a concrete user benefit, not a vague quality.
- [ ] Dependencies on other stories are explicitly listed (or "none").

## Technical (TL-owned)

- [ ] The story aligns with the current Architectural Foundation.
- [ ] If the story implies an architectural change, an ADR proposal is linked.
- [ ] The story has a T-shirt estimate (XS, S, M, L, XL). XL stories must be split before they can enter a sprint.
- [ ] Any new dependencies (libraries, services, infrastructure) are identified.
- [ ] If the story's epic has `needs_spec: true`, the epic's SPEC is `approved` and the story names it (`spec: SPEC-NNN`) and the ADRs it implements (`adrs:`).
- [ ] **Spikes**: one question phrased as a decision, a timebox of XS, S or M (never larger), and declared outputs (`spike_outputs`, `findings` always included). A spike's acceptance scenarios check the deliverable, not production behaviour.
- [ ] The story has a `discipline` assigned (`frontend | backend | qa | design | devops | multi`). A story with no discipline cannot enter a sprint.

## Common pitfalls (avoid these)

- "Improve performance" — not testable. Specify a budget.
- "User can configure X" — too broad. Name what specifically.
- "Same as US-NNN but for Y" — write the story standalone. Stories should be independent.
- "Investigate X" with no decision attached — a spike must end in a recommendation the team can act on.
- Feature stories for an epic whose biggest unknown is still open — run the spike first.

## How to update

The team owns this list. Add or remove items via PR. Discuss changes in retro before committing.
