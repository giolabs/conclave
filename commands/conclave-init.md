---
description: One-time project wizard. Configures the Conclave workspace for Scrum — collects project name, story ID prefix, stack, launch date, and locates the product planning document. Run once per repo before /conclave-planning.
allowed-tools: Bash(git rev-parse:*), Bash(git init:*), Bash(ls:*), Bash(find:*), Bash(grep:*), Bash(date:*), Bash(mkdir:*), Bash(cat:*), Read, Write, AskUserQuestion
---

# /conclave-init

One-time project setup wizard. Creates the `conclave/` workspace and records the project configuration that every other Conclave command reads.

**Run this command once per repository**, before `/conclave-planning`. If the workspace already exists, the command refuses and tells you what to do instead.

There are no AI agents in this command — it is a wizard that reads your project and writes configuration. Story and sprint generation happens in `/conclave-planning`.

---

## Step 0 — Guard idempotency

1. Run `git rev-parse --show-toplevel` to find `REPO_ROOT`. If not a git repo, ask the user via `AskUserQuestion` whether to `git init` here; if they decline, stop with a clear message.
2. If `$REPO_ROOT/conclave/config.md` already exists, **stop** and print:
   > "`conclave/` is already initialized. Edit `conclave/config.md` directly to change settings. Run `/conclave-planning` to generate stories and plan a sprint."

   Do not continue.

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

## Step 2 — Collect project info (AskUserQuestion)

Ask the user all required fields in a single `AskUserQuestion` call.

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
- `lean` (recommended for small teams / internal projects) — only Sprint Planning and QA Verification are enforced
- `full-scrum` — all ceremonies required (daily standup, grooming, peer PR review, sprint review, retro)
- `custom` — you'll configure each ceremony individually in `conclave/config.md`

Wait for all answers before continuing.

## Step 3 — Confirm or override the detected stack

Use a second `AskUserQuestion` to present the detected stack and let the user confirm or correct it.

Show:
- Detected signal files and the inferred stack label.
- Fields to confirm: language, framework, datastore, infrastructure.

For each field, the default is what you inferred from the signal files (or empty if nothing was detected). Options:
- "Looks correct" — use the detected values
- "Let me correct it" — accept free text for each field

If the user corrects any field, use their values. Set:

```
STACK_LANGUAGE   = <confirmed or user-entered>
STACK_FRAMEWORK  = <confirmed or user-entered>
STACK_DATASTORE  = <confirmed or user-entered>
STACK_INFRA      = <confirmed or user-entered>
PROJECT_TYPE     = <inferred from stack: backend | frontend | mobile | devops | multi>
```

## Step 4 — Find the product planning document

The product planning document is the single source of truth for stories and sprints. It must exist before `/conclave-planning` can run.

**4.1 — Search the repo for a candidate**

Look for these files in priority order:

```bash
find $REPO_ROOT -maxdepth 4 -type f -name "*.md" \
  -not -path "*/.git/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/conclave/*" \
  | xargs grep -l -i "sprint\|backlog\|user stor\|epics\|feature\|mvp\|milestone\|release" \
    2>/dev/null | head -10
```

Also check these specific paths without grepping (they may exist but be empty):
- `$REPO_ROOT/docs/mvp.md`
- `$REPO_ROOT/docs/project.md`
- `$REPO_ROOT/mvp.md`
- `$REPO_ROOT/project.md`
- `$REPO_ROOT/docs/product.md`
- `$REPO_ROOT/PRODUCT.md`

**4.2 — If one or more candidates are found**

Present up to 3 candidates to the user via `AskUserQuestion`:
- "We found these files that may contain your product plan. Which one is it?"
- Options: each candidate path, plus "None of these — I'll specify one" and "None of these — I'll create one now"

If the user picks a file, set `PRODUCT_DOC_PATH` to that path and continue to Step 5.

If the user says "I'll specify one" — ask for the path and set `PRODUCT_DOC_PATH`. If the file doesn't exist at that path, tell the user and wait for a valid path.

**4.3 — If no candidates are found**

Use `AskUserQuestion` to present three options:

> "No product planning document was found in this repo. `/conclave-planning` needs one to generate stories and sprints. Please choose:"

Options:
1. **"I'll paste the content now"** — The user pastes the content of the document in their next message. Write it to `$REPO_ROOT/docs/mvp.md` and set `PRODUCT_DOC_PATH = "docs/mvp.md"`.
2. **"The file is already there — here's the path"** — The user provides the path. Verify it exists. Set `PRODUCT_DOC_PATH`.
3. **"I'll create it later"** — Acknowledge and set `PRODUCT_DOC_PATH = null`. The workspace will be created but `/conclave-planning` will refuse to run until the field is filled in `config.md`.

Recommended format to suggest if the user is creating the document:

```markdown
# <Project name> — Product Plan

## Vision
<One-paragraph description of the product.>

## MVP Scope
<What the MVP includes and excludes.>

## Sprint 1
### Goal
<One sentence.>
### Features
- Feature 1: <description>
- Feature 2: <description>

## Sprint 2
### Goal
<One sentence.>
### Features
- Feature 3: <description>
```

## Step 5 — Create the workspace

Create all files in parallel where possible.

### 5.1 — Directory structure

```bash
mkdir -p $REPO_ROOT/conclave/team
mkdir -p $REPO_ROOT/conclave/product
mkdir -p $REPO_ROOT/conclave/context
mkdir -p $REPO_ROOT/conclave/sprints
mkdir -p $REPO_ROOT/conclave/runs
mkdir -p $REPO_ROOT/conclave/report
mkdir -p $REPO_ROOT/.github/ISSUE_TEMPLATE
```

### 5.2 — conclave/config.md

Read `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/config.template.md`. Fill in all `{{placeholders}}` with the collected values:

| Placeholder | Value |
|---|---|
| `{{project_name}}` | from Step 2 |
| `{{project_type}}` | from Step 3 |
| `{{project_language}}` | from Step 2 |
| `{{story_prefix}}` | from Step 2 |
| `{{launch_date}}` | from Step 2 (or "TBD") |
| `{{product_doc_path}}` | from Step 4 (or `""` if null) |
| `{{stack_language}}` | from Step 3 |
| `{{framework}}` | from Step 3 |
| `{{datastore}}` | from Step 3 |
| `{{infrastructure}}` | from Step 3 |
| `{{repo_url}}` | output of `git remote get-url origin 2>/dev/null \|\| echo ""` |
| `{{iso_date}}` | today's date (ISO) |
| `{{conclave_version}}` | `1.0.0` |
| `{{team_mode}}` | from Step 2 |
| `{{team_profile}}` | from Step 2 (force `lean` when `team_mode = solo`) |
| `{{daily_standup_required}}` | `true` for full-scrum, `false` for lean, ask for custom |
| `{{backlog_grooming_required}}` | `true` for full-scrum, `false` for lean |
| `{{peer_pr_review_required}}` | `true` for full-scrum, `false` for lean |
| `{{sprint_review_required}}` | `true` for full-scrum, `false` for lean |
| `{{sprint_retrospective_required}}` | `true` for full-scrum, `false` for lean |

Write to `$REPO_ROOT/conclave/config.md`.

### 5.3 — team/roster.md

Read `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/roster.template.md`. Fill in:
- If `team_mode = solo`: a single row with the project name as person name covering all disciplines.
- If `team_mode = team`: leave the template rows as-is for the team to fill in.

Write to `$REPO_ROOT/conclave/team/roster.md`.

### 5.4 — team/ceremonies.md

Read `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/ceremonies.template.md`. Use default sprint length (2 weeks), Monday as planning day, Wednesday as standup, Friday as retro. Write to `$REPO_ROOT/conclave/team/ceremonies.md`.

### 5.5 — product/definition-of-ready.md and product/definition-of-done.md

Read the DoR and DoD templates and write them as-is (they are sensible defaults). Adjust the `peer_pr_review` bullet in the DoD to reflect the chosen profile — comment it out if `peer_pr_review_required: false`.

### 5.6 — conclave/README.md

Read `${CLAUDE_PLUGIN_ROOT}/skills/conclave/templates/conclave-readme.template.md`. Fill in `{{project_name}}` and `{{iso_date}}`. Write to `$REPO_ROOT/conclave/README.md`.

### 5.7 — GitHub templates

Read and write the two GitHub templates from `skills/conclave/templates/`:
- `pr-template-github.template.md` → `.github/PULL_REQUEST_TEMPLATE.md`
- `bug-report-github.template.md` → `.github/ISSUE_TEMPLATE/bug_report.md`

Only write these if the target files do not already exist (do not overwrite).

### 5.8 — Context snapshot

In parallel:
- If `$REPO_ROOT/CLAUDE.md` exists, copy its content to `conclave/context/claude-md.snapshot.md`. If `$HOME/.claude/CLAUDE.md` also exists, append its content under a `## Global` heading.
- Write `conclave/context/skills.inventory.md` listing the skills currently available in the session.
- Write `conclave/context/rules.inventory.md` listing the stack signal files found in Step 1 (paths only — no content).

## Step 6 — Report to the user

Print a clear summary:

```
✓ Conclave workspace initialized at conclave/

  Project:        <project_name>
  Story prefix:   <prefix>-001, <prefix>-002, …
  Launch date:    <launch_date>
  Stack:          <framework> / <language>
  Profile:        <team_profile>
  Product doc:    <product_doc_path or "⚠ not set — edit config.md before running /conclave-planning">
```

Then suggest:

```bash
# Review the workspace
ls conclave/

# When ready, generate stories and plan the first sprint:
/conclave-planning

# Or plan all sprints from your product document at once:
/conclave-planning --all
```

If `PRODUCT_DOC_PATH` is null (user chose "I'll create it later"), add:

> ⚠️ **Before running `/conclave-planning`**, create your product document and set `product_doc_path` in `conclave/config.md`.

## Guardrails

- Do not create any file outside `$REPO_ROOT/conclave/` or `$REPO_ROOT/.github/` (and only if those files don't already exist).
- Do not commit. The user reviews on a PR.
- Do not run any AI agent. This command is orchestrator logic only.
- Do not overwrite an existing `conclave/config.md` under any circumstances — the idempotency guard in Step 0 must catch that first.
