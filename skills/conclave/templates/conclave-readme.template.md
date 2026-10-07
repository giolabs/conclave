# Conclave

This directory holds the **Scrum artifacts** for `{{project_name}}`, generated and maintained by the [Conclave](https://github.com/) Claude Code plugin.

## What lives here

- `config.md` — project-level configuration (stack, paths, conventions)
- `team/` — team roster and ceremony cadence
  - `roster.md` — who plays which Scrum role
  - `ceremonies.md` — sprint length, planning day, standup time, retro day
- `product/` — artifacts that persist across sprints
  - `vision.md` — problem, personas, Product Goal, success metrics, MVP scope
  - `epics/EP-NNN-<slug>.md` — one file per epic
  - `roadmap.md` — epics sequenced into sprint slots, burnup, forecast
  - `backlog.md` — the ordered Product Backlog (stories)
  - `adr/` — standalone Architecture Decision Records
  - `architecture.md` — living architectural doc (ADRs)
  - `definition-of-ready.md` — team-agreed DoR
  - `definition-of-done.md` — team-agreed DoD
- `context/` — frozen snapshots of inputs used to generate each spec (auditable)
- `sprints/SPRINT-NNN/` — one directory per sprint
  - `meta.md` — name, dates, goal, status
  - `spec.md` — sprint plan
  - `stories/US-NNN-<slug>.md` — one file per user story
  - `acceptance/AC-US-NNN.md` — Gherkin acceptance criteria per story
  - `planning.md`, `review.md`, `retro.md` — ceremony records

## How to work with it

Everything here is **plain markdown** — committed to git, reviewable in PR. The Conclave plugin reads and writes these files; team members read and edit them too. Treat changes the same way you treat code: open a PR, get a review, merge.

## Conventions

- **Visible directory.** `conclave/` is not hidden — it renders on GitHub and is discoverable.
- **Frontmatter is the metadata.** Status fields, IDs, dates live in YAML frontmatter at the top of each file. The body is for humans.
- **Append, never overwrite.** A new sprint creates `SPRINT-NNN+1/`; the previous sprint stays untouched as a historical record.
- **Stories reference, do not duplicate.** A story file references its acceptance file rather than embedding the criteria.

## The cycle

```
/conclave-init  →  vision + epics + roadmap         (once)
/conclave-planning  →  refine next slot, lock sprint  ┐
/conclave-dev → /conclave-qa → /conclave-pr-review    │ every sprint
/conclave-close  →  review + retro + velocity         ┘
```

## Slash commands you will use

| Command | When to run |
|---|---|
| `/conclave-init` | Once — setup plus inception (vision, epics, roadmap) |
| `/conclave-planning` | Start of every sprint — refines the next roadmap slot into stories and locks the sprint |
| `/conclave-dev US-NNN` | When you pick up an assigned story — implements with tests and opens a PR |
| `/conclave-qa US-NNN` | When a story reaches `status: review` — verifies it against its Gherkin scenarios |
| `/conclave-pr-review US-NNN` | When a story reaches `status: verified` (when `peer_pr_review.required: true`) — Tech Lead approves the PR |
| `/conclave-close` | End of every sprint — review, retro, velocity, roadmap update |
| `/conclave-epic`, `/conclave-story` | Any time — add, edit, split, or retire an epic or story |
| `/conclave-bug`, `/conclave-adr`, `/conclave-board`, `/conclave-dora` | As needed |
