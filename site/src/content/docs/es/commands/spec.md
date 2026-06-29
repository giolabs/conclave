---
title: /conclave-spec
description: Generá los artefactos fundacionales — Product Backlog, Architectural Foundation, plan del Sprint 1 — desde una idea de producto de una línea.
category: commands
order: 2
lang: es
---

# /conclave-spec &lt;idea&gt;

Produce los **artefactos Scrum fundacionales** para el repo actual, desde una idea de producto de una línea más el `CLAUDE.md` del proyecto, las Skills instaladas, y las señales de stack detectadas.

```
/conclave-spec "REST API para gestión de tareas con auth JWT"
```

Este es el **comando principal del MVP**. Corre una vez por proyecto. Después de que termina tenés un Product Backlog, una Architectural Foundation, y el Sprint 1 en draft.

## Qué hace

1. Detecta el repo activo (ofrece `git init` si no lo es).
2. Si `conclave/` no está inicializado, corre el flow de `/conclave-init` inline primero.
3. Ingesta contexto en paralelo: `CLAUDE.md` (local + global), skills disponibles, señales de stack detectadas (`pubspec.yaml`, `package.json`, `tsconfig.json`, etc.).
4. Snapshotea todo eso en `conclave/context/` para que los artefactos sean auditables.
5. Pregunta clarificaciones: stack confirmado, tipo de proyecto, scope del sprint-1, restricciones duras.
6. **Delega a los subagents Tech Lead y Product Manager en paralelo.**
7. Sintetiza sus outputs en los artefactos fundacionales.
8. Reportea paths y comandos git sugeridos.

## Qué produce

- `conclave/product/backlog.md` — el Product Backlog inicial.
- `conclave/product/architecture.md` — la Architectural Foundation con ADRs + mermaid diagram.
- `conclave/sprints/SPRINT-001/spec.md` — plan del Sprint 1 en `status: draft`.
- `conclave/sprints/SPRINT-001/stories/US-NNN-*.md` — un archivo por historia seleccionada.
- `conclave/sprints/SPRINT-001/acceptance/AC-US-NNN.md` — criterios de aceptación Gherkin.
- `conclave/sprints/SPRINT-001/meta.md` — metadata del sprint.

## Re-corridas

`/conclave-spec` es **append-only**:

- Corridas subsiguientes crean `SPRINT-002/`, `SPRINT-003/`, etc. — nunca sobrescriben sprints previos.
- El Product Backlog se actualiza aditivamente: historias nuevas appendeadas, historias existentes intactas.
- Se escribe un snapshot de contexto nuevo cada vez para que puedas diffear qué cambió.

## Guardrails

- No modifica ningún archivo fuera de `conclave/`.
- Nunca commitea — vos revisás los artefactos como PR.
- Si el output del PM o TL falla su checklist interno de calidad, la falla se surfaceá verbatim y la ejecución para.
