## Verification — {{iso_date}}

- **Commit tested:** `{{commit_sha}}`
- **PR:** {{pr_link_or_none}}
- **Branch:** `{{branch}}`
- **Environment:** {{environment}}
- **QA:** {{qa_name}}
- **Profile:** {{team_profile}}

### Gherkin scenarios

| # | Scenario | Verdict | Notes |
|---|----------|---------|-------|
| 1 | {{scenario_1_name}} | {{verdict_1}} | {{notes_1}} |
| 2 | {{scenario_2_name}} | {{verdict_2}} | {{notes_2}} |
| 3 | {{scenario_3_name}} | {{verdict_3}} | {{notes_3}} |

Legend: `PASS` (scenario assertion held) · `FAIL` (assertion failed — see Notes) · `BLOCKED` (could not execute — see Notes).

### Edge cases probed

{{edge_cases_section}}

### Definition of Done check

Structural items:
- [{{dod_tests_pass}}] All Gherkin scenarios have passing automated tests
- [{{dod_unit_tests}}] Unit tests cover the new code paths
- [{{dod_suite_passes}}] Full test suite passes
- [{{dod_lint}}] Linter / typechecker clean
- [{{dod_no_arch_deviation}}] No undocumented architectural deviation
- [{{dod_story_status}}] Story frontmatter status correctly updated
- [{{dod_verification_appended}}] Verification report appended (this section)

Conditional items (only checked if the flag in `conclave/config.md` says `required: true`):
- [{{dod_peer_review}}] Peer reviewer has approved *(skipped because `peer_pr_review.required: false`)* — applies only when the flag is on

### Verdict

{{verdict_summary}}

Story status set to: **{{new_story_status}}** *(one of `verified`, `done`, or unchanged `review`)*.

{{action_on_pr}}

> QA does not approve the PR. Code-level approval is the Tech Lead's call via `/conclave-pr-review US-NNN`. This verification covers acceptance criteria + structural DoD only.
