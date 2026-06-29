---
title: /conclave-spec
description: Generate the founding artifacts — Product Backlog, Architectural Foundation, Sprint 1 plan — from a one-line product idea.
category: commands
order: 2
lang: en
---

# /conclave-spec &lt;idea&gt;

Produce the **founding Scrum artifacts** for the current repo, from a one-line product idea plus the project's `CLAUDE.md`, installed Skills, and detected stack signals.

```
/conclave-spec "REST API for task management with JWT auth"
```

This is the **MVP main command**. It runs once per project. After it finishes you have a Product Backlog, an Architectural Foundation, and Sprint 1 in draft.

## What it does

1. Detects the active repo (offers `git init` if not one).
2. If `conclave/` is not initialized, runs the `/conclave-init` flow inline first.
3. Ingests context in parallel: `CLAUDE.md` (local + global), available skills, detected stack signals (`pubspec.yaml`, `package.json`, `tsconfig.json`, etc.).
4. Snapshots all of that into `conclave/context/` so the artifacts are auditable.
5. Asks clarifying questions: confirmed stack, project type, sprint-1 scope, hard constraints.
6. **Delegates to the Tech Lead and Product Manager subagents in parallel.**
7. Synthesizes their outputs into the founding artifacts.
8. Reports paths and suggested git commands.

## What it produces

- `conclave/product/backlog.md` — the initial Product Backlog.
- `conclave/product/architecture.md` — the Architectural Foundation with ADRs + mermaid diagram.
- `conclave/sprints/SPRINT-001/spec.md` — Sprint 1 plan in `status: draft`.
- `conclave/sprints/SPRINT-001/stories/US-NNN-*.md` — one file per selected story.
- `conclave/sprints/SPRINT-001/acceptance/AC-US-NNN.md` — Gherkin acceptance criteria.
- `conclave/sprints/SPRINT-001/meta.md` — sprint metadata.

## Re-running

`/conclave-spec` is **append-only**:

- Subsequent runs create `SPRINT-002/`, `SPRINT-003/`, etc. — never overwrite previous sprints.
- The Product Backlog is updated additively: new stories appended, existing stories untouched.
- A new context snapshot is written each time so you can diff what changed.

## Guardrails

- Does not modify any file outside `conclave/`.
- Never commits — you review the artifacts as a PR.
- If the PM or TL output fails their internal quality checklist, the failure is surfaced verbatim and execution stops.
