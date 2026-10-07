---
name: conclave-epic
description: PM epic authoring outside inception. First arg is a sub-action — new (author an epic and slot it into the roadmap), edit EP-NNN (revise), split EP-NNN (decompose into 2–4 epics), retire EP-NNN (drop it). Delegates to the Product Manager subagent for new/edit/split, the Tech Lead for the risk pass (uncertainty, needs_spec, spike candidates), and the Scrum Master for the roadmap update; retire is mechanical.
---

# /conclave-epic &lt;new | edit EP-NNN | split EP-NNN | retire EP-NNN&gt;


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Keep the epic layer alive after `/conclave-init`. Epics are created at inception; this command adds, revises, decomposes, or drops them as the product learns — typically right after a `/conclave-close` review proposed it. Nothing is committed.

Stories are **not** written here. An epic carries rough `## Candidate stories`; `/conclave-planning` refines them when the epic's roadmap slot comes up.

---

## Step 1 — Resolve the workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. Not a git repo → refuse.
2. Require `conclave/config.md` with `conclave_version` ≥ `2.0.0` and `conclave/product/epics/`. v1 workspace → *"Run `/conclave-init --upgrade` first."* Stop.
3. Require a clean working tree (`git status --porcelain` empty), same message as `/conclave-story`.
4. Resolve `MODEL_FOR_PM`, `MODEL_FOR_TL` and `MODEL_FOR_SM` from `models:` (overrides → default → null; invalid → warn and fall back).

## Step 2 — Parse the sub-action

First positional argument ∈ `new | edit | split | retire`, else refuse with `Usage: /conclave-epic <new|edit EP-NNN|split EP-NNN|retire EP-NNN>`. `edit`/`split`/`retire` need an `EP-NNN` that exists under `product/epics/`; `new` takes no ID.

## Step 3 — Snapshot context

Copy the touched epic file (if any), `product/roadmap.md`, and `product/backlog.md` to `conclave/context/<ISO_TIMESTAMP>/`.

## Step 4 — Dispatch

### 4a — `new`

1. `NEW_ID` = highest `EP-NNN` in `product/epics/` + 1 (zero-padded).
2. `AskQuestion`: **Title** (free text) · **What outcome should it deliver?** (free text) · **Type** `feature | enabler` · **Priority** `must | should | could` (default `should`).
3. Product Manager subagent (`MODEL_FOR_PM`, `product-manager.md` prefix) — task *"Sub-action: epic new"* per the charter section "How you operate inside `/conclave-epic`". Inputs: seed answers, `vision.md`, existing epics (titles + goals, to avoid overlap). Output: one `## Epic` block (body of `epic.template.md`).
4. **Tech Lead risk pass** (v2.1.0+) — one `Task` call (`MODEL_FOR_TL`, `tech-lead.md` prefix), same task as `/conclave-init` Step 6.5 for this one epic, with `architecture.md` and the ADR index. Merge the `## Risk` block (`uncertainty`, `needs_spec`, `adrs`, open questions) into the epic.
5. Write `product/epics/EP-NEW_ID-<slug>.md` with `status: proposed`.
6. Roadmap: Scrum Master subagent (`MODEL_FOR_SM`, `scrum-master.md` prefix), **roadmap mode, insert variant** — place the new epic into future `planned` slots by priority and dependencies (with a `spike:EP-NNN` entry ahead of it when `uncertainty: high`); never touch `active` or `closed` slots. Show the proposed slot change and confirm via `AskQuestion` before writing `roadmap.md` (add a re-plan log row) and the epic's `roadmap_slots`.

### 4b — `edit EP-NNN`

1. Guard: `retired` or `done` → refuse (*"Epic is <status>; create a new epic instead."*).
2. `AskQuestion`: **What should change?** (free text).
3. PM subagent — *"Sub-action: epic edit"*. Preserve ID, `status`, `stories:`, `roadmap_slots`, `created_at`, and the Tech Lead fields (`uncertainty`, `needs_spec`, `spec`, `adrs`, `spikes`, open questions). Return the full epic markdown.
4. Overwrite the file (slug stays). If scope changed, re-run the TL risk pass from 4a step 4. If `size`, `priority` or `uncertainty` changed, run the SM insert variant from 4a step 6 to re-slot it. If the epic has an approved SPEC and scope changed, tell the user to revise it with `/conclave-spec EP-NNN`.

### 4c — `split EP-NNN`

1. Guard: `retired` or `done` → refuse.
2. `AskQuestion`: **How many?** `2 | 3 | 4` · **Split axis** (free text).
3. PM subagent — *"Sub-action: epic split"*. Hard rule: every **non-retired, not-done** story in the parent's `stories:` and every candidate story lands in exactly one child; otherwise return `SPLIT_UNSAFE: <reason>` and nothing else.
4. `SPLIT_UNSAFE` → print verbatim and stop. Otherwise validate count and coverage mechanically; on mismatch abort without writing.
5. Write children (`split_from: EP-NNN`, `status: proposed`, or `active` if any of their stories is in the active sprint). Update each moved story's `epic:` frontmatter and the backlog's Epic column.
6. Parent: `status: retired`, `retired_at`, `retirement_reason: "Split into …"`, `superseded_by: [...]`. Its `done` stories stay listed on the parent.
7. Run the TL risk pass for each child (4a step 4) — a child inherits none of the parent's `spec`; the parent's `adrs` are copied to every child that still depends on them — then the SM insert variant to re-slot the children.

### 4d — `retire EP-NNN` (mechanical — no subagent)

1. Guard: any story of this epic with status `in-progress`, `review`, or `verified` → refuse (*"Finish or retire those stories first: …"*). `done` epic → refuse.
2. `AskQuestion`: **Why?** (non-empty).
3. Epic frontmatter: `status: retired`, `retirement_reason`, `retired_at`.
4. Its `backlog`/`ready` stories → `status: retired` with `retirement_reason: "Epic EP-NNN retired"` (same fields as `/conclave-story retire`); backlog rows updated.
5. Roadmap: remove the epic (and any `spike:EP-NNN` entry) from every `planned` slot; a slot left empty is marked `planned (empty)` and the user is told to fill it with `/conclave-epic new` or edit the roadmap. Add a re-plan log row.

## Step 5 — Report

Print the epic ID(s), files touched, roadmap slot changes, and:

```bash
git add conclave/ && git commit -m "conclave: <action> EP-NNN"
```

## Guardrails

- Never commit, push, or open a PR.
- Only write under `conclave/product/` (epics, roadmap, backlog) and story frontmatter fields `epic` / `status` / retirement fields. Never write a SPEC or ADR here — `/conclave-spec` and `/conclave-adr` do.
- Never write story files — that is `/conclave-planning` (refinement) or `/conclave-story`.
- Never modify `active` or `closed` roadmap slots.
- `retire` never calls a subagent.
