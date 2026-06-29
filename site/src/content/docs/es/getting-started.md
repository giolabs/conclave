---
title: Empezar
description: Instalá Conclave y corré el flow de artefactos fundacionales del Día 0 en menos de dos minutos.
category: overview
order: 1
lang: es
---

# Empezar

Conclave es un plugin de Claude Code que lleva **Scrum** a equipos de ingeniería distribuidos. Seis subagents de IA — uno por cada rol de Scrum — se coordinan vía markdown plano commiteado a git. Sin servidor central, sin formato propietario.

## Tres comandos para arrancar

Dentro de cualquier repo git:

```bash
# 1. Bootstrapeá el workspace conclave/
/conclave-init

# 2. Generá los artefactos fundacionales desde tu idea de producto
/conclave-spec "REST API para gestión de tareas con auth JWT"

# 3. Lockeá el Sprint 1
/conclave-planning
```

Eso es todo. Después del paso 3 el sprint está `active`, cada historia tiene un assignee y el equipo puede abrir un PR con todo el directorio `conclave/`.

## Qué se crea

Después de que corre `/conclave-spec`, tu repo gana un directorio `conclave/` en la raíz:

```
conclave/
├── README.md
├── config.md                         # team profile + ceremony flags
├── team/
│   ├── roster.md
│   └── ceremonies.md
├── product/
│   ├── backlog.md                    # Product Backlog ordenado
│   ├── architecture.md               # ADRs + diagrama mermaid
│   ├── definition-of-ready.md
│   └── definition-of-done.md
├── context/                          # snapshots congelados de inputs usados
└── sprints/
    └── SPRINT-001/
        ├── meta.md
        ├── spec.md                   # plan del sprint
        ├── stories/                  # un archivo por user story
        └── acceptance/               # criterios de aceptación Gherkin
```

Cada archivo es markdown. Cada cambio es un git diff normal que tu equipo puede revisar en un PR.

## Continuando el loop

Una vez que el Sprint 1 está lockeado:

```bash
# Cada dev agarra una historia asignada
/conclave-dev US-001

# QA verifica la historia cuando llega a review
/conclave-qa US-001

# Tech Lead aprueba el PR (solo cuando peer_pr_review.required está on)
/conclave-pr-review US-001
```

Cuando todas las historias del sprint están `done`, estás listo para el próximo ciclo de planning. Re-corré `/conclave-spec` o movete directo a `/conclave-planning` para el SPRINT-002.

## Próximos pasos

- Leé la [metodología](/conclave/es/docs/methodology/) para entender el modelo Scrum que Conclave asume.
- Elegí el [profile de equipo](/conclave/es/docs/profiles/) correcto para tu situación.
- Sumergite en la [referencia por comando](/conclave/es/docs/commands/init/).
