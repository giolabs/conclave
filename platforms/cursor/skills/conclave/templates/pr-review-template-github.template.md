# PR Review — {{pr_title}}

**Reviewer:** <!-- name -->
**Date:** <!-- YYYY-MM-DD -->
**Story / Bug:** <!-- US-NNN or BUG-NNN -->
**Branch:** `{{branch}}` → `{{base_branch}}`

---

## Checklist

### Code Quality
- [ ] Code is readable and follows project conventions (`CLAUDE.md`)
- [ ] No magic numbers or hardcoded strings without justification
- [ ] Error handling is appropriate for the scope
- [ ] No obvious performance issues introduced

### Architecture Alignment
- [ ] Changes respect `conclave/product/architecture.md`
- [ ] No ADR violations (or deviations are explicitly listed in the PR body)
- [ ] No new dependencies without prior discussion

### Testing
- [ ] Unit tests cover the new logic
- [ ] UAT scenarios in `tests/uat/` match the acceptance criteria
- [ ] No regressions introduced in adjacent modules

### Security
- [ ] No secrets, tokens, or credentials committed
- [ ] Input validation at system boundaries
- [ ] No SQL injection / XSS / command injection vectors introduced

### QA Gate
- [ ] QA verification passed (`conclave/sprints/.../acceptance/AC-US-NNN.md` has a `## Verification` block)
- [ ] CI checks are green

---

## Findings

| # | Severity | Location | Description |
|---|----------|----------|-------------|
| 1 | Blocker / Non-blocking | `file.ts:42` | |

---

## Verdict

- [ ] **Approved** — ready to merge
- [ ] **Request changes** — see findings above
- [ ] **Comment** — suggestions only, no blocking changes required

---

## Notes

<!-- Any additional context for the author -->
