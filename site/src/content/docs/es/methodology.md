---
title: Metodología
description: El modelo Scrum que Conclave asume, con las pequeñas adaptaciones que los equipos de ingeniería reales necesitan.
category: methodology
order: 1
lang: es
---

# Metodología

Conclave asume **Scrum** estándar con dos adaptaciones prácticas que los equipos de ingeniería reales hacen: roles explícitos de **Tech Lead** y **QA**, y **git** como sustrato de coordinación del equipo.

## El mapeo Scrum

| Concepto Scrum | Término Conclave | Notas |
|---|---|---|
| Product Owner | **Product Manager (PM)** | Mismas responsabilidades — dueño del backlog, prioriza, define aceptación. La mayoría de los equipos lo llaman PM en la práctica. |
| Scrum Master | **Scrum Master (SM)** | Facilita ceremonias, surface blockers. |
| Development Team | **Developers (Dev) + QA + Tech Lead (TL)** | TL y QA están nombrados como roles distintos para claridad. Siguen siendo parte del Dev Team en Scrum puro. |
| Product Backlog | `conclave/product/backlog.md` | Lista ordenada de user stories. |
| Sprint Backlog | tabla de stories seleccionadas en `conclave/sprints/SPRINT-NNN/spec.md` | Snapshot al momento del planning. |
| Increment | Los PRs mergeados que cierran historias | Conclave no trackea esto — git lo hace. |

## El árbol de artefactos

En la raíz del repo del equipo, Conclave mantiene un directorio visible `conclave/`. Todo es markdown.

```
conclave/
├── README.md                         # explica el directorio en GitHub
├── config.md                         # tipo de proyecto, stack, team profile
├── team/
│   ├── roster.md                     # quién juega qué rol
│   └── ceremonies.md                 # cadencia
├── product/                          # persiste entre sprints
│   ├── backlog.md
│   ├── architecture.md               # ADRs vivos
│   ├── definition-of-ready.md
│   └── definition-of-done.md
├── context/                          # snapshots congelados de inputs
└── sprints/
    └── SPRINT-NNN/
        ├── meta.md                   # nombre, fechas, status
        ├── spec.md                   # plan del sprint
        ├── stories/
        │   └── US-NNN-<slug>.md
        └── acceptance/
            └── AC-US-NNN.md
```

## Invariantes que cada comando Conclave respeta

- **Solo markdown.** Los campos estructurados viven en YAML frontmatter. El body es prosa human-readable.
- **Directorio visible.** `conclave/` no es oculto — renderiza en GitHub y es discoverable.
- **Append, no clobber.** Una segunda corrida de `/conclave-spec` crea `SPRINT-002/` y actualiza `product/backlog.md` aditivamente; nunca sobrescribe trabajo previo.
- **Snapshot de contexto.** Cada comando que genera artefactos escribe un snapshot fresh bajo `conclave/context/` para que el artefacto sea auditable contra los inputs que lo produjeron.
- **Referenciar, no duplicar.** Las stories referencian su archivo de aceptación; el sprint spec referencia `product/definition-of-done.md` en lugar de copiarlo.
- **La numeración es sticky.** Los IDs `SPRINT-NNN` y `US-NNN` incrementan monotónicamente y nunca se reusan.

## Cómo los slash commands invocan los subagents de rol

Cada slash command es un orquestador en markdown. Su body dice, en prosa: *"Lanzá un subagent cargado con `skills/conclave/agents/<role>.md` para producir X."*

Claude lee el archivo de charter del rol, despacha una llamada `Agent` con ese contenido como prefijo del system prompt, y continúa cuando el subagent retorna. Dos roles pueden correr en paralelo (PM + TL en `/conclave-spec`, SM + PM + TL en `/conclave-planning`) emitiendo ambas llamadas `Agent` en un mismo mensaje.

No hay DSL. El patrón es el mismo que el plugin `code-review` de Anthropic usa para sus agents de review en paralelo.

## Cómo los equipos se coordinan

Cada miembro del equipo corre su propio Claude Code local. El estado compartido vive en `conclave/` y está commiteado a git. La coordinación pasa por pull requests:

- PM groomea el backlog → abre un PR a `conclave/product/backlog.md`.
- Dev agarra una historia → brancha `feat/US-NNN-<slug>` → implementa → abre un PR.
- QA verifica → appendea un verification report al archivo de aceptación → comment en el PR.
- TL aprueba el código → corre `gh pr review --approve`.

No hay servidor central, no hay estado propietario, no hay superficie para vendor lock-in. El equipo es dueño del workflow porque el workflow son simplemente archivos en su propio repo.
