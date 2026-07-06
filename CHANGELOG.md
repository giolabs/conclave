# Changelog

All notable changes to the Conclave plugin are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
