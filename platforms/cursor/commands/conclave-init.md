---
name: conclave-init
description: Bootstrap the conclave/ directory in the current repo with team roster, ceremony cadence, DoR, DoD, and an empty Product Backlog / Architecture skeleton.
---

# /conclave-init


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Initialize a Conclave (Scrum-for-agent-platforms (Claude Code / Cursor)) workspace at the root of the current repository.

This command is **read/write inside the user's repo only**. It does not touch the plugin's own files. The output is a fully-formed `conclave/` directory the team can immediately work from.

Follow these steps precisely.

---

## Step 1 — Locate the repo root

Run `git rev-parse --show-toplevel`. If it errors (not a git repo), surface that to the user via a short message and use `AskQuestion` to ask whether to run `git init` here. If they decline, stop.

Set `REPO_ROOT` to the directory returned by `git rev-parse --show-toplevel` (or the current directory if you just ran `git init`).

## Step 2 — Check for existing `conclave/`

If `$REPO_ROOT/conclave/config.md` already exists, stop and tell the user the directory is already initialized. Suggest `/conclave-spec` instead. Do not overwrite.

## Step 3a — Solo or team?

Before anything else, use `AskQuestion` to ask: **"Is this just you, or a team?"** (`Solo` / `Team`).

- **Solo** → set `team_mode: solo`. Force `team_profile: lean` — do not ask the team-profile question in Step 3. Skip the per-discipline questions in Step 3b entirely. Continue to Step 3 for the remaining project-level questions only (project name, project type, sprint length, timezone).
- **Team** → set `team_mode: team`. Continue to Step 3 and Step 3b below.

## Step 3 — Gather the minimum info needed for the templates

Use `AskQuestion` to collect:

1. **Project name** (free text, default: the basename of `$REPO_ROOT`).
2. **Project type**: backend, frontend, mobile, devops, or multi.
3. **Team size** (`team` mode only): 2–3, 4–6, 7+ (rough; used to default the team profile below).
4. **Sprint length**: 1 week, 2 weeks, 3 weeks, 4 weeks (default 2).
5. **Timezone** (free text, e.g. "America/Montevideo"). If unsure, default to UTC.
6. **Team profile** (`team` mode only — `solo` already forces `lean`) — which ceremonies the team commits to:
   - `lean` (default for team sizes 2–3): only Sprint Planning and QA Verification are required; Standup, Backlog Grooming, Peer PR Review, Sprint Review, and Retro are off.
   - `full-scrum` (default for team sizes 4+): every ceremony is required.
   - `custom`: the user will edit each flag in `config.md` after init.

Do **not** ask for stack details here — that is `/conclave-spec`'s job.

## Step 3b — Staff the roster (`team` mode only)

Skip this step entirely in `solo` mode — the roster is a single row covering every discipline, filled in automatically at render time.

In `team` mode, ask one `AskQuestion` per discipline, in this order: **Tech Lead, Frontend, Backend, QA, Designer, DevOps**. For each: *"Who covers `<discipline>`?"* — the answer is a name + GitHub handle (e.g. "Ada, @ada"), or the literal answer `TBD` if the discipline isn't staffed yet. Accept the answer as free text; do not validate name or handle format beyond trimming whitespace — a malformed handle only ever matters later, harmlessly, if `/conclave-dev` tries to tag it as a PR reviewer.

After the six discipline questions, ask one more: *"Who (if anyone) also holds Product Manager / Scrum Master?"* — free text, one or more names, or `None yet`.

Carry all seven answers forward as `DISCIPLINE_ANSWERS` and `PROCESS_ROLE_ANSWERS` for template rendering in Step 5. Do not leave any of the six disciplines unasked — an unstaffed discipline still gets a roster row, with `TBD` in place of the name/handle.

### Profile-to-flag mapping

Once the user picks a profile, set the per-ceremony booleans accordingly so the templates can be rendered:

| Flag in `config.md` and `ceremonies.md` | `lean` | `full-scrum` | `custom` |
|---|---|---|---|
| `daily_standup.required` | `false` | `true` | ask the user |
| `backlog_grooming.required` | `false` | `true` | ask the user |
| `peer_pr_review.required` | `false` | `true` | ask the user |
| `sprint_review.required` | `false` | `true` | ask the user |
| `sprint_retrospective.required` | `false` | `true` | ask the user |

`sprint_planning.required` and `qa_verification.required` are always `true` regardless of profile. Do not expose them as toggles.

When rendering `ceremonies.md`, use the human-readable labels for the `Required` column: `required` when the flag is `true`, `optional` when it is `false`.

## Step 4 — Create the directory tree

Create these directories under `$REPO_ROOT/conclave/`:

```
conclave/
  team/
  product/
  context/
  sprints/
```

Use `mkdir -p`.

## Step 5 — Render and write templates

For each template under `skills/conclave/templates/`, read the template, substitute the `{{placeholder}}` fields with the values gathered in Step 3 (and today's date in ISO format from `date -u +%Y-%m-%dT%H:%M:%SZ`), and write the result to the corresponding path in the user's repo.

Mapping:

| Template | Destination |
|---|---|
| `conclave-readme.template.md` | `conclave/README.md` |
| `config.template.md` | `conclave/config.md` |
| `roster.template.md` | `conclave/team/roster.md` |
| `ceremonies.template.md` | `conclave/team/ceremonies.md` |
| `definition-of-ready.template.md` | `conclave/product/definition-of-ready.md` |
| `definition-of-done.template.md` | `conclave/product/definition-of-done.md` |
| `testing-environments.template.md` | `conclave/team/testing-environments.md` |

Leave `conclave/product/backlog.md`, `conclave/product/architecture.md`, `conclave/context/`, and `conclave/sprints/` empty for now. `/conclave-spec` populates them.

For the roster, render exactly one of `roster.template.md`'s two tables (see that file):
- `team_mode: solo` → the single-row solo table, with the user's name/handle from Step 3 (or `$USER`/`git config user.name` if not asked) filling every discipline and both process roles.
- `team_mode: team` → the six-row team table, one row per discipline, populated from `DISCIPLINE_ANSWERS` (Step 3b) — including `TBD` rows for any discipline left unstaffed — with `PROCESS_ROLE_ANSWERS` filling the `Process role(s)` column for whichever member(s) were named.

Either way, the roster is written out **fully populated** — no `{{name_N}}` / `@{{handle_N}}` placeholders remain for the user to fill in by hand afterward.

## Step 6 — Report

Print a short summary to the user:

- Path to the new `conclave/` directory.
- The resolved `team_mode` (`solo` or `team`).
- The selected `team_profile` and which ceremonies are required vs optional under it. Tell the user how to change it: edit `team_profile` in `conclave/config.md` to `full-scrum` to opt back into every ceremony, or set it to `custom` and toggle individual `ceremonies.*.required` flags.
- In `team` mode, which (if any) disciplines came back `TBD` and still need staffing.
- The files they should still review/edit by hand: `team/ceremonies.md`, `product/definition-of-ready.md`, `product/definition-of-done.md`, and `team/testing-environments.md` (`team/roster.md` is fully populated already, but is always worth a glance). `testing-environments.md` is written as a placeholder — until its `TBD` values are filled in with real CI environment-variable/secret names, `/conclave-qa` skips UAT generation and verifies acceptance criteria exactly as it always has.
- Next step: `/conclave-spec "<one-line product idea>"` to generate the Product Backlog, Architectural Foundation, and Sprint 1 plan.
- Suggested git commands:

  ```bash
  git add conclave/
  git commit -m "conclave: bootstrap Scrum workspace"
  ```

Do not auto-commit. The team should review the seed files first.
