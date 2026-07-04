# Changelog

All notable changes to the Conclave plugin are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
