# Changelog

All notable changes to the Conclave plugin are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
