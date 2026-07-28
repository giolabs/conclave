---
description: Generate a DORA metrics report for a specific time period — biweekly, monthly, semiannual, annual, or the full project. Aggregates data from all sprint closing reports in conclave/report/. For lean teams omits individual contributor breakdown; for full-scrum teams includes per-participant productivity. Uses the Tech Lead or Product Manager role subagent to synthesize findings and recommendations.
allowed-tools: Bash(git rev-parse:*), Bash(ls:*), Bash(find:*), Bash(date:*), Bash(cat:*), Bash(git log:*), Bash(gh pr list:*), Bash(gh pr view:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-dora [--period <type>] [--from <date>] [--to <date>]

Generate a **DORA Metrics Report** for the requested time period.

```
/conclave-dora                              # interactive: asks period and range
/conclave-dora --period biweekly            # last 2 weeks
/conclave-dora --period monthly             # last calendar month
/conclave-dora --period semiannual          # last 6 months
/conclave-dora --period annual              # last 12 months
/conclave-dora --period full-project        # entire project history
/conclave-dora --from 2026-01-01 --to 2026-06-30   # explicit date range
```

The four DORA metrics reported are:
1. **Deployment Frequency** — how often the team ships to production
2. **Lead Time for Changes** — time from first commit to production
3. **Change Failure Rate** — percentage of changes that cause incidents
4. **Mean Time to Recovery (MTTR)** — time to recover from failures

Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. If not a git repo, stop.
2. Confirm `$REPO_ROOT/conclave/config.md` exists. If not, suggest `/conclave-init` and stop.
3. Read `config.md`:
   - `team_profile` → set `TEAM_PROFILE`
   - `project_language` → set `LANGUAGE` (default `es`)
   - `models.*` → resolve:
     - `MODEL_FOR_TL` = `models.overrides.tech_lead` → `models.default` → null
     - `MODEL_FOR_PM` = `models.overrides.product_manager` → `models.default` → null
   - `team_mode` → set `TEAM_MODE` (`solo` | `team`)

## Step 2 — Parse flags and resolve the period

1. Parse `--period`, `--from`, `--to` from the invocation arguments.
2. If no flags are provided, use `AskUserQuestion`:

   **"What period should the DORA report cover?"**
   - Biweekly (last 2 weeks)
   - Monthly (last calendar month)
   - Semiannual (last 6 months)
   - Annual (last 12 months)
   - Full project (all sprints)
   - Custom date range (I'll specify start and end dates)

3. From the period type, compute `PERIOD_START` and `PERIOD_END` using today's date:
   - `biweekly`: today − 14 days
   - `monthly`: first day of the previous calendar month
   - `semiannual`: today − 6 months
   - `annual`: today − 12 months
   - `full-project`: earliest sprint start date found in `conclave/`
   - Custom: use `--from` and `--to` values directly

4. Generate `REPORT_ID` as the next sequential number from existing files in `conclave/report/dora/`:
   ```bash
   ls $REPO_ROOT/conclave/report/dora/ 2>/dev/null | grep -oP '\d+' | sort -n | tail -1
   ```
   `REPORT_ID = max + 1`, or `001` if the directory is empty.

## Step 3 — Collect sprint data

1. List all sprint directories in `$REPO_ROOT/conclave/sprints/` that fall within `[PERIOD_START, PERIOD_END]`. For each sprint, read its `meta.md` to get `start_date`, `end_date`, and `status`. Include only sprints with `status: done` or `status: archived`.

2. For each qualifying sprint, check for a pre-computed DORA snapshot:
   ```bash
   $REPO_ROOT/conclave/report/$SPRINT_ID/dora-data.yml
   ```
   - **If it exists:** read it directly — this is the fastest path.
   - **If it does not exist:** build the data from source files (sprint stories, acceptance files, bugs, git log). This is slower but always accurate.

3. Build the raw data file `DORA_RAW` in memory:

   ```yaml
   sprints:
     - id: SPRINT-001
       period_start: 2026-01-01
       period_end: 2026-01-14
       stories_done: 5
       velocity_points: 14
       bugs_opened: 2
       critical_bugs: 0
       prs_merged: 5
       lead_times_days: [3, 5, 2, 4, 6]
       mttr_hours: [8, 12]
   ```

4. If git history is available (`gh pr list` accessible), enrich each sprint's PRs with merge timestamps:
   ```bash
   gh pr list --state merged --json number,mergedAt,headRefName \
     --search "merged:>=$PERIOD_START merged:<=$PERIOD_END"
   ```
   Use merge timestamps to compute accurate lead times (first commit → PR merged).

## Step 4 — Choose the report agent

- `TEAM_PROFILE: lean` or `TEAM_MODE: solo` → use **Product Manager** (`MODEL_FOR_PM`). Rationale: lean teams need product-centric insights, not granular per-developer breakdowns.
- `TEAM_PROFILE: full-scrum` → use **Tech Lead** (`MODEL_FOR_TL`). Rationale: full-scrum teams benefit from engineering-depth analysis of cycle time, CI health, and rework patterns.
- When both models are null, use the session model.

## Step 5 — Delegate to the report agent

Issue a single `Agent` tool call with:

- **Model**: `MODEL_FOR_TL` or `MODEL_FOR_PM` (as resolved in Step 4; omit if null).
- Prompt prefix: full content of the chosen role charter (`${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/tech-lead.md` or `product-manager.md`).
- Task: synthesize the DORA report from the raw data.
- Inputs to embed:
  - `DORA_RAW` (the sprint data collected in Step 3)
  - `TEAM_PROFILE` and `TEAM_MODE`
  - `PERIOD_START`, `PERIOD_END`, period type label
  - `LANGUAGE` — all prose must be written in this language
  - Whether to include individual contributor breakdown: `true` only when `TEAM_PROFILE: full-scrum` AND `TEAM_MODE: team`
  - If including contributors: read `conclave/team/roster.md` and pass it along
  - Template path: `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/dora-report.template.md`
- Expected output: the fully rendered DORA report markdown (all `{{placeholders}}` filled, all prose sections written in `LANGUAGE`).

**Lean / solo teams:** instruct the agent to **omit** the "By Participant" sub-table in Section 6 entirely. Do not include names, GitHub handles, or per-developer metrics. Section 6 shows only the "By Sprint" table and the velocity trend.

**Full-scrum teams:** instruct the agent to include all participant rows in Section 6, reading assignee and reviewer data from the story files and PR metadata.

Wait for the agent. If it errors, surface and stop.

## Step 6 — Write and report

1. Create the output directory:
   ```bash
   mkdir -p $REPO_ROOT/conclave/report/dora
   ```

2. Write the report to:
   ```
   conclave/report/dora/DORA-NNN-<period-type>-<YYYYMMDD>.md
   ```
   where `NNN` is `REPORT_ID` and `<YYYYMMDD>` is today's date.

3. Print:
   ```
   📊 DORA report generated → conclave/report/dora/DORA-NNN-<period>-<date>.md
   Period: <PERIOD_START> → <PERIOD_END>
   Sprints included: <N> (<SPRINT-001>, <SPRINT-002>, ...)
   Overall DORA level: <Elite | High | Medium | Low>
   ```

4. Suggested git command:
   ```bash
   git add conclave/report/
   git commit -m "conclave: DORA report DORA-NNN (<period>)"
   ```

---

## Guardrails

- **Do not modify any file outside `conclave/report/dora/`.** This command is read-only except for the report file it creates.
- **Never include real credentials, webhook URLs, or environment secrets** in the report — reference only CI job names, PR numbers, and branch names.
- **Lean / solo profiles: omit all per-individual metrics.** Do not include names, handles, or per-developer velocity under any circumstances, even if asked. Report aggregate team metrics only.
- **Data completeness:** if some sprints within the period have no `dora-data.yml` and their source files are incomplete (e.g., stories still in progress, no PR metadata), note the data gap explicitly in the report rather than silently extrapolating.
- **Language:** all prose, labels, and recommendations must be written in `LANGUAGE` from `config.md`. Only the DORA metric names (Deployment Frequency, Lead Time, etc.) remain in English as they are international standard terms.
