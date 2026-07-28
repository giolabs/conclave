# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| v1.0.x (latest) | Yes |
| < v1.0 | No |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Conclave's source files are AI instructions executed by Claude Code. A vulnerability in a command or role charter could cause Claude to behave maliciously inside any repo that has the plugin installed — this warrants private disclosure.

### How to report

Send an email to **iosvany.alvarez@giolabs.com.uy** with:

- A description of the vulnerability and the file(s) involved.
- Steps to reproduce or a proof-of-concept (if applicable).
- The potential impact — what could an attacker cause Claude to do?
- Whether you believe the issue is already being exploited.

You will receive an acknowledgement within **48 hours** and a status update within **7 days**.

### What happens next

1. We confirm the vulnerability and assess severity.
2. We develop and test a fix in a private branch.
3. We publish the fix and credit you in the release notes (unless you prefer to remain anonymous).
4. We disclose the vulnerability publicly after the fix is available (coordinated disclosure).

## Scope

Issues we consider in-scope:

- **Prompt injection** — a change to `commands/`, `skills/`, or `platforms/cursor/skills/` that causes Claude to exfiltrate data, execute unauthorized commands, read files outside the target repo, or bypass the QA/TL approval gates.
- **Dependency vulnerabilities** in `site/` that could be exploited via the GitHub Pages deployment.
- **Supply-chain** risks in the plugin bootstrap flow.

Out of scope:

- Theoretical risks with no viable exploit path.
- Issues in Claude's own model behaviour (report those to Anthropic).
- Vulnerabilities in repos that *use* Conclave but are unrelated to the plugin source.

## Security design notes

- All changes to prompt files require a maintainer PR review (enforced by `CODEOWNERS` and branch protection).
- `allowed-tools` lists in command frontmatter are minimal and explicit — they declare exactly which shell subcommands and tools each command may use.
- Templates are substitution-only (`{{placeholder}}` replaced by the orchestrator) — they never call external services or evaluate code.
- Conclave never merges pull requests autonomously; merge decisions are always made by a human.
