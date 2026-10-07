---
name: conclave-planning
description: Sprint Planning for the next roadmap slot. Refines the slot's epic(s) into INVEST stories with Gherkin acceptance criteria just in time (inline refinement — no separate grooming), adds carry-over and retro action items, sizes the commitment against real velocity, assigns by discipline, and locks the sprint active. Run at the start of every sprint, after /conclave-init (first time) or /conclave-close (every time after).
---

# /conclave-planning


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Plan **one** sprint: the lowest roadmap slot that is not yet planned.

```
/conclave-planning
```

The cycle this command sits in:

```
/conclave-init (once) → /conclave-planning → build (/conclave-dev, /conclave-qa, /conclave-pr-review) → /conclave-close → /conclave-planning → …
```

Three waves of role subagents:

| Wave | Role | Job |
|---|---|---|
| 1 | Product Manager (+ Tech Lead for enabler slots) | **Refine**: turn the slot's epic(s) into stories with acceptance criteria; propose the Sprint Goal |
| 2 | Tech Lead | **Feasibility**: check against architecture/ADRs, assign `discipline`, flag under-estimates and cross-story dependencies |
| 3 | Scrum Master | **Plan**: capacity from velocity, assignments, retro action items, planning record |

> v2.0.0 removed `--all`. Stories are refined one slot at a time so each sprint's stories reflect what the previous review learned. The multi-sprint view lives in `product/roadmap.md`.

---

## Step 1 — Resolve workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. Not a git repo → surface and stop.
2. `$REPO_ROOT/conclave/config.md` missing → *"Run `/conclave-init` first."* Stop.
3. Read `config.md`. If `conclave_version` < `2.0.0` or `product/roadmap.md` is missing → *"This workspace predates v2 (no roadmap). Run `/conclave-init --upgrade` first."* Stop.
4. Extract:

| Field | Variable | Default |
|---|---|---|
| `project_name` | `PROJECT_NAME` | |
| `story_prefix` | `STORY_PREFIX` | `US` |
| `project_language` | `PROJECT_LANGUAGE` | `es` |
| `team_profile`, `team_mode` | `TEAM_PROFILE`, `TEAM_MODE` | |
| `sprint.length_weeks` | `SPRINT_WEEKS` | `2` |
| `ceremonies.close.retro` | `RETRO_ON` | `false` |
| `models.*` | `MODEL_FOR_PM`, `MODEL_FOR_TL`, `MODEL_FOR_SM` | overrides → default → null |

If any removed v1 ceremony key (`daily_standup`, `backlog_grooming`, `sprint_review`, `sprint_retrospective`) is still present, print one warning that it is ignored since v2.0.0. Invalid model name → warn and fall back. Print non-null model assignments.

## Step 2 — Gate and slot resolution

1. Read every `conclave/sprints/SPRINT-NNN/meta.md` frontmatter.
   - Any sprint with `status: active` → refuse: *"SPRINT-NNN is still active. Run `/conclave-close` to review and close it before planning the next one."* Stop.
   - Any sprint with `status: draft` → this is an interrupted earlier planning run; resume it (use that `SPRINT_ID` and skip story generation for stories that already exist on disk).
2. Read `product/roadmap.md`. `SLOT` = the lowest row with status `planned`. None left → *"Every roadmap slot is planned. Add epics with `/conclave-epic new` and re-plan the roadmap, or edit `product/roadmap.md`."* Stop.
3. `SPRINT_ID`: if the slot row already names a sprint ID that does not exist on disk, use it. Otherwise the next monotonic ID — highest existing `SPRINT-NNN` + 1; if none exist, `SPRINT-000` when `sprint.sprint_zero: true`, else `SPRINT-001`. IDs are never reused.
4. `SLOT_EPICS` = the epic IDs in the slot row. Read each `product/epics/EP-NNN-*.md`; skip `retired` ones with a warning.

## Step 3 — Load planning inputs (in parallel)

- `product/vision.md` (Product Goal), `product/roadmap.md`, `SLOT_EPICS` files
- `product/architecture.md`, `product/adr/` index, `product/definition-of-ready.md`
- **Domain rules**: when `product_doc_path` points to a `/conclave-discovery` package (folder whose `README.md` has `conclave_product_package: true`), its `03-bloc.md` — invariants, use cases and edge cases the PM must turn into Gherkin scenarios
- `product/backlog.md` and the story files it links
- `team/roster.md` (no `Discipline` column → treat everyone as `multi`, print a one-time compatibility hint)
- **Carry-over**: stories whose latest review marked them `next-sprint` (status `ready`/`in-progress`/`review`/`verified`, `sprint:` = the previous sprint)
- **Backlog pull candidates**: stories with `status: backlog` whose `epic` is in `SLOT_EPICS`
- **Retro actions**: if `RETRO_ON`, the previous sprint's `retro.md` action rows with `Status: open`
- **Velocity history**: `velocity` from the last 3 `closed` sprints' `meta.md`

## Step 4 — Ask the team for planning inputs (`AskQuestion`)

Always:
1. **Sprint start date** — default today.
2. **Sprint end date** — default start + `SPRINT_WEEKS` weeks.
3. **Facilitator** — default `git config user.name` or the solo roster row.

`full-scrum` only:
4. **Capacity adjustments** — anyone on PTO or partial availability?

## Step 5 — Wave 1: refinement

Issue the calls below **in a single message**.

### Agent A — Product Manager (refine the slot)

- **Model**: `MODEL_FOR_PM` (omit if null).
- Prompt prefix: full content of `agents/product-manager.md`.
- Task: **planning refinement mode** (charter section "How you operate inside `/conclave-planning` (refinement)").
- Inputs: Product Goal, `SLOT` goal, every feature epic in `SLOT_EPICS` (goal, scope, success criterion, candidate stories), `03-bloc.md` (when present), carry-over stories, backlog pull candidates, DoR, velocity history (or "none"), `story.template.md` and `acceptance.template.md` bodies.
- Language: *"Write titles, stories and acceptance criteria in `{{PROJECT_LANGUAGE}}`. Keep frontmatter keys, Gherkin keywords (Given/When/Then) and identifiers in English."*
- Output: a proposed **Sprint Goal** (one sentence, traceable to the slot goal) and one `## Story` + `## Acceptance` block pair per new story (`type: feature`, `epic: EP-NNN`, priority, estimate, dependencies, 2–4 Gherkin scenarios). No XL — split before returning. Reuse existing backlog pull candidates instead of duplicating them (reference them by ID).

### Agent B — Tech Lead (enabler stories) — only when `SLOT_EPICS` contains a `type: enabler` epic

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `agents/tech-lead.md`.
- Task: turn each enabler epic into `type: enabler` stories ("In order to / We need") with acceptance criteria that a script can check (e.g. *Given a fresh clone, When `npm test` runs, Then it exits 0 with at least one passing test*). For Sprint 0 the minimum set is: scaffold for the confirmed stack, test framework + one passing test, lint, CI workflow running both on PRs, integration branch `develop` created from the default branch.
- Inputs: enabler epic files, `architecture.md`, confirmed stack, `config.md` `repo:` block.

Wait for all calls. Any error → surface and stop.

## Step 6 — Write draft sprint and stories

1. Create `sprints/$SPRINT_ID/{stories,acceptance}/`. Render `sprint-meta.template.md` → `meta.md` with `status: draft`, `slot`, `epics: SLOT_EPICS`, goal = PM's proposed Sprint Goal.
2. Next story number: highest `<PREFIX>-NNN` across `sprints/*/stories/` and `product/backlog.md` + 1 (zero-padded, start `001`).
3. For each new story block: `stories/<PREFIX>-NNN-<slug>.md` from `story.template.md` (`status: backlog`, `sprint: $SPRINT_ID`, `type`, `epic`), and `acceptance/AC-<PREFIX>-NNN.md` from `acceptance.template.md`. Slug: lowercase ASCII, dash-separated, ≤ 40 chars.
4. Carry-over and pulled backlog stories: **move** the story file and its acceptance file into `sprints/$SPRINT_ID/stories/` and `sprints/$SPRINT_ID/acceptance/` (same filenames) and set `sprint: $SPRINT_ID`. Every downstream command (`/conclave-dev`, `/conclave-qa`, `/conclave-sprint`, `/conclave-close`, `--loop`) collects stories from the active sprint's directory, so a story left elsewhere would never run. The previous sprint's `review.md` already records the carry-over; update the link in `product/backlog.md`.
5. Append each new story ID to its epic's `stories:` list.

## Step 7 — Wave 2: Tech Lead feasibility

One `Agent` call (`MODEL_FOR_TL`, `tech-lead.md` prefix). Task: for every story now in the draft sprint, validate against `architecture.md` and ADRs, identify cross-story dependencies, flag under-estimates, and **assign `discipline`** (`frontend | backend | qa | design | devops | mobile | multi`). Output: `## Technical feasibility findings` — one verdict per story with its discipline.

## Step 8 — Wave 3: Scrum Master planning record

One `Agent` call (`MODEL_FOR_SM`, `scrum-master.md` prefix). Inputs: draft stories, roster, DoR, Step 4 answers, Wave 1 + Wave 2 outputs, velocity history, open retro actions, `planning.template.md`. Task per the charter section "How you operate inside `/conclave-planning`". Output: full planning record.

## Step 9 — Validate

### 9.1 DoR
Each story against `definition-of-ready.md` (discipline from Wave 2; `epic:` set unless carry-over predates v2). A failing story cannot enter:
- `lean`: ask whether to drop it back to `status: backlog` or fix it now (fix = re-run the PM for that story only).
- `full-scrum`: same choice, but the sprint cannot lock while any failing story remains selected.

### 9.2 Capacity
- Units: XS=1, S=2, M=3, L=5, XL=8. `committed = sum(units)`.
- **Capacity source**: average `velocity` of the last 3 closed sprints. With no closed sprint yet: `num_devs × SPRINT_WEEKS × 5`, minus `full-scrum` PTO adjustments — and label it *"fixed formula — no velocity yet"*. A closed Sprint 0 counts as history only if it delivered ≥ 1 unit.
- `committed > 1.2 × capacity` → `AskQuestion`: drop the lowest-priority story (back to backlog, `sprint: ""`) or keep and record the risk.
- `committed < 0.6 × capacity` and more candidates exist in `SLOT_EPICS` → offer to pull the next one.

### 9.3 Discipline coverage gaps
SM-flagged gap → `AskQuestion`: *"No one on the roster covers `<discipline>` for `<story>`. Assign to Tech Lead as a fallback?"* Record the answer.

## Step 10 — Lock the sprint

1. `meta.md`: `status: active`, `target_start`, `target_end`, `committed_units`.
2. `spec.md` ← `sprint-spec.template.md` with the final story table (discipline, assignee), `status: active`.
3. Story frontmatter: `assignee` (SM), `discipline` (TL), `status: ready`.
4. `planning.md` ← `planning.template.md` with SM output, PM/TL findings, capacity source, retro actions carried in, slot and epics.
5. `product/backlog.md`: append new stories (Epic column filled); selected rows → `ready`, `In sprint` = `$SPRINT_ID`; dropped rows → `backlog`, `—`. Update `last_groomed_at`.
6. Epics in `SLOT_EPICS`: `proposed` → `active`.
7. `product/roadmap.md`: slot row → status `active`, sprint ID, real dates.

## Step 11 — Report

```
✓ SPRINT-NNN is active (<start> → <end>) — slot <n>: <slot goal>
  Sprint Goal: <one sentence>
  Epics:       EP-001, EP-002

  <PREFIX>-001 → <assignee> (frontend) [M]  EP-001
  <PREFIX>-002 → <assignee> (devops)   [S]  EP-000 enabler
  ...

  Capacity: <committed> / <capacity> units — <velocity avg of SPRINT-x..y | fixed formula>
  Retro actions carried in: <n>
```

Next:

```bash
git add conclave/ && git commit -m "conclave: plan SPRINT-NNN — <sprint goal>"

/conclave-dev <PREFIX>-001                   # one story
/conclave-dev --loop                          # autonomous three-wave loop over the sprint
/conclave-close                               # at sprint end
```

## Guardrails

- Do not modify any file outside `$REPO_ROOT/conclave/`.
- Do not commit.
- `sprint_planning` and `qa_verification` are structural — refuse if a config sets either to `required: false`.
- Exactly one sprint may be `active`. Never plan while one is active; never activate a second.
- Refinement is just in time: never generate stories for epics outside `SLOT_EPICS` (backlog pull candidates must already exist).
- Preserve hand-edits in story files, `spec.md`, and `planning.md` on a resumed draft.
- Any agent output that fails its self-check → surface verbatim and stop.
