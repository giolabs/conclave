## Autonomous run — {{iso_timestamp}}

- **Outcome**: {{outcome}}
- **Branch**: `{{branch}}`
- **PR**: {{pr_url_or_dash}}
- **Duration**: {{duration_human}}
- **Runner**: {{runner_name}} ({{runner_email}})
- **Config source**: {{config_source}}

### Autonomous decisions

{{autonomous_decisions_bullets_or_none}}

### Files touched

{{files_touched_bullets_or_none}}

### Tests

- Gherkin scenarios covered: {{scenarios_covered}}/{{scenarios_total}}
- Suite: `{{test_command}}` → {{test_pass_count}} pass, {{test_fail_count}} fail
- Lint: {{lint_summary}}

{{blockers_section_or_omit}}

<!--
Template placeholder legend (not rendered — for the orchestrator):

- `{{outcome}}` — one of `done` | `blocked` | `aborted`.
- `{{pr_url_or_dash}}` — the PR URL when outcome == done; the literal string `—` otherwise.
- `{{duration_human}}` — e.g. `4m 22s`.
- `{{config_source}}` — one of:
    - `config.md commands.dev.interactive = false`
    - `--no-interaction CLI flag`
    - `forced by /conclave-sprint Phase 2`
- `{{autonomous_decisions_bullets_or_none}}` — one bullet per entry from the subagent's `autonomous_decisions` payload
  (`- <decision>: <chosen> — <reason>`), or the single line `- (none)` when the list is empty.
- `{{files_touched_bullets_or_none}}` — one bullet per file (`- \`<path>\` (<change_type>, <lines> lines)`),
  or `- (none)` on abort-before-write, or `- (none — aborted before code writes)` when applicable.
- `{{test_command}}`, `{{test_pass_count}}`, `{{test_fail_count}}`, `{{scenarios_covered}}`, `{{scenarios_total}}` —
  from the subagent's final payload. Zero out sensibly on abort (`0/0`, `n/a`).
- `{{lint_summary}}` — e.g. `0 warnings` or `3 warnings (see run log)`.
- `{{blockers_section_or_omit}}` — when outcome is `done`, omit this entire subsection. Otherwise render:
    ```
    ### Blockers

    - <blocker_line>
    ```
  where blocker_line is either the verbatim `AUTONOMOUS_ABORT: <reason>` line, or `Test suite failure: <summary>`,
  or `Agent tool error: <upstream>`, or `Push failed: <git error>` — whichever applies.

Append-only invariant: multiple autonomous runs on the same story stack their `## Autonomous run — <iso>`
sections in order. Never delete or edit prior sections; git history is the audit trail.
-->
