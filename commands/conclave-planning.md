---
description: Sprint Planning for the next roadmap slot. Checks the slot's epics are ready to refine (approved SPEC when needs_spec, spike done or scheduled when uncertainty is high), refines them into INVEST stories with Gherkin acceptance criteria just in time (from the SPEC's story breakdown when there is one), turns the slot's spike entries into timeboxed spike stories, adds carry-over and retro action items, sizes the commitment against real velocity, assigns by discipline, and locks the sprint active. Run at the start of every sprint, after /conclave-init (first time) or /conclave-close (every time after).
allowed-tools: Bash(git rev-parse:*), Bash(git config user.name:*), Bash(ls:*), Bash(find:*), Bash(date:*), Bash(cat:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-planning

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
| 0 | — (orchestrator) | **Readiness gate**: SPEC approved for `needs_spec` epics, spike done or scheduled for `uncertainty: high` epics |
| 1 | Product Manager (+ Tech Lead for enabler and spike entries) | **Refine**: turn the slot's epic(s) into stories with acceptance criteria (from the SPEC's §11 when present); turn `spike:EP-NNN` entries into spike stories; propose the Sprint Goal |
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
4. `SLOT_EPICS` = the plain `EP-NNN` IDs in the slot row (not the `spike:` entries). Read each `product/epics/EP-NNN-*.md`; skip `retired` ones with a warning.
5. `SLOT_SPIKES` = the `spike:EP-NNN` entries in the slot row (v2.0.0+). Each names an epic whose open questions this sprint answers; the epic itself may sit in a later slot.

## Step 2.5 — Readiness gate: SPECs and spikes (v2.0.0+)

An epic without `uncertainty` / `needs_spec` fields (written by hand, or by a pre-release v2 build) is treated as `low` / `false` and skips this step. Read `delivery.spec_gate` → `SPEC_GATE` (default `warn`).

For each epic in `SLOT_EPICS`:

1. **SPEC** — `needs_spec: true` and the epic's `spec` is empty or not `approved`:
   - `SPEC_GATE: require` → refuse: *"EP-NNN needs an approved SPEC before its stories can be refined. Run `/conclave-spec EP-NNN` (then `/conclave-spec approve SPEC-NNN`), or set `needs_spec: false` on the epic."* Stop.
   - `SPEC_GATE: warn` → `AskUserQuestion`:
     - **Write the SPEC now** — run `/conclave-spec EP-NNN` Steps 3–8 inline, then ask whether to approve it (Step A). Continue with whatever status results.
     - **Plan without it** — refine from candidate stories; record *"EP-NNN planned without an approved SPEC"* as a commitment risk in `planning.md`.
     - **Spike first** — drop EP-NNN from `SLOT_EPICS`, move it to the next `planned` slot in `roadmap.md` (Step 10 writes it, with a re-plan log row), and add `spike:EP-NNN` to `SLOT_SPIKES` if any open question remains.
2. **Uncertainty** — `uncertainty: high` and none of the epic's `spikes:` is `done`, and no `spike:EP-NNN` is in this slot:
   - `AskUserQuestion`: **Spike in this sprint, feature stories after** (adds `spike:EP-NNN` to `SLOT_SPIKES`, drops the epic from `SLOT_EPICS` and moves it to the next `planned` slot — same roadmap write as *Spike first*) / **Spike and stories together** (adds the spike; the PM refines only stories that do not depend on the open question) / **Accept the risk** (record it in `planning.md`).

Record every gate decision; Step 10 writes them into `planning.md` under commitments and risks. If the gate leaves both `SLOT_EPICS` and `SLOT_SPIKES` empty and there is no carry-over, stop without writing: *"Nothing left to plan in this slot — write the SPEC (`/conclave-spec`) or add spikes, then re-run."*

## Step 3 — Load planning inputs (in parallel)

- `product/vision.md` (Product Goal), `product/roadmap.md`, `SLOT_EPICS` files
- `product/architecture.md`, `product/adr/` index, `product/definition-of-ready.md`
- **SPECs** (v2.0.0+): for each epic in `SLOT_EPICS` whose `spec` is set, `product/specs/SPEC-NNN-*.md` — §3 decisions, §7 domain rules, §9 test strategy and §11 story breakdown drive refinement
- **Spike findings**: for each epic in `SLOT_EPICS`, the findings of its `done` spikes (re-estimates and new candidate stories)
- **Domain rules**: when `product_doc_path` points to a `/conclave-discovery` package (folder whose `README.md` has `conclave_product_package: true`), its `03-bloc.md` — invariants, use cases and edge cases the PM must turn into Gherkin scenarios
- `product/backlog.md` and the story files it links
- `team/roster.md` (no `Discipline` column → treat everyone as `multi`, print a one-time compatibility hint)
- **Carry-over**: stories whose latest review marked them `next-sprint` (status `ready`/`in-progress`/`review`/`verified`, `sprint:` = the previous sprint)
- **Backlog pull candidates**: stories with `status: backlog` whose `epic` is in `SLOT_EPICS`
- **Retro actions**: if `RETRO_ON`, the previous sprint's `retro.md` action rows with `Status: open`
- **Velocity history**: `velocity` from the last 3 `closed` sprints' `meta.md`

## Step 4 — Ask the team for planning inputs (`AskUserQuestion`)

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
- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/product-manager.md`.
- Task: **planning refinement mode** (charter section "How you operate inside `/conclave-planning` (refinement)").
- Inputs: Product Goal, `SLOT` goal, every feature epic in `SLOT_EPICS` (goal, scope, success criterion, candidate stories), each epic's SPEC (when set — its §11 rows **replace** the candidate stories as the refinement source, and each story carries `spec: SPEC-NNN` and the `adrs:` its row implements), done spike findings, `03-bloc.md` (when present), carry-over stories, backlog pull candidates, Step 2.5 gate decisions, DoR, velocity history (or "none"), `story.template.md` and `acceptance.template.md` bodies.
- Language: *"Write titles, stories and acceptance criteria in `{{PROJECT_LANGUAGE}}`. Keep frontmatter keys, Gherkin keywords (Given/When/Then) and identifiers in English."*
- Output: a proposed **Sprint Goal** (one sentence, traceable to the slot goal) and one `## Story` + `## Acceptance` block pair per new story (`type: feature`, `epic: EP-NNN`, priority, estimate, dependencies, 2–4 Gherkin scenarios). No XL — split before returning. Reuse existing backlog pull candidates instead of duplicating them (reference them by ID).

### Agent B — Tech Lead (enabler and spike stories) — only when `SLOT_EPICS` contains a `type: enabler` epic or `SLOT_SPIKES` is non-empty

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/tech-lead.md`.
- Task: turn each enabler epic into `type: enabler` stories ("In order to / We need") with acceptance criteria that a script can check (e.g. *Given a fresh clone, When `npm test` runs, Then it exits 0 with at least one passing test*). For Sprint 0 the minimum set is: scaffold for the confirmed stack, test framework + one passing test, lint, CI workflow running both on PRs, integration branch `develop` created from the default branch.
- **Spike entries** (v2.0.0+): for each `spike:EP-NNN` in `SLOT_SPIKES`, turn the epic's `## Open questions (spike candidates)` (and any SPEC §12 row with `Resolve by: spike`) into `type: spike` stories per the charter section "How you operate inside `/conclave-spike` and spike refinement": one question each, timebox ≤ `delivery.spike_max_timebox`, `spike_outputs`, `epic: EP-NNN`, 2–3 Gherkin scenarios that check the deliverable. Skip questions that already have a spike story (check the epic's `spikes:`).
- Inputs: enabler epic files, epic files named by `SLOT_SPIKES` (with their SPEC §12 when present), `architecture.md`, the ADR index, confirmed stack, `config.md` `repo:` and `delivery:` blocks.

Wait for all calls. Any error → surface and stop.

## Step 6 — Write draft sprint and stories

1. Create `sprints/$SPRINT_ID/{stories,acceptance}/`. Render `sprint-meta.template.md` → `meta.md` with `status: draft`, `slot`, `epics: SLOT_EPICS`, goal = PM's proposed Sprint Goal.
2. Next story number: highest `<PREFIX>-NNN` across `sprints/*/stories/` and `product/backlog.md` + 1 (zero-padded, start `001`).
3. For each new story block: `stories/<PREFIX>-NNN-<slug>.md` from `story.template.md` (`status: backlog`, `sprint: $SPRINT_ID`, `type`, `epic`), and `acceptance/AC-<PREFIX>-NNN.md` from `acceptance.template.md`. Slug: lowercase ASCII, dash-separated, ≤ 40 chars.
4. Carry-over and pulled backlog stories: **move** the story file and its acceptance file into `sprints/$SPRINT_ID/stories/` and `sprints/$SPRINT_ID/acceptance/` (same filenames) and set `sprint: $SPRINT_ID`. Every downstream command (`/conclave-dev`, `/conclave-qa`, `/conclave-sprint`, `/conclave-close`, `--loop`) collects stories from the active sprint's directory, so a story left elsewhere would never run. The previous sprint's `review.md` already records the carry-over; update the link in `product/backlog.md`.
5. Append each new story ID to its epic's `stories:` list; spike stories also go to the epic's `spikes:` list.

## Step 7 — Wave 2: Tech Lead feasibility

One `Agent` call (`MODEL_FOR_TL`, `tech-lead.md` prefix). Task: for every story now in the draft sprint, validate against `architecture.md`, ADRs and the epic's SPEC (when set), identify cross-story dependencies (a feature story that depends on a spike in the same sprint must list it in `dependencies:`), flag under-estimates, and **assign `discipline`** (`frontend | backend | qa | design | devops | mobile | multi`). A story that cannot be estimated because of an unknown gets `SPIKE_NEEDED: <story> — <question>`. Output: `## Technical feasibility findings` — one verdict per story with its discipline.

`SPIKE_NEEDED` → `AskUserQuestion` per finding: **Add a spike and move the story to the backlog** (Agent B spike authoring for that question, then the story → `status: backlog`, `sprint: ""`) / **Add a spike, keep the story** (the story depends on the spike) / **Keep the story as is** (risk recorded).

## Step 8 — Wave 3: Scrum Master planning record

One `Agent` call (`MODEL_FOR_SM`, `scrum-master.md` prefix). Inputs: draft stories, roster, DoR, Step 4 answers, Wave 1 + Wave 2 outputs, velocity history, open retro actions, `planning.template.md`. Task per the charter section "How you operate inside `/conclave-planning`". Output: full planning record.

## Step 9 — Validate

### 9.1 DoR
Each story against `definition-of-ready.md` (discipline from Wave 2; `epic:` set unless carry-over predates v2). A failing story cannot enter:
- `lean`: ask whether to drop it back to `status: backlog` or fix it now (fix = re-run the PM for that story only).
- `full-scrum`: same choice, but the sprint cannot lock while any failing story remains selected.

### 9.2 Capacity
- Units: XS=1, S=2, M=3, L=5, XL=8. `committed = sum(units)` — spike stories count their `timebox`.
- **Capacity source**: average `velocity` of the last 3 closed sprints. With no closed sprint yet: `num_devs × SPRINT_WEEKS × 5`, minus `full-scrum` PTO adjustments — and label it *"fixed formula — no velocity yet"*. A closed Sprint 0 counts as history only if it delivered ≥ 1 unit.
- `committed > 1.2 × capacity` → `AskUserQuestion`: drop the lowest-priority story (back to backlog, `sprint: ""`) or keep and record the risk.
- `committed < 0.6 × capacity` and more candidates exist in `SLOT_EPICS` → offer to pull the next one.

### 9.3 Discipline coverage gaps
SM-flagged gap → `AskUserQuestion`: *"No one on the roster covers `<discipline>` for `<story>`. Assign to Tech Lead as a fallback?"* Record the answer.

## Step 10 — Lock the sprint

1. `meta.md`: `status: active`, `target_start`, `target_end`, `committed_units`.
2. `spec.md` ← `sprint-spec.template.md` with the final story table (discipline, assignee), `status: active`.
3. Story frontmatter: `assignee` (SM), `discipline` (TL), `status: ready`.
4. `planning.md` ← `planning.template.md` with SM output, PM/TL findings, capacity source, retro actions carried in, slot and epics, and the Step 2.5 / `SPIKE_NEEDED` decisions as commitments and risks.
5. `product/backlog.md`: append new stories (Epic column filled); selected rows → `ready`, `In sprint` = `$SPRINT_ID`; dropped rows → `backlog`, `—`. Update `last_groomed_at`.
6. Epics in `SLOT_EPICS`: `proposed` → `active`.
7. `product/roadmap.md`: slot row → status `active`, sprint ID, real dates; its Epics column reflects the final `SLOT_EPICS` and `SLOT_SPIKES`. Epics moved by Step 2.5 are added to the next `planned` row, with one re-plan log row (`trigger: planning gate`).

## Step 11 — Report

```
✓ SPRINT-NNN is active (<start> → <end>) — slot <n>: <slot goal>
  Sprint Goal: <one sentence>
  Epics:       EP-001, EP-002

  <PREFIX>-001 → <assignee> (frontend) [M]  EP-001
  <PREFIX>-002 → <assignee> (devops)   [S]  EP-000 enabler
  ...

  <PREFIX>-003 → <assignee> (backend) [S]  EP-004 spike: <question>

  Capacity: <committed> / <capacity> units — <velocity avg of SPRINT-x..y | fixed formula>
  SPECs:    EP-002 ← SPEC-001 (approved) · EP-003 planned without SPEC (risk)
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
- Refinement is just in time: never generate stories for epics outside `SLOT_EPICS` (backlog pull candidates must already exist). Spike entries are the one exception — `spike:EP-NNN` refines only the epic's open questions, never its feature stories.
- Never write or approve a SPEC or ADR except through the `/conclave-spec` inline path of Step 2.5, which keeps that command's checkpoint.
- Preserve hand-edits in story files, `spec.md`, and `planning.md` on a resumed draft.
- Any agent output that fails its self-check → surface verbatim and stop.
