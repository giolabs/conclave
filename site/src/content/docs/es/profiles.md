---
title: Profiles de equipo
description: Cómo los profiles de equipo controlan qué ceremonias Scrum se enforce.
category: methodology
order: 2
lang: es
---

# Profiles de equipo

Conclave separa **invariantes estructurales** (no podés hacer Scrum sin ellos) de **ceremonias** (gates de proceso que el equipo elige comprometerse a hacer). El split está controlado por el campo `team_profile` en `conclave/config.md`.

## Siempre requeridos (estructural — nunca se saltea)

Estos cuatro checks se enforce en cada team profile. Son el mínimo que Scrum necesita para funcionar:

- **Sprint Planning** — sin goal y lista lockeada de historias, no hay sprint. Enforce por `/conclave-planning` y la existencia de `conclave/sprints/SPRINT-NNN/spec.md`.
- **Acceptance criteria en cada historia** — cada story file debe referenciar un `acceptance/AC-US-NNN.md` no vacío con escenarios Gherkin. Historias sin esto fallan la DoR.
- **Verificación QA de acceptance criteria** — cada historia `done` lleva un verification report appendeado a su archivo de aceptación. Enforce por `/conclave-qa`.
- **Compliance con Definition of Done** — el checklist de DoD customizado por el equipo debe estar cumplido para cada historia.

## Skippeable por profile

El equipo elige un profile en `conclave/config.md`. Los comandos de ceremonia de Conclave lo leen y saltean silenciosamente las gates que el profile apague.

| Ceremonia | Comando | Default `lean` | Default `full-scrum` | Notas |
|---|---|---|---|---|
| Daily Standup | `/conclave-standup` | off | on | Loguea a `sprints/SPRINT-NNN/daily/`. |
| Backlog Grooming | `/conclave-groom` | off | on | Cuando está off, el grooming pasa dentro de `/conclave-planning`. |
| Peer / TL PR Review | `/conclave-pr-review` | off | on | Devs solos y equipos chicos suelen saltearlo. |
| Sprint Review | `/conclave-review` | off | on | Requerido cuando hay stakeholders a los que demostrar. |
| Sprint Retrospective | `/conclave-retro` | off | on | Primero en dropearse bajo presión; opt back in cuando se estabiliza. |

## Semántica de los profiles

- **`lean`** — solo los invariantes estructurales se enforce. Para devs solos, equipos muy chicos (2–3) y trabajo de tooling interno.
- **`full-scrum`** — cada ceremonia es requerida. Para equipos cross-funcionales que envían a stakeholders externos.
- **`custom`** — el equipo setea cada flag `ceremonies.*.required` individualmente. Se graba como `custom` para que nadie asuma un preset.

## Dos gates no se pueden apagar

`sprint_planning` y `qa_verification` no pueden flaggearse off — intentar setear `required: false` para cualquiera se rechaza con un error claro. Estos son estructurales.

## La gate de aprobación del PR

Cuando `peer_pr_review.required: true`, el **Tech Lead** (o approver designado) es quien corre `gh pr review --approve` vía `/conclave-pr-review US-NNN`. El trabajo del QA termina en el verification report y un PR comment — nunca una aprobación. Mirá el [state machine](/conclave/es/docs/state-machine/) para cómo transiciona la historia.

Cuando el flag está `false`, el pass del QA es la señal de merge. La historia va directo de `review` a `done`.

## Cambiando tu profile

Editá `team_profile` en `conclave/config.md`. Para override una única ceremonia sin cambiar el profile entero, seteá `team_profile: custom` y editá los flags `ceremonies.*.required` individuales.

Los cambios de profile tienen efecto en la próxima corrida de slash command. El sprint actual no se ve afectado — los flags se leen al momento de invocación del comando.
