---
status: living
last_updated_at: "{{iso_date}}"
---

# Definition of Done (DoD)

A story is **Done** when all of the following are true. The QA confirms every item before marking the story `status: done`.

## Code and tests

- [ ] All Gherkin acceptance scenarios pass as automated tests in CI.
- [ ] Unit tests cover the new code paths added by this story.
- [ ] Integration / E2E tests cover the story's end-to-end happy path.
- [ ] Test coverage on changed files does not decrease.

## Quality gates

- [ ] Linter passes with no new warnings.
- [ ] Type checker passes (where applicable).
- [ ] Security scan flags no new high-severity findings.
- [ ] No new TODO / FIXME comments without a tracked follow-up issue.

## Architecture and docs

- [ ] No architectural deviation from `conclave/product/architecture.md` (or an approved ADR amendment is in this PR).
- [ ] Public API changes are reflected in the relevant doc (README, API reference, etc.).

## Process

- [ ] PR has been reviewed and approved by at least one team member who is not the author.
- [ ] PR has been merged to the agreed integration branch.
- [ ] Story file's frontmatter status is `done`.
- [ ] Verification report is appended to `acceptance/AC-US-NNN.md`.

## How to update

The team owns this list. Add or remove items via PR. The DoD typically tightens over time as the team learns what bites them.
