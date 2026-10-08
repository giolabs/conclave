---
name: conclave-spike
description: Create a timeboxed spike — a type: spike story that answers one technical or product question before the team commits to building. The Tech Lead phrases the question as a decision, sets the timebox (XS–M) and the outputs (findings always; a proposed ADR, a draft SPEC, or re-estimates when asked), and writes Gherkin that checks the deliverable. Lands in the backlog or the active sprint. Run it with /conclave-dev like any story; its result feeds /conclave-adr and /conclave-spec.
---

# /conclave-spike "&lt;question&gt;" [--epic EP-NNN] [--timebox XS|S|M]


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


A **spike** is research with a deadline: it buys knowledge, not features. Use it when a story cannot be estimated, an epic's design depends on something nobody has measured, or two options look equally good on paper.

```
/conclave-spike "Can Postgres LISTEN/NOTIFY carry our realtime load or do we need Redis?" --epic EP-003
/conclave-spike                                   # asks for the question
```

Where spikes come from:

| Source | How |
|---|---|
| Inception | The Tech Lead risk pass marks an epic `uncertainty: high` and lists its open questions; the roadmap schedules `spike:EP-NNN` one slot ahead. `/conclave-planning` turns it into a spike story. |
| Planning | Wave 2 feasibility flags `SPIKE_NEEDED` for a story that cannot be estimated. |
| A SPEC | `/conclave-spec` lists an open question with `Resolve by: spike`. |
| Anytime | This command. |

How a spike flows:

```
/conclave-spike → story type: spike (backlog or active sprint)
/conclave-dev <ID>   → Tech Lead runs it: findings + proposed ADR / draft SPEC, docs-only PR
/conclave-qa <ID>    → checks the deliverable answers the question
/conclave-close      → velocity counts the timebox; findings update the epic
```

Nothing is committed.

---

## Step 1 — Resolve the workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. Not a git repo → refuse.
2. Require `conclave/config.md` with `conclave_version` ≥ `2.0.0`. v1 workspace → *"Run `/conclave-init --upgrade` first."* Stop.
3. Require a clean working tree (`git status --porcelain` empty) — same message as `/conclave-story`.
4. Read `config.md`: `story_prefix` → `PREFIX` (default `US`), `project_language` (default `es`), `delivery.spike_max_timebox` → `MAX_TIMEBOX` (default `M`), `models.*` → `MODEL_FOR_TL` (overrides → default → null; invalid → warn and fall back).
5. Find the sprint with `status: active` (or `draft`) under `sprints/*/meta.md` → `ACTIVE_SPRINT` (may be none).

## Step 2 — Collect the seed (`AskQuestion`, only what the args did not give)

1. **Question** — free text. Required. If it is not phrased as a decision ("investigate X", "look into Y"), keep it; the Tech Lead rephrases it and the checkpoint in Step 5 shows the rewrite.
2. **Epic** — one of the non-retired, non-done `EP-NNN` under `product/epics/`, or `none`. Default: `--epic`, else none.
3. **Timebox** — `XS | S | M`, never above `MAX_TIMEBOX` (a larger request is refused: *"Split the question — a spike longer than `<MAX_TIMEBOX>` is a project, not a spike."*). Default `--timebox`, else `S`.
4. **Outputs** — multi-select: `adr` (a decision record), `spec` (draft or revise the epic's SPEC — only offered when an epic is chosen), `estimate` (re-size the epic or named stories). `findings` is always included.
5. **Where should it land?** — `Backlog` (default) / `Active sprint <ACTIVE_SPRINT>` (only when one exists; warn: *"Adds <units> units to a locked sprint — tell the team."*).

## Step 3 — Snapshot context

Copy to `conclave/context/<ISO_TIMESTAMP>/`: the chosen epic file (if any), `product/architecture.md`, the ADR index (IDs, titles, statuses — not bodies), the epic's SPEC (if any).

## Step 4 — Tech Lead authors the spike

One `Agent` call:

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `agents/tech-lead.md`.
- Task: **spike authoring** (charter section "How you operate inside `/conclave-spike` and spike refinement").
- Inputs: the seed answers, the epic file (goal, scope, open questions, technical notes), `architecture.md`, the ADR index, the epic's SPEC §12 (when present), `story.template.md` and `acceptance.template.md` bodies.
- Language: *"Write prose in `{{PROJECT_LANGUAGE}}`. Keep frontmatter keys, Gherkin keywords and identifiers in English."*
- Output: one `## Story` block (`type: spike`, `question`, `timebox`, `estimate` = `timebox`, `spike_outputs`, `discipline`, priority) and one `## Acceptance` block with 2–3 Gherkin scenarios that check the deliverable. Or `SPIKE_NOT_NEEDED: <reason>` when the answer is already in an accepted ADR, the architecture, or the SPEC — print it verbatim and stop without writing.

## Step 5 — Checkpoint

Show the rephrased question, timebox, outputs, discipline and scenario names. One `AskQuestion`: **Write it** / **Change something** (free text → re-run Step 4 once with the change) / **Cancel**.

## Step 6 — Write

1. `NEW_ID`: highest `<PREFIX>-NNN` across `sprints/*/stories/`, `product/stories-backlog/` and `product/backlog.md` + 1, zero-padded. `SLUG` from the title (lowercase ASCII, dashes, ≤ 40 chars).
2. Destination:
   - **Backlog** → `product/stories-backlog/<PREFIX>-NEW_ID-<slug>.md` and `product/stories-backlog/acceptance/AC-<PREFIX>-NEW_ID.md`; `status: backlog`, `sprint: ""`.
   - **Active sprint** → `sprints/$ACTIVE_SPRINT/stories/…` and `…/acceptance/…`; `status: ready`, `sprint: $ACTIVE_SPRINT`, `assignee` = the roster Tech Lead (or the solo row). Add a row to the sprint's `spec.md` story table and add the timebox units to `meta.md` `committed_units`.
3. Frontmatter from the TL block: `type: spike`, `question`, `timebox`, `estimate`, `spike_outputs`, `discipline`, `epic`, `findings_path: ""`, `created_at`.
4. Epic (when set): append the ID to `spikes:` and to `stories:`; if the question matches an entry in `## Open questions (spike candidates)`, suffix that line with `→ <PREFIX>-NEW_ID`.
5. `product/backlog.md`: append a row (Epic column filled, Title prefixed `Spike:`); update `last_groomed_at`.

## Step 7 — Report

```
✓ <PREFIX>-NNN  Spike: <question>
  Timebox: <S>   Outputs: findings, adr   Epic: EP-003
  Landed in: <backlog | SPRINT-NNN>
```

Next:

```bash
git add conclave/ && git commit -m "conclave: spike <PREFIX>-NNN — <short question>"

/conclave-dev <PREFIX>-NNN       # Tech Lead runs the spike (once it is in a sprint)
```

## Guardrails

- Never commit, push, or open a PR.
- Only write under `conclave/product/` (stories-backlog, backlog, epic frontmatter and open questions) and, when landing in the active sprint, that sprint's `stories/`, `acceptance/`, `spec.md` table and `meta.md` `committed_units`.
- A spike has exactly one question and a timebox ≤ `delivery.spike_max_timebox`. Never create a spike without a timebox.
- Never write an ADR or SPEC here — the spike produces them when it runs.
