---
entity_id: "{{entity_id}}"         # US-NNN or BUG-NNN — the story or bug this lab test guards
entity_type: "{{story|bug}}"
entity_title: "{{entity_title}}"
generated_by: tech-lead
generated_at: "{{iso_timestamp}}"
integration_branch: "{{integration_branch}}"
runner: "{{runner}}"               # playwright | newman | bash | auto
timebox_minutes: {{timebox_minutes}}
status: pending                    # pending | passed | failed | blocked
last_run_at: null
last_run_sha: null
---

# Lab Test — {{entity_id}}: {{entity_title}}

## Objective

{{one_sentence_describing_what_this_verifies_in_the_integrated_environment}}

## Pre-conditions

<!-- Everything that must be true in the environment before running the Verify command.
     Be concrete: branch, services that must be running, seeded data, env vars (names only — never values). -->

- [ ] Branch `{{integration_branch}}` is checked out and up to date (`git pull origin {{integration_branch}}`)
- [ ] {{precondition_2}}

## Verify command

```bash
{{executable_verify_command}}
```

**Expected exit code:** 0

**Expected output contains:** `{{expected_output_pattern}}`

<!-- The command must be runnable verbatim in the configured environment without modification.
     If the runner is playwright: `npx playwright test <file>` or the repo's test script.
     If the runner is newman: `newman run tests/uat/api-collection.postman_collection.json ...`
     If the runner is bash: a self-contained script referencing env var NAMES only (never values).
     If the runner is auto: pick the command based on the detected stack.
     Reference only files that already exist in the repo, or that the dev is expected to create as part of the fix/story. -->

## Decision rule

- **Pass:** exit code 0 AND output matches the expected pattern above → the fix/story works end-to-end in the integrated state.
- **Fail:** any other exit code OR output does not match → the fix is incomplete, or the story introduced a regression.

## Scope

**This test verifies:** {{what_is_explicitly_in_scope}}

**This test does NOT verify:** {{what_is_explicitly_out_of_scope}}

<!-- "Not verified" is mandatory. Without it, readers assume coverage you never had. -->

## Evidence log

<!-- Filled by the QA agent at execution time. Never edited manually.
     One row per run of /conclave-qa <ID> --lab (stories) or per run of /conclave-qa BUG-NNN (bugs). -->

| Run | SHA | Exit code | Output (first 200 chars) | Result | Timestamp |
|-----|-----|-----------|---------------------------|--------|-----------|
