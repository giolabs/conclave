---
title: /conclave-qa
description: Adversarially verify a story against its Gherkin acceptance criteria. Structurally required.
category: commands
order: 5
lang: en
---

# /conclave-qa US-NNN

Verify a story in `status: review` against its acceptance criteria. When this finishes, the story has moved to one of three states:

- **`verified`** — QA passed, awaiting Tech Lead PR approval. Happens when `peer_pr_review.required: true`.
- **`done`** — QA passed and there is no separate TL gate. Happens when `peer_pr_review.required: false`.
- **`review` (with blockers)** — QA found failures.

```
/conclave-qa US-001
```

This is one of the two **structural** Scrum gates Conclave enforces — required in every profile.

## What it does

1. Refuses if `qa_verification.required` is somehow `false` — it is structural.
2. Locates the story and acceptance file. Refuses if `status` is not `review`.
3. Switches to the dev branch `feat/US-NNN-<slug>`. Offers to `git fetch` if absent.
4. Captures the commit SHA as the audit-trail anchor.
5. Loads PR metadata via `gh pr view` (peer approvals, CI status).
6. **Delegates to the adversarial QA subagent.** The agent:
   - Reads story and acceptance first — internalises what "done" means.
   - For each Gherkin scenario, designs an execution: sets up Given, performs When, asserts Then.
   - Runs each scenario end-to-end. Does NOT trust the dev's test suite as proof — re-derives from first principles.
   - Probes edge cases beyond the explicit scenarios: empty/oversized/malformed inputs, concurrency, expired credentials.
   - Runs the Definition of Done checklist (skipping conditional items if their profile flag is off).
7. Writes outputs (see below).

## What it produces

- A `## Verification — <YYYY-MM-DD>` section appended to `acceptance/AC-US-NNN.md` — never overwrites prior runs.
- Story-file frontmatter updated:
  - All pass → `status: verified` (if peer-review on) or `status: done` (if off).
  - Anything fails → stays `status: review` with a `## QA blockers` section listing failing items and reproductions.
- A PR comment via `gh pr comment` with the verdict summary.

## QA does NOT approve the PR

QA's contribution to the PR is **a comment** — never a review verdict. Code-level approval is the Tech Lead's job via `/conclave-pr-review US-NNN`. This separation matches the Scrum convention: QA verifies behavior, TL approves code.

## Hard rules the QA subagent follows

- Verifies the criteria, not the code.
- Never rewrites scenarios. If they look ambiguous, flags as a process issue.
- Never skips the DoD checklist.
- Never approves a story it has not actually executed (reading code or test output is not verification).
- Stakes its reputation on every approval — wouldn't approve unless it would bet on the story being shippable.

## Re-runs

A second `/conclave-qa` after dev fixes pushes appends a new verification section. Status transitions to `verified` / `done` (or stays `review`) based on the new run alone — past runs are kept for history but do not affect the verdict.
