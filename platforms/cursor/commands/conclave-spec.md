---
name: conclave-spec
description: Generate the founding Scrum artifacts (Product Backlog, Architectural Foundation, Sprint 1 plan) from a product idea, the project's CLAUDE.md, available skills, and detected stack signals. The MVP main command.
---

# /conclave-spec <idea>


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Produce the **founding Scrum artifacts** for the current repo, from the one-line product idea passed as argument plus all available project context.

The output is three things, all written under the team's `conclave/` directory:

1. `conclave/product/backlog.md` — the initial Product Backlog
2. `conclave/product/architecture.md` — the Architectural Foundation
3. `conclave/sprints/SPRINT-001/` (or the next sprint number) — the Sprint 1 plan, plus per-story and per-acceptance files

This is the MVP main command. Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, ask the user via `AskQuestion` whether to `git init` here; if they decline, stop.
2. If `$REPO_ROOT/conclave/config.md` does not exist, the workspace is not initialized. Run the `/conclave-init` flow inline first (do not fail). When that finishes, continue from Step 2.
3. Read `$REPO_ROOT/conclave/config.md` so you know the project type and confirmed stack baseline. Extract `models.*` and resolve:
   - `MODEL_FOR_TL` = `models.overrides.tech_lead` → `models.default` → null
   - `MODEL_FOR_PM` = `models.overrides.product_manager` → `models.default` → null
   Invalid model name → `WARNING: Unknown model '<value>' for role <role>. Falling back to <next_fallback>.` then continue. Absent block → all null, no warning. Print `Models: tl=<id>, pm=<id>` for any non-null values.

## Step 2 — Determine the sprint ID

List `$REPO_ROOT/conclave/sprints/` and find the highest existing `SPRINT-NNN`. The new sprint is `SPRINT-N+1`, zero-padded to 3 digits. If the directory is empty, the new sprint is `SPRINT-001`.

Set `SPRINT_ID` to this value.

## Step 3 — Ingest project context (in parallel)

Read these inputs and write a snapshot of each into `conclave/context/`:

| Input | Snapshot path |
|---|---|
| `$REPO_ROOT/CLAUDE.md` (if present) | `conclave/context/claude-md.snapshot.md` |
| `$HOME/.claude/CLAUDE.md` (if present) | append to `conclave/context/claude-md.snapshot.md` under a `## Global` heading |
| List of skills currently available in the session | `conclave/context/skills.inventory.md` |
| Stack-signal files detected (`pubspec.yaml`, `package.json`, `tsconfig.json`, `Cargo.toml`, `requirements.txt`, `go.mod`, `.cursorrules`, `.eslintrc*`, `.editorconfig`) | `conclave/context/rules.inventory.md` — record which files exist; do not embed their contents |

Use `find $REPO_ROOT -maxdepth 3 -type f -name '<pattern>'` for the rules inventory and do not recurse into `node_modules`, `.git`, `vendor`, `build`, `dist`.

Run the file reads in parallel.

## Step 4 — Clarify the idea with the user

Use `AskQuestion` to ask:

1. **Confirmed stack** (based on what was detected): is the proposed stack correct? Allow override.
2. **Project type** (multi-select if needed): backend / frontend / mobile / devops / multi.
3. **Sprint 1 scope**: how many stories do you want pulled into Sprint 1? (3–5 default.)
4. **Hard constraints**: any deadlines, compliance rules, performance budgets, banned dependencies?

Carry the answers as `CLARIFICATIONS` for the rest of the run.

## Step 5 — Delegate to the Tech Lead and Product Manager in parallel

Issue **two `Task` tool calls in a single message** so they run concurrently:

### Agent A — Tech Lead

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: the full content of `agents/tech-lead.md`.
- Task: produce the **Architectural Foundation** document following the structure in `skills/conclave/templates/architecture.template.md`.
- Inputs to embed in the task prompt: the user's `<idea>` argument, the `CLARIFICATIONS`, and the contents of the context snapshots (CLAUDE.md, skills inventory, rules inventory).
- Output: the full architecture document as markdown text. The orchestrator writes it to `conclave/product/architecture.md`.

### Agent B — Product Manager

- **Model**: `MODEL_FOR_PM` (omit if null).
- Prompt prefix: the full content of `agents/product-manager.md`.
- Task: produce the **Product Backlog** in the structure described in that charter.
- Inputs to embed in the task prompt: the user's `<idea>` argument, the `CLARIFICATIONS`, and the contents of the context snapshots. (Do not wait for the TL's output; the PM works from the idea + constraints.)
- Output: the full backlog markdown. The orchestrator parses it into per-story files.

Wait for both to return. If either errors, surface the error to the user and stop.

## Step 6 — Synthesize and write artifacts

### 6.1 Write the Architectural Foundation
Write Agent A's output to `conclave/product/architecture.md`, with the frontmatter from `architecture.template.md` filled in.

### 6.2 Write the Product Backlog summary
Build a table from Agent B's output and write it to `conclave/product/backlog.md` using the structure in `product-backlog.template.md`. Each row links to the story file you are about to create.

### 6.3 Build the Sprint 1 plan
- Pick the top N stories from the PM's output where N is what the user confirmed in Step 4 (default 3–5).
- Create the directory `conclave/sprints/$SPRINT_ID/` with subdirectories `stories/` and `acceptance/`.
- Render `skills/conclave/templates/sprint-meta.template.md` → `conclave/sprints/$SPRINT_ID/meta.md`.
- Render `skills/conclave/templates/sprint-spec.template.md` → `conclave/sprints/$SPRINT_ID/spec.md`, with the selected stories table populated.

### 6.4 Split stories and acceptance
For each selected story:
- Render `story.template.md` → `conclave/sprints/$SPRINT_ID/stories/US-NNN-<slug>.md` with frontmatter populated from the PM's output (priority, estimate, dependencies) and body containing the As/I want/So that and the "See acceptance/..." reference.
- Render `acceptance.template.md` → `conclave/sprints/$SPRINT_ID/acceptance/AC-US-NNN.md` with the Gherkin scenarios the PM produced.

`<slug>` is a lowercase, dash-separated, ASCII-only version of the story title, truncated to ~40 chars.

### 6.5 (If re-running) Update the backlog additively
If `conclave/product/backlog.md` already existed before this run, **do not overwrite it**. Read it, append the new stories from this run's PM output that are not already present (compare by title), update the `last_groomed_at` field, and rewrite.

## Step 7 — Report to the user

Print:

- The path of the new sprint directory.
- The sprint goal (one sentence pulled from the sprint plan).
- The count of stories in the new Sprint 1 plan and the total backlog size.
- The path to the Architectural Foundation.
- Suggested git commands so the team can review the artifacts as a PR:

  ```bash
  git add conclave/
  git commit -m "conclave: founding artifacts (<SPRINT_ID>)"
  gh pr create --title "Conclave: founding artifacts" --body "Review the backlog, architecture, and ${SPRINT_ID} plan."
  ```

- Next-iteration hints: `/conclave-planning` to lock the sprint, `/conclave-dev US-NNN` per developer once active. Mark these as **planned, not yet shipped** so the user knows the MVP ends here.

## Guardrails

- **Do not modify** any file outside `$REPO_ROOT/conclave/` or `$REPO_ROOT/CLAUDE.md` (and you should only read `CLAUDE.md`, not edit it).
- **Do not commit.** The team reviews the artifacts on PR before merging.
- **Append, never overwrite** for the Product Backlog. Per-sprint directories are always new, so they cannot collide.
- If the PM or TL output fails any quality check from its role charter, surface the failure to the user with the specific check that failed; do not silently fix.
