---
title: /conclave-init
description: Bootstrapeá el directorio conclave/ en tu repo y elegí un team profile.
category: commands
order: 1
lang: es
---

# /conclave-init

Inicializá un workspace Scrum de Conclave en la raíz del repositorio actual.

```
/conclave-init
```

Este comando es **read/write solo dentro de tu repo**. No toca los archivos del propio plugin. El output es un directorio `conclave/` completamente formado con el que el equipo puede empezar a trabajar inmediatamente.

## Qué pregunta

Primero, `/conclave-init` pregunta **"¿Sos solo vos, o un equipo?"** — esto setea `team_mode: solo | team` y ramifica todo lo que sigue.

- **Solo** → `team_profile` se fuerza a `lean`, sin preguntas por disciplina, sin preguntas de tamaño/profile.
- **Team** → continúa con las preguntas de abajo, y después pregunta quién cubre cada una de las seis disciplinas.

`/conclave-init` usa `AskUserQuestion` para juntar:

1. **Nombre del proyecto** (default: el basename del repo).
2. **Tipo de proyecto**: backend / frontend / mobile / devops / multi.
3. **Tamaño del equipo** (solo en modo `team`): 2–3, 4–6, 7+ (grueso; define el default del team profile de abajo).
4. **Duración del sprint**: 1, 2, 3 o 4 semanas (default 2).
5. **Timezone** (ej. `America/Montevideo`, default UTC).
6. **Team profile** (solo en modo `team` — `solo` ya fuerza `lean`): `lean`, `full-scrum`, o `custom` — controla qué ceremonias son requeridas. Mirá [profiles](/conclave/es/docs/profiles/) para detalle.
7. **Quién cubre cada disciplina** (solo en modo `team`): una pregunta por disciplina — **Tech Lead, Frontend, Backend, QA, Designer, DevOps** — nombre + handle de GitHub, o `TBD` si no está cubierta. Después una pregunta más por quién (si alguien) lleva los process roles opcionales de Product Manager / Scrum Master.

## Qué crea

```
conclave/
├── README.md
├── config.md
├── team/
│   ├── roster.md
│   └── ceremonies.md
├── product/
│   ├── definition-of-ready.md
│   └── definition-of-done.md
├── context/
└── sprints/
```

`product/backlog.md` y `product/architecture.md` quedan intencionalmente vacíos — `/conclave-spec` los puebla.

## Qué NO hace

- **No commitea.** El equipo debería revisar los seed files (especialmente roster, DoR y DoD) antes de commitear.
- **No toca archivos fuera de `conclave/`** — tu código está a salvo.

## Después de que corre

`conclave/team/roster.md` queda **completamente poblado** en ambos modos — un proyecto solo obtiene una fila cubriendo las seis disciplinas, un equipo obtiene una fila por disciplina (con `TBD` para lo que quedó sin cubrir) — sin placeholders para llenar a mano.

Archivos que vale la pena revisar igual:

- `conclave/team/roster.md` — chequeá nombres/handles, sumá a quien haya quedado como `TBD`.
- `conclave/team/ceremonies.md` — ajustá a tu cadencia real (sprint length, planning day, etc.).
- `conclave/product/definition-of-ready.md` — customizá el checklist.
- `conclave/product/definition-of-done.md` — customizá el checklist.

Después commiteá:

```bash
git add conclave/
git commit -m "conclave: bootstrap Scrum workspace"
```

Y avanzá a `/conclave-spec`.

## Idempotencia

Re-correr `/conclave-init` en un workspace que ya tiene `conclave/config.md` se rechaza. Para cambiar el profile u otras settings, editá `conclave/config.md` directamente.
