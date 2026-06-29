---
title: Instalación
description: Instalá Conclave como plugin de Claude Code vía el directory marketplace.
category: overview
order: 2
lang: es
---

# Instalación

Conclave se distribuye como plugin de Claude Code vía un directory marketplace.

## Prerrequisitos

- **Claude Code** instalado y autenticado.
- **git** disponible en la línea de comandos.
- **gh** (GitHub CLI) recomendado — los comandos de Conclave lo usan para abrir y revisar PRs, pero degradan a "imprimir el comando" si `gh` falta.

## Instalación en dos comandos

```bash
claude plugin marketplace add lucasgio/conclave
claude plugin install conclave@conclave
```

Después **reiniciá Claude Code** para que los slash commands se registren.

Podés confirmar la instalación con:

```bash
claude plugin list
```

Deberías ver:

```
❯ conclave@conclave
  Version: 0.1.0
  Scope: user
  Status: ✔ enabled
```

## Verificá la instalación

Abrí Claude Code en cualquier repo y tipeá `/conclave`. El autocomplete debería listar los seis comandos:

- `/conclave-init`
- `/conclave-spec`
- `/conclave-planning`
- `/conclave-dev`
- `/conclave-qa`
- `/conclave-pr-review`

Si no aparecen, corré `claude plugin list` para confirmar que el plugin esté enabled, después reiniciá la sesión.

## Actualizando

El marketplace apunta al repo de GitHub; para traer la última versión:

```bash
claude plugin update conclave
```

## Desinstalando

```bash
claude plugin uninstall conclave@conclave
claude plugin marketplace remove conclave
```

Esto remueve el plugin de tu máquina. Cualquier directorio `conclave/` ya commiteado en tus repos se queda donde está — al final del día es solo markdown.
