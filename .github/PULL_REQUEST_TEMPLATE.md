## Summary

<!-- What does this PR do? One paragraph or a short bullet list. -->

## Type of change

- [ ] Bug fix
- [ ] New feature / command
- [ ] Docs update
- [ ] Refactor / cleanup
- [ ] Dependency bump
- [ ] Chore (CI, tooling, config)

## Prompt safety checklist (required for changes to `commands/`, `skills/`, `platforms/cursor/skills/`)

> Skip this section if your PR does not touch any of those paths.

- [ ] No new step exfiltrates data to an external URL or service
- [ ] No new `Bash(...)` tool is used without being declared in the command's `allowed-tools` frontmatter
- [ ] No step reads files outside the target repo's working directory
- [ ] The QA verification gate and TL approval gate are not bypassed
- [ ] The `conclave/` directory contract (markdown-only, append-not-clobber, monotonic IDs) is respected

## General checklist

- [ ] `CHANGELOG.md` updated under `## [Unreleased]`
- [ ] Relevant docs pages updated (`site/content/en/` **and** `site/content/es/`)
- [ ] `skills/conclave/SKILL.md` updated if the directory contract or role table changed
- [ ] `README.md` updated if the shipped-commands list or install steps changed
- [ ] `npm run build` passes in `site/` (for docs changes)

## Testing

<!-- How did you verify this works? Include the command you ran and what you observed. -->

## Related issues

<!-- Closes #NNN -->
