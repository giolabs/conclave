---
title: Story state machine
description: How a story moves from backlog through done, profile-aware.
category: methodology
order: 3
lang: en
---

# Story state machine

A user story moves through a small set of well-defined states. The exact path depends on the team's profile — specifically whether `peer_pr_review.required` is on.

## The states

| Status | Meaning |
|---|---|
| `backlog` | Exists in the Product Backlog but not yet ready. |
| `ready` | Passes the Definition of Ready; can be pulled into a sprint. |
| `in-progress` | Assigned and being implemented (`/conclave-dev`). |
| `review` | PR open, awaiting QA verification. |
| `verified` | QA passed acceptance criteria; awaiting Tech Lead PR approval. **Used only when `peer_pr_review.required: true`.** |
| `done` | All gates passed, DoD met, PR mergeable. |

## Transitions

```
backlog → ready → in-progress → review → [verified] → done
```

### When `peer_pr_review.required: true` (full-scrum default)

```
review ──/conclave-qa──→ verified ──/conclave-pr-review──→ done
                ↘                                        ↗
                  blocked → back to review for fixes
```

QA passes → `status: verified`, posts a PR comment with the verdict. The Tech Lead runs `/conclave-pr-review`, reviews the diff against the architecture and ADRs, then runs `gh pr review --approve`. On approve → `status: done`.

### When `peer_pr_review.required: false` (lean default)

```
review ──/conclave-qa──→ done
              ↘
                blocked → back to review for fixes
```

QA passes → `status: done` directly. No separate Tech Lead gate. QA is the merge signal.

## Failure handling

A failure in either gate drops the story back to `review`. The dev fixes the issue, pushes new commits, and the gate(s) re-run:

- **QA found criteria failing** → story stays `review` with a `## QA blockers` section added to the story file. Fix → push → re-run `/conclave-qa`.
- **TL found code blockers** → story moves back to `review` with a `## TL findings` section. Fix → push → re-run `/conclave-qa` (criteria may have shifted) → `/conclave-pr-review`.

A single blocker is enough to keep the story out of `done`. No "approve with notes" when a blocker exists.

## Audit trail

Every transition is committed to git. The verification report on `acceptance/AC-US-NNN.md` is append-only — each `/conclave-qa` run adds a new `## Verification — <date>` section, never deletes prior runs. The same applies to the TL's findings.

You can reconstruct the complete history of any story with `git log -- conclave/sprints/SPRINT-NNN/stories/US-NNN-*.md`.
