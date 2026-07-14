---
description: Report a bug (post-merge regression) or list the open bug backlog. `report` turns free text or a logging/error-tracking tool reference into a BUG-NNN artifact with Gherkin repro steps, mirrors it as a GitHub issue, and hands it straight to /conclave-dev (dev-ready immediately — bugs skip Sprint Planning). `list` is mechanical, no subagent call.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(find:*), Bash(gh issue create:*), Bash(gh issue view:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-bug &lt;report [text|url] | list&gt;

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

Read `$REPO_ROOT/conclave/config.md` frontmatter: `models.*`. Resolve `MODEL_FOR_QA` using the existing v0.7.0 pattern:

- `models.overrides.qa` → `models.default` → parent session model (null).
- Invalid model ID → print `WARNING: Unknown model '<value>' for role qa. Falling back to <next>.` and continue.
- Absent `models:` block → silent no-op.

Print one line before dispatching the subagent (skip when `MODEL_FOR_QA` is null): `Models: qa=<id>`.

Continue to the matching section below based on `ACTION`.

---

## Step 4a — `report [free text | URL/ID]`

1. **Classify the argument.** If it matches a URL pattern (`https?://...`) or looks like a bare tracker ID, set `LOOKS_LIKE_REFERENCE = true`; otherwise treat the whole argument as free-text description.

2. **Attempt MCP enrichment, only if `LOOKS_LIKE_REFERENCE`.** Print `Checking for a connected logging/error-tracking tool...`. Check whether the current session has any connected MCP tool whose name or description matches logging/error-tracking terms (generic keyword match — e.g. "sentry", "error tracking", "logging", "issue", "crash report" in the tool's own advertised description — **never hardcode a specific vendor name**). If one or more match, attempt to fetch the referenced item's details (stack trace, breadcrumbs, affected environment, first/last seen). Set `ENRICHED_CONTEXT` on success. If no matching tool is connected, or the fetch fails/errors, or returns nothing usable: print `Could not enrich from the connected tool — continuing with the text you provided.` and fall back silently to treating the original argument as plain text — never block on a failed integration.

3. **Ask the user (`AskUserQuestion`)** — batched, some pre-filled from `ENRICHED_CONTEXT` when available:
   - **Title** (free text; pre-filled from the tracker's issue title when `ENRICHED_CONTEXT` has one).
   - **Severity** — `critical | high | medium | low`, **no default** — must be explicit.
   - **Discipline** — `frontend | backend | mobile | qa | design | devops | multi` (default `multi`, same as `/conclave-story new`).
   - **Related story or PR, if known** (free text, optional — e.g. `US-042` or a PR URL; skippable).

4. **Delegate to the QA subagent**:
   - **Model**: `MODEL_FOR_QA` (omit if null).
   - Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/qa.md`.
   - Task: *"Author a bug report from the seed inputs. Follow the 'How you operate inside /conclave-bug report' section of your charter. Produce Gherkin repro steps and an advisory severity note — the user's explicit severity choice from Step 4a.3 is authoritative, yours is advisory only."*
   - Embed: title, any free text, `ENRICHED_CONTEXT` (if any), the user's severity/discipline/related-story answers.
   - Expected output: 1–3 Gherkin Given/When/Then repro scenarios, an advisory severity note (may agree or suggest reconsidering — never overrides the user's choice), and (optionally) a `## Needs more info` note naming what's still underspecified.

   Wait for the subagent. If it errors, surface and stop.

5. **Compute `NEW_ID`.** Glob `$REPO_ROOT/conclave/product/bugs/BUG-*.md`. `NEW_ID = max(existing) + 1`, zero-padded to 3 digits — a separate monotonic sequence from `US-NNN` (independent counters; the two ID spaces never collide by construction).

6. **Snapshot context.** Write a timestamped snapshot to `$REPO_ROOT/conclave/context/<ISO_TIMESTAMP>/` containing the seed inputs and `ENRICHED_CONTEXT` (if any).

7. **Write `conclave/product/bugs/BUG-NEW_ID-<slug>.md`** from `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/bug.template.md`, with `status: ready`, `severity` from Step 4a.3, `discipline` from Step 4a.3, `related_story` from Step 4a.3 (or omitted), `assignee: ""`, `created_at`, `reported_via` (`manual` or `mcp:<tool-name>`), the QA subagent's Gherkin repro steps, and its `## Needs more info` note if present. Create `conclave/product/bugs/` if it does not exist yet (lazy creation, no index file).

8. **Create the mirrored GitHub issue**, if `gh` is available:
   ```
   gh issue create --title "BUG-NEW_ID: <title>" --body "<rendered from the bug file's Gherkin + severity + a footer link back to the file path>" --label bug
   ```
   Also attempt `--label severity:<severity>` best-effort (non-fatal if the label doesn't exist in the target repo). Record the returned issue number/URL back into the bug file's frontmatter (`github_issue_number`, `github_issue_url`) with a second write.

   If `gh` is unavailable: skip issue creation, leave those two fields empty, and note in the report (Step 6 below) that the user should create the issue manually and fill them in by hand — print the prepared `gh issue create` command.

9. **Report**: bug ID, path, severity, discipline, GitHub issue URL (or the prepared `gh issue create` command), and the next step: `/conclave-dev BUG-NEW_ID` to fix it. Suggested git flow:
   ```bash
   git add conclave/
   git commit -m "conclave: report BUG-NEW_ID"
   gh pr create --title "New bug: BUG-NEW_ID" --body "Bug report."
   ```

## Step 4b — `list` (mechanical — no subagent call)

1. Glob `$REPO_ROOT/conclave/product/bugs/BUG-*.md`. If none exist, print `No bugs reported yet.` and stop. No file writes, no git operations.
2. For each, read frontmatter: `id`, `title`, `severity`, `status`, `related_story` (or `—`), `github_issue_url` (or `—`), `assignee` (or `—`).
3. Print a table sorted by `severity` (`critical` → `high` → `medium` → `low`), then by ID within the same severity:
   ```
   | Bug     | Title                          | Severity | Status      | Related    | Issue                         | Assignee |
   |---------|---------------------------------|----------|--------------|------------|--------------------------------|----------|
   | BUG-004 | Checkout 500 on mobile Safari  | critical | in-progress  | US-042     | https://github.com/…/issues/81 | Cy       |
   | BUG-002 | Stale cache on logout           | medium   | ready        | —          | https://github.com/…/issues/79 | —        |
   ```
4. Note in the output that no subagent was invoked — this is by design, listing is a policy-free read (same courtesy note `/conclave-story retire` prints).

---

## Guardrails

- **Do not modify any file outside `conclave/product/bugs/` and `conclave/context/`.** This command does not touch `conclave/product/backlog.md`, `roster.md`, `config.md`, or any story or sprint file. Bugs live in their own directory, not the story backlog.
- **Never commit.** The team reviews the bug report as a PR, same as every existing command.
- **`list` never calls the subagent.** If a future change is tempted to add LLM prose to listing, resist — listing existing data is policy-free, same precedent as `/conclave-story retire`.
- **No `edit`/`retire`/`split` sub-actions in this phase.** A mis-filed bug is hand-corrected via frontmatter edit (git preserves the audit trail) — same recovery path already established for un-retiring a story.
- **Never invent a stack trace, environment detail, or severity the user didn't provide or the enrichment didn't surface.** If reproduction steps are underspecified, write what's known and flag the gap in `## Needs more info` rather than guessing.
- **Never hardcode a specific logging/error-tracking vendor name** (e.g. "Sentry") in the MCP-detection logic — detection is generic, keyword/description-based.
- **`BUG-NNN` and `US-NNN` are independent monotonic sequences** — never derive one from the other, never let a bug ID collide with a story ID (they can't, by prefix, but never assume otherwise when computing `NEW_ID`).
