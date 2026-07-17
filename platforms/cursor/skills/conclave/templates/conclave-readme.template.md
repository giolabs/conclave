# Conclave

This directory holds the **Scrum artifacts** for `{{project_name}}`, generated and maintained by the [Conclave](https://github.com/) Claude Code plugin.

## What lives here

- `config.md` — project-level configuration (stack, paths, conventions)
- `team/` — team roster and ceremony cadence
  - `roster.md` — who plays which Scrum role
  - `ceremonies.md` — sprint length, planning day, standup time, retro day
- `product/` — artifacts that persist across sprints
  - `backlog.md` — the ordered Product Backlog
  - `architecture.md` — living architectural doc (ADRs)
  - `definition-of-ready.md` — team-agreed DoR
  - `definition-of-done.md` — team-agreed DoD
- `context/` — frozen snapshots of inputs used to generate each spec (auditable)
- `sprints/SPRINT-NNN/` — one directory per sprint
  - `meta.md` — name, dates, goal, status
  - `spec.md` — sprint plan
  - `stories/US-NNN-<slug>.md` — one file per user story
  - `acceptance/AC-US-NNN.md` — Gherkin acceptance criteria per story

## How to work with it

Everything here is **plain markdown** — committed to git, reviewable in PR. The Conclave plugin reads and writes these files; team members read and edit them too. Treat changes the same way you treat code: open a PR, get a review, merge.

## Conventions

- **Visible directory.** `conclave/` is not hidden — it renders on GitHub and is discoverable.
- **Frontmatter is the metadata.** Status fields, IDs, dates live in YAML frontmatter at the top of each file. The body is for humans.
- **Append, never overwrite.** A new sprint creates `SPRINT-NNN+1/`; the previous sprint stays untouched as a historical record.
- **Stories reference, do not duplicate.** A story file references its acceptance file rather than embedding the criteria.

## Slash commands you will use

| Command | When to run |
|---|---|
| `/conclave-init` | Once, when bootstrapping this directory |
| `/conclave-spec <idea>` | Once, to generate the founding artifacts |
| `/conclave-planning` | Per sprint, to lock the sprint plan and assign stories |
| `/conclave-dev US-NNN` | When you pick up an assigned story — implements with tests and opens a PR |
| `/conclave-qa US-NNN` | When a story reaches `status: review` — verifies it against Gherkin scenarios and either passes (→ `verified` or `done`) or blocks |
| `/conclave-pr-review US-NNN` | When a story reaches `status: verified` (full-scrum / custom-on profiles only) — Tech Lead reviews the code and approves the PR |
| `/conclave-standup` | Daily, to log your update *(planned, not yet shipped)* |
| `/conclave-review` | At sprint end, to capture the demo and acceptance results *(planned, not yet shipped)* |
| `/conclave-retro` | At sprint end, to capture Keep / Change / Start / Stop *(planned, not yet shipped)* |
