---
name: conclave-spec
description: Technical specification for an epic. /conclave-spec EP-NNN has the Tech Lead compose the epic's design — decisions (ADRs), components, contracts, data changes, domain rules, test strategy, rollout and a story breakdown — and the Product Manager check it against the epic's scope; the result is SPEC-NNN in draft. /conclave-spec approve SPEC-NNN marks it approved so /conclave-planning can refine the epic's stories from it. Unknowns become spike candidates, missing decisions become proposed ADRs.
---

# /conclave-spec &lt;EP-NNN | approve SPEC-NNN&gt;


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


The SPEC sits between the epic and its stories:

```
Epic (what · why)  →  Spike(s) (unknowns)  →  ADR(s) (decisions)  →  SPEC (how)  →  Stories (/conclave-planning)
```

- **ADR** — one decision, its alternatives and evidence. Small, permanent.
- **SPEC** — the design for one epic, composed from its ADRs: components, contracts, data, tests, rollout, and the story breakdown planning refines. Lives at `conclave/product/specs/SPEC-NNN-<slug>.md`.

```
/conclave-spec EP-003              # author (or revise) the SPEC for EP-003
/conclave-spec approve SPEC-002    # mark it approved — planning can now refine EP-003 from it
```

When is a SPEC needed? When the Tech Lead risk pass (inception) or `/conclave-epic` set `needs_spec: true` on the epic — typically an epic that changes the data model, a public contract, or more than one component. `/conclave-planning` enforces it per `delivery.spec_gate`. Any epic may have one.

Nothing is committed.

---

## Step 1 — Resolve the workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. Not a git repo → refuse.
2. Require `conclave/config.md` with `conclave_version` ≥ `2.0.0` and `product/epics/`. v1 workspace → *"Run `/conclave-init --upgrade` first."* Stop.
3. Require a clean working tree — same message as `/conclave-story`.
4. Read `config.md`: `project_language` (default `es`), `product_doc_path`, `models.*` → `MODEL_FOR_TL`, `MODEL_FOR_PM`.

## Step 2 — Parse the sub-action

- `EP-NNN` → **author**. The epic must exist; `retired` or `done` → refuse (*"Epic is <status>; a SPEC would design nothing."*).
- `approve SPEC-NNN` → **approve** (Step A). The file must exist under `product/specs/`.
- Anything else → `Usage: /conclave-spec <EP-NNN | approve SPEC-NNN>`.

## Step 3 — Existing spec for the epic (author only)

Read the epic's `spec:` field.

- Empty → new spec. `SPEC_ID` = highest `SPEC-NNN` under `product/specs/` + 1 (zero-padded, start `001`).
- Points to a `draft` spec → **revise in place** (same ID). Ask: **What should change?** (free text, may be "re-check against the latest ADRs and spikes").
- Points to an `approved` spec → `AskQuestion`: **Write a new version** (new `SPEC_ID`, `supersedes: <old>`; the old one is marked `superseded` on write) / **Cancel**. Warn when any story of the epic is already `in-progress` or later: those stories keep their `spec:` link to the old version.

## Step 4 — Load inputs (in parallel)

- The epic file (goal, scope, success criterion, candidate stories, open questions, `adrs`, `spikes`).
- `product/vision.md` (Product Goal), `product/architecture.md`, every `product/adr/ADR-*.md` (full text for the epic's `adrs:`, index line for the rest).
- Findings of the epic's done spikes (`findings_path` of each story in `spikes:`).
- When `product_doc_path` is a `/conclave-discovery` package: `02-data-model.md` and `03-bloc.md`.
- The existing spec (revise / new version).
- `tech-spec.template.md` body.

Snapshot the epic, the existing spec (if any) and the ADR index to `conclave/context/<ISO_TIMESTAMP>/`.

## Step 5 — Wave 1: Tech Lead authors the spec

One `Agent` call (`MODEL_FOR_TL`, `tech-lead.md` prefix), task **spec authoring** (charter section "How you operate inside `/conclave-spec`"). Pass `SPEC_ID` verbatim and the next free ADR number (`NEXT_ADR_ID`, computed as in `/conclave-adr` Step 6). Language: `project_language` for prose; keys and identifiers in English.

Output, in this order:
1. One `## Spec` block — the body of `tech-spec.template.md`.
2. Zero or more `## ADR` blocks — full `adr.template.md` documents (`status: proposed`), numbered from `NEXT_ADR_ID`, for decisions the design needs that no ADR records yet. At most 3; more than that means the epic needs a spike first.
3. Or, instead of everything, `SPEC_BLOCKED: <question>` (one per line) when an unknown makes any design a guess.

`SPEC_BLOCKED` → show the questions and `AskQuestion`: **Create spikes for them** (run `/conclave-spike` Steps 2–7 once per question with `--epic` set, then stop) / **Write the spec anyway** (re-run the TL with *"record each blocked question in §12 with Resolve by: spike"*) / **Cancel**.

## Step 6 — Wave 2: Product Manager scope check

One `Agent` call (`MODEL_FOR_PM`, `product-manager.md` prefix), task **spec scope check** (charter section "How you operate inside `/conclave-spec` (scope check)"). Inputs: the epic file, the Product Goal, the spec's §2 Scope and §11 Story breakdown. Output: `SCOPE_OK` or a `## Scope findings` list (scope creep, a missing slice of the success criterion, a story with no user value that is not an enabler).

Findings → re-run Wave 1 once with them appended to the task; then continue whatever the second PM verdict is, carrying any remaining findings into §12 as `PM decision` rows.

## Step 7 — Checkpoint

```
SPEC-NNN  <title>  (EP-NNN)
  Decisions: ADR-004 (accepted), ADR-007 (new, proposed), …
  Stories:   7 candidates — 2 enabler, 5 feature — ≈ <units> units ≈ <n> sprints at current velocity
  Open:      2 questions (1 spike, 1 PM decision)
  PM check:  OK | <n> findings carried into §12
```

`AskQuestion`: **Write it** / **Change something** (free text → back to Step 5, max 2 rounds) / **Cancel**.

## Step 8 — Write

1. `mkdir -p conclave/product/specs`. Write `product/specs/SPEC-NNN-<slug>.md` ← template + TL block. Frontmatter: `status: draft`, `epic`, `adrs` (every ADR in §3), `spikes` (the epic's done spikes used), `authors` (roster Tech Lead, or `git config user.name` when solo), `created_at`.
2. Each new `## ADR` block → `product/adr/ADR-NNN-<slug>.md` and a row in `architecture.md` §4 (same validation as `/conclave-adr` Step 9 — `status: proposed`, Decision section present).
3. New version: old spec → `status: superseded`, `superseded_by: SPEC-NNN`.
4. Epic frontmatter: `spec: SPEC-NNN`; `adrs` ∪= the spec's ADRs; `needs_spec: true`. Replace nothing in `## Candidate stories` — append one line: `> Refined by [SPEC-NNN](../specs/SPEC-NNN-<slug>.md) §11 — planning uses that breakdown.`
5. When §11's total size differs from the epic `size` by a full sprint or more → tell the user and suggest `/conclave-roadmap replan`.

## Step A — `approve SPEC-NNN` (mechanical — no subagent)

1. Guard: `status` must be `draft`. `approved` → *"Already approved."* `superseded` → refuse.
2. Warn (do not refuse) for each §12 row with `Resolve by: spike` whose spike is not `done`, and for each ADR in `adrs:` still `proposed`: *"Approving with open spike / unaccepted ADR — planning will carry the risk."* `AskQuestion`: **Approve anyway** / **Cancel**.
3. Set `status: approved`, `approved_at` (today), `approved_by` (`git config user.name`); fill §13.

## Step 9 — Report

```
✓ SPEC-NNN <title> — draft (EP-NNN)
  New ADRs: ADR-007 (proposed)
  Next: review it, then /conclave-spec approve SPEC-NNN
```

```bash
git add conclave/ && git commit -m "conclave: SPEC-NNN for EP-NNN — <title>"
```

## Guardrails

- Never commit, push, or open a PR.
- Only write under `conclave/product/` — `specs/`, `adr/`, `architecture.md` §4, and the epic's frontmatter / candidate-stories note — plus `conclave/context/`.
- Never write story files — planning refines stories from §11.
- Never write `status: approved` from a subagent; only Step A (a human running it) approves.
- Never renumber: `SPEC_ID` and ADR numbers are computed by the orchestrator and used verbatim.
