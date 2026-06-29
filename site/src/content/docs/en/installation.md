---
title: Installation
description: Install Conclave as a Claude Code plugin via the directory marketplace.
category: overview
order: 2
lang: en
---

# Installation

Conclave ships as a Claude Code plugin via a directory marketplace.

## Prerequisites

- **Claude Code** installed and authenticated.
- **git** available on the command line.
- **gh** (GitHub CLI) recommended — Conclave commands use it to open PRs and review them, but they degrade to "print the command" if `gh` is missing.

## Install in two commands

```bash
claude plugin marketplace add lucasgio/conclave
claude plugin install conclave@conclave
```

Then **restart Claude Code** so the slash commands register.

You can confirm the install with:

```bash
claude plugin list
```

You should see:

```
❯ conclave@conclave
  Version: 0.1.0
  Scope: user
  Status: ✔ enabled
```

## Verify the install

Open Claude Code in any repo and type `/conclave`. The autocomplete should list the six commands:

- `/conclave-init`
- `/conclave-spec`
- `/conclave-planning`
- `/conclave-dev`
- `/conclave-qa`
- `/conclave-pr-review`

If they don't appear, run `claude plugin list` to confirm the plugin is enabled, then restart the session.

## Updating

The marketplace points at the GitHub repo; to pull the latest version:

```bash
claude plugin update conclave
```

## Uninstalling

```bash
claude plugin uninstall conclave@conclave
claude plugin marketplace remove conclave
```

This removes the plugin from your machine. Any `conclave/` directories already committed to your project repos stay where they are — they are just markdown, after all.
