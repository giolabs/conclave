# Contributing to Conclave

Thank you for your interest in Conclave. This document explains how to contribute safely and effectively.

## Table of contents

- [Code of conduct](#code-of-conduct)
- [How Conclave works — read this first](#how-conclave-works--read-this-first)
- [Security model and prompt safety](#security-model-and-prompt-safety)
- [Types of contributions](#types-of-contributions)
- [Development setup](#development-setup)
- [Pull request process](#pull-request-process)
- [Commit style](#commit-style)
- [Docs site](#docs-site)
- [Questions](#questions)

---

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold it. Report unacceptable behaviour to **iosvany.alvarez@giolabs.com.uy**.

---

## How Conclave works — read this first

Conclave is a **Claude Code plugin**. Its core is plain markdown:

| Path | What it is |
|---|---|
| `commands/conclave-*.md` | Slash-command orchestrators — numbered prose steps that Claude executes |
| `skills/conclave/agents/*.md` | Role charters — system-prompt context loaded into each subagent |
| `skills/conclave/templates/*.template.md` | Artifact templates with `{{placeholder}}` substitution |
| `platforms/cursor/` | Cursor mirror of the same methodology |
| `site/` | Next.js + Nextra documentation site |

Every file under `commands/`, `skills/`, and `platforms/cursor/skills/` is **executed as an AI instruction**. Changes to these files directly affect what Claude does on behalf of users.

---

## Security model and prompt safety

> **This is the most important section for contributors.**

Because Conclave's source files are AI instructions, a malicious or careless change is a **prompt injection** — it could cause Claude to behave unexpectedly inside any repo that has the plugin installed.

The project enforces these safeguards:

1. **All changes go through a pull request.** Direct pushes to `main` are blocked. There are no exceptions.
2. **Every PR that touches `commands/`, `skills/`, or `platforms/cursor/skills/` is reviewed by a maintainer** before merging (see [CODEOWNERS](.github/CODEOWNERS)).
3. **No PR may add a step that** (a) exfiltrates data to an external URL, (b) executes arbitrary shell commands beyond the `allowed-tools` list already declared in the command's frontmatter, (c) reads files outside the target repo, or (d) bypasses the two-gate rule (Sprint Planning + QA Verification).
4. **`allowed-tools` lists are minimal and explicit.** If your contribution needs a new tool (e.g. a new `Bash(...)` subcommand), justify it in the PR description.
5. **Templates never call external services.** The `{{placeholder}}` system is substitution-only — no eval, no fetch, no side effects.

If you believe a **merged change** violates these rules, report it privately via [SECURITY.md](SECURITY.md) rather than opening a public issue.

---

## Types of contributions

| Type | Welcome? | Notes |
|---|---|---|
| Bug fix in an existing command | Yes | Write a clear reproduction in the PR description |
| New slash command | Yes | Follow the spec-driven process below |
| New role charter or template | Yes | Must have a corresponding command that uses it |
| Docs site improvements | Yes | `site/content/en/` and `site/content/es/` (keep bilingual) |
| Translating docs to a new language | Yes | Open an issue first to coordinate |
| Bumping npm dependencies in `site/` | Yes | Check that `npm run build` still passes |
| Adding a new `allowed-tools` entry | Yes, with justification | Explain why the tool is needed and what it does |
| Changing the `conclave/` directory contract | Yes, with an ADR | Open an issue first; contract changes affect all installs |
| Removing an existing command | Discuss first | Open an issue; commands may be in active use |

### Spec-driven process for new commands

Conclave is developed spec-first. For any new command:

1. Open an issue describing the command — what problem it solves, which role it serves, what artifacts it reads/writes.
2. Wait for maintainer feedback before writing code.
3. When given the go-ahead, write a spec in `docs/specs/<feature-name>/spec.md` following the 20-section format in `docs/specs/pm-story-tl-adr-authoring/spec.md`.
4. Submit the spec as a draft PR for review.
5. Implement once the spec is approved.

---

## Development setup

There is no build step for the plugin itself — `commands/` and `skills/` are markdown files read directly by Claude Code.

### Install locally (Claude Code)

```bash
git clone https://github.com/giolabs/conclave
ln -s "$(pwd)/conclave" ~/.claude/plugins/conclave
# restart Claude Code
```

### Install locally (Cursor)

```bash
bash scripts/install-cursor-local.sh
# restart Cursor
```

### Docs site

```bash
cd site
npm ci
npm run dev    # dev server at http://localhost:3000/conclave/en/
npm run build  # must pass before opening a docs PR
```

The docs site pins `nextra` and `nextra-theme-docs` to exact versions — do not bump them without checking [CLAUDE.md](CLAUDE.md).

---

## Pull request process

1. **Fork** the repo and create a branch from `main`.
2. **Make your change.** Keep each PR focused on one thing.
3. **Update docs** if your change affects anything described in `site/content/`, `CHANGELOG.md`, `skills/conclave/SKILL.md`, or `README.md`.
4. **Add a `CHANGELOG.md` entry** under `## [Unreleased]` — even for small changes.
5. **Open the PR** against `main`. Fill in the PR template.
6. **A maintainer reviews.** PRs touching prompt files (`commands/`, `skills/`, `platforms/cursor/skills/`) get extra scrutiny — this is normal and expected.
7. **Address review comments.** The PR is merged once approved.

### What reviewers look for

- Does the change match what the PR description says it does?
- For prompt changes: does it stay within the declared `allowed-tools` list? Does it respect the `conclave/` directory contract? Could it be read as an instruction to exfiltrate data or bypass safety gates?
- For docs: are EN and ES both updated? Does `npm run build` pass?
- Is there a `CHANGELOG.md` entry?

---

## Commit style

```
<type>: <short summary>

<optional body>
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `brand`.

Examples:
```
feat: add --dry-run flag to /conclave-sprint
fix: exclude retired stories from /conclave-planning collection
docs: add ES translation for /conclave-dora page
```

Keep the summary under 72 characters. Reference issues with `Fixes #NNN` in the body when applicable.

---

## Docs site

- Content lives in `site/content/en/` (English) and `site/content/es/` (Spanish).
- If you add or change a page in one language, update the other too.
- Technical terms (sprint, backlog, PR, ADR, Gherkin) stay in English even in Spanish content.
- Run `npm run build` from `site/` before submitting — the CI job also runs it and will block the PR if it fails.

---

## Questions

- **General questions**: open a [GitHub Discussion](https://github.com/giolabs/conclave/discussions).
- **Bug reports**: open a [GitHub Issue](https://github.com/giolabs/conclave/issues) using the bug report template.
- **Security issues**: see [SECURITY.md](SECURITY.md) — do **not** open a public issue.
- **Private contact**: iosvany.alvarez@giolabs.com.uy
