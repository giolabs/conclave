---
name: conclave-close
description: Close the active sprint. Sprint Review (inspect the Increment against the Sprint Goal, decide what happens to unfinished stories, update epic and Product Goal progress, record velocity, re-plan the roadmap) plus the Retrospective when ceremonies.close.retro is true (keep / change / try, at most 3 action items imported by the next planning). Writes review.md, retro.md, the closing report, UAT guide and DORA snapshot, and sets the sprint closed. Refuses while a critical bug is open.
---

# /conclave-close


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Close the **active** sprint. This is the last step of every sprint and the only command that sets a sprint `closed`; `/conclave-planning` refuses to plan the next sprint until it has run.

```
/conclave-close
```

| Part | Always? | Role | Output |
|---|---|---|---|
| Review | yes — structural | Product Manager | `sprints/SPRINT-NNN/review.md`, epic + roadmap updates, velocity |
| Retro | when `ceremonies.close.retro: true` | Scrum Master | `sprints/SPRINT-NNN/retro.md` |
| Reports | yes | orchestrator | `report/SPRINT-NNN/{report.md, UAT.md, dora-data.yml}` |

Conclave never merges (ADR-006). Review counts a story as part of the Increment when its status is `done` — QA-verified and, when the TL gate is on, approved. Whether a human has merged the PR yet is reported, not enforced.

---

## Step 1 — Resolve workspace and sprint

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. `conclave/config.md` missing → *"Run `/conclave-init` first."* Stop.
   `conclave_version` < `2.0.0` or no `product/roadmap.md` → *"This workspace predates v2. Run `/conclave-init --upgrade` first."* Stop.
2. Read `config.md`: `project_language` (default `es`), `team_profile`, `ceremonies.close.retro` → `RETRO_ON` (default `false`), `ceremonies.peer_pr_review.required`, `models.*` → `MODEL_FOR_PM`, `MODEL_FOR_SM`. Warn once if a removed v1 ceremony key is present.
3. Find the sprint with `status: active` in `sprints/*/meta.md`. None → *"No active sprint to close."* Stop. Set `SPRINT_ID`, `SPRINT_PATH`.
4. Load: `meta.md`, `spec.md`, `planning.md`, every non-retired story + acceptance file whose `sprint:` is `SPRINT_ID`, `sprints/$SPRINT_ID/bugs/`, `product/vision.md`, `product/roadmap.md`, the epics in `meta.md` `epics:`, and the previous sprint's `retro.md` (if any).

## Step 2 — Critical-bug gate

Scan `$SPRINT_PATH/bugs/` and `conclave/product/bugs/` for `BUG-NNN-*.md` with `severity: critical`, `status` not `done`/`closed`, and `sprint:` equal to `SPRINT_ID` (or found under `$SPRINT_PATH/bugs/`).

Any found → refuse, change nothing:

```
⛔ SPRINT-NNN cannot close — N open critical bug(s):
  - BUG-NNN: <title> (status: <status>)
Fix them with /conclave-dev BUG-NNN, verify with /conclave-qa BUG-NNN, then re-run /conclave-close.
```

Open non-critical bugs → warn and continue; they are listed in the review.

## Step 3 — Compute sprint facts (no agent)

- Units: XS=1, S=2, M=3, L=5, XL=8.
- `committed_units` = from `meta.md` (fall back to the sum over stories listed in `planning.md`).
- `done_units` = sum over stories with `status: done` → this is **velocity**.
- Not-done list: every non-retired story whose status is not `done`, with its status.
- Per epic: stories done / total (non-retired), from the epic's `stories:` list.
- PR state per done story: `gh pr view <url> --json state,mergedAt` when a PR URL is in the story; otherwise `unknown`. If `gh` is unavailable, report `unknown` and continue.
- Signals for the retro: stories that went back to `review` after QA or TL feedback (look for `## QA blockers` / `## TL findings` sections), autonomous runs `blocked`/`aborted` (`## Autonomous run` sections and `runs/RUN-*.md`), bugs opened this sprint, carry-over count.

## Step 4 — Unfinished stories (`AskQuestion`)

Skip when every story is `done`. Otherwise one question, multi-select style per story (batch up to 4 per call):

> "<PREFIX>-NNN (<status>) — what happens to it?"
- **Next sprint** (recommended when status is `in-progress`/`review`/`verified`) — keeps status and assignee; the next `/conclave-planning` picks it up as carry-over.
- **Back to backlog** — `status: backlog`, `assignee: ""`, `sprint: ""`.

Record each decision for the review.

## Step 5 — Review (Product Manager)

One `Agent` call:
- **Model**: `MODEL_FOR_PM` (omit if null).
- Prompt prefix: full content of `agents/product-manager.md`.
- Task: **review mode** (charter section "How you operate inside `/conclave-close` (review)").
- Inputs: Sprint Goal, Product Goal and success metrics, Step 3 facts, Step 4 decisions, done stories with their acceptance summaries, epic files, open bugs, `sprint-review.template.md` body.
- Language: `project_language`.
- Output: the body of `sprint-review.template.md` — Sprint Goal verdict (`true | false | partial` + reason), epic progress with a verdict per epic (`done` only if every non-retired story is done **and** the success criterion holds), Product Goal progress, backlog/roadmap adaptations (new candidate stories, reprioritised epics, epics to split or retire — proposals only).

## Step 6 — Retro (Scrum Master) — only when `RETRO_ON`

1. One `AskQuestion` with three optional free-text questions: *What should we keep? What should we change? What should we try next sprint?* In `team_mode: team`, tell the user to paste the team's answers (one line per person is fine). In headless contexts (no user), skip the questions and let the SM work from signals only.
2. Also ask, for each `open` action item in the previous `retro.md`: **done / not done / drop**.
3. One `Agent` call (`MODEL_FOR_SM`, `scrum-master.md` prefix), task **retro mode** (charter section "How you operate inside `/conclave-close` (retro)"). Inputs: Step 3 signals, the answers, previous action items with their new status, `retro.template.md`. Output: the body of `retro.template.md` with **at most 3** action items, each with owner and measure.

## Step 7 — Write

1. `$SPRINT_PATH/review.md` ← `sprint-review.template.md` + PM output.
2. `$SPRINT_PATH/retro.md` ← `retro.template.md` + SM output (when `RETRO_ON`). Update the previous `retro.md` action rows' `Status` with the answers from Step 6.2.
3. Story frontmatter per Step 4 decisions.
4. Epics: those the review marked `done` → `status: done`. Proposed splits/retirements are **not** applied — list them in the report as `/conclave-epic split|retire` suggestions.
5. `meta.md`: `status: closed`, `velocity: <done_units>`, `sprint_goal_met`, `closed_at: <today>`.
6. `product/backlog.md`: done rows → `done`; Step 4 decisions reflected; new candidate stories from the review are **not** written as stories (refinement happens at planning) — append them to the relevant epic's `## Candidate stories`.
7. `product/roadmap.md`:
   - Slot row for `SPRINT_ID` → `closed`.
   - Append a burnup row: sprint, velocity, cumulative done, current scope, goal met.
   - Recompute **Forecast** from the average velocity of the last 3 closed sprints. If the MVP slot or `launch_date` moves, update future slots' target dates and add a row to the re-plan log with the reason. Never reorder or drop epics automatically — propose it in the report.
8. Reports (same as pre-v2 `/conclave-sprint` close):
   - `mkdir -p conclave/report/$SPRINT_ID`
   - `report.md` ← `sprint-closing-report.template.md` (stories committed/done/carried over, bugs, velocity, completion rate, acceptance summary, decisions and blockers, next-sprint recommendations).
   - `UAT.md` ← `sprint-uat-summary.template.md` for every `done` story (setup from `repo.integration_branch` or `develop`, steps from its Gherkin scenarios).
   - `dora-data.yml`:

     ```yaml
     sprint_id: "SPRINT-NNN"
     period_start: "<target_start>"
     period_end: "<closed_at>"
     stories_done: <n>
     velocity_points: <done_units>
     bugs_opened: <n>
     critical_bugs: 0
     prs_merged: <n>              # from Step 3 PR state; unknown counts as not merged
     lead_times_days: [<…>]       # first commit → merge, merged PRs only
     mttr_hours: [<…>]            # bug report → resolution
     ```

## Step 8 — Report

```
✓ SPRINT-NNN closed — Sprint Goal met: <yes | no | partial>
  Velocity:    <done> / <committed> units (avg last 3: <n>)
  Increment:   <n> stories done · PRs merged: <n>/<n> (unmerged PRs wait for a human)
  Carry-over:  <n> next sprint · <n> back to backlog
  Epics done:  EP-00X …
  Retro:       <n> action items (or "off")
  Forecast:    MVP at SPRINT-00N (<date>) — <on track | moved from SPRINT-00M>
  Suggested:   /conclave-epic split EP-00Y · /conclave-epic retire EP-00Z   (only if proposed)
```

Next:

```bash
git add conclave/ && git commit -m "conclave: close SPRINT-NNN"
/conclave-planning      # plan the next slot
```

## Guardrails

- Only the `active` sprint can be closed; a `closed` sprint is never reopened by this command.
- The critical-bug gate is unconditional.
- Never merge, never push, never change code — this command only writes inside `conclave/`.
- Never create story files here; candidate stories go into epics and are refined by `/conclave-planning`.
- Never apply epic splits, retirements, or roadmap reordering automatically — propose them.
- Review runs regardless of profile. Retro runs only when `ceremonies.close.retro: true`.
