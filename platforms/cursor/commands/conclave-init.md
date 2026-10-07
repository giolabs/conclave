---
name: conclave-init
description: One-time project setup plus Scrum inception. Configures the Conclave workspace (name, story prefix, stack, profile, cadence), then finds your product documentation (or offers /conclave-discovery to write it) and turns it into a product vision with a Product Goal, a set of epics, an architectural foundation, and a sprint-by-sprint roadmap (Sprint 0 walking skeleton first). Run once per repo before /conclave-planning. `--upgrade` migrates a v1.x workspace to the v2 structure.
---

# /conclave-init [--upgrade]


> **Cursor runtime notes (ADR-002):** This command is the Cursor port of the Claude Code twin.
> - Prefer the **`AskQuestion`** tool for structured prompts when running in top-level Agent chat. If unavailable (e.g. inside a `Task`/subagent), use an explicit numbered option list and wait for the user's reply.
> - Spawn role work with the **`Task`** tool (or Cursor custom agents), loading the matching file under `agents/<role>.md` as the subagent charter — not Claude Code's `Agent` tool.
> - Template and skill paths are relative to this plugin root: `skills/conclave/templates/...` and `skills/conclave/board-app/...`.
> - There is no `allowed-tools` frontmatter; Cursor session permissions apply.
> - Concurrent batches still issue ≤ 3 Task calls per wave (correctness over wall-clock if Cursor serializes them).


One-time project setup **and inception**. Creates the `conclave/` workspace, records the project configuration every other Conclave command reads, and produces the four artifacts the rest of the Scrum cycle hangs from:

| Artifact | Owner | Purpose |
|---|---|---|
| `product/vision.md` | Product Manager | Problem, personas, **Product Goal**, success metrics, MVP scope |
| `product/epics/EP-NNN-<slug>.md` | Product Manager | The big chunks of value, each with a success criterion |
| `product/architecture.md` + `product/adr/` | Tech Lead | Architectural foundation and the enablers the skeleton needs |
| `product/roadmap.md` | Scrum Master | Epics sequenced into sprint slots up to the MVP / launch date |

```
/conclave-init             # new workspace: setup + inception
/conclave-init --upgrade   # existing v1.x workspace: migrate config, derive vision/epics/roadmap from the existing backlog
```

**Run this once per repository**, before `/conclave-planning`. Stories are **not** written here — they are refined just in time, one roadmap slot at a time, by `/conclave-planning`.

---

## Step 0 — Guard idempotency and pick the mode

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, ask the user via `AskQuestion` whether to `git init` here; if they decline, stop with a clear message.
2. Check `--upgrade`. Set `MODE = upgrade` if present, `MODE = new` otherwise.
3. If `$REPO_ROOT/conclave/config.md` exists:
   - Read `conclave_version` from its frontmatter.
   - `MODE = new` and version `< 2.0.0` (or absent) → stop: *"This workspace was created by Conclave v1.x. Run `/conclave-init --upgrade` to migrate it to v2 (vision, epics, roadmap, new ceremony flags)."*
   - `MODE = new` and version `>= 2.0.0` → stop: *"`conclave/` is already initialized. Edit `conclave/config.md` to change settings. Run `/conclave-planning` to plan the next sprint."*
   - `MODE = upgrade` and version `>= 2.0.0` → stop: *"Already on v2 — nothing to upgrade."*
   - `MODE = upgrade` and version `< 2.0.0` → jump to **Step U** (upgrade path). Skip Steps 1–9.
4. If `config.md` does not exist and `MODE = upgrade` → stop: *"No v1 workspace found. Run `/conclave-init` without `--upgrade`."*

## Step 1 — Detect the stack

Before asking the user anything, scan the project to detect the technology stack. This gives the user something concrete to confirm rather than a blank field.

Run the following in parallel and collect the results:

```bash
find $REPO_ROOT -maxdepth 3 -type f \( \
  -name "package.json" \
  -o -name "tsconfig.json" \
  -o -name "next.config.*" \
  -o -name "vite.config.*" \
  -o -name "angular.json" \
  -o -name "nuxt.config.*" \
  -o -name "svelte.config.*" \
  -o -name "go.mod" \
  -o -name "Cargo.toml" \
  -o -name "requirements.txt" \
  -o -name "pyproject.toml" \
  -o -name "setup.py" \
  -o -name "pubspec.yaml" \
  -o -name "build.gradle" \
  -o -name "build.gradle.kts" \
  -o -name "pom.xml" \
  -o -name "Gemfile" \
  -o -name "mix.exs" \
  -o -name "composer.json" \
  -o -name ".php-version" \
\) \
-not -path "*/.git/*" \
-not -path "*/node_modules/*" \
-not -path "*/vendor/*" \
-not -path "*/build/*" \
-not -path "*/dist/*"
```

Build a readable summary of what was found. Examples of how to infer from files:

| Signal file | Likely stack |
|---|---|
| `package.json` + `next.config.*` | Next.js (TypeScript if `tsconfig.json` present) |
| `package.json` + no framework config | Node.js |
| `pubspec.yaml` | Flutter / Dart |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `requirements.txt` or `pyproject.toml` | Python |
| `build.gradle` or `pom.xml` | Android / Java / Kotlin |
| `Gemfile` | Ruby on Rails |
| `mix.exs` | Elixir |
| `composer.json` | PHP |

If no signal files are found, set the detected stack to "Not detected — will fill manually".

Then compute `GREENFIELD`:

```bash
git ls-files | grep -v -E '^(conclave/|docs/|\.github/|README|LICENSE|\.gitignore|CLAUDE\.md)' | head -1
```

- No output and no signal files → `GREENFIELD = true` (no application code yet).
- Otherwise → `GREENFIELD = false`.

`GREENFIELD` sets the default for `sprint.sprint_zero` and tells the Tech Lead whether the architecture is a proposal for an empty repo or a description of an existing one.

## Step 2 — Collect project info (AskQuestion)

Ask the user all required fields in a single `AskQuestion` call.

**Question 1 — Project name**
Free text. Used as the title in all generated artifacts.

**Question 2 — Story ID prefix**
Free text, default: `US`. Explain: *"Stories will be named `<PREFIX>-001`, `<PREFIX>-002`, etc. Examples: `US` (user story), `TASK`, `FEAT`, or a project abbreviation like `MYAPP`."*

**Question 3 — Project language**
Options: `es` (Spanish — recommended default), `en` (English), other (free text for any ISO 639-1 code). Explain: *"All Conclave-generated markdown — stories, acceptance criteria, reports — will be written in this language."*

**Question 4 — Launch date**
ISO date (YYYY-MM-DD). Optional — the user can enter "TBD" if not yet known.

**Question 5 — Team mode**
Options:
- `team` — a multi-person engineering team
- `solo` — a single developer (forces `lean` profile; roster will have one row)

**Question 6 — Team profile** (skip if team_mode is `solo` — force `lean`)
Options:
- `lean` (recommended for small teams / internal projects) — Planning, QA Verification and Sprint Review are enforced; TL gate and retro off
- `full-scrum` — Tech Lead PR approval gate on, retrospective on inside `/conclave-close`
- `custom` — set `ceremonies.peer_pr_review.required` and `ceremonies.close.retro` yourself in `conclave/config.md`

**Question 7 — Sprint length**
Options: `1 week`, `2 weeks` (recommended), `3 weeks`, `4 weeks`. Stored as `sprint.length_weeks`.

Wait for all answers before continuing.

## Step 3 — Product documentation

Inception needs to know what the product is. This step finds the team's product documentation, checks it covers what inception needs, and — when there is none — offers `/conclave-discovery` to write it.

### 3.1 — Scan the repo for product documents (no agent)

1. **Discovery package.** Look for any `README.md` up to depth 4 (same exclusions as item 2) whose frontmatter has `conclave_product_package: true` — `find $REPO_ROOT -maxdepth 4 -name README.md` then `grep -l 'conclave_product_package: true'`. The default location is `docs/product/`, but `/conclave-discovery --out` can put it anywhere. Found → `PACKAGE_DIR`; it wins over everything below.
2. **Candidate documents.** List every `.md` up to depth 4, excluding `.git/`, `node_modules/`, `vendor/`, `dist/`, `build/`, `conclave/`, `conclave-board/`, `.github/`, `site/`, and the files `CHANGELOG.md`, `LICENSE*`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CLAUDE.md`.
3. **Score** each candidate (orchestrator-side, by reading the first ~200 lines):

| Signal | Points |
|---|---|
| Under `docs/` (or `doc/`, `product/`) | +2 |
| Filename contains `mvp`, `product`, `prd`, `vision`, `discovery`, `brief`, `idea`, `project`, `spec`, `requirements` | +3 |
| Each coverage signal present (table below) | +2 |
| Root `README.md` | −2 (usually install docs, not product) |

**Coverage signals** — what inception needs; match headings or obvious paragraphs, in any language:

| Signal | Matches (case-insensitive, EN/ES) |
|---|---|
| Problem | problem, pain, problema, dolor |
| Users | user, persona, ICP, customer, usuario, cliente |
| Goal / metrics | goal, objective, metric, KPI, success, objetivo, métrica, éxito |
| Features / scope | feature, scope, functionality, funcionalidad, alcance, requisitos |
| MVP boundary | MVP, out of scope, fuera de alcance, v1, release |

Keep candidates scoring ≥ 4, top 3 by score. Record each one's missing coverage signals.

### 3.2 — Choose the source (one `AskQuestion`)

**A. A discovery package was found** → don't ask about other files: *"Found the product package at `<PACKAGE_DIR>` (generated <date>). Use it?"* — **Use it** (recommended) / **Regenerate with /conclave-discovery** / **Use something else**.

**B. Candidates were found** → *"These look like product documents. Which one describes the product?"*
- One option per candidate: `<path>` — covers N/5 (missing: …)
- **"None of these — write it with /conclave-discovery"**
- **"I'll describe the idea in a paragraph"**

**C. Nothing was found** → *"No product documentation found. Inception needs to know what the product is, for whom, and what the MVP is."*
- **"Create it with /conclave-discovery"** (recommended) — guided: discovery, tech stack, data model, domain rules, MVP; about 10–15 minutes of questions and generation.
- **"I'll describe the idea in a paragraph"** — faster, thinner inception; the PM fills gaps and lists open questions.
- **"I have a document elsewhere"** — the user gives a path; verify it exists.

### 3.3 — Gap check for a chosen document

When the user picks a candidate (B) or a path that covers **fewer than 4 of the 5** coverage signals → one `AskQuestion`: *"`<path>` is missing <signals>. Complete it first?"*
- **"Complete it with /conclave-discovery --from <path>"** (recommended) — keeps everything the document says, fills the gaps, writes the package to `docs/product/`.
- **"Use it as is"** — the PM will list what is missing as open questions in `vision.md`.

### 3.4 — Run discovery inline when chosen

When any answer above chose `/conclave-discovery`, run its Steps 1–7 inline now (`commands/conclave-discovery.md`), passing `--from <path>` when completing a document, the project language from Step 2, team = `solo` when `team_mode = solo` (otherwise let discovery ask), and — when the user picked **Regenerate** in 3.2-A — the decision `regenerate`, so discovery skips its own Step 1.5 question. It returns without its own next-step block. Then continue here with `PACKAGE_DIR` = its output folder.

### 3.5 — Set the inputs

- Package → `PRODUCT_DOC_PATH = PACKAGE_DIR`; `IDEA` = the five documents concatenated with their filenames as headings; `PACKAGE_STACK` = the `stack:` frontmatter of `01-tech-stack.md`.
- Document → `PRODUCT_DOC_PATH = <path>`; `IDEA` = its content.
- Paragraph → `PRODUCT_DOC_PATH = ""`; ask for the text in the next message; `IDEA` = that text. Write it verbatim to `$REPO_ROOT/conclave/context/idea.md` once Step 5 creates the directory.

## Step 4 — Confirm the stack and inception preferences

### 4.1 — Stack (one `AskQuestion`)

Defaults, in order: the signal-file inference from Step 1; when nothing was detected, `PACKAGE_STACK` from the discovery package. Show where each value came from ("detected from `package.json`" / "from docs/product/01-tech-stack.md"). If both exist and disagree, show both and recommend the detected one — the code is the fact.

Options: **"Looks correct"** / **"Let me correct it"** (free text per field). Set:

```
STACK_LANGUAGE   = <confirmed or user-entered>
STACK_FRAMEWORK  = <confirmed or user-entered>
STACK_DATASTORE  = <confirmed or user-entered>
STACK_INFRA      = <confirmed or user-entered>
PROJECT_TYPE     = <inferred from stack: backend | frontend | mobile | devops | multi>
```

### 4.2 — Inception preferences (one `AskQuestion`, all optional)

Only ask what `IDEA` does not already answer — a discovery package answers the first three, so skip them:
1. **Primary users** — who uses this first?
2. **Product Goal hint** — what measurable outcome would make the MVP a success? (or "let the PM propose")
3. **Hard constraints** — deadlines, compliance, budgets, banned technologies.
4. **Sprint 0** — "Start with a walking-skeleton sprint (scaffold, tests, CI)?" Default `yes` when `GREENFIELD = true` (or when the package's `04-mvp.md` lists Sprint 0 enablers), `no` otherwise.

Carry the answers as `INCEPTION_PREFS`. Set `SPRINT_ZERO` from question 4.

## Step 5 — Create the workspace skeleton

Create all files in parallel where possible.

### 5.1 — Directory structure

```bash
mkdir -p $REPO_ROOT/conclave/team
mkdir -p $REPO_ROOT/conclave/product/epics
mkdir -p $REPO_ROOT/conclave/product/adr
mkdir -p $REPO_ROOT/conclave/context
mkdir -p $REPO_ROOT/conclave/sprints
mkdir -p $REPO_ROOT/conclave/runs
mkdir -p $REPO_ROOT/conclave/report
mkdir -p $REPO_ROOT/.github/ISSUE_TEMPLATE
```

### 5.2 — conclave/config.md

Read `skills/conclave/templates/config.template.md`. Fill in all `{{placeholders}}` with the collected values:

| Placeholder | Value |
|---|---|
| `{{project_name}}` | from Step 2 |
| `{{project_type}}` | from Step 4.1 |
| `{{project_language}}` | from Step 2 |
| `{{story_prefix}}` | from Step 2 |
| `{{launch_date}}` | from Step 2 (or "TBD") |
| `{{product_doc_path}}` | from Step 3.5 — package folder, document path, or `""` when the idea was typed |
| `{{stack_language}}` | from Step 4.1 |
| `{{framework}}` | from Step 4.1 |
| `{{datastore}}` | from Step 4.1 |
| `{{infrastructure}}` | from Step 4.1 |
| `{{repo_url}}` | output of `git remote get-url origin 2>/dev/null \|\| echo ""` |
| `{{iso_date}}` | today's date (ISO) |
| `{{conclave_version}}` | `2.0.0` |
| `{{team_mode}}` | from Step 2 |
| `{{team_profile}}` | from Step 2 (force `lean` when `team_mode = solo`) |
| `{{peer_pr_review_required}}` | `true` for full-scrum, `false` for lean and custom |
| `{{close_retro}}` | `true` for full-scrum, `false` for lean and custom |
| `{{sprint_length_weeks}}` | from Step 2 (default `2`) |
| `{{sprint_zero}}` | `SPRINT_ZERO` from Step 4.2 |

Write to `$REPO_ROOT/conclave/config.md`.

### 5.3 — team/roster.md

Read `skills/conclave/templates/roster.template.md`. Fill in:
- If `team_mode = solo`: a single row covering all disciplines. Person name = output of `git config user.name` (fall back to asking the user) — **not** the project name; `/conclave-dev` matches assignees against the git identity.
- If `team_mode = team`: leave the template rows as-is for the team to fill in.

Write to `$REPO_ROOT/conclave/team/roster.md`.

### 5.4 — team/ceremonies.md

Read `skills/conclave/templates/ceremonies.template.md`. Fill `sprint_length_weeks` from Step 2, `{{peer_pr_review_label}}` and `{{retro_label}}` with `required` / `optional` per the profile. Write to `$REPO_ROOT/conclave/team/ceremonies.md`.

### 5.5 — product/definition-of-ready.md and product/definition-of-done.md

Read the DoR and DoD templates and write them as-is (they are sensible defaults). Adjust the `peer_pr_review` bullet in the DoD to reflect the chosen profile — comment it out if `peer_pr_review_required: false`.

### 5.6 — conclave/README.md

Read `skills/conclave/templates/conclave-readme.template.md`. Fill in `{{project_name}}` and `{{iso_date}}`. Write to `$REPO_ROOT/conclave/README.md`.

### 5.7 — GitHub templates

Read and write the GitHub and team templates from `skills/conclave/templates/`:
- `pr-template-github.template.md` → `.github/PULL_REQUEST_TEMPLATE.md`
- `bug-report-github.template.md` → `.github/ISSUE_TEMPLATE/bug_report.md`
- `pr-review-template-github.template.md` → `conclave/team/PR_REVIEW_TEMPLATE.md`
- `testing-environments.template.md` → `conclave/team/testing-environments.md`

Only write these if the target files do not already exist (do not overwrite).

### 5.8 — Context snapshot

In parallel:
- If `$REPO_ROOT/CLAUDE.md` exists, copy its content to `conclave/context/claude-md.snapshot.md`. If `$HOME/.claude/CLAUDE.md` also exists, append its content under a `## Global` heading.
- Write `conclave/context/skills.inventory.md` listing the skills currently available in the session.
- Write `conclave/context/rules.inventory.md` listing the stack signal files found in Step 1 (paths only — no content).

## Step 6 — Inception, wave 1: PM + TL in parallel

Resolve models from `config.md` `models:` (`MODEL_FOR_PM`, `MODEL_FOR_TL`, `MODEL_FOR_SM`; overrides → default → null; invalid name → warn and fall back).

Issue **two `Task` tool calls in a single message**:

### Agent A — Product Manager (vision + epics)

- **Model**: `MODEL_FOR_PM` (omit if null).
- Prompt prefix: full content of `agents/product-manager.md`.
- Task: **inception mode** (see the charter section "How you operate inside `/conclave-init` (inception)").
- Inputs: `IDEA` (prefixed with `## Product idea — source of truth for intent:`; when it is a discovery package, say so — `04-mvp.md` candidate epics are the epics), `INCEPTION_PREFS`, `launch_date`, `sprint.length_weeks`, `vision.template.md`, `epic.template.md`.
- Language: *"Write all prose in `{{PROJECT_LANGUAGE}}`. Keep frontmatter keys and identifiers in English."*
- Output: one `## Vision` block (body of `vision.template.md`) followed by 3–8 `## Epic` blocks (body of `epic.template.md`, `type: feature`), ordered by value.

### Agent B — Tech Lead (architecture + enablers)

- **Model**: `MODEL_FOR_TL` (omit if null).
- Prompt prefix: full content of `agents/tech-lead.md`.
- Task: produce the Architectural Foundation (`architecture.template.md`) plus initial ADRs (`adr.template.md`), and — when `SPRINT_ZERO = true` — one `## Enabler epic` block (body of `epic.template.md`, `type: enabler`, title "Walking skeleton") listing the enablers Sprint 0 needs: repo scaffold for the confirmed stack, test framework with one passing test, lint, CI workflow running both, integration branch (`develop`).
- Inputs: `IDEA` (a discovery package's `01-tech-stack.md`, `02-data-model.md` and `03-bloc.md` are the starting point for architecture and ADRs), `INCEPTION_PREFS`, confirmed stack, `GREENFIELD`, context snapshots.
- When `GREENFIELD = true`, every ADR's evidence comes from versioned docs (Tier B) — there is no code to measure; say so in each ADR's Unknowns.

Wait for both. If either errors, surface and stop.

## Step 7 — Inception, wave 2: SM roadmap

One `Agent` call:

- **Model**: `MODEL_FOR_SM` (omit if null).
- Prompt prefix: full content of `agents/scrum-master.md`.
- Task: **roadmap mode** (charter section "How you operate inside `/conclave-init` (roadmap)").
- Inputs: the PM's epics (with size and dependencies), the TL's enabler epic (if any), `roster.md` (team size), `sprint.length_weeks`, `launch_date`, today's date, `roadmap.template.md`.
- Output: the body of `roadmap.template.md` — slots, target dates, MVP slot, forecast.

## Step 8 — Checkpoint: user confirms inception

Show the user a compact summary:

```
Product Goal:  <one sentence>
Personas:      <names>
Epics:         EP-001 <title> [M, must] · EP-002 <title> [S, should] · …
Roadmap:       S0 walking skeleton · S1 EP-001 · S2 EP-001, EP-002 · … MVP at SPRINT-00N (<date>)
Launch risk:   <on track | at risk — reason>
```

Then one `AskQuestion`:
- **"Looks right — write it"**
- **"Change something"** — the user states the change in free text; re-run only the affected agent (PM for vision/epics, TL for enablers, SM for roadmap — always re-run SM if epics changed), then show the summary again. Max 3 rounds; after that, write what exists and tell the user to edit the files directly.

## Step 9 — Write inception artifacts

1. `product/vision.md` ← `vision.template.md` + PM vision block.
2. Epics: number from `EP-001` (enabler epic first when present). For each: `product/epics/EP-NNN-<slug>.md` ← `epic.template.md` + block; set `roadmap_slots` from the SM's roadmap.
3. `product/architecture.md` ← TL output; each ADR → `product/adr/ADR-NNN-<slug>.md`, and the ADR index table in `architecture.md` lists them.
4. `product/roadmap.md` ← `roadmap.template.md` + SM output.
5. `product/backlog.md` ← `product-backlog.template.md` with an **empty** table (stories arrive at planning).
6. Append `## /conclave-init inception — <ISO>` to `conclave/context/claude-md.snapshot.md` recording: idea source (`PRODUCT_DOC_PATH` or `context/idea.md`), epic count, slot count, MVP slot.

## Step U — Upgrade a v1.x workspace (`--upgrade`)

Migrates in place. **Append, don't clobber**: existing sprints, stories, acceptance files, and reports are never rewritten except for the frontmatter fields listed below. Every sub-step is idempotent — re-running after a partial failure resumes.

**U.1 — Inventory.** Read `config.md`, `product/backlog.md`, `product/architecture.md`, every `sprints/SPRINT-NNN/meta.md`, every story frontmatter, and `PRODUCT_DOC_PATH` if set. Print what was found (sprints by status, story count, inline ADR count).

**U.2 — Config.**
- Map `ceremonies.sprint_retrospective.required` → `ceremonies.close.retro` (same boolean; absent → profile default).
- Remove all four v1 keys: `ceremonies.daily_standup`, `ceremonies.backlog_grooming`, `ceremonies.sprint_review`, `ceremonies.sprint_retrospective`.
- Add the `sprint:` block: `length_weeks` from `team/ceremonies.md` (default 2), `sprint_zero: false`.
- Set `conclave_version: "2.0.0"`. Rewrite the `product_doc_path` comment to the v2 wording.
- Show the diff and confirm via `AskQuestion` before writing.

**U.3 — Sprint status.** v1 `status: done` or `archived` in `meta.md` → `closed`. Add `slot`, `epics: []`, `committed_units`, `velocity` (sum of `done` story estimates, XS=1 S=2 M=3 L=5 XL=8), `sprint_goal_met: null`, `closed_at: ""` where missing.

**U.4 — Derive inception artifacts from what exists.** Run Steps 6–9 with these differences:
- `IDEA` = product doc (if any) + current backlog table + `architecture.md` overview.
- PM task: **inception mode, upgrade variant** — group existing stories into epics (every non-retired story lands in exactly one epic) and write `vision.md`. Return a story → epic map.
- TL: skip; keep `architecture.md`. If inline `### ADR-NNN:` sections exist, tell the user to run `/conclave-adr` once to migrate them.
- SM: roadmap where already-closed sprints are `closed` slots, the active sprint (if any) is the `active` slot, and remaining epics fill future slots. Seed the burnup table from closed sprints' velocities.

**U.5 — Story frontmatter.** For every story file add `type: feature` and `epic: <EP-NNN from the map>` when missing. No other field changes.

**U.6 — Backlog.** Add the `Epic` column to `backlog.md`, replace the `## Vision` section with the link line from `product-backlog.template.md`.

**U.7 — Report.**

```
✓ Upgraded conclave/ to v2.0.0
  Config:   ceremonies migrated (retro: <bool>), sprint.length_weeks: <n>
  Sprints:  <n> closed · <n> active · <n> draft
  Epics:    <n> created from <n> stories
  Roadmap:  <n> slots, MVP at <SPRINT-NNN>
Next: review the diff, commit, then /conclave-close (if the active sprint is finished) or keep working.
```

## Step 10 — Report to the user

```
✓ Conclave workspace initialized at conclave/

  Project:        <project_name>
  Product Goal:   <one sentence>
  Epics:          <n> (EP-001 … EP-00N)
  Roadmap:        <n> slots · Sprint 0: <yes/no> · MVP at <SPRINT-NNN> (<date>)
  Story prefix:   <prefix>-001, <prefix>-002, …
  Stack:          <framework> / <language>
  Profile:        <team_profile> · sprints of <n> week(s)
```

Then suggest:

```bash
git add conclave/ .github/
git commit -m "conclave: inception for <project_name>"

# Plan the first slot (Sprint 0 when enabled):
/conclave-planning
```

## Guardrails

- Do not create any file outside `$REPO_ROOT/conclave/`, `$REPO_ROOT/.github/` (only if those files don't already exist), and — only when the user chose `/conclave-discovery` in Step 3 — the discovery package folder (default `docs/product/`).
- Do not commit, and do not create branches — the integration branch is an enabler story in Sprint 0.
- Do not write stories here. Stories are refined just in time by `/conclave-planning`.
- Do not overwrite an existing `conclave/config.md` outside `--upgrade`; the guard in Step 0 must catch that first.
- `--upgrade` never deletes or renames a sprint, story, or report file.
