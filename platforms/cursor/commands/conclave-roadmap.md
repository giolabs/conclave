---
name: conclave-roadmap
description: Release planning — how many sprints, and what goes in each. show prints the release plan (sprints planned, Sprint 0, MVP slot, launch risk, spikes, epics beyond the horizon). replan [--sprints N | --sprints auto] has the Scrum Master re-sequence every future planned slot — epics, spike entries ahead of risky epics, dates from current velocity — against a fixed number of sprints or as many as the must/should epics need. Never touches active or closed slots.
---

# /conclave-roadmap &lt;show | replan [--sprints N|auto]&gt;


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


`/conclave-init` writes the first roadmap; `/conclave-close` re-forecasts dates after every sprint; `/conclave-epic` slots one epic at a time. This command is for the moment the team wants to decide **how many sprints** the release has — or re-sequence everything after the plan has drifted.

```
/conclave-roadmap show                 # release plan at a glance
/conclave-roadmap replan --sprints 6   # fit the release into 6 sprints (Sprint 0 included)
/conclave-roadmap replan --sprints auto  # as many sprints as the must/should epics need
/conclave-roadmap replan               # keep the current horizon, re-sequence
```

The **horizon** (`sprint.planned_sprints` in `config.md`, mirrored as `horizon` / `planned_sprints` in `roadmap.md`) is either `auto` or a number. With a number, epics that do not fit go to **Beyond the horizon** in priority order, and the forecast says which `must` epic (if any) is out — that is a scope decision for the PM, not something the roadmap hides.

Nothing is committed.

---

## Step 1 — Resolve the workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. Not a git repo → refuse.
2. Require `conclave/config.md` (`conclave_version` ≥ `2.0.0`) and `product/roadmap.md`. Otherwise → *"Run `/conclave-init` (or `/conclave-init --upgrade`) first."* Stop.
3. `replan` only: require a clean working tree — same message as `/conclave-story`.
4. Read `config.md`: `sprint.length_weeks`, `sprint.sprint_zero`, `sprint.planned_sprints` (absent → `auto`), `launch_date`, `models.*` → `MODEL_FOR_SM`.

## Step 2 — Parse the sub-action

`show` | `replan` (optional `--sprints <N|auto>`, `N` an integer ≥ 1). Anything else → `Usage: /conclave-roadmap <show | replan [--sprints N|auto]>`.

## Step 3 — `show` (mechanical — no subagent)

Read `roadmap.md`, every epic's frontmatter, and the `meta.md` of every sprint. Print:

```
Release plan — <project_name>
  Horizon:   <auto | N sprints>    Sprint length: <w> weeks
  Sprints:   <closed> closed · <1> active · <n> planned  (Sprint 0: <yes/no>)
  MVP at:    SPRINT-NNN (<date>)   Launch: <launch_date> — <on track | at risk: reason>
  Velocity:  <avg of last 3 closed | no velocity yet — fixed formula>

  Slot  Sprint      Epics                         Status
  0     SPRINT-000  EP-001                        closed
  1     SPRINT-001  EP-002, spike:EP-004          active
  2     SPRINT-002  EP-003                        planned
  …
  Beyond the horizon: EP-007 (should, +1 sprint), EP-008 (could, +1)

  Epics needing attention:
    EP-004  uncertainty: high — spike scheduled in SPRINT-001
    EP-005  needs_spec — SPEC-002 is draft (/conclave-spec approve SPEC-002)
```

Stop.

## Step 4 — `replan`: horizon

1. `--sprints` given → `NEW_HORIZON` = its value.
2. Otherwise `AskQuestion`: **Keep <current>** (default) / **Auto — as many as needed** / **Fixed number** (free text, integer). With no velocity yet, show the fixed-formula capacity per sprint next to the question so the number is not a guess.
3. `NEW_HORIZON` counts **all** slots, Sprint 0 and closed ones included (`--sprints 6` with 2 closed sprints leaves 4 to plan). A number smaller than closed + active slots + 1 → refuse: *"<n> sprints are already closed or active — the horizon must be at least <min>."*

## Step 5 — Snapshot context

Copy `roadmap.md`, `config.md` and every epic's frontmatter to `conclave/context/<ISO_TIMESTAMP>/`.

## Step 6 — Scrum Master re-plans

One `Agent` call (`MODEL_FOR_SM`, `scrum-master.md` prefix), task **roadmap mode, replan variant** (charter section "How you operate inside `/conclave-roadmap` (replan)"). Inputs: the current `roadmap.md`; every non-retired, non-done epic (size, priority, dependencies, `uncertainty`, `needs_spec`, `spec` status, open questions, stories done/total); closed and active slots (frozen); velocity history; `sprint.length_weeks`; `launch_date`; `NEW_HORIZON`; today's date; `roadmap.template.md` body. Output: the updated body of `roadmap.template.md` (Release plan, Slots, Beyond the horizon, Forecast) and one re-plan log row.

## Step 7 — Checkpoint

Show the slot table diff (old → new for every `planned` row), the Beyond-the-horizon list, the MVP slot and launch verdict. Highlight any `must` epic beyond the horizon in its own line. `AskQuestion`: **Apply** / **Change something** (free text → re-run Step 6 once) / **Cancel**.

## Step 8 — Write

1. `roadmap.md` ← SM output; keep `## Burnup` untouched; append the re-plan log row (`trigger: /conclave-roadmap replan`, change summary).
2. `config.md` `sprint.planned_sprints` ← `NEW_HORIZON` (add the key under `sprint:` when absent).
3. Every epic's `roadmap_slots` ← the planned slots it now appears in (closed/active slots it already ran in stay listed).

## Step 9 — Report

Print the new release plan (Step 3 format) and:

```bash
git add conclave/ && git commit -m "conclave: replan roadmap — <N|auto> sprints"
```

## Guardrails

- Never commit, push, or open a PR.
- Never change an `active` or `closed` slot, the burnup table, or any sprint directory.
- Never create, retire or edit epics — propose it in the report (`/conclave-epic split|retire`) instead.
- Only write `product/roadmap.md`, `config.md` `sprint.planned_sprints`, and epic `roadmap_slots`.
