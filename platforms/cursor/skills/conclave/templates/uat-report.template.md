{{! Rendered as tests/uat/US-NNN-UAT.md in the target repo. Two variants — pick the one matching story.discipline. }}

<!-- frontend / backend / multi variant -->
# UAT — US-{{id}}

- **Discipline:** {{discipline}}
- **CI run:** {{ci_run_url}} — **Result:** {{ci_result}}
- **Suites:** {{suite_list}}

| Scenario | Result | Notes |
|---|---|---|
| {{scenario_1_name}} | {{scenario_1_result}} | {{scenario_1_notes_or_evidence}} |
| {{scenario_2_name}} | {{scenario_2_result}} | {{scenario_2_notes_or_evidence}} |

Legend: `PASS` · `FAIL` (see Notes for the CI log excerpt) · `BLOCKED` (no CI run found, or the run timed out — see Notes).

<!-- mobile variant -->
# UAT — US-{{id}} (manual)

- **Discipline:** mobile
- **Tester:** _(fill in)_
- **Date:** _(fill in)_

| # | Scenario | Steps | Checked | Result |
|---|---|---|---|---|
| 1 | {{scenario_1_name}} | {{scenario_1_manual_steps}} | ☐ | _(PASS/FAIL)_ |
| 2 | {{scenario_2_name}} | {{scenario_2_manual_steps}} | ☐ | _(PASS/FAIL)_ |

**Overall result:** _(PASS/FAIL — fill in once every case above is checked, then commit and re-run `/conclave-qa US-{{id}}`)_

**Tester notes:** _(anything relevant to a FAIL — what happened, how to reproduce)_
