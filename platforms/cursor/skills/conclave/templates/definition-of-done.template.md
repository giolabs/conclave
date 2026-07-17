---
status: living
last_updated_at: "{{iso_date}}"
---

# Definition of Done (DoD)

A story is **Done** when all of the following are true. The QA confirms every item before marking the story `status: done`.

> Items in the **Process — conditional** section depend on the team's profile in `conclave/config.md`. If a flag is `required: false` there, the corresponding DoD check is skipped silently. Everything else is structural and applies to every team.

## Code and tests

- [ ] All Gherkin acceptance scenarios pass as automated tests in CI.
- [ ] Unit tests cover the new code paths added by this story.
- [ ] Integration / E2E tests cover the story's end-to-end happy path.
- [ ] Test coverage on changed files does not decrease.
- [ ] `tests/uat/US-NNN-UAT.md` exists and reports an overall pass — CI green on the generated Playwright/Newman suites for the story's discipline, or a human-signed-off checklist for `discipline: mobile`. *(Skipped, not failed, when `conclave/team/testing-environments.md` has no environment configured yet.)*

## Quality gates

- [ ] Linter passes with no new warnings.
- [ ] Type checker passes (where applicable).
- [ ] Security scan flags no new high-severity findings.
- [ ] No new TODO / FIXME comments without a tracked follow-up issue.

## Architecture and docs

- [ ] No architectural deviation from `conclave/product/architecture.md` (or an approved ADR amendment is in this PR).
- [ ] Public API changes are reflected in the relevant doc (README, API reference, etc.).

## Process

Structural items (always required):

- [ ] PR has been merged to the agreed integration branch.
- [ ] Story file's frontmatter status is `done`.
- [ ] Verification report is appended to `acceptance/AC-US-NNN.md`.

## Process — conditional

These items apply only if the corresponding flag in `conclave/config.md` is `required: true`.

- [ ] **Tech Lead PR approval** — the Tech Lead (or designated approver) has run `/conclave-pr-review US-NNN` and approved the PR. *(Governed by `ceremonies.peer_pr_review.required` — off in the `lean` profile. When off, QA verification is the merge signal and there is no separate code-level gate.)*

## How to update

The team owns this list. Add or remove items via PR. The DoD typically tightens over time as the team learns what bites them.
