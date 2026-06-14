---
description: Bootstrap the conclave/ directory in the current repo with team roster, ceremony cadence, DoR, DoD, and an empty Product Backlog / Architecture skeleton.
allowed-tools: Bash(git rev-parse:*), Bash(git init:*), Bash(mkdir:*), Bash(ls:*), Bash(date:*), Read, Write, Edit, AskUserQuestion
---

# /conclave-init

Initialize a Conclave (Scrum-for-Claude-Code) workspace at the root of the current repository.

This command is **read/write inside the user's repo only**. It does not touch the plugin's own files. The output is a fully-formed `conclave/` directory the team can immediately work from.

Follow these steps precisely.

---

## Step 1 — Locate the repo root

Run `git rev-parse --show-toplevel`. If it errors (not a git repo), surface that to the user via a short message and use `AskUserQuestion` to ask whether to run `git init` here. If they decline, stop.

Set `REPO_ROOT` to the directory returned by `git rev-parse --show-toplevel` (or the current directory if you just ran `git init`).

## Step 2 — Check for existing `conclave/`

If `$REPO_ROOT/conclave/config.md` already exists, stop and tell the user the directory is already initialized. Suggest `/conclave-spec` instead. Do not overwrite.

## Step 3 — Gather the minimum info needed for the templates

Use `AskUserQuestion` to collect:

1. **Project name** (free text, default: the basename of `$REPO_ROOT`).
2. **Project type**: backend, frontend, mobile, devops, or multi.
3. **Team size**: 2–3, 4–6, 7+ (rough; used to scale the roster template).
4. **Sprint length**: 1 week, 2 weeks, 3 weeks, 4 weeks (default 2).
5. **Timezone** (free text, e.g. "America/Montevideo"). If unsure, default to UTC.
6. **Team profile** — which ceremonies the team commits to:
   - `lean` (default for team sizes 2–3): only Sprint Planning and QA Verification are required; Standup, Backlog Grooming, Peer PR Review, Sprint Review, and Retro are off.
   - `full-scrum` (default for team sizes 4+): every ceremony is required.
   - `custom`: the user will edit each flag in `config.md` after init.

Do **not** ask for stack details here — that is `/conclave-spec`'s job.

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

For each template under `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/`, read the template, substitute the `{{placeholder}}` fields with the values gathered in Step 3 (and today's date in ISO format from `date -u +%Y-%m-%dT%H:%M:%SZ`), and write the result to the corresponding path in the user's repo.

Mapping:

| Template | Destination |
|---|---|
| `conclave-readme.template.md` | `conclave/README.md` |
| `config.template.md` | `conclave/config.md` |
| `roster.template.md` | `conclave/team/roster.md` |
| `ceremonies.template.md` | `conclave/team/ceremonies.md` |
| `definition-of-ready.template.md` | `conclave/product/definition-of-ready.md` |
| `definition-of-done.template.md` | `conclave/product/definition-of-done.md` |

Leave `conclave/product/backlog.md`, `conclave/product/architecture.md`, `conclave/context/`, and `conclave/sprints/` empty for now. `/conclave-spec` populates them.

For the roster, populate the table with one placeholder row per role (PM, TL, SM, 2× Dev, 1× QA) scaled down for small teams. The user will edit it.

## Step 6 — Report

Print a short summary to the user:

- Path to the new `conclave/` directory.
- The selected `team_profile` and which ceremonies are required vs optional under it. Tell the user how to change it: edit `team_profile` in `conclave/config.md` to `full-scrum` to opt back into every ceremony, or set it to `custom` and toggle individual `ceremonies.*.required` flags.
- The four files they should edit by hand right now: `team/roster.md`, `team/ceremonies.md`, `product/definition-of-ready.md`, `product/definition-of-done.md`.
- Next step: `/conclave-spec "<one-line product idea>"` to generate the Product Backlog, Architectural Foundation, and Sprint 1 plan.
- Suggested git commands:

  ```bash
  git add conclave/
  git commit -m "conclave: bootstrap Scrum workspace"
  ```

Do not auto-commit. The team should review the seed files first.
