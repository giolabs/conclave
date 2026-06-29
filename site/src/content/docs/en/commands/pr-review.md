---
title: /conclave-pr-review
description: Tech Lead reviews the code, approves the PR, moves the story to done.
category: commands
order: 6
lang: en
---

# /conclave-pr-review US-NNN

Tech Lead PR approval gate. Reviews the code of a story QA has already verified behaviorally. On approve, the PR is approved and the story moves to `status: done`. On request-changes, the story moves back to `review` for the dev to fix.

```
/conclave-pr-review US-001
```

This command runs **only when `ceremonies.peer_pr_review.required: true`** in `conclave/config.md`. In `lean` profile the flag is off and QA's pass is the merge signal — there is no separate TL gate.

## What it does

1. Refuses if `peer_pr_review.required: false` — there is no TL gate to run.
2. Locates the story. Refuses if `status` is not `verified` — QA must pass first.
3. Switches to the dev branch `feat/US-NNN-<slug>`.
4. Loads context: `config.md`, architecture, DoD, story file, acceptance file (including QA's latest verification block), full PR diff, PR metadata.
5. **Delegates to the Tech Lead subagent** in PR-review mode. The TL:
   - Confirms QA has passed (refuses otherwise).
   - Reads the diff with the architecture in mind. Checks every ADR for compliance.
   - Validates code-level DoD items: lint, typecheck, coverage, no new TODO/FIXME, docs updated for API changes.
   - Checks code quality at a TL level: correctness traps QA can't catch (race conditions, off-by-one cleanup, error swallowing), security smells, abstraction mistakes, accidental coupling.
   - Evaluates any ADR proposal in the PR body.
   - Renders a structured verdict.
6. Acts on the PR based on the verdict.

## What it produces

- Story-file frontmatter:
  - `verdict: approved` → `status: done`.
  - `verdict: request_changes` → `status: review`, plus a `## TL findings` section listing blocker- and non-blocking-severity findings.
- `gh pr review --approve` or `gh pr review --request-changes` with the TL's structured verdict as the body.
- A commit on the dev branch (`chore(US-NNN): TL approved` or `... TL findings raised`).

## Hard rules the TL subagent follows

- Verifies the code, not the criteria.
- Will not approve if any single finding is `blocker`-severity. No "approve with notes" when a blocker exists.
- Does not merge the PR — approval is sufficient.
- Does not rewrite the dev's code. Findings go in the verdict; the dev addresses them.
- Refuses to run if the story is not yet `verified`.

## Re-runs

A second `/conclave-pr-review` after dev fixes adds a new `## TL findings` section if findings remain; on approve, removes the section and moves the story to `done`. Past TL reviews live in the PR review history.

## After it runs

- On approve: the PR is approved and mergeable. The team decides when to merge (release windows, batching).
- On request-changes: dev pushes fixes, re-runs `/conclave-qa US-NNN` (criteria may have shifted), then `/conclave-pr-review` again.
