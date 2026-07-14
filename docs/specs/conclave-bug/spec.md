# `/conclave-bug` — Post-Merge Bug Reporting Linked to the Full Conclave Loop

> **Status:** PENDING PROPOSAL/CHANGE — no OpenSpec change has been generated yet. Run `/openspec-propose` (or `/opsx:propose`) using this spec as input.

## 1. Objetivo *(Goal)*

Give teams a way to report a bug the moment it surfaces — typically **after** a PR has already merged and shipped a silent regression — without waiting for the next Sprint Planning cycle, and without inventing a second, parallel workflow next to the one Conclave already has for stories.

`/conclave-bug report` turns a raw signal (free text, or a URL/ID from whatever logging/error-tracking tool the session has an MCP connection to) into a structured `BUG-NNN` artifact with Gherkin repro steps and a `severity`, mirrors it as a GitHub issue, and hands it straight to the existing `/conclave-dev` → `/conclave-qa` → `/conclave-pr-review` loop — the same commands that already fix stories fix bugs, because a `BUG-NNN` ID is accepted everywhere a `US-NNN` ID is today. `/conclave-bug list` gives a quick view of the open bug backlog, since bugs accumulate outside any single sprint.

The design goal is **reuse, not duplication**: no new state machine, no new subagent, no new dev/QA/PR-review pipeline — `/conclave-bug` is the on-ramp; everything downstream is the pipeline Conclave has had since v0.1.0.

## 2. Alcance *(Scope)*

### Incluido en esta fase

- **New command `commands/conclave-bug.md`** with two sub-actions:
  - `report [free text | URL/ID]` — creates a new `BUG-NNN` artifact and a mirrored GitHub issue.
  - `list` — mechanical, no subagent call, reads `conclave/product/bugs/*.md` and prints a table.
- **New persistent directory `conclave/product/bugs/`** — bugs live here, not under any `sprints/SPRINT-NNN/`, because a bug is reported ad hoc and does not wait for Sprint Planning (locked decision, §10). Created lazily on first `/conclave-bug report`.
- **New template `skills/conclave/templates/bug.template.md`** — same Gherkin Given/When/Then repro format Conclave already uses for acceptance criteria, plus a new `severity: critical | high | medium | low` field, distinct from `priority` (MoSCoW). Frontmatter schema detailed in §6.
- **Bugs reuse the story state machine verbatim** (`backlog | ready | in-progress | review | verified | done | retired`) — a reported bug is written directly in `status: ready` (locked decision, §10), skipping `backlog` (nothing to groom) and never touching `/conclave-planning`.
- **Generic MCP-tool detection for `report`'s input** — if the argument looks like a URL/ID and the current session has *any* connected MCP tool whose name/description matches a logging or error-tracking pattern (generic detection, not a hardcoded vendor name — Conclave stays tool-agnostic, matching its existing no-vendor-lock-in posture), the command may use it to fetch stack trace/breadcrumbs/context. Otherwise (no matching tool, or the argument is plain text), `report` falls back to free text and interactive follow-up via `AskUserQuestion`.
- **GitHub issue mirroring via `gh issue create`** — GitHub-only in this phase (GitLab explicitly out of scope, §2 Fuera de scope). The issue is a mirror, never the source of truth, same relationship a PR already has to a story. The bug file's frontmatter gains `github_issue_number` and `github_issue_url` once the issue is created.
- **`/conclave-dev` and `/conclave-qa` extended to accept `BUG-NNN` IDs** alongside `US-NNN` IDs, in the same invocation, including mixed batches (`/conclave-dev US-001 BUG-004`). The ID prefix disambiguates which directory (`sprints/SPRINT-NNN/stories/` vs `product/bugs/`) each ID resolves against — no new CLI flag. Both commands' existing Step-0 upfront-validation → batches-of-≤3 → failure-isolation → summary-table machinery is reused, generalized to look up either kind of ID.
- **Developer charter gains a bug-specific first step**: when the ID being worked is a `BUG-NNN`, reproduce the failure using the bug file's Gherkin repro steps *before* touching any code — confirming the bug is real and still present is the first form of verification, not an afterthought. The PR body then includes `Fixes #<github_issue_number>` so merging auto-closes the mirrored GitHub issue.
- **QA subagent authors the bug file's content** (repro steps in Gherkin, and a severity recommendation the human confirms/overrides) from whatever `report` collected — QA is the charter whose whole mindset is "verify and reproduce," not Product Manager's (locked decision, §10).
- **Doc updates** per `CLAUDE.md`'s "Release notes and doc updates" rule: `SKILL.md`, `README.md`, `CHANGELOG.md`, `site/content/{en,es}/commands/bug.mdx` (new), `site/content/{en,es}/state-machine.mdx` (note that `BUG-NNN` reuses the same state machine, entering at `ready`).
- **Version bump**: `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` `0.9.0` → `0.10.0`.

### Fuera de scope

- **`edit BUG-NNN` / `retire BUG-NNN` / `split BUG-NNN` sub-actions.** This phase ships `report` and `list` only (explicit user decision — matches exactly what was asked for). If a bug is reported in error, the team hand-edits the frontmatter (git preserves the audit trail) — same precedent already established for un-retiring a story.
- **GitLab issue mirroring.** `gh` (GitHub CLI) only. Conclave already uses `gh` in every existing command; adding `glab` detection/dispatch logic without real demand duplicates a whole platform-detection surface for a first version. A future spec can add it if requested.
- **Sprint Planning awareness of bugs.** `/conclave-planning` gains zero new logic and never looks inside `conclave/product/bugs/`. A bug reported via `/conclave-bug report` is immediately `ready` and is picked up directly by `/conclave-dev`, not through a planning ceremony (explicit user decision — the entire point of this command is reacting fast to a silent regression, not adding latency).
- **A custom bug state machine.** Bugs reuse the exact story state enum, including `retired` as a terminal escape hatch (explicit user decision — zero new state-machine code in `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, or `/conclave-sprint`).
- **Duplicate-bug detection.** `/conclave-bug report` does not search existing `BUG-NNN` files for similar titles/stack traces before creating a new one. The team dedupes manually (and can `list` first to check). A future iteration could add fuzzy-matching against existing bug titles; not attempted here.
- **Any change to `/conclave-planning`, `/conclave-pr-review`'s core review logic, `/conclave-sprint`, `/conclave-board`'s UI, `/conclave-story`, or `/conclave-adr`.** `/conclave-pr-review` and `/conclave-sprint` are touched *only* to the minimal extent needed to also collect `BUG-NNN` IDs alongside `US-NNN` (see §6) — no behavioral change to what they do once they have an ID.
- **A rollback/cleanup flow if `gh issue create` fails after the bug file is already written.** Matches the existing "if `gh` is unavailable, print the prepared command" degradation pattern (§9 Errores) — the local `BUG-NNN` file is the durable, already-valid artifact regardless of GitHub's availability.
- **A `bug_triage` or `qa`-alternate model-resolution role key.** The bug-authoring subagent call resolves its model via the *existing* `models.overrides.qa` key (§10) — no new role key is introduced to `conclave/config.md`'s schema.
- **Board (`/conclave-board`) awareness of bugs.** The Kanban board's data-generation script (`conclave-board/scripts/generate-data.mjs`) is not extended to read `conclave/product/bugs/` in this phase — bugs that enter a sprint's `stories/` directory would already show up (see §11 for whether bugs *do* live under `sprints/` — they do not, per this spec — so bugs are simply invisible to the board for now). A future spec can extend the board's data source.

## 3. Tecnologias y convenciones del proyecto *(Technologies & conventions)*

### Stack

- **Plugin logic**: markdown only — commands, charters, templates. No runtime, no build step, no application code (unchanged from every prior Conclave capability except `/conclave-board`, which this spec does not touch).
- **MCP tool detection**: read-only introspection of whatever MCP tools/resources are available in the current Claude Code session (the same mechanism this plugin's own orchestrator prose already relies on when it says "if `gh` is available... otherwise..." — generalized here to "if a logging/error-tracking-shaped MCP tool is available..."). No new dependency; Conclave does not bundle or require any specific MCP server.
- **GitHub issues**: `gh issue create` / `gh issue view` — same CLI already used for `gh pr create`, `gh pr comment`, `gh pr review` everywhere else in this plugin.

### Versiones relevantes

| Dependency | Version | Source |
|---|---|---|
| Conclave plugin | 0.9.0 → **0.10.0** (this change) | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `conclave_version` (per-install artifact schema) | 0.5.0 → **0.10.0** | `skills/conclave/templates/config.template.md` |
| Story state enum (reused verbatim by bugs) | unchanged — `backlog \| ready \| in-progress \| review \| verified \| done \| retired` | `skills/conclave/templates/story.template.md`, introduced v0.8.0 |
| Model resolution (`models.overrides.qa`) | reused verbatim, v0.7.0 pattern | `skills/conclave/templates/config.template.md` |
| `/conclave-dev`, `/conclave-qa` multi-ID batching (v0.6.0) | extended to accept `BUG-NNN` alongside `US-NNN` | `commands/conclave-dev.md`, `commands/conclave-qa.md` |

### Patrones existentes a respetar

- **Sub-action dispatch on the first positional argument** — same shape as `/conclave-story <new|edit|split|retire>`, here `/conclave-bug <report|list>`.
- **One sub-action is purely mechanical, no subagent call** — `list` follows the exact precedent `/conclave-story retire` established in v0.8.0: reading/printing existing data is a policy-free operation, no LLM needed.
- **Reference, don't duplicate** — the GitHub issue references the bug file's path; the bug file does not duplicate the issue body verbatim, it is the source the issue body is *rendered from* (`SKILL.md` §2 invariant).
- **Frontmatter-only structured data** — `severity`, `github_issue_number`, `github_issue_url`, `related_story` are all YAML frontmatter fields, never body prose (`SKILL.md` §2 invariant).
- **Model resolution matches v0.7.0** — `RESOLVE_MODEL('qa')`: `models.overrides.qa` → `models.default` → session. Invalid model ID → one warning, fallback. Absent `models:` block → silent no-op.
- **Never commit, never merge** — same as every existing command; the user runs `git add`/`git commit`/`gh pr create` after reviewing.
- **Snapshot context on artifact-generating runs** — `/conclave-bug report` writes a timestamped snapshot to `conclave/context/` (`SKILL.md` §2 invariant, unbroken since v0.1.0).
- **Multi-ID batching, upfront validation, failure isolation** — `/conclave-dev`/`/conclave-qa`'s existing Step 0 pattern (v0.6.0) is generalized, not rewritten from scratch.

## 4. Dependencias previas *(Prerequisites)*

- [ ] `skills/conclave/templates/story.template.md` at its v0.8.0+ schema (status enum includes `retired`) — bugs reuse this enum verbatim.
- [ ] `commands/conclave-dev.md`, `commands/conclave-qa.md` at their v0.9.0 shipped form (multi-ID Step 0 batching, model resolution, autonomous-mode support in `/conclave-dev`) — this spec generalizes their ID-parsing, not their execution logic.
- [ ] `skills/conclave/agents/qa.md` exists and already has a "How you operate inside `/conclave-qa`" section (v0.1.0+) to extend with a bug-authoring contract.
- [ ] `skills/conclave/agents/developer.md` exists (v0.1.0+) to extend with the reproduce-before-fixing step.
- [ ] `conclave/config.md` per-install schema is at least v0.7.0 (contains `models:` block).
- [ ] `docs/specs/pm-story-tl-adr-authoring/spec.md` — the direct architectural precedent this spec mirrors (mechanical sub-action, new persistent non-sprint directory, GitHub-only scope, model resolution reuse).
- [ ] `site/content/{en,es}/state-machine.mdx`, `site/content/{en,es}/commands/_meta.js` exist (present since v0.4.0 EN/ES site split).

## 5. Arquitectura *(Architecture)*

### Patron

Prose-orchestrated subagents (unchanged). One addition and two generalizations:

- **`/conclave-bug`** (new) — one command file dispatching on the first positional argument (`report | list`). `report` delegates to the QA subagent once (charter identical to `/conclave-qa`'s, different task prompt: author a bug file, not verify a story). `list` is fully mechanical — no `Agent` call.
- **`/conclave-dev` and `/conclave-qa`** (generalized, not rewritten) — their existing Step 0 multi-ID logic changes from "parse all `US-NNN` arguments" to "parse all `US-NNN` and `BUG-NNN` arguments," and their per-ID resolution step (today "locate `sprints/$SPRINT/stories/US-NNN-*.md`") branches on the ID prefix to also check `conclave/product/bugs/BUG-NNN-*.md`. Everything downstream of ID resolution (branch naming, charter routing by `discipline`, verification, batching, summary tables) is untouched, **except PR-body link rendering** — a `BUG-NNN`'s story-shaped frontmatter (same `discipline`, `status`, `assignee` fields) means the existing logic already knows what to do with it once it's found, but `pr-body.template.md`'s two hardcoded sprint-relative links and the new `Fixes #<n>` line do need per-prefix handling (see §6's `pr-body.template.md` entry).

### Capas afectadas

| Layer | Affected? | Description |
|---|---|---|
| Commands (`commands/conclave-bug.md`) | Yes (NEW) | One new file, two sub-actions. |
| Commands (`commands/conclave-dev.md`) | Yes (MODIFIED) | Step 0 ID-parsing generalized to `US-NNN \| BUG-NNN`; Step 2/Step 2-equivalent resolution branches by prefix; Step 6 gains the reproduce-first sub-step when the ID is a bug; Step 7's PR body includes `Fixes #<issue>` for bugs. |
| Commands (`commands/conclave-qa.md`) | Yes (MODIFIED) | Step 0 ID-parsing generalized identically; Step 2 resolution branches by prefix. No other QA logic changes — a bug's Gherkin scenarios are verified exactly like a story's. |
| Commands (`commands/conclave-pr-review.md`) | Yes (MODIFIED, minimal) | Step 2 (resolve the story) generalized to also resolve a `BUG-NNN`. No change to the review logic itself. |
| Commands (`commands/conclave-sprint.md`) | Yes (MODIFIED, minimal) | Phase 3/Phase 4 story-collection queries are documented as **not** collecting bugs automatically (bugs bypass sprint orchestration by design, §2) — a one-line clarification, not a behavior change. |
| Agent charters (`skills/conclave/agents/qa.md`) | Yes (MODIFIED) | New "How you operate inside `/conclave-bug report`" section: turn raw input into Gherkin repro steps + a severity recommendation. |
| Agent charters (`skills/conclave/agents/developer.md`) | Yes (MODIFIED) | New hard rule: when handed a `BUG-NNN`, reproduce via its repro steps before writing any fix code; PR body includes `Fixes #<issue>`. |
| Templates (`skills/conclave/templates/bug.template.md`) | Yes (NEW) | Bug file format. |
| Templates (`skills/conclave/templates/pr-body.template.md`) | Yes (MODIFIED) | The two hardcoded sprint-relative links become orchestrator-resolved per ID prefix (bug PRs link into `conclave/product/bugs/` instead, no acceptance-file link); new optional `Fixes #<n>` line. |
| `conclave/product/bugs/` (per-install) | Yes (NEW) | Created lazily on first `report`. Flat directory of `BUG-NNN-<slug>.md` files — no index file (mirrors the QA-UAT feature's `tests/uat/` precedent: `list` globs directly, nothing to keep in sync). |
| `skills/conclave/SKILL.md` | Yes | §2 directory layout, §3 role-to-subagent table, §5 templates list, §6 state-machine note. |
| `README.md`, `CHANGELOG.md` | Yes | Quick start + entry. |
| `.claude-plugin/plugin.json`, `marketplace.json` | Yes | Version bump. |
| `site/content/{en,es}/commands/` | Yes | 1 new pair of MDX pages (`bug.mdx`). |
| `site/content/{en,es}/state-machine.mdx` | Yes | Note that `BUG-NNN` reuses the state machine, entering at `ready`. |
| `/conclave-planning`, `/conclave-story`, `/conclave-adr`, `/conclave-board`, `/conclave-init`, `/conclave-spec` | No | Unchanged — see Fuera de scope. |

### `/conclave-bug <report|list>` flow

```
/conclave-bug report "checkout button throws 500 on mobile Safari"
/conclave-bug report https://<logging-tool-url>/issues/8f2a1c
/conclave-bug list
```

**Common preamble (both sub-actions):**
1. **Workspace resolve** — `git rev-parse --show-toplevel`; require `conclave/config.md`; require clean working tree (same refusal text as `/conclave-story`/`/conclave-dev`).
2. **Parse sub-action** — first positional arg is `report` or `list`. Missing/unknown → refuse: `Usage: /conclave-bug <report [text|url] | list>`.
3. **Load config** (report only) — `models.overrides.qa` → `models.default` → session. Print `Models: qa=<id>` (omit if null).

#### 5.1 `report [free text | URL/ID]`

1. **Classify the argument.** If it matches a URL pattern (`https?://...`) or looks like a bare tracker ID the user is likely pasting from a tool, set `LOOKS_LIKE_REFERENCE = true`; otherwise treat the whole argument as free-text description.
2. **Attempt MCP enrichment, only if `LOOKS_LIKE_REFERENCE`.** Check whether the current session has any connected MCP tool whose name or description matches logging/error-tracking terms (generic keyword match — e.g. "sentry", "error tracking", "logging", "issue", "crash report" in the tool's own advertised description; never a hardcoded product name check). If one or more match, attempt to fetch the referenced item's details (stack trace, breadcrumbs, affected environment, first/last seen). If the fetch succeeds, fold the result into `ENRICHED_CONTEXT`. If no matching tool is connected, or the fetch fails/errors, fall back silently to treating the original argument as plain text — never block the command on a failed integration.
3. **Ask the user (`AskUserQuestion`)** — batched, some pre-filled from `ENRICHED_CONTEXT` when available:
   - **Title** (free text; pre-filled from the tracker's issue title when `ENRICHED_CONTEXT` has one).
   - **Severity** — `critical | high | medium | low`, **no default** (must be explicit — this is the one field this command exists to capture accurately).
   - **Discipline** — `frontend | backend | mobile | qa | design | devops | multi` (default `multi`, same as `/conclave-story new`).
   - **Related story or PR, if known** (free text, optional — e.g. `US-042` or a PR URL; skippable).
4. **Delegate to the QA subagent** (§5.3 contract): produce Gherkin repro steps (Given/When/Then) from the title + `ENRICHED_CONTEXT` (if any) + any additional free text the user gave, and confirm or revise the severity the user picked (QA may flag *"you said high, but the stack trace shows a full outage — recommend critical"* as a note; the user's explicit answer from Step 3 is what gets written unless the user then changes it — QA's severity read is advisory, not authoritative, since severity is fundamentally a human/business call the user already made explicitly in Step 3).
5. **Compute `NEW_ID`.** Glob `conclave/product/bugs/BUG-*.md`. `NEW_ID = max(existing) + 1`, zero-padded to 3 digits — a separate monotonic sequence from `US-NNN` (the two ID spaces never collide by construction: different prefix, independent counters).
6. **Write `conclave/product/bugs/BUG-NEW_ID-<slug>.md`** from `bug.template.md` (§6), with `status: ready`, `severity` from Step 3, `discipline` from Step 3, `related_story` from Step 3 (or omitted), `assignee: ""`, `created_at`.
7. **Create the mirrored GitHub issue**, if `gh` is available: `gh issue create --title "BUG-NEW_ID: <title>" --body <rendered from the bug file's Gherkin + severity + a footer link back to the file path> --label bug` (also attempt `--label severity:<severity>` best-effort — non-fatal if the label doesn't exist in the target repo). Record the returned issue number/URL back into the bug file's frontmatter (`github_issue_number`, `github_issue_url`) with a second write. If `gh` is unavailable, skip issue creation, leave those two fields empty, and note in the report (Step 8) that the user should create the issue manually and fill them in by hand.
8. **Report**: bug ID, path, severity, discipline, GitHub issue URL (or the prepared `gh issue create` command if `gh` was unavailable), and the next step: `/conclave-dev BUG-NEW_ID` to fix it. Suggested git flow:
   ```bash
   git add conclave/
   git commit -m "conclave: report BUG-NEW_ID"
   gh pr create --title "New bug: BUG-NEW_ID" --body "Bug report."
   ```

#### 5.2 `list` (mechanical — no subagent call)

1. Glob `conclave/product/bugs/BUG-*.md`. If none exist, print `No bugs reported yet.` and stop.
2. For each, read frontmatter: `id`, `title`, `severity`, `status`, `related_story` (or `—`), `github_issue_url` (or `—`), `assignee` (or `—`).
3. Print a table sorted by `severity` (`critical` → `high` → `medium` → `low`), then by ID within the same severity:
   ```
   | Bug     | Title                          | Severity | Status      | Related    | Issue                         | Assignee |
   |---------|---------------------------------|----------|--------------|------------|--------------------------------|----------|
   | BUG-004 | Checkout 500 on mobile Safari  | critical | in-progress  | US-042     | https://github.com/…/issues/81 | Cy       |
   | BUG-002 | Stale cache on logout           | medium   | ready        | —          | https://github.com/…/issues/79 | —        |
   ```
4. No file writes, no git operations. Note in the output that no subagent was invoked (same courtesy note `/conclave-story retire` already prints) — this is by design, listing is a policy-free read.

### 5.3 QA subagent contract (for `/conclave-bug report`)

The QA charter gains a "How you operate inside `/conclave-bug report`" section:

- **Input**: title, any free-text description, `ENRICHED_CONTEXT` (if an MCP tool supplied it), the user's explicit severity pick, the discipline pick.
- **Output**: 1–3 Gherkin Given/When/Then repro scenarios, and an advisory severity note (may agree or suggest reconsidering — never overrides the user's explicit choice).
- **Hard rules**: never invent a stack trace or environment detail not present in the input or `ENRICHED_CONTEXT` — if reproduction steps are underspecified, write a scenario using the information given and flag what's still needed in a `## Needs more info` body section rather than guessing; never assign `discipline` or `severity` itself (both come from the human in Step 5.1.3); never write a GitHub issue directly — that is the orchestrator's job (same "orchestrator writes, subagent proposes" separation every other Conclave charter follows).

### `/conclave-dev` / `/conclave-qa` generalization

`/conclave-qa`'s Step 0 changes from:

> Parse all `US-NNN` arguments from the command invocation.

to:

> Parse all `US-NNN` and `BUG-NNN` arguments from the command invocation (order-preserving, IDs of either kind may be mixed in one invocation).

`/conclave-dev`'s Step 0 changes identically, applied to its existing arg list **after** its current CLI-flag-stripping sub-step (`--no-interaction`/`--headless` are parsed and removed first, unchanged — this spec does not touch flag handling, only what happens to the remaining positional args once flags are stripped).

Both commands' per-ID resolution step changes from a single lookup path to:

> If the ID starts with `US-`, locate it under the active sprint's `stories/`. If the ID starts with `BUG-`, locate it under `conclave/product/bugs/`. Any other prefix is invalid — refuse that ID with `Unrecognized ID prefix: <id>. Expected US-NNN or BUG-NNN.`

A bug's frontmatter has the same `discipline`, `status`, `assignee` fields a story has, so charter routing (`/conclave-dev` Step 6), branch naming (`feat/BUG-NNN-<slug>`, matching the existing `feat/US-NNN-<slug>` convention — note `config.md`'s branch-naming convention already documents `fix/<short-slug>` for bugs as a *suggestion*, superseded here by the same `feat/`-prefixed convention for consistency with the shared batching machinery, since the branch prefix is not what the orchestrator's regex/logic depends on), and the summary table all work unmodified.

**PR body rendering does need one real change**, not just ID resolution — `pr-body.template.md` (unlike every other file touched by this spec) has no conditional syntax and hardcodes sprint-relative links (`../conclave/sprints/{{sprint_id}}/stories/{{story_id}}-{{slug}}.md` and the `acceptance/AC-{{story_id}}.md` link), which are meaningless for a `BUG-NNN` living under `conclave/product/bugs/` with no separate acceptance file. See §6's `pr-body.template.md` entry for the exact fix — this is called out explicitly rather than folded into "everything downstream is unmodified," because it isn't.

## 6. Archivos a crear o modificar *(Files to create / modify)*

| Ruta | Accion | Proposito | Ejemplo del proyecto a seguir |
|---|---|---|---|
| `commands/conclave-bug.md` | NUEVO | `report`/`list` sub-action dispatcher | `commands/conclave-story.md` (sub-action dispatch, mechanical-sub-action precedent) |
| `commands/conclave-dev.md` | MODIFICAR | Step 0 ID-parsing + resolution generalized to `US-NNN \| BUG-NNN`; Step 6 reproduce-first sub-step; Step 7 `Fixes #<issue>` in PR body | Existing Step 0/Step 2/Step 6/Step 7 (self-referential — surgical edit, not rewrite) |
| `commands/conclave-qa.md` | MODIFICAR | Step 0 ID-parsing + resolution generalized identically | Existing Step 0/Step 2 |
| `commands/conclave-pr-review.md` | MODIFICAR | Step 2 (resolve story) generalized to also resolve `BUG-NNN` | Existing Step 2 |
| `commands/conclave-sprint.md` | MODIFICAR (minimal) | One-line clarification: bugs are not auto-collected by any phase | Existing Phase 2/3/4 story-collection prose |
| `skills/conclave/agents/qa.md` | MODIFICAR | New "How you operate inside `/conclave-bug report`" section | Existing "How you operate inside `/conclave-qa`" section |
| `skills/conclave/agents/developer.md` | MODIFICAR | New hard rule: reproduce-before-fix for `BUG-NNN`, `Fixes #<issue>` in PR body | Existing hard-rules section |
| `skills/conclave/templates/bug.template.md` | NUEVO | Bug file format | `skills/conclave/templates/story.template.md` (frontmatter shape, status-transitions prose block) |
| `skills/conclave/templates/pr-body.template.md` | MODIFICAR | Orchestrator-resolved links per ID prefix; new optional `Fixes #<n>` line | Existing flat placeholder structure (no conditional syntax today — see Detalle) |
| `skills/conclave/SKILL.md` | MODIFICAR | §2 directory layout (`product/bugs/`), §3 role-to-subagent row, §5 templates list, §6 state-machine note | Existing corresponding sections |
| `README.md` | MODIFICAR | Quick start gains `/conclave-bug report` / `/conclave-bug list` examples | Existing Quick start section |
| `CHANGELOG.md` | MODIFICAR | `[Unreleased]` / v0.10.0 entry | `[0.8.0]` entry format (`pm-story-tl-adr-authoring`) |
| `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | MODIFICAR | Version bump `0.9.0` → `0.10.0` | Prior bumps |
| `site/content/en/commands/bug.mdx`, `site/content/es/commands/bug.mdx` | NUEVO | Command reference, both locales | `site/content/{en,es}/commands/story.mdx` |
| `site/content/en/commands/_meta.js`, `site/content/es/commands/_meta.js` | MODIFICAR | Add `bug` nav entry | Existing entries (already has `board`) |
| `site/content/en/state-machine.mdx`, `site/content/es/state-machine.mdx` | MODIFICAR | Note that `BUG-NNN` reuses the state machine, entering at `ready` | Existing `retired`-state addition from v0.8.0 |

### Detalle por archivo

#### `commands/conclave-bug.md` (NEW)

Standard command structure (frontmatter `description`, `allowed-tools`). `allowed-tools` at minimum: `Bash(git rev-parse:*), Bash(git status:*), Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(find:*), Bash(gh issue create:*), Bash(gh issue view:*), Read, Write, Edit, Agent, AskUserQuestion`. Steps as in §5.1/§5.2.

**No mezclar**: does not touch `/conclave-story`'s backlog-authoring logic (a bug is not a story-backlog item — it lives in its own directory) or `/conclave-planning`.

#### `commands/conclave-dev.md` / `commands/conclave-qa.md` (MODIFY, surgical)

Step 0 (ID parsing) and the per-ID resolution step change exactly as described in §5's "generalization" subsection. Step 7 (PR-body rendering) changes as described in §6's `pr-body.template.md` entry — the orchestrator resolves different link targets and an optional `Fixes #<n>` line depending on the ID prefix, before handing the template's placeholders to the Developer subagent. Every other step (branch creation, charter delegation, push, autonomous mode, UAT generation, CI wait, model resolution) is untouched — a `BUG-NNN`'s resolved file has the same frontmatter shape a story has, so the existing logic downstream of "found the file, read its `discipline`/`status`" needs no bug-specific branch.

`/conclave-dev`'s Step 6 (delegate to execution subagent) gains one conditional line in the Developer charter's task prompt: *"If this ID is a BUG-NNN, first reproduce the failure using its Gherkin repro steps before writing any fix — treat a failure to reproduce as grounds to pause and ask (interactive mode) or `AUTONOMOUS_ABORT: could not reproduce BUG-NNN's repro steps` (autonomous mode)."*

**No mezclar**: no change to autonomous-mode's sensible-defaults catalog, no change to UAT generation, no change to the summary-table format beyond it now being able to show either ID shape in the same table.

#### `commands/conclave-pr-review.md` (MODIFY, minimal)

Step 2 ("resolve the story") is renamed in intent (not necessarily in heading text) to resolve either a story or a bug by prefix, identical branching logic to `/conclave-dev`/`/conclave-qa`. No change to the Tech Lead's review criteria — code quality and DoD compliance apply the same way to a bug fix as to a feature.

#### `commands/conclave-sprint.md` (MODIFY, minimal)

Add one clarifying sentence near the Phase 2/3/4 story-collection description: *"Bugs (`BUG-NNN`) are never auto-collected by any `/conclave-sprint` phase — they bypass sprint orchestration by design (see `/conclave-bug`). Fix a bug directly via `/conclave-dev BUG-NNN`."* No behavioral change.

#### `skills/conclave/agents/qa.md` (MODIFY)

New top-level section `## How you operate inside /conclave-bug report`, structured per §5.3's contract (input, output, hard rules). Placed after the existing `## How you operate inside /conclave-qa` section.

**No mezclar**: does not touch the existing verification-report/UAT-generation sections — this new section only covers the `report` authoring flow, not QA's role when a bug later reaches `/conclave-qa` for verification (that path is already covered by QA's existing "How you operate inside `/conclave-qa`" section, since a `BUG-NNN` is just another ID it verifies the same way).

#### `skills/conclave/agents/developer.md` (MODIFY)

New hard rule added to the existing hard-rules list: *"When implementing a `BUG-NNN`, reproduce the failure using its Gherkin repro steps before writing any fix. If reproduction fails, treat this as a blocking finding — do not silently 'fix what looks wrong'; surface it (interactively ask, or `AUTONOMOUS_ABORT` in autonomous mode)."* Plus one line in the PR-body-rendering guidance: include `Fixes #<github_issue_number>` when the story ID is a bug and that field is populated.

**No mezclar**: no change to how Developer handles `US-NNN` stories.

#### `skills/conclave/templates/bug.template.md` (NEW)

```markdown
---
id: "BUG-{{id}}"
title: "{{title}}"
severity: "{{severity}}"        # critical | high | medium | low — distinct from priority; measures incident impact
status: ready                    # backlog | ready | in-progress | review | verified | done | retired — reuses the story state machine verbatim, always starts at ready
discipline: "{{discipline}}"    # frontend | backend | qa | design | devops | mobile | multi
assignee: ""
related_story: "{{related_story_or_empty}}"    # optional — US-NNN this bug relates to, if known
github_issue_number: {{issue_number_or_null}}
github_issue_url: "{{issue_url_or_empty}}"
created_at: "{{iso_date}}"
reported_via: "{{manual|mcp:<tool-name>}}"     # how the report originated — audit trail only
# Optional retirement fields, same shape as story.template.md, set only via hand-edit (no /conclave-bug retire in this phase)
# retirement_reason: ""
# retired_at: ""
---

# BUG-{{id}}: {{title}}

## Reported

{{original_report_text_or_summary}}

## Reproduction

```gherkin
Given {{precondition}}
When {{action}}
Then {{unexpected_result}}
```

## Needs more info

{{gaps_the_qa_subagent_flagged_or_omit_section}}

## Status transitions

Reuses the story state machine exactly (see `story.template.md`) — this file starts at `ready` (bugs skip `backlog`/Sprint Planning by design) and follows the same `ready → in-progress → review → [verified] → done` path via `/conclave-dev` and `/conclave-qa`, with `retired` available as a manual escape hatch (hand-edit only in this phase).
```

**No mezclar**: does not duplicate the acceptance-file split stories/ADRs use (`acceptance/AC-US-NNN.md`) — a bug's repro steps live inline in the same file, since there is no separate "story vs acceptance criteria" distinction meaningful for an incident report.

#### `skills/conclave/templates/pr-body.template.md` (MODIFY)

Current content is entirely flat `{{placeholder}}` substitution with no conditional syntax, and it hardcodes two sprint-relative links that only make sense for a story:

```markdown
Implements [{{story_id}}](../conclave/sprints/{{sprint_id}}/stories/{{story_id}}-{{slug}}.md) from sprint [{{sprint_id}}](../conclave/sprints/{{sprint_id}}/spec.md).
...
Every Gherkin scenario in [`AC-{{story_id}}.md`](../conclave/sprints/{{sprint_id}}/acceptance/AC-{{story_id}}.md) must be covered.
```

Both links are resolved by the **orchestrator** (`/conclave-dev`'s existing rendering step), not the template itself, and the fix is purely in how the orchestrator fills the placeholders — no new template syntax is introduced:

- When the ID is `US-NNN`: fill `{{story_id}}`/`{{sprint_id}}`/`{{slug}}` exactly as today — unchanged.
- When the ID is `BUG-NNN`: the first line's target becomes `[{{story_id}}](../conclave/product/bugs/{{story_id}}-{{slug}}.md)` and drops the "from sprint ..." clause entirely (a bug has no sprint); the "Scenario → test mapping" section's intro sentence changes from *"Every Gherkin scenario in `AC-{{story_id}}.md`..."* to *"Every Gherkin scenario in [`{{story_id}}-{{slug}}.md`](../conclave/product/bugs/{{story_id}}-{{slug}}.md)..."* (the bug file itself, since bugs have no separate acceptance file — §6 `bug.template.md`).
- New line, appended directly under the title heading, present only for bugs with a resolved `github_issue_number`: `Fixes #{{github_issue_number}}`. Omitted entirely (not even a blank placeholder) for stories, and for bugs where the GitHub issue was never created (`gh` unavailable at report time, §9 Errores).

The Developer subagent's existing task (fill this template and return `pr_body`) does not change — the *orchestrator* passes the already-correct link targets and the `Fixes #` line (or its absence) into the subagent's inputs, same "orchestrator resolves paths, subagent fills the template" division of labor `/conclave-dev` already uses for `{{sprint_id}}` today.

**No mezclar**: no change to the DoD self-check checklist or the "Architectural deviations" / "Notes for QA" sections — those apply to a bug fix exactly as written.

#### `skills/conclave/SKILL.md` (MODIFY)

- §2 directory layout gains one line under `product/`:
  ```
  ├── product/
  │   ├── backlog.md
  │   ├── bugs/                     # BUG-NNN-<slug>.md — flat, no index file, /conclave-bug list globs directly
  ```
- §3 role-to-subagent table gains one row: `agents/qa.md` (again) | `/conclave-bug report` — one Agent call per invocation; `list` is mechanical and skips the agent.
- §5 templates list gains `bug.template.md`.
- §6 state-machine section gains a paragraph: *"`BUG-NNN` artifacts (v0.10.0+) reuse this exact state machine. A reported bug is written directly in `status: ready` — bugs never pass through `backlog` or Sprint Planning; `/conclave-bug report` is the only way one is created, and it always starts dev-ready."*

**No mezclar**: no change to the `retired`-state paragraph from v0.8.0, no change to profile-skippable ceremonies.

## 7. API Contract

Sin API surface — no aplica. No HTTP layer of this plugin's own. `gh issue create` and any MCP-tool fetch are the only "external" calls, and both are pre-existing CLI/tool-integration surfaces, not a contract this spec defines.

## 8. Criterios de exito *(Success criteria)*

- [ ] `/conclave-bug report "checkout button throws 500"` in a repo with an initialized `conclave/`: asks for severity (no default), discipline (default `multi`), related story (optional); on completion, `conclave/product/bugs/BUG-NNN-<slug>.md` exists with `status: ready`, `severity` set exactly as chosen, 1+ Gherkin repro scenarios, and (if `gh` is available) a real GitHub issue with `github_issue_number`/`github_issue_url` populated.
- [ ] `/conclave-bug report` with a URL argument, when a logging/error-tracking-shaped MCP tool is connected: the tool is used to enrich the report (title pre-filled, stack trace context available to the QA subagent) without hardcoding any specific vendor's name in the command's own logic.
- [ ] `/conclave-bug report` with a URL argument, when no matching MCP tool is connected: falls back cleanly to treating the argument as plain text — no error, no crash.
- [ ] `/conclave-bug list` with zero bugs reported: prints `No bugs reported yet.` and makes no file/git changes.
- [ ] `/conclave-bug list` with 3+ bugs of mixed severity: table is sorted critical → high → medium → low, correct columns, no subagent invoked (verifiable — no `Models:` line printed).
- [ ] `/conclave-dev BUG-004`: resolves against `conclave/product/bugs/`, not `sprints/*/stories/`; Developer charter reproduces the bug via its Gherkin steps before writing a fix; final PR body contains `Fixes #<github_issue_number>`.
- [ ] `/conclave-dev US-001 BUG-004`: mixed batch — both IDs validated upfront, both run concurrently (batch of ≤ 3 unaffected by the mix), independent branches/PRs, one combined summary table showing both.
- [ ] `/conclave-qa BUG-004` once its PR is open: verifies its Gherkin repro scenarios exactly like a story's acceptance criteria, same UAT/CI logic if `testing-environments.md` is configured, same verdict semantics (`passed`/`blocked`/`pending_uat`).
- [ ] `/conclave-pr-review BUG-004` when `peer_pr_review.required: true`: resolves and reviews the bug fix exactly like a story's PR.
- [ ] Merging the bug-fix PR (a manual human action, per existing "never merge" guardrail) auto-closes the mirrored GitHub issue via the `Fixes #<n>` reference GitHub itself honors.
- [ ] `/conclave-planning` run in a repo with open `BUG-NNN` files: does not list them as assignable, does not error, behaves identically to a repo with zero bugs.
- [ ] `/conclave-sprint` run in the same repo: Phase 2/3/4 do not pick up any `BUG-NNN` automatically.
- [ ] `conclave/config.md` with `models.overrides.qa: claude-opus-4-6`: `/conclave-bug report` prints `Models: qa=claude-opus-4-6` and dispatches with that model.
- [ ] Working tree dirty: `/conclave-bug` refuses with the same error text existing commands use.
- [ ] `CHANGELOG.md`, `README.md`, `SKILL.md`, `site/content/{en,es}/commands/bug.mdx`, `site/content/{en,es}/state-machine.mdx`, both plugin manifest files updated per §6.

### Tests requeridos

No automated test suite exists for this plugin (`CLAUDE.md` §"Development commands"). All scenarios above are verified manually per the verification commands.

### Comandos de verificacion

```bash
ln -s "$(pwd)" ~/.claude/plugins/conclave   # restart Claude Code after this

# In a scratch target repo with a v0.9.0 conclave/ setup and an active sprint:
/conclave-bug report "checkout button throws 500 on mobile Safari"   # severity: critical
/conclave-bug list                                                    # confirm it shows up, sorted first
/conclave-dev BUG-001                                                 # reproduce -> fix -> PR with Fixes #<n>
/conclave-qa BUG-001                                                  # verify exactly like a story
/conclave-pr-review BUG-001                                           # (if peer_pr_review.required: true)

# Mixed batch:
/conclave-dev US-001 BUG-002

# No-gh / no-MCP degradation:
# (temporarily rename/hide `gh` from PATH, or run in a session with no logging MCP connected)
/conclave-bug report "some vague description"   # must still complete, no crash, gh command printed instead

# Confirm bugs never surface in sprint/planning collection:
/conclave-planning     # (draft sprint exists) — no BUG-NNN in assignments
/conclave-sprint       # Phase 2/3/4 skip BUG-NNN entirely
```

## 9. Criterios de UX *(UX criteria)*

### Loading

`report` prints the model-summary line (or nothing if `models:` is absent) before dispatching the QA subagent — same convention as every model-resolving command since v0.7.0. Before the MCP-enrichment attempt (if any), print one line: `Checking for a connected logging/error-tracking tool...` — omitted entirely when the argument doesn't look like a URL/ID (no wasted narration for plain-text reports).

### Formularios

Every user decision uses `AskUserQuestion` — title, severity (no default, must be explicit), discipline (default `multi`), related story/PR (optional, skippable). No bare CLI prompts.

### Passwords

No aplica — no credentials involved; `gh` auth and any MCP tool's auth are session-level concerns outside this command's scope.

### Errores

- Missing/unknown sub-action: `"Usage: /conclave-bug <report [text|url] | list>"`.
- Dirty working tree: `"Working tree is dirty. Stash or commit your local changes, then re-run."` (identical to every existing command's message).
- MCP fetch attempted but fails (tool errors, times out, or returns nothing usable): falls back to plain-text treatment of the original argument — no error surfaced to the user beyond a one-line note, `Could not enrich from the connected tool — continuing with the text you provided.`
- `gh` unavailable at issue-creation time: bug file is still written and complete; report step notes *"GitHub CLI not available — issue not created. Run the following once `gh` is set up: `gh issue create --title ... --body ...`"* and leaves `github_issue_number`/`github_issue_url` empty (not `null`-typed differently than "never attempted" — a future manual `gh issue create` plus a hand-edit of the frontmatter is the recovery path).
- `/conclave-dev`/`/conclave-qa` given an ID with an unrecognized prefix: `"Unrecognized ID prefix: <id>. Expected US-NNN or BUG-NNN."` — that one ID fails upfront validation like any other invalid ID in the existing batch table.

### Navegacion

No aplica — CLI only.

### Accesibilidad

No aplica — text-only CLI interaction, same as every existing Conclave command.

## 10. Decisiones tomadas *(Decisions made — locked)*

| Decision | Why |
|---|---|
| Bugs reuse the **story state machine verbatim**, entering at `status: ready` | Explicit user decision (recommended option chosen) — zero new state-machine code anywhere in `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, `/conclave-sprint`; a bug is just another `discipline`-routed, gate-checked unit of work once it exists. |
| Bugs **skip Sprint Planning and `/conclave-planning` entirely** — no bug-awareness added to that command | Explicit user decision — the purpose of `/conclave-bug` is reacting fast to a silent post-merge regression; waiting for the next planning cycle would defeat that purpose. |
| The **QA subagent**, not Product Manager, authors the bug's repro steps and severity recommendation | Explicit user decision (recommended option chosen) — reproducing and describing failure conditions is QA's mindset (adversarial, verify-first), not PM's (scope/priority of feature work). |
| Scope is **`report` + `list` only** this phase — no `edit`/`retire`/`split` for bugs | Explicit user decision — matches exactly what was requested; a mis-filed bug is hand-corrected via frontmatter edit, same recovery path already established for un-retiring a story. |
| `severity` is a **new field, distinct from `priority`** (MoSCoW) | Explicit user decision from the original design conversation — severity measures incident impact, priority measures feature work order; conflating them would force incident vocabulary onto a MoSCoW scale that doesn't fit "critical bug in production." |
| **GitHub-only** (`gh`) issue mirroring — GitLab explicitly out of scope | Explicit user decision — Conclave already uses `gh` in every existing command; no `glab` support without demonstrated demand. |
| **Generic MCP-tool detection**, never a hardcoded vendor name (e.g. "Sentry") | Explicit user decision, consistent with Conclave's existing no-vendor-lock-in posture ("no proprietary format, no hidden state" — README.md's own framing). |
| **No new model-resolution role key** — bug authoring resolves via the existing `models.overrides.qa` | The bug-authoring subagent *is* the QA charter (same file, extended with a new operating-mode section) — introducing a separate `bug_triage` key would fragment model config for no behavioral benefit. |
| **`conclave/product/bugs/` has no index file** — `/conclave-bug list` globs the directory directly | Mirrors the `tests/uat/` precedent from the QA-UAT-generation feature (v0.3.0): a directory of individually-readable files with a mechanical, read-only listing command is simpler than keeping a manifest file in sync. |
| Bug branches use the **same `feat/<ID>-<slug>` naming** as stories, not a `fix/`-prefixed branch | Keeps `/conclave-dev`'s branch-handling logic (existing-branch detection, resume/recreate decisions) completely prefix-agnostic — introducing a second branch-prefix convention would require every branch-parsing regex in `/conclave-dev` to handle two shapes for no functional gain. `config.md`'s existing `fix/<short-slug>` convention note remains as free-form guidance for *manual* branches a human creates outside Conclave's own commands, not a constraint on this command's generated branches. |

## 11. Edge cases

### Datos invalidos

- `severity` answered with something outside the four valid values (should be prevented by `AskUserQuestion`'s enum choices, but defensively): reject and re-ask — never write a bug file with an invalid severity.
- `related_story` given a value that doesn't match any existing `US-NNN` file: stored as-is (free text, best-effort cross-reference) — not validated against the sprint's story list. A dangling reference is a minor annotation error, not worth blocking the report over.

### API errors

No aplica in the traditional sense (no HTTP API of this plugin's own) — `gh issue create` failures are handled per §9 Errores (graceful degradation, bug file still valid). An MCP tool fetch failure is handled per §9 Errores (silent fallback to plain text).

### Sin conexion

`gh` and any MCP tool are both optional at report time (§9). The bug file itself requires no network access to write — fully offline-capable except for the two optional enrichment/mirroring steps.

### Timeout

An MCP-tool fetch attempt should not hang the command indefinitely — apply the same reasonable-timeout expectation Conclave's other optional-integration steps already assume (e.g. the QA-UAT feature's CI-wait timeout is the only place Conclave defines an explicit numeric timeout; MCP fetches here are expected to fail fast via whatever the tool itself does, with no new Conclave-level timeout value introduced).

### Respuesta vacia o inesperada

An MCP tool that returns a successful-but-empty result (no stack trace, no breadcrumbs) is treated as "enrichment unavailable" — falls back to whatever free text the user provided, same as a failed fetch.

### Doble submit

Running `/conclave-bug report` twice with the same description creates **two separate `BUG-NNN` files** — no deduplication in this phase (§2 Fuera de scope, explicit). The team is expected to `list` first if they suspect a duplicate.

## 12. Estados de UI requeridos

No aplica — no graphical UI, text-only CLI. The bug's `status` field reuses the existing story state machine, already documented in `state-machine.mdx` — no new state-transition table is introduced by this spec, only a note that `BUG-NNN` enters at `ready`.

## 13. Validaciones

### Validaciones de cliente

| Campo | Regla | Mensaje |
|---|---|---|
| `severity` | Must be one of `critical \| high \| medium \| low`, no default | `AskUserQuestion` enum choice — invalid values are structurally prevented, not just message-validated |
| `title` | Non-empty free text | Re-ask if blank |
| `discipline` | One of the six known values, default `multi` | Same enum as `/conclave-story new` |
| ID prefix (in `/conclave-dev`/`/conclave-qa`) | Must be `US-` or `BUG-` | `"Unrecognized ID prefix: <id>. Expected US-NNN or BUG-NNN."` |

### Validaciones de servidor

No aplica — no server of this plugin's own.

## 14. Seguridad y permisos

- **Secrets**: none in scope. `bug.template.md` holds no credential fields. Any stack trace or breadcrumb content fetched from an MCP tool is written into the bug file's body as-is — the same exposure level as any other `conclave/` content already committed to git (visible to anyone with repo access, same as a story's description). Teams handling genuinely sensitive stack traces (e.g. containing user PII) should redact before or after `/conclave-bug report` writes the file — no automatic redaction is performed by this spec.
- **Sensitive payloads**: no new payload types beyond what stories already carry (prose descriptions, now plus stack-trace-shaped text). No new exposure surface.
- **Permission checks**: none — matches every existing Conclave command's posture (no RBAC in this plugin).
- **GitHub issue creation**: uses the same `gh` auth the user already has configured for PR operations — no new auth surface introduced.
- **MCP tool access**: read-only fetch of a single referenced item; this spec does not grant Conclave any new MCP capability — it only reacts to whatever tools the user's own Claude Code session already has connected.

## 15. Observabilidad y logging

- **Log**: which sub-action ran, whether MCP enrichment was attempted and its outcome (matched-tool-used / no-matching-tool / fetch-failed), the resolved model (if `models:` configured), and — for `report` — the created bug ID and GitHub issue URL (or the reason it wasn't created). All via the plugin's existing mechanism: plain terminal output, no structured logging system.
- **Never log**: nothing new to withhold beyond the existing posture — stack traces/breadcrumbs fetched from an MCP tool are written into the bug file itself (visible in git), not specially masked in terminal output either, since they're the whole point of the report.

## 16. i18n / textos visibles

No aplica for the plugin's own command/charter prose — English, matching every existing command file (unchanged convention). The **docs site** (bilingual since v0.4.0) gains `site/content/en/commands/bug.mdx` and its Spanish translation `site/content/es/commands/bug.mdx`, following the exact same per-command-page pattern as every other `commands/*.mdx` pair (e.g. `story.mdx`/`adr.mdx` from v0.8.0).

## 17. Performance

- `/conclave-bug list` is a directory glob + frontmatter read + table print — cost scales with the number of bug files, expected to be small (tens, not thousands) for any real bug backlog. No caching/pagination is mandated.
- The MCP-tool-detection step in `report` is a one-time, single-fetch operation per invocation — no polling, no repeated calls.

## 18. Restricciones *(Restrictions / hard "do not" rules)*

The implementer must NOT:

- [ ] Hardcode "Sentry" (or any other specific vendor name) anywhere in the MCP-tool-detection logic — detection must be generic, keyword/description-based.
- [ ] Add GitLab (`glab`) support in this phase.
- [ ] Invent a new bug-specific state machine — reuse the story enum verbatim, including `retired` as the only escape hatch.
- [ ] Add `edit`, `retire`, or `split` sub-actions to `/conclave-bug` in this phase.
- [ ] Give `/conclave-planning` or `/conclave-sprint` any new logic that collects `BUG-NNN` files automatically.
- [ ] Introduce a new `models.overrides.*` role key — bug authoring resolves via the existing `qa` key.
- [ ] Rewrite `/conclave-dev`'s or `/conclave-qa`'s Step 0/execution logic wholesale — only the ID-parsing and per-ID resolution steps change; everything downstream is reused as-is.
- [ ] Create an index/manifest file for `conclave/product/bugs/` — `list` globs directly.
- [ ] Attempt duplicate-bug detection or fuzzy matching in this phase.
- [ ] Skip the `CHANGELOG.md` entry or the doc updates this change requires per `CLAUDE.md`.

## 19. Entregables *(Deliverables)*

- [ ] `commands/conclave-bug.md` (new), `skills/conclave/templates/bug.template.md` (new).
- [ ] `commands/conclave-dev.md`, `commands/conclave-qa.md`, `commands/conclave-pr-review.md`, `commands/conclave-sprint.md` — surgical ID-generalization edits per §6.
- [ ] `skills/conclave/templates/pr-body.template.md` — orchestrator-resolved bug-path links + optional `Fixes #<n>` line per §6.
- [ ] `skills/conclave/agents/qa.md` gains the `/conclave-bug report` operating-mode section; `skills/conclave/agents/developer.md` gains the reproduce-first hard rule.
- [ ] `SKILL.md`, `README.md`, `CHANGELOG.md`, both plugin manifest files, both locales' `commands/bug.mdx` + `commands/_meta.js` + `state-machine.mdx` updated per §6.
- [ ] Version bump to `0.10.0` (plugin manifests) and `conclave_version` in `config.template.md`.
- [ ] Manual verification per §8 completed and reported (no automated tests exist to add).

## 20. Checklist final para el agente *(Final agent checklist)*

Before delivering, verify:

- [ ] Read this spec end-to-end.
- [ ] Confirmed all prerequisites (§4) are satisfied.
- [ ] Modified/created only files listed in §6 (plus doc/CHANGELOG updates §19 requires) — no unrelated refactors, no changes to `/conclave-story`, `/conclave-adr`, `/conclave-board`, `/conclave-planning`'s own logic.
- [ ] Every acceptance-criteria checkbox in §8 verified manually via the commands in "Comandos de verificacion."
- [ ] MCP-tool detection is generic — grep the diff for any hardcoded vendor name and remove it if found.
- [ ] `BUG-NNN` and `US-NNN` never collide (independent counters, verified by creating one of each in the same run and confirming distinct IDs).
- [ ] A `BUG-NNN` never appears in `/conclave-planning` or `/conclave-sprint`'s collected-story lists.
- [ ] `Fixes #<issue>` appears in a bug-fix PR body only when `github_issue_number` is actually populated — never a dangling `Fixes #` with no number.
- [ ] No locked decision from §10 changed without flagging it back to the user first.
- [ ] `CHANGELOG.md` and the named doc pages reflect the new command, the generalized `/conclave-dev`/`/conclave-qa`, and the version bump.
- [ ] No temporary notes, TODOs, or scratch files left in `docs/`, `commands/`, or `skills/`.
