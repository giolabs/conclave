---
description: TL ADR authoring outside the /conclave-spec ceremony. Two modes — topic-directed (/conclave-adr "<decision>") writes a full ADR for the given topic; discovery (/conclave-adr with no args) has the Tech Lead propose 1–3 candidate decisions from sprint activity + architecture gaps, then authors the one the user picks. On first run in a repo with inline ADRs in architecture.md, migrates them to standalone files under conclave/product/adr/ (per-ADR atomic, resumable, idempotent). Available in every team mode.
allowed-tools: Bash(git rev-parse:*), Bash(git status:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(find:*), Bash(grep:*), Read, Write, Edit, Agent, AskUserQuestion
---

# /conclave-adr [topic]

Author a Tech Lead ADR (Architectural Decision Record) as a standalone file at `conclave/product/adr/ADR-NNN-<slug>.md`. The ADR is written with `status: proposed` — the team promotes it to `accepted` on PR merge.

Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. If not a git repo, refuse.
2. Require `$REPO_ROOT/conclave/config.md`. If absent, suggest `/conclave-init` and stop.
3. Require a clean working tree (`git status --porcelain` empty). If dirty, refuse with: *"Working tree is dirty. Stash or commit your local changes, then re-run."*

## Step 2 — Parse the mode

- If the first positional argument (or the joined args) is a non-empty, non-whitespace string → **topic-directed** mode. `TOPIC = <string>`.
- If no arguments, or the joined args are all whitespace, or the argument is the literal empty string `""` → **discovery** mode. `TOPIC = null`.

## Step 3 — Load config

Read `$REPO_ROOT/conclave/config.md` frontmatter: `team_profile`, `team_mode`, and `models.*`. Resolve `MODEL_FOR_TL` using the v0.7.0 pattern:

- `models.overrides.tech_lead` → `models.default` → parent session model (null).
- Invalid model ID → print `WARNING: Unknown model '<value>' for role tech_lead. Falling back to <next>.` and continue.
- Absent `models:` block → silent no-op.

Print one line before dispatching the subagent (skip when `MODEL_FOR_TL` is null): `Models: tl=<id>`.

## Step 4 — Load ADR context

Read in parallel:

- `$REPO_ROOT/conclave/product/architecture.md`
- Every file matching `$REPO_ROOT/conclave/product/adr/ADR-*.md` (may be zero files — the directory may not exist yet)
- The active sprint's `spec.md` (find via listing `conclave/sprints/` for `status: active`; if none, use the most recent draft or archived — best-effort context for discovery mode)

Extract from each existing ADR file: `id`, `title`, `status`, and a one-line summary from the Decision section. Build `EXISTING_ADRS_INDEX` — a list of these tuples.

## Step 5 — Migrate inline ADRs from `architecture.md` (idempotent)

Grep `architecture.md` for lines matching `^### ADR-([0-9]+): ` — these are the legacy inline ADR sections written by pre-v0.8.0 `/conclave-spec` runs.

If **zero matches** → skip migration entirely. Continue to Step 6.

If **matches found**, process them **one at a time** (per-ADR atomic):

For each match, in ascending ADR-NNN order:

1. Parse the inline section: extract `NNN`, `TITLE`, and the Context / Decision / Consequences prose bodies (each is a bold-labelled paragraph in the current template — e.g. `**Context.** <text>` on its own line).
2. Compute a `SLUG` from `TITLE` (lowercase, dash-separated ASCII, ~40 chars).
3. **Existence check**: if `conclave/product/adr/ADR-NNN-<slug>.md` already exists, this ADR was already extracted by an earlier interrupted run — skip step 4 and go to step 5. Otherwise continue.
4. **Write the standalone file** at `conclave/product/adr/ADR-NNN-<slug>.md` using `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/adr.template.md`. Fill:
   - `id: "ADR-NNN"`
   - `title: <TITLE>`
   - `status: accepted` — this is migration; the team already acted on it.
   - `date: "unknown"` — the literal string `"unknown"`. Best-effort fallback: try `git log --diff-filter=A --format=%aI -- conclave/product/architecture.md | tail -1` (the file's first-add date is a reasonable lower bound); if that returns non-empty, use it, otherwise stay with `"unknown"`.
   - `deciders`: the Tech Lead(s) from `conclave/team/roster.md` at time of run — list format.
   - `tags: []`
   - `supersedes: null`, `superseded_by: null`
   - Context / Decision / Consequences: the extracted prose from the inline section.
   - `Alternatives Considered` table: single stub row `| — | Migrated from inline architecture.md — not populated at the time of the original decision | — |`.
   - `Trade-offs`: single line `Migrated from inline architecture.md — not populated at the time of the original decision.`
5. **Remove the specific inline `### ADR-NNN: ...` section from `architecture.md`** — Edit the file to delete that heading and all lines up to (but not including) the next `###`- or `##`-level heading. This step must happen **after** step 4's write so that if migration is interrupted between them, a resume can detect the inconsistency (inline section present but standalone file missing) and finish the extraction cleanly.

**Resumability**: because each per-ADR extraction is atomic (write standalone file, then remove inline section), an interrupted migration leaves `architecture.md` in a consistent partial state — inline sections still present correspond to ADRs whose standalone files do not yet exist; removed inline sections correspond to extracted ADRs whose files are on disk. A re-run picks up where the previous run left off.

**After all inline sections are extracted** (or when the initial grep found zero matches), rewrite section 4 of `architecture.md` with the new referenced-ADR table format — one row per migrated ADR plus a placeholder row for the new ADR being authored (which Step 8 will populate). Match the shape of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/architecture.template.md` section 4.

## Step 6 — Compute the next ADR number

Glob `$REPO_ROOT/conclave/product/adr/ADR-*.md` (including any files just written by migration). Extract the numeric part of each `ADR-NNN`. `NEXT_ID = max(all found) + 1`, zero-padded to 3 digits. If the directory does not exist or is empty, `NEXT_ID = 001`.

## Step 7 — Snapshot context

Write a timestamped snapshot to `$REPO_ROOT/conclave/context/<ISO_TIMESTAMP>/`:

- The current `architecture.md` (post-migration).
- The list of existing ADR IDs, titles, and statuses (as a text file — do not copy the ADR bodies).
- The active sprint's `spec.md` (when applicable).

## Step 8 — Dispatch by mode

### Step 8a — Topic-directed mode (`TOPIC != null`)

Delegate to the Tech Lead subagent:

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `${CLAUDE_PLUGIN_ROOT}/skills/conclave/agents/tech-lead.md`.
- Task: *"Research the decision described in TOPIC and write a full ADR. Mode: topic-directed. Use ADR ID `ADR-NNN` verbatim (do not renumber). Follow the 'Topic-directed mode' section of your `/conclave-adr` charter. Return one complete ADR markdown document matching the template — nothing else."*
- Embed: `TOPIC`, `architecture.md` content, `EXISTING_ADRS_INDEX`, active sprint's `spec.md` for context, `NEXT_ID`.
- Expected output: complete ADR markdown, matching `adr.template.md`.

Wait for the subagent. If it errors, surface and stop (do not write any files).

Continue to Step 9.

### Step 8b — Discovery mode (`TOPIC == null`)

1. **First TL call — candidate generation**:
   - **Model**: `MODEL_FOR_TL`.
   - Prompt prefix: TL charter.
   - Task: *"Propose 1–3 candidate decisions that would benefit from an ADR, based on gaps in architecture.md and open questions raised by sprint activity. Mode: discovery. Follow the 'Discovery mode' section of your `/conclave-adr` charter. Return only the YAML `candidates:` block — nothing else."*
   - Embed: `architecture.md`, `EXISTING_ADRS_INDEX`, active sprint's `spec.md`.
   - Expected output: YAML block with `candidates:` (0–3 entries, each `title` / `one_line_context` / `why_it_needs_an_adr`).
2. **Parse the YAML**. If parsing fails, print `TL subagent produced malformed YAML for discovery candidates. Aborting.` and stop.
3. **Empty candidates**. If `candidates: []`, print `No ADR candidates surfaced — architecture appears complete relative to sprint scope.` and stop (no file writes).
4. **Present candidates to the user (`AskUserQuestion`)**:
   - Options: `Author "<title 1>"`, `Author "<title 2>"`, `Author "<title 3>"`, `None — cancel`.
   - Show `one_line_context` and `why_it_needs_an_adr` in the description of each option.
5. If the user picks `None — cancel`, print `No ADR authored.` and stop.
6. Otherwise, set `TOPIC` to the picked candidate's `title`, then proceed as if this were topic-directed mode from Step 8a — issue a second TL call for authoring.

## Step 9 — Write the ADR file and update `architecture.md`

1. **Compute `SLUG`** from the ADR title (lowercase, dash-separated ASCII, ~40 chars).
2. **Write** the ADR markdown to `$REPO_ROOT/conclave/product/adr/ADR-<NEXT_ID>-<slug>.md`. Verify the frontmatter matches the required shape:
   - `id`, `title`, `status: proposed`, `date` (today's ISO date), `deciders` (list from roster), `tags`, `supersedes: null`, `superseded_by: null`, `generated_by: conclave`.
   If any field is missing or if `status != "proposed"`, refuse to write and surface: `TL subagent output has malformed frontmatter (status='<value>', expected 'proposed'). Aborting.`
   If the body has no Decision section, refuse: `ADR is missing the Decision section. Aborting.`
3. **Append a row** to `architecture.md` section 4 (the referenced-ADR table): `| [ADR-NEXT_ID](adr/ADR-NEXT_ID-<slug>.md) | <title> | proposed | <today ISO date> |`. If Step 5 wrote a placeholder row for the new ADR, replace that row instead of appending.
4. Do NOT commit. Do NOT push. Do NOT open a PR.

## Step 10 — Report

Print:

- `ADR-NEXT_ID: <title>` — the new ADR's ID and title.
- Path to the new file.
- Whether migration ran (and if so, how many inline ADRs were migrated).
- One-line summary of the Decision section (first sentence of the body).
- Suggested git flow:
  ```bash
  git add conclave/
  git commit -m "conclave: propose ADR-NEXT_ID — <title>"
  gh pr create --title "ADR-NEXT_ID: <title>" --body "Proposed by TL. Team promotes to accepted on merge."
  ```
- Reminder: the ADR is `status: proposed`. Team promotes to `accepted` by editing the frontmatter on merge.

## Guardrails

- **Never write `status: accepted` from the subagent.** Only migration writes `accepted` (for pre-existing inline ADRs whose team already acted on). New ADRs are always `proposed`.
- **Never commit**, push, or open a PR.
- **Never modify any story file** or any file outside `conclave/product/{architecture.md, adr/**}` and `conclave/context/`.
- **Migration is idempotent and resumable**. A second `/conclave-adr` run on a repo where migration already completed finds no inline ADRs and skips migration cleanly. A run interrupted mid-migration can be resumed by re-invoking the command — the per-ADR existence check in Step 5.3 detects already-extracted ADRs and skips them.
- **Never invent an ADR number**. The orchestrator computes `NEXT_ID` in Step 6 — the subagent uses it verbatim.
- **Do not touch section 5 or 6 of `architecture.md`**. Only section 4 (the referenced-ADR table) and (during migration) inline `### ADR-NNN` sections are edited by this command. Cross-cutting concerns and risk tables stay untouched.
- **Discovery mode with no candidates is a clean exit, not a failure**. `No ADR candidates surfaced` is the intended message when nothing is missing.
