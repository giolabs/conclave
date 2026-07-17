# Conclave for Cursor (`conclave-cursor`)

This directory is the **Cursor** installable package for Conclave (plugin name: `conclave-cursor`). It is the sibling of the Claude Code plugin at the repository root (`conclave`). Both packages share the same target-repo `conclave/` markdown contract (ADR-002).

**Do not hand-edit** `skills/conclave/SKILL.md` or `skills/conclave/templates/` here — they are synced from the canonical tree via:

```bash
./scripts/sync-cursor-platform.sh
./scripts/sync-cursor-platform.sh --check   # CI / release freshness
```

Commands (`commands/`) and agents (`agents/`) are **ported** (Cursor primitives: `Task`, `AskQuestion`). Re-generate after large Claude Code ceremony changes with `./scripts/generate-cursor-platform.sh` (then re-apply any intentional Cursor-only edits).

## Install (local)

**New Cursor-only user?** Start from the repo root checklist: [Cursor from scratch](../../README.md#cursor-from-scratch) (clone plugin → install → Reload → bootstrap **your app** repo).

Preferred reliable path — **copy** into Cursor’s local plugins dir (external symlinks to this repo are often rejected):

```bash
# From the Conclave repo root:
./scripts/install-cursor-local.sh

# Or manually:
./scripts/sync-cursor-platform.sh
mkdir -p ~/.cursor/plugins/local
rsync -a --delete "$(pwd)/platforms/cursor/" ~/.cursor/plugins/local/conclave-cursor/
```

Then:

1. Enable **Include third-party Plugins, Skills, and other configs** if your Cursor build requires it.
2. Run **Developer: Reload Window**.
3. Confirm `/conclave-init` (and other `/conclave-*` commands) appear in Agent chat.

### Team / Enterprise

If nothing loads after a correct `rsync` + reload, check Cursor plugin logs for `userLocal=false` and ask your org admin to allow local/third-party plugins. That is an environment block, not a Conclave packaging bug.

### Symlink note

Cursor docs mention `ln -s … ~/.cursor/plugins/local/conclave-cursor`. Symlinks whose target lies **outside** `~/.cursor/plugins/local/` are frequently rejected. Prefer `rsync` / `install-cursor-local.sh`.

## Hooks (best-effort)

`hooks/hooks.json` wires `afterFileEdit` → `scripts/regenerate-board-data.sh`. Payload shapes differ from Claude Code’s `PostToolUse`; the script always exits 0 and may no-op. **`/conclave-board` remains authoritative** for scaffolding and data generation.

## Version

Lockstep with the Claude Code plugin: **0.11.0**.
