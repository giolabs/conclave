---
story: "US-{{id}}"
sprint: "{{sprint_id}}"
generated_at: "{{iso_date}}"
---

# AC-US-{{id}}: Acceptance criteria for {{title}}

> Every scenario below must pass before the story can be marked `done`. The QA agent runs these scenarios end-to-end and appends a verification report at the bottom.

## Scenario 1: {{scenario_1_name}}

**Given** {{precondition_1}}
**When** {{action_1}}
**Then** {{expected_result_1}}

## Scenario 2: {{scenario_2_name}}

**Given** {{precondition_2}}
**When** {{action_2}}
**Then** {{expected_result_2}}

## Scenario 3: {{scenario_3_name}}

**Given** {{precondition_3}}
**When** {{action_3}}
**Then** {{expected_result_3}}

---

## Verification reports

> QA appends one section per verification run. Do not delete past runs — they are the story's audit trail.

<!-- Example structure (filled in by /conclave-qa, planned, not yet shipped):
## Verification — YYYY-MM-DD

- Commit tested: <sha>
- Environment: <local | staging | ci>
- Scenario 1: PASS
- Scenario 2: PASS
- Scenario 3: FAIL — <reason and reproduction>

### Verdict
- [ ] All scenarios pass
- [ ] DoD met
- [ ] Approved
-->
