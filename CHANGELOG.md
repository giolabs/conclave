# Changelog

All notable changes to the Conclave plugin are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

---

## [2.0.0] — 2026-10-07

**Breaking release — "Scrum Lite" lifecycle.** Conclave now drives a project from a raw idea to sprint N through a reduced Scrum cycle: inception (vision, Product Goal, epics, roadmap) → Sprint Planning per roadmap slot → build → Sprint Close (review + retro). Before this release Conclave assumed a product document already split into `## Sprint N` existed, had no epic layer, no Sprint 0, and never closed a sprint (review, retro, standup and grooming were config flags without commands; velocity never fed capacity). Existing v1.x workspaces must run `/conclave-init --upgrade` once before `/conclave-planning`, `/conclave-close` or `/conclave-epic` will run.

### Added

- **`/conclave-discovery`** — new command that turns a raw idea (or an incomplete document via `--from`) into the product documentation package inception needs, written to `docs/product/` (team-owned, outside `conclave/`): `00-discovery.md` (problem, ICP, personas, business model, Haiku-researched competitors, UVP, MoSCoW features), `01-tech-stack.md` (choice per layer with why / reconsider-when, test+lint+CI, rejected alternatives, evidence tiers), `02-data-model.md` (Mermaid ER, entities, structural decisions), `03-bloc.md` (numbered invariants, use cases and edge cases, state machines) and `04-mvp.md` (Product Goal, metrics, scope, candidate epics, Sprint 0, sequencing), plus an index `README.md`. Adapted from the `mvp-idea` discovery flow without its stakeholder questionnaire — open questions are recorded instead. One checkpoint (ICP / problem / UVP) before the rest is derived. New templates `product-*.template.md` and references `skills/conclave/references/{discovery-methodology,tech-stack-decision-tree}.md`.
- **Product-document scan in `/conclave-init`.** Init now looks for a discovery package first, then scores every `.md` in the repo (location, filename, five coverage signals: problem, users, goal/metrics, features/scope, MVP boundary) and offers the top 3. With nothing found it offers `/conclave-discovery` (run inline) or a one-paragraph idea; a chosen document covering fewer than 4 signals gets a "complete it with `/conclave-discovery --from`" option. A package's `01-tech-stack.md` pre-fills the stack confirmation in greenfield repos; its candidate epics become the inception epics and its tech-stack choices become the initial ADRs.
- **BLOC-driven acceptance criteria.** When `product_doc_path` points to a discovery package, `/conclave-planning` passes `03-bloc.md` to the PM, and every invariant / use case / edge case a story touches must appear as a Gherkin scenario.
- **Inception in `/conclave-init`.** After the setup wizard, the PM (vision + feature epics) and TL (architecture, initial ADRs, Sprint 0 enabler epic) run in parallel, then the SM sequences the epics into a roadmap. One confirmation checkpoint before anything is written. Starts from free text or an existing document — a product document is no longer required. Writes `product/vision.md`, `product/epics/EP-NNN-*.md`, `product/roadmap.md`, `product/adr/`, and an empty backlog. Detects greenfield repos (no application code) and defaults Sprint 0 on for them.
- **`/conclave-init --upgrade`** migrates a v1.x workspace in place: removes the dropped ceremony keys, maps `sprint_retrospective.required` → `ceremonies.close.retro`, adds the `sprint:` block, rewrites sprint `status: done|archived` → `closed` with recorded velocity, groups existing stories into epics (PM), builds the roadmap with closed/active slots and a seeded burnup (SM), and adds `type`/`epic` to every story. Never deletes or renames a sprint, story or report.
- **`/conclave-close`** — new command, the only one that sets a sprint `closed`. Runs the critical-bug gate, asks what happens to unfinished stories (next sprint or back to backlog), Sprint Review by the PM (Sprint Goal verdict, epic and Product Goal progress, adaptation proposals), the Retrospective by the SM when `ceremonies.close.retro: true` (keep / change / try, at most 3 action items), records velocity, appends a burnup row and re-forecasts the roadmap, marks finished epics `done`, and writes `review.md`, `retro.md` plus the closing report, UAT guide and `dora-data.yml` (moved here from `/conclave-sprint`).
- **`/conclave-epic new | edit | split | retire`** — keeps the epic layer alive after inception; the SM re-slots new or changed epics into future roadmap slots (never `active` or `closed` ones). Split is coverage-checked like `/conclave-story split`.
- **Sprint 0 / walking skeleton.** With `sprint.sprint_zero: true` the first sprint is `SPRINT-000`, made of `type: enabler` stories (scaffold, test framework + one passing test, lint, CI, `develop` integration branch). The Developer charter now treats a missing test framework as expected when the enabler story is the one that bootstraps it, so `/conclave-dev --loop` no longer aborts on a fresh repo; the DevOps charter covers creating `develop`.
- **Velocity-based capacity.** `/conclave-planning` sizes the sprint on the average velocity of the last 3 closed sprints and records which source it used; the fixed `devs × weeks × 5` formula only applies before any sprint has closed.
- **Templates**: `vision`, `epic`, `roadmap`, `sprint-review`, `retro`.
- **Story frontmatter**: `type: feature | enabler` and `epic: EP-NNN`. **Sprint `meta.md`**: `slot`, `epics`, `committed_units`, `velocity`, `sprint_goal_met`, `closed_at`.
- **Config**: `ceremonies.close.retro`, `sprint.length_weeks`, `sprint.sprint_zero`.

### Changed

- **`/conclave-planning` plans one roadmap slot at a time** with inline refinement: Wave 1 PM turns the slot's epics into stories + Gherkin (TL writes enabler stories when the slot has an enabler epic), Wave 2 TL feasibility + discipline, Wave 3 SM planning record with retro action items carried in. Refuses while a sprint is still `active` — close it with `/conclave-close` first. Reads vision/epics/roadmap instead of `product_doc_path`.
- **Sprint status is `draft → active → closed`** (was `draft | active | done | archived`). Exactly one sprint is active at a time.
- **`/conclave-sprint` covers the build phase only.** Phase 1 runs `/conclave-planning` when no sprint is active; it no longer writes the closing report or checks the close gate — it prints a hint to run `/conclave-close`.
- **Profiles**: `lean` = TL gate off, retro off; `full-scrum` = both on. Sprint Review is now structural (always runs inside `/conclave-close`), alongside Sprint Planning and QA Verification.
- **`/conclave-story new`** asks for the epic and type; `split` children inherit them; epics track their stories.
- **Charters**: PM gains inception, refinement, review and epic modes; SM gains roadmap and retro modes and loses the never-shipped standup/review/retro command tables; TL gains inception (greenfield ADRs, enabler epic) and the Wave 1 / Wave 2 planning split.
- **`product_doc_path`** is now optional inception input, not the planning source of truth.
- **Solo roster** uses `git config user.name` as the person name (was the project name, which then failed assignee matching in `/conclave-dev`).
- `/conclave-init` now also writes `team/PR_REVIEW_TEMPLATE.md` and `team/testing-environments.md`, which the directory contract already promised.
- `scripts/generate-cursor-platform.py` reads the version from `.claude-plugin/plugin.json` (it was hard-coded to `0.15.0`) and removes Cursor commands whose canonical source was deleted.
- Cursor package regenerated and re-synced; this also ships v1.2.0 charter and template changes that had not been synced to `platforms/cursor/`.

### Removed

- **`/conclave-spec`** (deprecated since v1.1.0).
- **`/conclave-planning --all`** — the roadmap is the multi-sprint view; stories are refined per slot.
- **Config keys** `ceremonies.daily_standup`, `ceremonies.backlog_grooming`, `ceremonies.sprint_review`, `ceremonies.sprint_retrospective`. Commands warn once and ignore them; `--upgrade` deletes them. There is no standup or grooming ceremony: the board and story statuses are the daily view, and refinement happens inside planning.
- `sprints/SPRINT-NNN/daily/` from the directory contract (nothing ever wrote it).

### Fixed

- Stale references to `/conclave-spec`, `/conclave-review`, `/conclave-sprint close` and "planned, not yet shipped" commands across commands, templates and the board empty state.
- `SKILL.md` §5 template list now includes every shipped template.

### Upgrade

```bash
/conclave-init --upgrade   # once per existing workspace; review the diff, then commit
/conclave-close            # if the active sprint is finished
/conclave-planning         # plan the next roadmap slot
```

---

## [1.2.0] — 2026-08-27

### Added

- **Lab test feature** (`lab_test:` config block, `lab-test.template.md`, `--lab` flag on `/conclave-qa`): an optional end-to-end verification layer that runs against the integration branch (`develop`). When `lab_test.enabled: true` in `config.md`, the Tech Lead generates an executable lab spec (a `BUG-NNN-lab.md` or `US-NNN-lab.md`) during `/conclave-bug report` (for bugs meeting the configured severity threshold) or during `/conclave-pr-review` (for stories, on approval). The QA agent runs the lab spec post-merge via `/conclave-qa US-NNN --lab`, records Tier A evidence (command + exit code + output + SHA) in the spec's Evidence log, and auto-creates `BUG-NNN` artifacts in the global bug pool for any failures. Lab timeouts produce a `blocked` status rather than a false-negative bug. This feature is opt-in and off by default.

- **`/conclave-bug report` — Haiku pre-analysis refiner**: before asking the user any questions, `/conclave-bug report` now dispatches a lightweight Haiku subagent (read-only) to analyse the raw report. The refiner returns an optimized title, a `suspected_code_area` hint (used by QA when writing repro steps, and by the TL when generating the lab spec), a classification of blocking vs. non-blocking ambiguity, and an advisory severity. If the refiner finds no blocking ambiguity and severity is unambiguous, `AskUserQuestion` is skipped entirely. Non-blocking gaps are promoted to `## Needs more info` without interrupting the user.

- **`/conclave-bug report` — `suspected_code_area` and `lab_test_path` fields**: the bug file template now includes `suspected_code_area` (populated by the Haiku refiner; passed to the QA subagent as a hint) and `lab_test_path` (empty on creation, filled once the TL generates the lab spec).

- **`story.template.md` — `lab_test_path` field**: story files now include a `lab_test_path` field (empty on creation, filled during `/conclave-pr-review` when `lab_test.enabled: true`).

- **`config.template.md` — `lab_test:` block**: new commented-out configuration block documents all lab test options (`enabled`, `integration_branch`, `runner`, `timebox_minutes`, `stories.generate_on`, `bugs.severity_threshold`).

- **`lab-config.template.md` v2.0** — expanded from the initial v1.0 with structured sections for every integration type a modern project may need: `environments` (local/integration flat vars map), `runner` (Playwright/Newman/bash config), `auth` (pre-issued test credentials), `databases` (Postgres/MySQL/MongoDB/Redis), `microservices` (Pact Broker, downstream services), `aws` (region, IAM keys, SQS/SNS/DynamoDB/S3/Lambda/RDS resources), `gcp` (project, SA key base64, Pub/Sub/Firestore/BigQuery/Cloud SQL), `azure` (subscription, App Registration, Service Bus/Cosmos DB/SQL), `terraform` (workspace, remote state backend, var-file), and `safety` (test_tag_prefix, data_ttl_seconds, email_sink, payment_mode, Stripe key). The Variable registry is organized by category (auth, URLs, databases, AWS, GCP, Azure, microservices, IaC, safety) with env var names, frontmatter source path, purpose, and integration type columns. A Runner quick-reference table maps each integration type (FE→BE, BE→DB, BE→AWS, BE→GCP, BE→Azure, BE→BE contracts, IaC drift, Full stack) to the recommended CLI tool and a concrete Verify command pattern. The `safety` block enables agent-enforced pre-checks: `payment_mode` must be `test`; `STRIPE_SECRET_KEY` must start with `sk_test_` (hard abort otherwise); `LAB_TEST_TAG` is exported as `lab-<timestamp>` for idempotent resource naming and cleanup.

- **`lab-test.template.md`**: new template for lab test spec files. Covers entity metadata (entity_id, entity_type, integration_branch, runner, timebox_minutes, status), Objective, Pre-conditions, Verify command (runnable bash block + expected exit code + expected output pattern), Decision rule (Pass/Fail binary), Scope (in/out — both are mandatory), and Evidence log (one row per QA execution, appended by the QA agent).

- **TL charter — "How you operate inside lab test generation" section**: describes both Bug context mode (invoked from `/conclave-bug report`) and Story context mode (invoked from `/conclave-pr-review`). Hard rules: no fabricated commands; every file/endpoint in the Verify command must be verified via Read/Grep/Glob; no Tier-D claims; `status: blocked` is the honest response when context is insufficient.

- **QA charter — "How you operate inside lab test execution (`--lab`)" section**: describes how to translate a machine-generated Verify command failure into a structured bug report (Gherkin repro steps derived from the failing command, advisory severity based on the lab spec's Scope section, `## Needs more info` note for environment-related failures).

### Changed

- **Tech Lead agent (`skills/conclave/agents/tech-lead.md`) — evidence-grounded ADRs**: the TL charter now enforces the full decision protocol before returning any ADR. Four new Mindset principles (evidence tiers, reversibility bar, ACH disconfirmation, confidence/likelihood separation). New "Evidence and quality gates" section with five mandatory pre-emit checks: evidence tier tagging on every claim, Type-1/Type-2 reversibility classification, a 5-step self-critique gate (pre-mortem, key-assumptions check, reversal test, identifier audit, two-sided absence test), an ambiguity sweep against a literal word list, and mandatory Unknowns register + Coverage section. Two new common hard rules: no Tier-D claim in `## Decision`, no unfilled `{{placeholder}}` strings.

- **ADR template (`skills/conclave/templates/adr.template.md`) — agent-executable format**: expanded with `reversibility` and `applies_to` frontmatter fields; evidence tier notation in Alternatives Considered; mandatory `## Unknowns and Assumptions` table with revisit trigger; `## Rules` section (RFC-2119 `MUST`/`MUST NOT`/`SHOULD`); `### Confirmation` with executable `Verify:` command; `## Implementation Notes` (verified entry points, ordered steps each ending in a runnable verification, contracts touched, migration/rollback, out-of-scope); `## Coverage` section. Template comment updated with a full reference guide for each section.

- **`/conclave-bug report` — conditional `AskUserQuestion`**: the question round is now gated on the Haiku refiner's output. When the refiner finds no blocking ambiguity and severity is clear, the interaction is skipped. When questions are needed, they are pre-filled from refiner output and limited to the first 3 blocking questions (max 5 total); the rest go to `## Needs more info`.

- **`/conclave-bug list`** — table now includes a `Lab` column (`✓` / `—`) indicating whether a lab spec has been generated for each bug.

### Docs

- **Lab tests — new page EN/ES** (`site/content/{en,es}/lab-tests.mdx`): complete reference for the lab test feature. Covers the full flow (TL generates spec → PR merged → QA runs `--lab` → Tier A evidence → auto-bug on failure), `conclave/lab-config.md` setup (copy template, gitignore, fill in values), Variable registry format and rules, integration type / runner reference table, lab spec file structure, safety rules (`payment_mode: test`, `STRIPE_SECRET_KEY` prefix check, `LAB_TEST_TAG` idempotency), bug filing on failure, and enabling via the `lab_test:` config block.
- **`/conclave-bug` docs EN/ES** — updated to document: Haiku pre-analysis refiner behavior (read-only subagent, returns structured JSON, never blocks the flow); conditional `AskUserQuestion` (skipped when no blocking questions and severity is clear); `suspected_code_area` and `lab_test_path` fields in the bug template; lab test spec generation as Step 9 (gated on `lab_test.enabled` and `severity_threshold`); `Lab` column in `list` output.
- **`/conclave-qa` docs EN/ES** — updated to document the `--lab` flag: command syntax, prerequisites, step-by-step execution flow (env var export → safety checks → Verify command → Evidence log → bug on failure), `blocked` vs `failed` distinction, and after-it-runs section extended for post-merge lab test outcomes.
- **`/conclave-pr-review` docs EN/ES** — updated to document Step 6.5 lab spec generation: conditions (enabled + `generate_on: pr-review` + `approved`), `lab-config.md` requirement (soft skip), spec written to sprint stories directory, `lab_test_path` frontmatter update, and after-it-runs note about running `--lab` post-merge.
- **Configuration reference EN/ES** — new "Lab test configuration block" section documenting all `lab_test:` fields with defaults and notes, plus the `conclave/lab-config.md` gitignored-file requirement.

---

## [1.1.0] — 2026-07-29

### Changed (Breaking)

- **`/conclave-init` is now the one-time project setup wizard** — the wizard logic previously split across `/conclave-spec` (as redesigned last sprint) has been merged into `/conclave-init`. It auto-detects the stack, collects project name, story prefix (e.g. `US`, `TASK`, `FEAT`), launch date, team profile, and the path to the product planning document (`docs/mvp.md` or `docs/project.md`). Run it once per repository before `/conclave-planning`. `/conclave-spec` is now a deprecated shim that tells users to run `/conclave-init` instead.

- **`/conclave-planning` now generates all artifacts (Phase A + Phase B)** — on the first run (no backlog exists yet), it reads the product document and invokes the PM and TL in parallel to produce the full Product Backlog, Architectural Foundation, per-story files, and Gherkin acceptance criteria. The Sprint Planning ceremony (Phase B: SM + scope/feasibility validation) always runs after Phase A. The `--all` flag plans every sprint in the product document at once, activating the first and leaving the rest `draft`. On subsequent runs, Phase A is skipped and only Phase B runs.

### Added

- **`story_prefix` in `config.md`** — a new field (default `US`) that controls the prefix for all story and acceptance file names. Set during `/conclave-init`; all commands read it when creating or querying story files. Examples: `US-001-login.md` / `AC-US-001.md`, or `TASK-001-login.md` / `AC-TASK-001.md`.

- **`product_doc_path` in `config.md`** — a new field pointing to the product planning document that `/conclave-planning` uses as its source of truth for generating stories and sprints. Set during `/conclave-init`; can be updated to point to a different document at any time.

- **`launch_date` in `config.md`** — an ISO date (or "TBD") captured during `/conclave-init` and carried through all generated artifacts.

### Docs

- **`/es/configuration` — ejemplos mejorados** — la página de referencia de configuración EN/ES ahora incluye: (1) dos ejemplos completos de `config.md` ("proyecto solo / lean" y "equipo distribuido / full-scrum") en lugar de uno solo; (2) el bloque `commands:` reemplazado por tres recetas nombradas y sin comentar ("Dev autónomo sin loop", "Loop de fin de semana", "Loop con Slack"); (3) el ejemplo de `testing-environments.md` muestra ahora un archivo completado con valores realistas de env vars, Postman y usuarios de test, en lugar de solo TBDs.

## [0.16.0] — 2026-07-27

### Removed

- **`/conclave-sprint-board`** — the offline HTML roadmap/analytics board command has been removed along with its skill (`skills/conclave/visual-sprint-board/`), templates (`sprint-board.html.template`, `sprint-board-readme.template.md`), and the Cursor-platform counterparts. The Kanban board (`/conclave-board`) remains. DORA metrics are now covered by `/conclave-dora` (see Added below).

### Added

- **`project_language` in `config.md`** — a new ISO 639-1 field (`es`, `en`, `pt`, etc.) that all commands read and pass to their role subagents so every generated markdown artifact (stories, acceptance criteria, bug descriptions, reports, comments) is written in the team's language. Defaults to `es` when absent. `/conclave-init` asks for it during bootstrap.

- **Sprint plan detection in `/conclave-spec`** (Step 3b) — before asking clarification questions, the command scans the repo for any requirements or backlog document (`.md`, `.txt`, `.csv`, `.xlsx`, `.pdf`) using keyword matching. If found, the document is read and passed to the PM and TL agents as `EXISTING_PLAN` so stories derive from it. If nothing is found, the user is asked to share a document (markdown preferred to save tokens) or continue without one.

- **Multi-sprint planning in `/conclave-planning --all`** — a new `--all` flag plans every draft sprint from the backlog in one pass. The first sprint is activated (`status: active`); the rest are planned and left in `draft`, ready to be activated when the prior sprint closes. Useful after `/conclave-spec` generates multiple sprints at once.

- **Sprint closing report and UAT guide** (Steps 12–13 in `/conclave-sprint`) — when a sprint run completes, the command now:
  - Checks for open critical bugs in `conclave/sprints/SPRINT-NNN/bugs/` (new gate: sprint cannot close if any are found).
  - Generates `conclave/report/SPRINT-NNN/report.md` — a full sprint closing report with velocity, story outcomes, bug counts, acceptance coverage, decisions, and next-sprint recommendations.
  - Generates `conclave/report/SPRINT-NNN/UAT.md` — a functional QA guide describing every delivered feature with Gherkin scenarios, manual test steps, regression checklist, and sign-off table.
  - Writes `conclave/report/SPRINT-NNN/dora-data.yml` — a raw DORA data snapshot (velocity, lead times, MTTR, PR counts) for `/conclave-dora` to aggregate later.
  - Language of all generated prose follows `project_language`.

- **QA verification on the integration branch** (`/conclave-qa` updated) — QA now switches to `$INTEGRATION_BRANCH` (develop / main) instead of the feature branch, verifying the integrated state of the codebase. When a verification is blocked, reproducible defects are written as `BUG-NNN-<slug>.md` files in `conclave/sprints/<SPRINT_ID>/bugs/` with full linkage to the story, acceptance criteria, and the PR that introduced the regression. Severity is inferred from Gherkin tags (`@critical`) and DoD classification. Critical sprint bugs block the sprint from closing.

- **`/conclave-dora` command** — new command to generate DORA metrics reports for any time window: `--period biweekly | monthly | semiannual | annual | full-project`, or explicit `--from` / `--to` dates. Uses the Tech Lead agent for full-scrum teams (engineering-depth analysis) and the Product Manager agent for lean/solo teams (product-centric insights). Lean/solo output omits all per-individual contributor data. Reports are written to `conclave/report/dora/DORA-NNN-<period>-<date>.md` and language follows `project_language`.

- **GitHub project templates** — `/conclave-init` now also writes three GitHub template files to the target repo:
  - `.github/ISSUE_TEMPLATE/bug_report.md` — bug report form with Conclave story/sprint linkage fields
  - `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist referencing CLAUDE.md conventions and Conclave acceptance criteria
  - `conclave/team/PR_REVIEW_TEMPLATE.md` — checklist template for tech-lead PR reviews (architecture alignment, security, testing, DoD)

- **`pr-comment-reviewer` skill enhanced** — in addition to existing rules, the skill now:
  - Reads `conclave/product/architecture.md`, `conclave/product/definition-of-done.md`, and the linked story's acceptance file alongside `CLAUDE.md` and `.rules/`
  - Performs an independent diff analysis against the `develop` (or `main`) base branch, detecting regression risks, common bug patterns, architectural boundary violations, and convention violations
  - After the report is ready, asks the user whether to post findings as **inline PR comments** (anchored to file and line), a **general PR comment** (summary), or both
  - All posting to GitHub requires explicit user confirmation

### Changed

- `conclave/config.md` schema: new frontmatter field `project_language` (string, ISO 639-1). The `stack.language` field (programming language) is unchanged — `project_language` is the human/natural language for documentation. Existing installs default to `es` when the field is absent.
- `conclave_version` bumped to `0.16.0` in `config.template.md`.
- `SKILL.md` directory contract updated: new `conclave/report/` subtree, `conclave/sprints/SPRINT-NNN/bugs/` subtree, `.github/` GitHub templates, updated invariants for language, sprint bugs, report generation, and multi-sprint planning.
- `/conclave-init` Step 3 now includes a language question (item 3) and Step 5 writes the three GitHub templates in addition to the `conclave/` seed files. The suggested git command now includes `.github/`.
- `/conclave-spec` Step 5 now embeds `EXISTING_PLAN` in both the TL and PM agent prompts when a sprint plan document was found or provided.
- `/conclave-planning` Step 1 now handles the `--all` flag and builds `SPRINTS_TO_PLAN`; Step 6b runs the multi-sprint loop; Step 7 reports on all planned sprints.
- `/conclave-sprint` allowed-tools list adds `Bash(find:*)` and `Bash(mkdir:*)` for the closing report steps.
- `/conclave-qa` allowed-tools list adds `Bash(mkdir:*)` and `Bash(find:*)` for the sprint bugs directory. Step 3 now switches to `$INTEGRATION_BRANCH` instead of the feature branch.

## [0.15.0] — 2026-07-26

**Breaking:** Conclave no longer merges pull requests, and the delivery loop moved to `/conclave-dev --loop` with a new wave structure and a new schedule schema. If you configured a loop in 0.13.0 or 0.14.0, read "Changed" and "Migration" below before upgrading.

### Added
- **Autonomous Three-Wave Delivery Loop on `/conclave-dev`** (`--loop`, or `commands.dev.loop: true`) — the single autonomous delivery loop. It takes the **active sprint** (or the IDs you pass, bugs included) and runs **W0** conflict ordering → **W1** Dev to green CI → **W2** headless QA → **W3** forced Tech Lead review. Any wave failure returns the affected stories to **W1**, because changed code invalidates the QA verdict that preceded it. Waves never overlap; batch-of-3 concurrency exists only inside W1 for stories with no dependency or file overlap. `--loop` implies `--no-interaction` (ADR-006).
- **Wave 0 conflict analysis** — the loop now reads each story's `dependencies:` and orders the scope accordingly, serializes stories observed to touch the same paths (`conflict: path_overlap`), and **aborts the run on a dependency cycle** rather than inventing an order.
- **Recurring local-time schedule** `commands.dev.schedule` — `timezone` (IANA), `days` (`mon`..`sun`), `start_time` / `end_time` (may cross midnight), `duration_days`, `active_from`, `enforce`. A weekend campaign is now expressible once instead of two ISO timestamps per weekend.
- **Agent-productivity statistics in the run report** — per role: dispatches, stories touched, first-pass success rate, rework caused, average tokens per story, outcome mix. Plus per-story wave-entry counts, `QA→Dev` / `TL→Dev` re-entry heatmap, cycle time, accumulated CI wait, conflicts handled, and the list of **PRs ready for human merge** with copyable merge commands.
- **Versioned Slack templates** — `slack-loop-success.template.json`, `slack-loop-partial.template.json`, `slack-loop-hitl.template.json` (Block Kit, with an `mrkdwn` fallback retry). HITL alerts are emitted **at the moment** the blocker occurs — structural `AUTONOMOUS_ABORT`, dependency cycle, another dev's commits, missing/unauthenticated `gh`, CI still red after the attempt cap, `pending_uat` — so an operator can act while the run continues elsewhere. New optional toggles `notifications.slack.on_success` / `on_partial` / `on_hitl`.

### Changed
- **No Conclave command merges a pull request.** `gh pr merge` is gone from every `allowed-tools` list and every step. QA verification and Tech Lead approval are gates, not merge authorizations; the loop's terminal state is an approved, open PR (ADR-006).
- **`/conclave-sprint --no-interaction` is now headless one-pass only** — planning with documented defaults, then batched Dev/QA/TL, with zero prompts. No self-heal, no schedule gate, no budgets, no run report, no merge, no mechanical sprint close. It prints a line pointing at `/conclave-dev --loop`, and `--ignore-schedule` is accepted but ignored.
- `commands.sprint.schedule`, `commands.sprint.budgets`, and `commands.sprint.merge_method` are **ignored no-ops** that print one line each — kept so an upgraded config does not error.
- `commands.dev.merge_method` is likewise an ignored no-op.
- `sprint-run-report.template.md` rewritten for the loop: `mode: autonomous-dev-three-wave`, `merged: none (by design)`, `sprint_closed: false` always, new `waves`, `conflicts_detected`, `prs_ready_for_human_merge`, and `ci_wait_minutes` fields, plus the productivity and conflict sections. Reports written by 0.13.0/0.14.0 loops stay on disk untouched.
- QA charter — the headless section is now "Wave 2 of the three-wave loop": a `blocked` verdict goes back to Dev (write blockers a Developer subagent can act on without you), the same item may be verified more than once per run, and nothing in the loop merges.
- `SKILL.md` — directory contract, the new "no command merges" invariant, the §3 rows for `/conclave-dev` and `/conclave-sprint`, the §5 template list (run report + three Slack templates), and the rewritten §6 loop/scheduling section.
- Docs EN/ES — Scheduling rewritten around the three waves, the recurring window, report contents, and worked Slack message examples; `/conclave-dev`, `/conclave-sprint`, and Configuration pages updated to match.
- Plugin manifests (Claude Code + Cursor) and `conclave_version` → **0.15.0**.
- ADR-006 → **accepted**. ADR-005 → **superseded**. ADR-004 → amended: its delivery-loop semantics are superseded, while its budget ledger, model routing, report-as-lock protocol, and "Conclave gates, an external trigger fires" stance carry over.

### Migration from 0.13.0 / 0.14.0
- Replace `commands.sprint.schedule` / `budgets` / `merge_method` with `commands.dev.schedule` / `commands.dev.budgets`. The old `window_start` / `window_end` pair is **not** honored: the loop prints a migration message and stops rather than guessing a recurring window from a one-shot pair.
- Point any recurring trigger at `/conclave-dev --loop` instead of `/conclave-sprint --no-interaction`.
- Expect approved PRs instead of merged ones. The run report and the Slack success message list what to merge.

## [0.14.0] — 2026-07-25

### Added
- **Autonomous Delivery Loop on `/conclave-dev`** (`--loop`, or `commands.dev.loop: true`) — ADR-004's loop machinery narrowed to exactly the IDs you pass: serial Dev → PR checks → QA → **forced Tech Lead review** → **merge** into `repo.integration_branch` (prefer `develop`), self-healing until the attempt budget runs out. `--loop` implies `--no-interaction` (ADR-005).
- **Bugs can now be delivered hands-off.** `/conclave-dev --loop BUG-004` is the only path from a reported bug to a merged fix without human steps — `/conclave-sprint` deliberately never collects `BUG-NNN`.
- **`--ignore-schedule` on `/conclave-dev`**, and schedule/budget gating for the dev loop: `commands.dev.schedule`, `commands.dev.budgets`, `commands.dev.merge_method` — each optional and **inheriting the `commands.sprint.*` value when absent**, so one weekend window and one token ceiling cover both loops.
- **Dev-loop run report** `RUN-NNN-dev-loop.md` under the active sprint's `runs/`, or `conclave/runs/` in a repo with no sprint at all. Doubles as the concurrency lock: a run whose ID scope intersects a live run is refused, while non-overlapping scopes may run in parallel.

### Changed
- `sprint-run-report.template.md` now serves both loops: new `scope` and `mode` frontmatter fields (`autonomous-sprint-loop` | `autonomous-dev-loop`), `per_story_rows` → `per_item_rows`, `story_count` → `item_count`, heading "Sprint run report" → "Run report".
- `/conclave-dev` guardrails: **"do not merge"** now reads "except in loop mode, and only with green CI + QA pass + TL approval"; loop mode is serial (no batch-of-3), forces the TL gate ephemerally, and **never closes a sprint** — it prints a hint pointing at `/conclave-sprint`.
- `/conclave-dev` `allowed-tools` extended with the `gh` PR checks/review/merge, `git fetch/add/commit/diff`, `mkdir`, and `curl` subcommands the loop needs (plus `gh pr edit`, which Step 7 already used).
- In loop mode, `INTEGRATION_BRANCH` (`repo.integration_branch` → `develop` → `main`) replaces Step 4's `main`/`master` detection, so an item forks from the branch it merges back into.
- QA charter — the headless section now covers both loops (`Autonomous sprint loop` / `Autonomous delivery loop` prompts), handles `BUG-NNN`, and restates that a QA pass never authorises a merge.
- `SKILL.md` — `runs/` in the directory contract (including the `conclave/runs/` fallback), run-report append-only/lock invariant, merge-policy exception covering both loops, `/conclave-dev` row in §3, template note in §5.
- Plugin manifests (Claude Code + Cursor) and `conclave_version` → **0.14.0**.
- Docs: `/conclave-dev`, Configuration, and Scheduling pages EN/ES document the loop, the config inheritance, and the `commands.dev.loop: true` blast-radius warning.
- ADR-005 → **accepted**.

## [0.13.0] — 2026-07-25

### Added
- **Autonomous Sprint Loop** on `/conclave-sprint` (`--no-interaction` / `--headless`, or `commands.sprint.interactive: false`) — serial self-heal Dev → PR checks → QA → **forced Tech Lead review** → **merge** into `repo.integration_branch` (prefer `develop`); mechanical sprint close when all non-retired stories are `done`; run report at `conclave/sprints/SPRINT-NNN/runs/RUN-NNN-autonomous-loop.md`; optional Slack Incoming Webhook via env var name (ADR-004).
- **Schedule window** `commands.sprint.schedule.window_start` / `window_end` / `enforce` — Conclave gates; external trigger (`/loop`, `/schedule`, Cursor Automation, `cron`) starts the command. `--ignore-schedule` bypasses for one run. Outside-window invocations are a cheap no-op (exit 0, no report).
- **Budgets** `commands.sprint.budgets` — `max_attempts_per_story`, `max_ci_wait_minutes`, `max_total_tokens` (best-effort ledger), `max_wall_clock_hours` (exact).
- Template `sprint-run-report.template.md`; docs: Scheduling pages EN/ES.

### Changed
- Interactive `/conclave-sprint` (default) unchanged: one-pass, **never merges**.
- Plugin manifests + `conclave_version` → **0.13.0**.
- `SKILL.md` §3/§5/§6 — loop catalog, merge-policy exception, schedule/budget note.
- QA charter — headless defaults inside the Autonomous Sprint Loop.
- ADR-004 → **accepted**.
- Docs note: Autonomous Sprint Loop requires GitHub CLI (`gh`) installed and authenticated with repo access — Conclave does not install or configure it.

## [0.12.0] — 2026-07-17

### Added
- **`/conclave-sprint-board`** — generates a local, self-contained HTML roadmap board (tabs: Roadmap / Tasks / Analytics) from `conclave/sprints/**` into `docs/sprint-board/index.html` (+ `README.md`). Offline `file://`, no CDN, no npm. Complementary to `/conclave-board` (Next.js status Kanban); does not replace it and does not mutate story/sprint source files (ADR-003).
- **Skill** `skills/conclave/visual-sprint-board/SKILL.md` — discovery order, status mapping (`done|verified` → done, etc.), accent cascade (prompt → DESIGN.md → `board.md` → `#C45C26`), one phase `Delivery`.
- **Templates** `sprint-board.html.template`, `sprint-board-readme.template.md`.
- Cursor twin + sync of `visual-sprint-board/` via `scripts/sync-cursor-platform.sh`.
- Docs site: `site/content/{en,es}/commands/sprint-board.mdx`.

### Changed
- Plugin manifests (Claude Code + Cursor) and `conclave_version` → **0.12.0**.
- `skills/conclave/SKILL.md` §7 documents both visual boards (Kanban vs roadmap HTML).
- ADR-003 status → **accepted**.
- Developer docs: `CLAUDE.md` layout/sync notes; site index EN/ES command count → twelve.

## [0.11.0]

### Added
- **Cursor package (`conclave-cursor`)** under `platforms/cursor/` — full parity with the Claude Code plugin: all 11 `/conclave-*` commands, 7 role agents, synced `SKILL.md` + templates + `board-app`, best-effort `afterFileEdit` board hook. Same target-repo `conclave/` contract (ADR-002). Local install via `./scripts/install-cursor-local.sh` (`rsync` into `~/.cursor/plugins/local/conclave-cursor/`).
- **`scripts/sync-cursor-platform.sh`** — copies canonical `skills/conclave/{SKILL.md,templates,board-app}` into the Cursor tree; `--check` mode for release/CI freshness.
- **`scripts/generate-cursor-platform.py`** — regenerates Cursor command/agent ports from the Claude Code twins (Task / AskQuestion mapping).
- **Optional `runtime: claude-code | cursor | both`** on `config.template.md` (informational; unset = either runtime OK).
- Docs: dual-runtime README, `site/content/{en,es}/platforms.mdx`, installation + getting-started updates, end-to-end **Cursor from scratch** checklist (clone plugin → install → Reload → `/conclave-init` in your app repo).

### Changed
- `skills/conclave/SKILL.md` — platform-neutral wording (Claude Code **and** Cursor).
- Plugin manifests (Claude Code + Cursor) and `conclave_version` → **0.11.0**.

## [0.10.0]

### Added
- **New `/conclave-bug <report [text|url] | list>` command** — report a bug the moment it surfaces (typically after a PR has already merged and shipped a silent regression) without waiting for the next Sprint Planning cycle:
  - `report` turns free text, or a URL/ID from a connected logging/error-tracking MCP tool, into a `BUG-NNN` artifact with Gherkin repro steps and an explicit `severity` (`critical | high | medium | low` — distinct from `priority`, since severity measures incident impact, not feature work order). MCP-tool detection is generic (keyword/description matching, e.g. "sentry", "error tracking", "logging") — never a hardcoded vendor name. Mirrors the bug as a GitHub issue via `gh issue create` (GitHub-only this phase).
  - `list` is mechanical, no subagent call — same precedent as `/conclave-story retire` — and prints the open bug backlog sorted by severity.
  - Bugs reuse the story state machine verbatim and are written directly in `status: ready` — they never pass through `backlog` or Sprint Planning. `/conclave-planning` and `/conclave-sprint` never collect them.
- **New persistent directory `conclave/product/bugs/`** — flat, no index file; `/conclave-bug list` globs it directly.
- **New template `skills/conclave/templates/bug.template.md`.**
- **`/conclave-dev` and `/conclave-qa` now accept `BUG-NNN` IDs alongside `US-NNN`**, including mixed batches (`/conclave-dev US-001 BUG-004`) — the ID prefix disambiguates which directory each resolves against; every other step (branch naming, discipline-based charter routing, batching, model resolution, summary tables) is unchanged, since a bug's frontmatter has the same shape a story's does. `/conclave-pr-review` accepts either ID too (single-ID only, unbatched).
- **The Developer subagent reproduces a bug before fixing it** — uses the bug file's inline Gherkin repro steps to confirm the failure is still present before writing any fix code; aborts (or asks, interactively) if it cannot reproduce. The rendered PR body includes `Fixes #<github_issue_number>` so merging auto-closes the mirrored GitHub issue.
- **QA subagent gains a bug-report authoring mode** — "How you operate inside `/conclave-bug report`" turns raw input into Gherkin repro steps and an advisory severity note (the user's explicit severity choice is always authoritative, never overridden).

### Changed
- `skills/conclave/templates/pr-body.template.md` — the two previously-hardcoded sprint-relative links (and a new optional `Fixes #<n>` line) are now resolved by the orchestrator per ID prefix before being handed to the Developer subagent, since the template itself has no conditional syntax. Story PRs render byte-for-byte as before.
- `.claude-plugin/plugin.json` and `marketplace.json` — version bumped to `0.10.0`; marketplace description updated to eleven shipped commands.

## [0.9.0]

### Added
- **Autonomous mode for `/conclave-dev`** — new `commands.dev.interactive: true | false` config field in `conclave/config.md` (default `true`, absent = interactive) and matching CLI flag `--no-interaction` (also accepted as `--headless`). When resolved to `false`, `/conclave-dev` runs headless:
  - **No `AskUserQuestion` prompts.** Every current prompt site applies a documented sensible default:
    - Assignee mismatch → **auto-take-over** (ownership follows execution).
    - Existing local branch with no story commits → **delete and recreate** from the integration branch.
    - Existing local branch with prior story commits by the same runner → **switch and resume**.
    - Existing local branch with commits authored by another `git config user.email` → **refuse with `AUTONOMOUS_ABORT: story branch has commits from another dev (<their email>); manual coordination required`**.
  - **Ambiguities without a safe default abort.** The Developer subagent returns `AUTONOMOUS_ABORT: <one-line reason>` for the four documented cases (no test framework detected; new dependency not in any ADR; ambiguous Gherkin scenario; story requires architectural change). The story resets to `status: ready`; no push, no PR.
  - **Per-run report appended to the story file** — new `## Autonomous run — <ISO>` section covering outcome (`done` / `blocked` / `aborted`), autonomous decisions taken, files touched, test/lint summary, and blockers when applicable. Append-only across repeated runs — every autonomous invocation stacks a new section; prior sections are preserved verbatim.
  - **Compact terminal summary** — a `Mode: autonomous` line at the start of the run and a bullet-list summary at the end (interactive mode is silent — no `Mode:` line — matching v0.8.0 behavior byte-for-byte).
- **`/conclave-sprint` Phase 2 always forces autonomous mode** — regardless of `commands.dev.interactive` in `config.md`. Sprint dispatches are inherently batched; per-story prompts would freeze the batch. Each per-story `## Autonomous run —` section records `Config source: forced by /conclave-sprint Phase 2` so the driver is auditable.
- **New template `skills/conclave/templates/autonomous-run.template.md`** — the run-report section format the orchestrator renders and appends to the story file. Fully documented in-file with a placeholder legend covering all fallbacks (early aborts, missing subagent payload fields, blockers subsection conditional rendering).
- **New Developer-subagent operating mode** — `skills/conclave/agents/developer.md` gains a "How you operate in autonomous mode" section documenting the `AUTONOMOUS_ABORT` contract, the default catalog (test framework selection, ADR-mandated patterns, canonical scenario interpretations, established directory conventions), and the four hard abort scenarios.
- **Value coercion for `commands.dev.interactive`** — the config field accepts `true`/`false` (boolean), `"true"`/`"false"` (strings, case-insensitive), and `0`/non-zero integers with a `WARNING:` line. Boolean is documented and unambiguous; other shapes fall back with the warning so a mistyped config never silently changes behavior.

### Changed
- `skills/conclave/templates/config.template.md` — new optional `commands:` YAML block (commented-out defaults) alongside the existing `models:` and `ceremonies:` blocks; new `## Command configuration` prose section with the coercion table.
- `commands/conclave-dev.md` — CLI argument parse now extracts `--no-interaction` / `--headless` from the arg list before positional IDs; new Step 1.5 resolves `INTERACTIVE` from config and CLI; every existing `AskUserQuestion` site branches on `INTERACTIVE` (assignee mismatch, existing-branch handling); Step 6 prepends an autonomous-mode preamble to the subagent task and handles `AUTONOMOUS_ABORT` / error / structured-payload return paths; new Step 8.5 emits the run-report section on autonomous runs; Step 9 has interactive and autonomous variants.
- `commands/conclave-sprint.md` Phase 2 dispatch hard-codes `INTERACTIVE = false` in the per-story task prompt; documents the Config-source-string convention for the appended run-report sections.
- `.claude-plugin/plugin.json` and `marketplace.json` — version bumped to `0.9.0`; marketplace description notes the autonomous mode capability.

## [0.8.0]

### Added
- **`/conclave-story` (PM story authoring)** — four sub-actions the human PM can invoke between `/conclave-spec` runs to keep the backlog alive:
  - `new` — allocates the next monotonic `US-NNN` and authors a story + acceptance file. User picks whether it lands in `conclave/product/stories-backlog/` (backlog-only) or is also pulled into the active sprint.
  - `edit US-NNN` — revises a `ready` or `backlog` story per the user's stated change. Preserves the story ID and any frontmatter fields the user did not touch.
  - `split US-NNN` — decomposes a parent story into 2, 3, or 4 children. The PM subagent enforces a hard scenario-coverage rule **during proposal generation** — if any parent Gherkin scenario cannot be assigned to a child under the given axis, the split is refused with `SPLIT_UNSAFE:` and no files are written. Parent becomes `status: retired` with `superseded_by: [US-CHILD_1, ...]`.
  - `retire US-NNN` — mechanical frontmatter update, no LLM call. Sets `status: retired`, `retirement_reason`, `retired_at`. Refused on stories past `ready` (in-progress / review / verified / done) because retiring shipped or actively-implemented work would be dishonest.
  Every action is available in every `team_mode` (solo, lean, full-scrum). None of them commit, push, or open a PR — the user runs `git commit` and `gh pr create` after reviewing.
- **`/conclave-adr` (TL ADR authoring)** — two modes:
  - Topic-directed: `/conclave-adr "<decision>"` has the Tech Lead research the decision (read-only exploration of the codebase, `architecture.md`, and existing ADRs) and write a full ADR file at `conclave/product/adr/ADR-NNN-<slug>.md`.
  - Discovery: `/conclave-adr` (no args) has the TL propose 1–3 candidate decisions from gaps in `architecture.md` + open questions raised by sprint stories. User picks one via `AskUserQuestion`; the flow continues as topic-directed. If nothing surfaces, the command exits cleanly with `No ADR candidates surfaced`.
  Every new ADR is `status: proposed`; team promotes to `accepted` on PR merge.
- **New terminal story state `retired`** — parallel terminal to `done`. Excluded from every command's story collection (`/conclave-planning`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`, `/conclave-sprint`). `/conclave-spec` is intentionally exempt from the filter (it authors new stories rather than collecting existing ones). Documented in `SKILL.md` §6 and `story.template.md`.
- **New optional story-frontmatter fields** — `retirement_reason`, `retired_at`, `superseded_by`, `split_from`. All optional; pre-0.8.0 story files are unaffected.
- **New template `skills/conclave/templates/adr.template.md`** — ADR file format modelled on this repo's own `docs/adr/ADR-001-...md`. Includes YAML frontmatter (`id`, `title`, `status`, `date`, `deciders`, `tags`, `supersedes`, `superseded_by`) and body sections (Context / Decision / Alternatives Considered / Trade-offs / Consequences / Links).
- **New standalone-ADR directory in target repos**: `conclave/product/adr/`. Created lazily on first `/conclave-adr` invocation. Numbering is monotonic and never reused.
- **New backlog-only story directory in target repos**: `conclave/product/stories-backlog/`. Home for stories that exist in `backlog.md` but are not yet pulled into any sprint. Created lazily by `/conclave-story new` when the user picks "backlog only".
- **Inline-ADR migration** — the first `/conclave-adr` run in a repo with pre-0.8.0 inline `### ADR-NNN:` sections in `architecture.md` extracts each to a standalone file under `adr/`, updates section 4 to a referenced-ADR table, and is idempotent + resumable: interrupted runs can be resumed by re-invoking the command (per-ADR existence check detects already-extracted ADRs and skips them). Migrated ADRs get `status: accepted` (the team already acted on them by shipping the architecture) and `date: "unknown"` (or the best-effort first-add date from `git log`).

### Changed
- `skills/conclave/templates/architecture.template.md` — section 4 restructured from inline `### ADR-NNN:` blocks to a **referenced-ADR table** with rows linking to `adr/ADR-NNN-<slug>.md`. New section 7 documents `/conclave-adr` and the `status: proposed → accepted → superseded` lifecycle.
- `skills/conclave/agents/product-manager.md` — gains a "How you operate inside `/conclave-story`" section with sub-contracts for `new`, `edit`, and `split` (including the hard scenario-coverage rule for splits).
- `skills/conclave/agents/tech-lead.md` — gains a "How you operate inside `/conclave-adr`" section covering topic-directed authoring, discovery mode, and hard rules (always `proposed`, cite evidence, ground in confirmed stack, distinct discovery titles).
- `skills/conclave/templates/story.template.md` — status enum extended to include `retired`; four optional retirement / lineage frontmatter fields documented; state-transitions prose extended.
- `skills/conclave/templates/product-backlog.template.md` — legend updated to include `retired` and reference the exclusion rule.
- `commands/conclave-planning.md`, `commands/conclave-dev.md`, `commands/conclave-qa.md`, `commands/conclave-pr-review.md`, `commands/conclave-sprint.md` — each gains a one-line filter to exclude `status: retired` stories from its collection queries or its status guards. `/conclave-spec` is not modified.
- `.claude-plugin/plugin.json` and `marketplace.json` — version bumped to `0.8.0`; marketplace description mentions the two new commands.

## [0.7.0]

### Added
- **Model configuration per role subagent**: teams can now declare, once in `conclave/config.md`, which Claude model each role subagent uses. Add an optional `models:` block to the YAML frontmatter with a `default` (fallback for every role) and per-role `overrides` (`product_manager`, `tech_lead`, `scrum_master`, `developer`, `designer`, `devops`, `qa`). Every command reads this block and passes the resolved `model` parameter to its `Agent` tool calls. Existing installs without a `models:` block continue to behave exactly as before — the absent block is a silent no-op.
- **`/conclave-sprint`**: new command that drives an entire active sprint end-to-end in one invocation. Phase 1 runs sprint planning if the sprint is still `draft`. Phase 2 dispatches all `ready` stories via the batch-of-3 dev pattern. Phase 3 dispatches all `review` stories via the batch-of-3 QA pattern. Phase 4 dispatches all `verified` stories through the Tech Lead PR-review gate (skipped when `peer_pr_review.required: false`). Each phase prints a header and story count before dispatching; failures are isolated per story and do not block other stories. Final sprint summary table shows starting → final status for every story touched.

### Changed
- All commands that spawn Agent subagents (`/conclave-planning`, `/conclave-spec`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`) now resolve and apply the configured model for their respective roles. Invalid model names produce a `WARNING:` line and fall back gracefully rather than failing.
- `skills/conclave/templates/config.template.md` — new `models:` YAML block (commented-out defaults) and `## Model configuration` prose section added.

## [0.6.0]

### Added
- `/conclave-dev` and `/conclave-qa` now accept multiple space-separated `US-NNN` arguments in a single invocation (`/conclave-dev US-001 US-002 US-003`, `/conclave-qa US-004 US-005`). Each story runs on its own independent branch with its own PR; stories are dispatched in concurrent batches of ≤ 3 (all Agent calls within a batch fire in the same message). The single-story path (`/conclave-dev US-001`) is fully backward-compatible — no change in behaviour, output, or syntax.
- Upfront validation wave before any Agent call is dispatched: all stories are checked for existence, `ready`/`review` status, and branch conflicts at once. A single validation failure refuses the entire invocation with a per-story error table.
- Failure isolation per story: if one story's subagent fails mid-batch, the other stories in the batch complete normally. The failed story is reset to `status: ready` (dev) and its error is reported in the final summary table.
- Final summary table printed after all batches complete, showing per-story branch, PR URL (or error), and outcome.

### Changed
- `/conclave-dev` guardrail updated: now refuses a story only if that exact `US-NNN` is already `in-progress` on an existing branch — not because other stories are concurrently in-progress on other branches. Parallel stories on separate branches are explicitly permitted.
- `skills/conclave/SKILL.md` §3 role-to-subagent table updated to show the multi-story command signatures (`US-NNN [US-NNN ...]`) and the batch-of-3 concurrency note.

## [0.5.0]

### Added
- New `/conclave-board` command: one-time scaffold of a local, branded Kanban board (Next.js + shadcn/ui + Tailwind, Poppins) at `conclave-board/`, a sibling directory of `conclave/` — not inside it, preserving the markdown-only invariant. Columns mirror the existing story status machine (`backlog | ready | in-progress | review | verified | done`); cards show ID, title, discipline, assignee (resolved against `roster.md`), priority, estimate, and sprint.
- New `conclave/team/board.md`, rendered by `/conclave-board` — the one config surface for company branding (name, logo, primary/accent colors). No secrets; the board's font is fixed to Poppins, not configurable.
- New plugin hook (`hooks/hooks.json` + `hooks/regenerate-board-data.sh`): fires on every `Write`/`Edit` tool call, and — only when the touched path is under `conclave/` and the current repo has a scaffolded board — re-runs a deterministic, non-LLM Node script (`conclave-board/scripts/generate-data.mjs`) that re-parses every story/sprint/roster file into `conclave-board/data/board-data.generated.json`. The board's dev server hot-reloads to reflect it. No-ops cleanly (and never fails the underlying tool call) in every other repo.
- The board is read-only: it never writes back to `conclave/`. Story-status changes still only happen through `/conclave-dev`, `/conclave-qa`, and `/conclave-pr-review`.
- No CI pipeline, no hosting, no cross-machine sync — the board runs locally via `npm run dev`/`npm run build && npm run start` on each teammate's own machine.
- Board UI refined to a Jira-like visual language: colored issue-type icons per discipline, colored priority chevrons, story-point circles, deterministic per-person avatar colors, compact card shadows, and a tab-style sprint switcher with a done/total progress bar. Columns render as an equal-width grid (`grid-cols-6`) so the board never needs horizontal scrolling, regardless of viewport width.

## [0.4.0]

### Added
- Docs site: new "Team example" page walking through a worked, multi-developer scenario — several people, each running Claude Code locally, coordinating a full sprint (bootstrap, planning, and the fully-parallel per-story loop) purely through git, with a note on the few files/ceremonies that still need to be sequential.
- Docs site: bilingual EN/ES. Content now lives under `content/en/` and `content/es/`, routed through an `app/[lang]/` App Router segment (Nextra's own i18n split, not Next.js's built-in i18n routing — incompatible with `output: "export"`). The bare `/` route auto-detects a locale from a previous manual choice (the cookie `nextra-theme-docs`' own language dropdown sets) or the browser's language list, falling back to English, and redirects client-side. Every doc page carries a language switcher in the navbar.

### Changed
- `next.config.mjs` gains `i18n: { locales: ["en", "es"], defaultLocale: "en" }` (read by Nextra only — it strips this before Next.js sees it) and `unstable_shouldAddLocaleToLinks: true` so Nextra's own sidebar/pagination links carry the locale prefix.

### Fixed
- `next.config.mjs` gains `trailingSlash: true`. Without it, `output: "export"` wrote each route as a flat file (`en.html`) instead of a directory with an index (`en/index.html`) — GitHub Pages 404'd on the trailing-slash URL (`/conclave/en/`) that the root redirect page and every internal link produce, even though the slash-less form resolved fine.

## [0.3.0]

### Added
- QA-generated UAT test suites, run through the target repo's own CI: `/conclave-qa` now generates and pushes a Playwright spec (`frontend`/`multi` stories), merges endpoints into one evolving project-wide Postman collection run via Newman (`backend`/`multi` stories), and produces a `tests/uat/US-NNN-UAT.md` report for every discipline — a manual functional checklist for `mobile` stories, since no automated mobile runner ships in this phase.
- New `mobile` discipline value, routed to `developer.md` in `/conclave-dev` (same bucket as `frontend`/`backend`) — only QA branches on it for a distinct manual UAT strategy.
- New `conclave/team/testing-environments.md`, rendered by `/conclave-init` as a placeholder — declares the CI environment-variable and secret **names** the generated UAT tests read. QA never resolves, reads, or writes a secret value itself; the target repo's own CI does, from its own secrets store.
- New `verdict: pending_uat` outcome, distinct from `blocked`: a mobile checklist that's just been generated or is still incomplete is not a defect, so the story stays in `review` with a `## QA pending` section instead of `## QA blockers`.
- New `ceremonies.qa_verification.ci_wait_timeout_minutes` config field (default `20`) bounding how long a single `/conclave-qa` run polls CI before treating "no conclusion yet" as blocked.
- New templates: `testing-environments.template.md`, `uat-report.template.md`.

### Changed
- `/conclave-qa` is restructured into generate-artifacts → push → wait-for-CI → verify, instead of a single Gherkin/DoD read-through. A CI failure or timeout on the generated UAT tests is treated exactly like a failing Gherkin scenario — never silently passed.
- QA's guardrails now carve out `tests/uat/*` as a second location QA may write to (alongside `conclave/` and the acceptance file), plus a narrow, human-confirmed exception to add the one CI job/step that runs `tests/uat/` — broader CI pipeline ownership stays with DevOps.
- `verification-report.template.md` and `definition-of-done.template.md` gain a UAT execution section/item, skipped (not failed) when `testing-environments.md` has no environment configured yet.
- The placeholder `tests/uat/US-NNN-UAT.md` shell QA writes for `frontend`/`backend`/`multi` stories before pushing is rewritten with the real `CI_RESULT`/run URL once CI concludes, so the file never stays a blank shell — the `mobile` variant is never touched this way, since that file belongs to the human tester.
- Backward-compatible: a `testing-environments.md` that doesn't exist yet, or is still all `TBD`, is not a hard failure — `/conclave-qa` verifies acceptance criteria exactly as it did before this release.

## [0.2.0]

### Added
- Discipline-first roster (Tech Lead, Frontend, Backend, QA, Designer, DevOps) replacing the fixed five-Scrum-role model. Product Manager and Scrum Master become optional process roles (ADR-001).
- Explicit solo/team setup in `/conclave-init`, collecting real names/handles per discipline instead of leaving roster placeholders.
- `discipline` field on stories, assigned by the Tech Lead during `/conclave-planning`, routing `/conclave-dev` to `developer.md`, `designer.md`, or `devops.md`.
- New `designer.md` and `devops.md` agent charters.
- Docs site rebuilt on Next.js 16 + Nextra 4 (single locale), covering the full plugin: methodology, roles, profiles, configuration reference, story state machine, a solo-vs-team workflow map, and per-command reference pages.
- GitHub Pages deploy workflow for the docs site.

### Changed
- Backward-compatible: a `roster.md` predating the `Discipline` column degrades gracefully — every member is treated as `multi`-discipline with a one-time warning, no hard failure.

## [0.1.0]

### Added
- Initial release: `/conclave-init`, `/conclave-spec`, `/conclave-planning`, `/conclave-dev`, `/conclave-qa`, `/conclave-pr-review`.
- Five Scrum-role charters: Product Manager, Tech Lead, Scrum Master, Developer, QA.
- Team profiles (`lean` / `full-scrum` / `custom`) with two always-required structural gates (Sprint Planning, QA Verification).
