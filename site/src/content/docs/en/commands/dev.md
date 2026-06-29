---
title: /conclave-dev
description: Developer picks up a story, implements it with tests, opens a PR.
category: commands
order: 4
lang: en
---

# /conclave-dev US-NNN

Pick up a single user story from the active sprint and drive it through implementation. When this finishes, the story is in `status: review` with a feature branch and a PR ready for QA verification via `/conclave-qa US-NNN`.

```
/conclave-dev US-001
```

The argument is required and must match a story file under the active sprint.

## What it does

1. Verifies the working tree is clean (refuses on a dirty tree).
2. Locates the active sprint and the story file. Refuses if the story is past the dev gate.
3. Checks the assignee — if it does not match you, asks whether to take over.
4. Loads context: `config.md` (profile + peer-review flag), architecture, DoD, roster, story, acceptance.
5. Creates branch `feat/US-NNN-<slug>` from the integration branch.
6. Marks the story `in-progress` in its own commit (visible to the team immediately).
7. **Delegates to the Developer subagent.** The agent:
   - Reads story, acceptance, architecture, DoD.
   - Plans a technical breakdown (scratch only — not committed).
   - Detects or bootstraps the test setup.
   - Implements story-then-test, scenario by scenario. Each Gherkin scenario gets at least one passing test.
   - Runs the full test suite once at the end.
   - Lints / typechecks.
   - Commits in scoped chunks (`feat(US-NNN): ...`).
   - Renders the PR body from `templates/pr-body.template.md`.
8. Pushes the branch.
9. Opens the PR via `gh pr create` (or prints the prepared command if `gh` is missing).
10. Tags a peer reviewer if `peer_pr_review.required: true` — picks one from the roster, excluding the assignee.
11. Marks the story `status: review`.

## What it produces

- Code + tests in the repo.
- A feature branch `feat/US-NNN-<slug>` pushed to `origin`.
- A PR (or prepared `gh pr create` command).
- Story-file frontmatter updated: `assignee`, `status: review`.

## Hard rules the Dev subagent follows

- Every Gherkin scenario maps to at least one passing test.
- No architectural deviation without an ADR proposal in the PR body.
- Never modifies acceptance criteria. If they look wrong, flags it via a comment, does not silently fix.
- Touches no file under `conclave/` except its own story file's frontmatter.
- Never merges its own PR.

## Profile awareness

- `peer_pr_review.required: true` → tags a peer (typically the Tech Lead) as reviewer, PR body's conditional checklist includes the TL-approval item.
- `peer_pr_review.required: false` → no separate reviewer required. The Dev still self-reviews.

## Resume on an existing branch

If `feat/US-NNN-<slug>` already exists locally (the story is `in-progress` from a prior run), the command offers three options: switch and resume, delete and recreate, or abort. On resume, the Developer subagent reads what already exists in the branch before adding new code.

## After it runs

- QA verifies: `/conclave-qa US-NNN`.
