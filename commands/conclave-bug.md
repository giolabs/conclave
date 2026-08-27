---
description: Report a bug (post-merge regression) or list the open bug backlog. `report` runs a Haiku pre-analysis on the raw input, asks targeted questions only when ambiguity would change the fix direction, and produces a BUG-NNN artifact with Gherkin repro steps and a suspected code area. When `lab_test.enabled` in config, the Tech Lead also generates an executable e2e lab spec (BUG-NNN-lab.md). Mirrors the bug as a GitHub issue. Hands off directly to /conclave-dev — bugs skip Sprint Planning. `list` is mechanical, no subagent call.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(find:*), Bash(grep:*), Bash(gh issue create:*), Bash(gh issue view:*), Bash(gh issue edit:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-bug <report [text|url] | list>

Report a bug the moment it surfaces — typically after a PR has already merged and shipped a silent regression — or list the current bug backlog.

```
/conclave-bug report "checkout button throws 500 on mobile Safari"
/conclave-bug report https://<logging-tool-url>/issues/8f2a1c
/conclave-bug list
```

`report` writes a `BUG-NNN` artifact directly in `status: ready` — bugs never pass through `backlog` or Sprint Planning, and `/conclave-planning` never sees them. Once reported, a bug is picked up exactly like a story: `/conclave-dev BUG-NNN` → `/conclave-qa BUG-NNN` → `/conclave-pr-review BUG-NNN` (if applicable). This command is the on-ramp only — no new pipeline is introduced.

Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. If not a git repo, refuse.
2. Require `$REPO_ROOT/conclave/config.md`. If absent, suggest `/conclave-init` and stop.
3. Require a clean working tree (`git status --porcelain` empty). If dirty, refuse with: *"Working tree is dirty. Stash or commit your local changes, then re-run."*

## Step 2 — Parse the sub-action

The first positional argument must be exactly `report` or `list`. Extract it as `ACTION`.

- Missing → refuse with `Usage: /conclave-bug <report [text|url] | list>`.
- Unknown → refuse with the same usage line.
- `report` with no further argument → refuse with the same usage line (a description or reference is required).

## Step 3 — Load config (report only)

Read `$REPO_ROOT/conclave/config.md` frontmatter:

- `models.*` — Resolve `MODEL_FOR_QA` and `MODEL_FOR_TL` using the v0.7.0 pattern:
  - `models.overrides.qa` → `models.default` → parent session model (null).
  - `models.overrides.tech_lead` → `models.default` → parent session model (null).
  - Invalid model ID → print `WARNING: Unknown model '<value>' for role <role>. Falling back to <next>.` and continue.
  - Absent `models:` block → silent no-op.
  - Print one line before dispatching agents (skip null values): `Models: qa=<id>, tl=<id>`.

- `lab_test.*` — Read the lab test block if present:
  - `LAB_TEST_ENABLED` = `lab_test.enabled` (default `false`).
  - `LAB_TEST_BRANCH` = `lab_test.integration_branch` → `repo.integration_branch` → `develop`.
  - `LAB_TEST_RUNNER` = `lab_test.runner` (default `auto`).
  - `LAB_TEST_TIMEBOX` = `lab_test.timebox_minutes` (default `30`).
  - `LAB_TEST_THRESHOLD` = `lab_test.bugs.severity_threshold` (default `null` = all severities).
  - If `lab_test:` block is absent → `LAB_TEST_ENABLED = false`. Silent.

- `lab-config.md` — **Required when `LAB_TEST_ENABLED == true`**. Attempt to read `$REPO_ROOT/conclave/lab-config.md`:
  - If found: parse the YAML frontmatter; store the Variable registry (names only — never log values) as `LAB_VAR_REGISTRY`, and the full frontmatter as `LAB_CONFIG`.
  - If **not found** and `LAB_TEST_ENABLED == true`: print the following and set `LAB_TEST_ENABLED = false` (no lab spec will be generated this run):
    ```
    ⚠  Lab tests are enabled but conclave/lab-config.md is missing.
       1. Copy the template:
          cp <plugin_root>/skills/conclave/templates/lab-config.template.md conclave/lab-config.md
       2. Fill in your environment values (base_url, vars).
       3. Add to .gitignore:
          echo "conclave/lab-config.md" >> .gitignore
       4. Re-run /conclave-bug report to generate the lab spec.
    ```
    Continue the rest of the command normally (bug file and GitHub issue are still created).
  - If found but `conclave/lab-config.md` is **not listed in `.gitignore`**: print a one-line warning and continue:
    `⚠  conclave/lab-config.md is not in .gitignore — add it before committing to avoid leaking local values.`

Continue to the matching section below based on `ACTION`.

---

## Step 3.5 — Pre-analysis with Haiku refiner (report only)

Before asking the user anything, dispatch a read-only Haiku subagent to analyze the raw input.

**Invoke via `Agent` tool:**
- **Model**: `claude-haiku-4-5-20251001` (always Haiku — this is a cheap classification step).
- The subagent is **read-only**: no file edits, no shell commands (Grep/Glob/Read allowed for codebase lookup).
- Prompt:

  > You are analyzing a raw bug report to help a QA team file it correctly. You are read-only — no file edits, no shell commands. Use Read/Grep/Glob only if the input references a specific file or symbol worth inspecting.
  >
  > Return ONLY a JSON object with these exact keys — no prose, no explanation:
  > ```json
  > {
  >   "optimized_title": "...",
  >   "suspected_code_area": "...",
  >   "blocking_questions": ["...", "..."],
  >   "nonblocking_gaps": ["...", "..."],
  >   "advisory_severity": "critical|high|medium|low",
  >   "prefill": {
  >     "title": "...",
  >     "severity": null
  >   }
  > }
  > ```
  > Rules:
  > - `optimized_title`: concise, describes the failure not the feature (max 80 chars).
  > - `suspected_code_area`: relative file path(s) or module most likely responsible; empty string if unclear.
  > - `blocking_questions`: questions whose answer would change the diagnosis or fix direction. Maximum 5. Omit if the report is complete. Examples: missing expected behavior, multiple bugs mixed, unclear environment when it matters.
  > - `nonblocking_gaps`: useful info missing but not blocking (e.g. "affected OS version"); these go straight to Needs-more-info without asking the user.
  > - `advisory_severity`: your read of the severity — the user's explicit choice overrides this.
  > - `prefill.title`: pre-filled title for the AskUserQuestion (the optimized_title); `prefill.severity`: null unless severity is unambiguous from the report (e.g. production down = critical).
  >
  > Raw bug report:
  > <RAW_INPUT>

- Embed the raw argument text plus `ENRICHED_CONTEXT` (if already fetched).
- Store the returned JSON as `REFINER_OUTPUT`.
- If the subagent errors or returns malformed JSON: set `REFINER_OUTPUT = null` and continue — the refiner is a convenience, not a gate.

---

## Step 4a — `report [free text | URL/ID]`

1. **Classify the argument.** If it matches a URL pattern (`https?://...`) or looks like a bare tracker ID, set `LOOKS_LIKE_REFERENCE = true`; otherwise treat the whole argument as free-text description. Hold as `RAW_INPUT`.

2. **Attempt MCP enrichment, only if `LOOKS_LIKE_REFERENCE`.** Print `Checking for a connected logging/error-tracking tool...`. Check whether the current session has any connected MCP tool whose name or description matches logging/error-tracking terms (generic keyword match — e.g. "sentry", "error tracking", "logging", "issue", "crash report" in the tool's own advertised description — **never hardcode a specific vendor name**). If one or more match, attempt to fetch the referenced item's details (stack trace, breadcrumbs, affected environment, first/last seen). Set `ENRICHED_CONTEXT` on success. If no matching tool is connected, or the fetch fails/errors, or returns nothing usable: print `Could not enrich from the connected tool — continuing with the text you provided.` and fall back silently to treating the original argument as plain text — never block on a failed integration.

3. **Ask the user (`AskUserQuestion`) — only what's necessary.**

   Read `REFINER_OUTPUT`:

   - If `REFINER_OUTPUT` is null (refiner failed): always ask all four fields.
   - If `REFINER_OUTPUT.blocking_questions` is empty AND `REFINER_OUTPUT.prefill.severity` is non-null:
     skip the AskUserQuestion round entirely — severity and title are clear from the report. Jump to Step 4a.4 using `REFINER_OUTPUT.prefill.title` as title and `REFINER_OUTPUT.prefill.severity` as severity.
   - Otherwise: ask the following in a single batched `AskUserQuestion`, pre-filling where possible:
     - **Title** (free text; default = `REFINER_OUTPUT.prefill.title` or `ENRICHED_CONTEXT` issue title).
     - **Severity** — `critical | high | medium | low`, **no default** — must be explicit. Show `REFINER_OUTPUT.advisory_severity` as a hint: *"QA advises: <severity>"*.
     - **Discipline** — `frontend | backend | mobile | qa | design | devops | multi` (default `multi`).
     - **Related story or PR, if known** (free text, optional; skippable).
     - Plus at most the **first 3 items** from `REFINER_OUTPUT.blocking_questions` (prioritize by fix-direction risk; promote the rest to `## Needs more info`).

   Maximum 5 questions total across all items in this batch. If more blocking questions exist, promote extras to `## Needs more info`.

4. **Delegate to the QA subagent:**
   - **Model**: `MODEL_FOR_QA` (omit if null).
   - Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/qa.md`.
   - Task: *"Author a bug report from the seed inputs. Follow the 'How you operate inside /conclave-bug report' section of your charter. Produce Gherkin repro steps and an advisory severity note — the user's explicit severity choice is authoritative, yours is advisory only."*
   - Embed: title, `RAW_INPUT`, `ENRICHED_CONTEXT` (if any), the user's severity/discipline/related-story answers, and `REFINER_OUTPUT.suspected_code_area` as a hint: *"The pre-analysis suspects the issue is in: <area>. Verify if possible, correct if wrong."*
   - Expected output: 1–3 Gherkin `Given`/`When`/`Then` repro scenarios, an advisory severity note, and (optionally) a `## Needs more info` note — which must also include `REFINER_OUTPUT.nonblocking_gaps`.

   Wait for the subagent. If it errors, surface and stop.

5. **Compute `NEW_ID`.** Glob `$REPO_ROOT/conclave/product/bugs/BUG-*.md`. `NEW_ID = max(existing) + 1`, zero-padded to 3 digits — a separate monotonic sequence from story IDs (independent counters; the two ID spaces never collide by construction).

6. **Snapshot context.** Write a timestamped snapshot to `$REPO_ROOT/conclave/context/<ISO_TIMESTAMP>/` containing the seed inputs and `ENRICHED_CONTEXT` (if any).

7. **Write `conclave/product/bugs/BUG-NEW_ID-<slug>.md`** from `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/bug.template.md`, with:
   - `status: ready`
   - `severity` from Step 4a.3 (user's explicit choice)
   - `discipline` from Step 4a.3
   - `related_story` from Step 4a.3 (or empty)
   - `suspected_code_area` from `REFINER_OUTPUT.suspected_code_area` (or empty string if refiner failed)
   - `lab_test_path: ""` (will be filled in Step 4a.9 if applicable)
   - `assignee: ""`
   - `created_at`
   - `reported_via` (`manual` or `mcp:<tool-name>`)
   - the QA subagent's Gherkin repro steps
   - its `## Needs more info` note if present

   Create `conclave/product/bugs/` if it does not exist yet (lazy creation, no index file).

8. **Create the mirrored GitHub issue**, if `gh` is available:
   ```
   gh issue create --title "BUG-NEW_ID: <title>" --body "<rendered from the bug file's Gherkin + severity + a footer link back to the file path>" --label bug
   ```
   Also attempt `--label severity:<severity>` best-effort (non-fatal if the label doesn't exist in the target repo). Record the returned issue number/URL back into the bug file's frontmatter (`github_issue_number`, `github_issue_url`) with a second write.

   If `gh` is unavailable: skip issue creation, leave those two fields empty, and note in the report (Step 9 below) that the user should create the issue manually — print the prepared `gh issue create` command.

9. **Generate the lab test, if applicable.**

   Check: `LAB_TEST_ENABLED == true` AND (`LAB_TEST_THRESHOLD` is null OR `severity >= LAB_TEST_THRESHOLD`).
   Severity ordering for threshold comparison: `critical > high > medium > low`.

   If the check passes:

   a. Dispatch the Tech Lead subagent via `Agent`:
      - **Model**: `MODEL_FOR_TL` (omit if null).
      - Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/tech-lead.md`.
      - Task: *"Generate a lab test specification for the bug below. Follow the 'How you operate inside lab test generation' section of your charter — Bug context mode."*
      - Embed:
        - The full content of the just-written `BUG-NEW_ID-<slug>.md`
        - `ENRICHED_CONTEXT` (if any)
        - `REFINER_OUTPUT.suspected_code_area`
        - Lab test config: `integration_branch`, `runner`, `timebox_minutes`
        - **`LAB_VAR_REGISTRY`** — the Variable registry table from `conclave/lab-config.md` (variable names + purpose + required-when columns). This tells the TL which env var names exist so it can write concrete `Verify:` commands. Embed as-is; never embed actual values.
        - **`LAB_CONFIG.environments.integration.base_url`** (or `local.base_url` if integration is empty) — the base URL the Verify command should target.
      - Expected output: the fully rendered content of a `lab-test.template.md` — a complete `BUG-NNN-lab.md` with no unfilled `{{placeholder}}` strings. If the TL cannot write a concrete `Verify:` command (insufficient context or the Variable registry is empty), it returns a partial spec with `status: blocked` and a `## Needs more info` section listing what is missing — the orchestrator writes this as-is.

   b. Write the lab spec to `conclave/product/bugs/BUG-NEW_ID-lab.md`.

   c. Update `lab_test_path` in `BUG-NEW_ID-<slug>.md` frontmatter to point to the lab spec file path.

   If the check does not pass: skip silently (no lab spec generated for this severity).

10. **Report**: bug ID, path, severity, discipline, `suspected_code_area` (if non-empty), lab spec path (if generated), GitHub issue URL (or the prepared `gh issue create` command), and the next step: `/conclave-dev BUG-NEW_ID` to fix it. Suggested git flow:
    ```bash
    git add conclave/
    git commit -m "conclave: report BUG-NEW_ID"
    gh pr create --title "New bug: BUG-NEW_ID" --body "Bug report."
    ```

## Step 4b — `list` (mechanical — no subagent call)

1. Glob `$REPO_ROOT/conclave/product/bugs/BUG-*.md`. If none exist, print `No bugs reported yet.` and stop. No file writes, no git operations.
2. For each, read frontmatter: `id`, `title`, `severity`, `status`, `related_story` (or `—`), `github_issue_url` (or `—`), `assignee` (or `—`), `lab_test_path` (or `—`).
3. Print a table sorted by `severity` (`critical` → `high` → `medium` → `low`), then by ID within the same severity:
   ```
   | Bug     | Title                          | Severity | Status      | Related    | Lab  | Issue                         | Assignee |
   |---------|--------------------------------|----------|-------------|------------|------|-------------------------------|----------|
   | BUG-004 | Checkout 500 on mobile Safari  | critical | in-progress | US-042     | ✓    | https://github.com/…/issues/81 | Cy       |
   | BUG-002 | Stale cache on logout          | medium   | ready       | —          | —    | https://github.com/…/issues/79 | —        |
   ```
4. Note in the output that no subagent was invoked — this is by design, listing is a policy-free read (same courtesy note `/conclave-story retire` prints).

---

## Guardrails

- **Do not modify any file outside `conclave/product/bugs/` and `conclave/context/`.** This command does not touch `conclave/product/backlog.md`, `roster.md`, `config.md`, or any story or sprint file. Bugs live in their own directory, not the story backlog.
- **Never commit.** The team reviews the bug report as a PR, same as every existing command.
- **`list` never calls the subagent.** If a future change is tempted to add LLM prose to listing, resist — listing existing data is policy-free, same precedent as `/conclave-story retire`.
- **No `edit`/`retire`/`split` sub-actions in this phase.** A mis-filed bug is hand-corrected via frontmatter edit (git preserves the audit trail).
- **Never invent a stack trace, environment detail, or severity the user didn't provide or the enrichment didn't surface.** If reproduction steps are underspecified, write what's known and flag the gap in `## Needs more info` rather than guessing.
- **Never hardcode a specific logging/error-tracking vendor name** in the MCP-detection logic — detection is generic, keyword/description-based.
- **`BUG-NNN` and story IDs are independent monotonic sequences** — never derive one from the other.
- **The refiner is a convenience, not a gate.** If `REFINER_OUTPUT` is null, continue with the legacy 4-question AskUserQuestion flow. Never block on a refiner failure.
- **The AskUserQuestion is conditional, not eliminated.** If severity is ambiguous, always ask — never guess a critical/high severity without explicit user confirmation.
- **The lab test is generated only when `LAB_TEST_ENABLED` and severity meets the threshold.** Never generate a lab spec for a `medium` or `low` bug when `severity_threshold: high`. If the TL subagent returns a blocked/partial spec, write it as-is — never fabricate a Verify: command.
