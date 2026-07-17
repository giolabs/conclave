---
name: conclave-story
description: PM story authoring outside the /conclave-spec ceremony. First arg is a sub-action — new (author a new story), edit US-NNN (revise), split US-NNN (decompose into 2–4 children), retire US-NNN (mark terminal). Available in every team mode (solo, lean, full-scrum). Delegates to the Product Manager subagent for new/edit/split; retire is a mechanical frontmatter update with no LLM call.
---

# /conclave-story &lt;new | edit US-NNN | split US-NNN | retire US-NNN&gt;


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


Author, refine, decompose, or retire a user story between `/conclave-spec` runs. All four sub-actions leave the target repo in a PR-ready state — nothing is committed automatically.

Follow these steps in order.

---

## Step 1 — Resolve the workspace

1. `git rev-parse --show-toplevel` → `REPO_ROOT`. If not a git repo, refuse.
2. Require `$REPO_ROOT/conclave/config.md`. If absent, suggest `/conclave-init` and stop.
3. Require a clean working tree (`git status --porcelain` empty). If dirty, refuse with: *"Working tree is dirty. Stash or commit your local changes, then re-run."*

## Step 2 — Parse the sub-action

The first positional argument must be exactly one of `new | edit | split | retire`. Extract it as `ACTION`.

- Missing → refuse with `Usage: /conclave-story <new|edit US-NNN|split US-NNN|retire US-NNN>`.
- Unknown → refuse with the same usage line.
- For `edit`, `split`, `retire`: the second positional argument must be a `US-NNN` ID. Missing → refuse with the same usage line.
- For `new`: refuse if any positional arg follows (it takes no ID — the orchestrator allocates one monotonically).

## Step 3 — Load config

Read `$REPO_ROOT/conclave/config.md` frontmatter: `team_profile`, `team_mode`, and `models.*`. Resolve `MODEL_FOR_PM` using the v0.7.0 pattern:

- `models.overrides.product_manager` → `models.default` → parent session model (null).
- Invalid model ID → print `WARNING: Unknown model '<value>' for role product_manager. Falling back to <next>.` and continue.
- Absent `models:` block → silent no-op.

Print one line before dispatching the subagent (skip when `MODEL_FOR_PM` is null): `Models: pm=<id>`.

## Step 4 — Locate the active sprint (required for `edit` / `split` / `retire`; optional for `new`)

List `$REPO_ROOT/conclave/sprints/` and read each `meta.md`'s frontmatter to find the sprint with `status: active`.

- **`new`**: an active sprint is not required. If one exists, remember it — the user may choose to pull the new story into it.
- **`edit` / `split` / `retire`**: if the story is not in an active sprint's `stories/` directory, look in `$REPO_ROOT/conclave/product/stories-backlog/`. If it exists in neither, refuse with `US-NNN not found in the active sprint or in conclave/product/stories-backlog/.`

Cross-sprint operations are out of scope. A story in `SPRINT-002` cannot be `edit`ed from a `SPRINT-003`-active workspace via this command.

## Step 5 — Snapshot context

Write a timestamped snapshot to `$REPO_ROOT/conclave/context/<ISO_TIMESTAMP>/`:

- The story file being touched (for `edit`/`split`/`retire`).
- The current `product/backlog.md`.
- The active sprint's `spec.md` (when applicable).

Skip snapshot for `new` when there is no active sprint — nothing to snapshot yet.

## Step 6 — Dispatch by sub-action

Continue to the matching section below based on `ACTION`.

---

### Step 6a — `new`

1. **Compute the next story ID**. Glob `$REPO_ROOT/conclave/sprints/*/stories/US-*-*.md` and `$REPO_ROOT/conclave/product/stories-backlog/US-*-*.md`. Extract the numeric part of each `US-NNN`. Also scan `$REPO_ROOT/conclave/product/backlog.md` for `US-NNN` mentions. `NEW_ID = max(all found) + 1`, zero-padded to 3 digits.
2. **Ask the user (`AskQuestion`)**:
   - **Story title** (free text).
   - **Where should it land?** — `Backlog only` (default) / `Backlog + pull into active sprint` (only offered when a sprint is `active` or `draft`).
   - **Discipline** — `frontend | backend | mobile | qa | design | devops | multi` (default `multi`).
   - **Priority** — `must | should | could | wont` (default `should`).
   - **Estimate** — `XS | S | M | L | XL` (default `M`).
3. **Delegate to the Product Manager subagent**:
   - **Model**: `MODEL_FOR_PM` (omit if null).
   - Prompt prefix: full content of `agents/product-manager.md`.
   - Task: *"Author a new story per the seed inputs. Sub-action: new. Reference the story ID as `US-{{id}}` — the orchestrator will substitute. Return `## Story` then `## Acceptance` blocks, nothing else. Follow the 'How you operate inside /conclave-story new' section of your charter."*
   - Embed: the seed answers, the active sprint's `spec.md` (when landing in sprint), the current `backlog.md`.
   - Expected output: two markdown blocks — `## Story` matching `story.template.md`, `## Acceptance` matching `acceptance.template.md`.
4. **Write the files**:
   - Compute `SLUG` from the story title (lowercase, dash-separated ASCII, ~40 chars).
   - If the user chose `Backlog + pull into active sprint`: write `conclave/sprints/SPRINT-NNN/stories/US-NEW_ID-<slug>.md` and `conclave/sprints/SPRINT-NNN/acceptance/AC-US-NEW_ID.md`. Set frontmatter `sprint: SPRINT-NNN`, `status: ready`.
   - Otherwise: write `conclave/product/stories-backlog/US-NEW_ID-<slug>.md` and `conclave/product/stories-backlog/acceptance/AC-US-NEW_ID.md`. Create the directories if they do not exist. Set frontmatter `sprint: ""`, `status: backlog`.
   - Populate the frontmatter fields from the seed answers (`priority`, `estimate`, `discipline`, `assignee: ""`, `created_at`). Leave retirement/lineage fields absent.
5. **Update `conclave/product/backlog.md`**:
   - Append a new row at the bottom of the Backlog table. Columns: Order (next integer), Story (link — `[US-NEW_ID](../<path-to-file>)`), Title, Priority, Estimate, Status, In sprint (`SPRINT-NNN` or `—`).
   - Update the frontmatter `last_groomed_at` to today's ISO date.
6. **Report** — see Step 7.

---

### Step 6b — `edit US-NNN`

1. **Locate the story** — path from Step 4.
2. **Guard on status**. Read the story's frontmatter `status`.
   - `backlog`, `ready` → continue.
   - `in-progress`, `review`, `verified`, `done` → refuse with: *"Story is past the ready gate. Editing acceptance criteria mid-implementation would invalidate the QA verification — surface the issue via a PR comment on the story file instead."*
   - `retired` → refuse with: *"Story is retired. Un-retire it by editing its frontmatter `status:` field by hand (git will preserve the audit trail), then re-run this command."*
3. **Ask the user (`AskQuestion`)**: **What should change?** — free-form paragraph. The PM subagent will ask follow-ups if it needs to disambiguate what specifically to touch (title, description, acceptance criteria, priority, estimate).
4. **Delegate to the Product Manager subagent**:
   - **Model**: `MODEL_FOR_PM`.
   - Prompt prefix: PM charter.
   - Task: *"Edit story US-NNN per the user's stated change. Sub-action: edit. Preserve the ID, preserve frontmatter fields not covered by the change, do not modify status. Follow the 'How you operate inside /conclave-story edit' section of your charter. Return the full edited story markdown and (if criteria changed) the full edited acceptance markdown."*
   - Embed: current story markdown, current acceptance markdown, user's stated change.
5. **Write the files** — overwrite in place. Do not rename the file (slug is stable across edits). Preserve everything the PM did not touch.
6. **Update `conclave/product/backlog.md`** — only if surface fields (title, priority, estimate, discipline) changed. Row position stays the same.
7. **Report** — see Step 7.

---

### Step 6c — `split US-NNN`

1. **Locate the story** — path from Step 4.
2. **Guard on status** — same rules as `edit` (§6b Step 2).
3. **Ask the user (`AskQuestion`)**:
   - **How many splits?** — `2` / `3` / `4`.
   - **Split axis** — free-form paragraph (e.g. "by user flow", "by data layer vs UI").
4. **Delegate to the Product Manager subagent**:
   - **Model**: `MODEL_FOR_PM`.
   - Prompt prefix: PM charter.
   - Task: *"Split story US-NNN into N children per the axis. Sub-action: split. Enforce the coverage rule during proposal generation (§ 'How you operate inside /conclave-story split' of your charter): plan a scenario-to-child map first, refuse with SPLIT_UNSAFE if any parent scenario cannot be assigned. Return N `## Story` + `## Acceptance` block pairs, one per child."*
   - Embed: parent story markdown, parent acceptance markdown, N, split axis.
5. **Handle refusal**. If the PM returns a line starting with `SPLIT_UNSAFE:`, print that message verbatim to the user, take no further action, and stop. Do not write any files.
6. **Validate the output** (orchestrator-side mechanical check):
   - `len(children) == N` — if not, print `Split expected N children, subagent returned M. Aborting.` and stop.
   - Every parent scenario name (verbatim match) appears in at least one child's `## Acceptance` block — if not, print `Coverage gap: parent scenario "<name>" not present in any child. Aborting.` and stop.
7. **Allocate child IDs**. `CHILD_ID_1 = max(all existing IDs) + 1`, `CHILD_ID_2 = CHILD_ID_1 + 1`, etc.
8. **Write child files**:
   - Compute a `SLUG` per child from its title.
   - Same target directory as the parent (sprint's `stories/` or `stories-backlog/`).
   - Each child's frontmatter: inherit parent's `sprint`, set `status: ready` (or `backlog` if parent was backlog-only), set `split_from: US-NNN`, `assignee: ""`, `discipline` from the PM's output (or inherit if the PM did not override).
   - Also write the child's acceptance file.
9. **Update the parent's frontmatter** — do NOT delete the parent file:
   - `status: retired`
   - `retired_at: <today ISO date>`
   - `retirement_reason: "Split into US-CHILD_1, US-CHILD_2, ... via /conclave-story split"`
   - `superseded_by: [US-CHILD_1, US-CHILD_2, ...]`
10. **Update `conclave/product/backlog.md`**:
    - Parent row's Status → `retired`.
    - Insert N new rows immediately after the parent, one per child. Same `In sprint` value as the parent.
11. **Report** — see Step 7.

---

### Step 6d — `retire US-NNN` (mechanical — no subagent call)

1. **Locate the story** — path from Step 4.
2. **Guard on status**:
   - `backlog`, `ready` → continue.
   - `in-progress`, `review`, `verified`, `done` → refuse with: *"Story is past the ready gate. Retiring active or shipped work is either dishonest (it shipped) or requires reverting code first. Reset the branch and story status by hand before retiring."*
   - `retired` → refuse with: *"Story is already retired."*
3. **Ask the user (`AskQuestion`)**: **Why is it being retired?** — free-form paragraph, non-empty required.
4. **Update the story's frontmatter**:
   - `status: retired`
   - `retirement_reason: <user's paragraph>`
   - `retired_at: <today ISO date>`
   Leave the body unchanged.
5. **Update `conclave/product/backlog.md`** — row's Status column → `retired`.
6. **Report** — see Step 7. Note in the report that no subagent was invoked (this is by design — retirement is a mechanical policy decision).

---

## Step 7 — Report

Print a summary tailored to the sub-action:

- **new**: story ID + path to the story file + path to the acceptance file + whether it landed in a sprint or backlog-only + suggested git flow:
  ```bash
  git add conclave/
  git commit -m "conclave: new story US-NEW_ID"
  gh pr create --title "New story: US-NEW_ID" --body "Backlog addition."
  ```
- **edit**: story ID + short summary of what changed + suggested git flow.
- **split**: parent ID → child IDs + count + `In sprint` values + suggested git flow.
- **retire**: story ID + retirement reason (echoed back) + note that no subagent ran + suggested git flow.

## Guardrails

- **Never commit**. The team reviews the change as a PR.
- **Never merge, push, or open a PR**. The user runs `git commit` and `gh pr create` after reviewing.
- **Never touch files outside `conclave/`** (specifically: `conclave/product/{backlog.md,stories-backlog/**}`, and the active sprint's `stories/` and `acceptance/` directories when applicable). Never touch `commands/`, `skills/`, `.claude-plugin/`, `docs/`, `.github/`.
- **Never dispatch multiple stories in one invocation**. This command handles one action per run. Batch multi-story dev/QA lives in `/conclave-dev` and `/conclave-qa` from v0.6.0.
- **`retire` never calls the subagent**. If a future change is tempted to add LLM prose to retirement, resist — retirement is a policy decision the human already made.
- **`split` output must be validated post-hoc for count and coverage** even though the PM subagent is responsible for enforcing the same rule during generation (defense in depth).
