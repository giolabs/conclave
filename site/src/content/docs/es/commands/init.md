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

`/conclave-init` usa `AskUserQuestion` para juntar:

1. **Nombre del proyecto** (default: el basename del repo).
2. **Tipo de proyecto**: backend / frontend / mobile / devops / multi.
3. **Tamaño del equipo**: 2–3, 4–6, 7+ (grueso; escala el template del roster).
4. **Duración del sprint**: 1, 2, 3 o 4 semanas (default 2).
5. **Timezone** (ej. `America/Montevideo`, default UTC).
6. **Team profile**: `lean`, `full-scrum`, o `custom` — controla qué ceremonias son requeridas. Mirá [profiles](/conclave/es/docs/profiles/) para detalle.

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

Los cuatro archivos que casi seguro vas a querer editar a mano:

- `conclave/team/roster.md` — listá tus miembros reales del equipo.
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
