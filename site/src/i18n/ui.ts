export const languages = {
  en: "English",
  es: "Español",
} as const;

export const defaultLang = "en" as const;

export type Lang = keyof typeof languages;

export const ui = {
  en: {
    "nav.docs": "Docs",
    "nav.github": "GitHub",
    "nav.install": "Install",
    "nav.methodology": "Methodology",

    "hero.eyebrow": "Open source · Claude Code plugin",
    "hero.title.line1": "Scrum for",
    "hero.title.line2": "Claude Code teams",
    "hero.subtitle":
      "Conclave brings the Scrum ceremonies, roles, and quality gates into Claude Code. Six AI subagents — one for every role — coordinate through plain markdown in git. No central server, no proprietary format, no hidden state.",
    "hero.cta.install": "Install",
    "hero.cta.docs": "Read the docs",
    "hero.cta.github": "View on GitHub",

    "features.title": "What you get",
    "features.subtitle":
      "Conclave is a methodology layer on top of Claude Code. Everything ships as a normal plugin you install with one command.",
    "features.roles.title": "Six AI roles",
    "features.roles.body":
      "Product Manager, Tech Lead, Scrum Master, Developer and QA — each as a specialized subagent invoked by slash commands.",
    "features.profiles.title": "Profile-aware ceremonies",
    "features.profiles.body":
      "Lean teams skip the daily standup, peer review and retro. Full-scrum teams enforce everything. Two structural gates always remain.",
    "features.markdown.title": "Markdown in git",
    "features.markdown.body":
      "Every artifact — backlog, sprint plan, stories, acceptance criteria — is plain markdown under a visible conclave/ directory.",
    "features.multiuser.title": "Multi-user via PRs",
    "features.multiuser.body":
      "Git is the coordination substrate. Each team member runs their own Claude Code, syncs through pull requests, no shared server.",
    "features.commands.title": "Six commands shipped",
    "features.commands.body":
      "init, spec, planning, dev, qa and pr-review — the full Day-0 plus per-story delivery loop. More ceremonies coming.",
    "features.specdriven.title": "Spec-driven from Day 0",
    "features.specdriven.body":
      "A central spec is generated from your idea + CLAUDE.md + installed skills. Every later phase reads from it.",

    "loop.title": "The delivery loop",
    "loop.subtitle":
      "One command per Scrum gate. Each one delegates to specialised subagents and writes its output as markdown the team can review in a PR.",
    "loop.step1.title": "Bootstrap",
    "loop.step1.body": "Seed conclave/ with team, profile, DoR, DoD.",
    "loop.step2.title": "Founding artifacts",
    "loop.step2.body": "PM + TL produce backlog + architecture + Sprint 1.",
    "loop.step3.title": "Lock the sprint",
    "loop.step3.body": "SM + PM + TL run planning, assign stories, validate DoR.",
    "loop.step4.title": "Implement",
    "loop.step4.body": "Dev picks up a story, writes code + tests, opens PR.",
    "loop.step5.title": "Verify",
    "loop.step5.body": "QA adversarially re-derives PASS/FAIL per Gherkin scenario.",
    "loop.step6.title": "Approve",
    "loop.step6.body": "TL reviews the code against architecture + ADRs, approves PR.",

    "terminal.title": "See it in action",
    "terminal.subtitle":
      "/conclave-spec takes a one-line product idea and invokes the PM and TL subagents in parallel to produce the Day 0 artifacts.",

    "profiles.title": "Pick a profile that fits your team",
    "profiles.subtitle":
      "Two ceremonies are structural and always on. The rest scale with the profile you choose at install time.",
    "profiles.lean": "Lean",
    "profiles.lean.body":
      "Solo devs and small (2–3) teams. Only Sprint Planning and QA Verification are enforced. Everything else is silently skippable.",
    "profiles.full": "Full Scrum",
    "profiles.full.body":
      "Cross-functional teams with stakeholders. Every ceremony — standup, grooming, peer review, sprint review, retro — is required.",
    "profiles.custom": "Custom",
    "profiles.custom.body":
      "Mixed needs. Set each ceremony flag individually in conclave/config.md.",
    "profiles.ceremony": "Ceremony",
    "profiles.always": "always",
    "profiles.required": "required",
    "profiles.optional": "optional",
    "profiles.cell.planning": "Sprint Planning",
    "profiles.cell.qa": "QA Verification",
    "profiles.cell.standup": "Daily Standup",
    "profiles.cell.grooming": "Backlog Grooming",
    "profiles.cell.review": "Peer / TL PR Review",
    "profiles.cell.sprintreview": "Sprint Review",
    "profiles.cell.retro": "Sprint Retrospective",

    "install.title": "Install in 30 seconds",
    "install.subtitle":
      "Conclave ships as a Claude Code plugin via a directory marketplace. After installing, restart Claude Code and the /conclave-* slash commands appear natively.",
    "install.step1.label": "Register the marketplace",
    "install.step2.label": "Install the plugin",
    "install.step3.label": "Restart Claude Code",
    "install.step3.body":
      "Exit and re-enter your session. Type /conclave to see the six commands.",

    "footer.tagline": "Scrum for Claude Code teams.",
    "footer.docs": "Documentation",
    "footer.github": "GitHub",
    "footer.license": "License",
    "footer.version": "Version",

    "docs.onthispage": "On this page",
    "docs.editonGitHub": "Edit on GitHub",
    "docs.previous": "Previous",
    "docs.next": "Next",

    "lang.switchTo": "Switch to",
  },
  es: {
    "nav.docs": "Docs",
    "nav.github": "GitHub",
    "nav.install": "Instalación",
    "nav.methodology": "Metodología",

    "hero.eyebrow": "Open source · Plugin de Claude Code",
    "hero.title.line1": "Scrum para",
    "hero.title.line2": "equipos con Claude Code",
    "hero.subtitle":
      "Conclave lleva las ceremonias, roles y quality gates de Scrum dentro de Claude Code. Seis subagents de IA — uno por cada rol — se coordinan vía markdown plano en git. Sin servidor central, sin formato propietario, sin estado oculto.",
    "hero.cta.install": "Instalar",
    "hero.cta.docs": "Ver la docs",
    "hero.cta.github": "Ver en GitHub",

    "features.title": "Qué te llevás",
    "features.subtitle":
      "Conclave es una capa de metodología sobre Claude Code. Todo se distribuye como un plugin normal que se instala con un comando.",
    "features.roles.title": "Seis roles con IA",
    "features.roles.body":
      "Product Manager, Tech Lead, Scrum Master, Developer y QA — cada uno como subagent especializado que se invoca desde slash commands.",
    "features.profiles.title": "Ceremonias por profile",
    "features.profiles.body":
      "Los equipos lean saltean standup, peer review y retro. Los full-scrum las exigen todas. Dos gates estructurales siempre quedan activos.",
    "features.markdown.title": "Markdown en git",
    "features.markdown.body":
      "Cada artefacto — backlog, sprint plan, historias, criterios de aceptación — es markdown plano bajo el directorio visible conclave/.",
    "features.multiuser.title": "Multi-usuario vía PRs",
    "features.multiuser.body":
      "Git es el sustrato de coordinación. Cada miembro corre su propio Claude Code y sincroniza por pull requests. No hay servidor compartido.",
    "features.commands.title": "Seis comandos shipeados",
    "features.commands.body":
      "init, spec, planning, dev, qa y pr-review — el loop completo de Día 0 más entrega por historia. Más ceremonias en camino.",
    "features.specdriven.title": "Spec-driven desde el Día 0",
    "features.specdriven.body":
      "Una spec central se genera desde tu idea + CLAUDE.md + skills instaladas. Cada fase posterior lee desde ahí.",

    "loop.title": "El loop de entrega",
    "loop.subtitle":
      "Un comando por gate de Scrum. Cada uno delega a subagents especializados y escribe su output como markdown que el equipo revisa en un PR.",
    "loop.step1.title": "Bootstrap",
    "loop.step1.body": "Seed de conclave/ con equipo, profile, DoR, DoD.",
    "loop.step2.title": "Artefactos fundacionales",
    "loop.step2.body": "PM + TL producen backlog + architecture + Sprint 1.",
    "loop.step3.title": "Lockear el sprint",
    "loop.step3.body": "SM + PM + TL corren planning, asignan historias, validan DoR.",
    "loop.step4.title": "Implementación",
    "loop.step4.body": "Dev agarra una historia, escribe código + tests, abre PR.",
    "loop.step5.title": "Verificación",
    "loop.step5.body": "QA re-deriva PASS/FAIL adversarialmente por escenario Gherkin.",
    "loop.step6.title": "Aprobación",
    "loop.step6.body": "TL revisa el código contra arquitectura + ADRs, aprueba PR.",

    "terminal.title": "Vélo funcionando",
    "terminal.subtitle":
      "/conclave-spec toma una idea de producto de una línea e invoca al PM y al TL en paralelo para producir los artefactos del Día 0.",

    "profiles.title": "Elegí el profile que matchea con tu equipo",
    "profiles.subtitle":
      "Dos ceremonias son estructurales y siempre están on. El resto escala según el profile que elegís al instalar.",
    "profiles.lean": "Lean",
    "profiles.lean.body":
      "Devs solos y equipos chicos (2–3). Solo Sprint Planning y QA Verification se exigen. Todo lo demás se saltea silenciosamente.",
    "profiles.full": "Full Scrum",
    "profiles.full.body":
      "Equipos cross-funcionales con stakeholders. Cada ceremonia — standup, grooming, peer review, sprint review, retro — es requerida.",
    "profiles.custom": "Custom",
    "profiles.custom.body":
      "Necesidades mixtas. Configurás cada flag de ceremonia a mano en conclave/config.md.",
    "profiles.ceremony": "Ceremonia",
    "profiles.always": "siempre",
    "profiles.required": "requerida",
    "profiles.optional": "opcional",
    "profiles.cell.planning": "Sprint Planning",
    "profiles.cell.qa": "QA Verification",
    "profiles.cell.standup": "Daily Standup",
    "profiles.cell.grooming": "Backlog Grooming",
    "profiles.cell.review": "Peer / TL PR Review",
    "profiles.cell.sprintreview": "Sprint Review",
    "profiles.cell.retro": "Sprint Retrospective",

    "install.title": "Instalá en 30 segundos",
    "install.subtitle":
      "Conclave se distribuye como un plugin de Claude Code vía un directory marketplace. Después de instalar, reiniciá Claude Code y los slash commands /conclave-* aparecen nativos.",
    "install.step1.label": "Registrá el marketplace",
    "install.step2.label": "Instalá el plugin",
    "install.step3.label": "Reiniciá Claude Code",
    "install.step3.body":
      "Salí y volvé a entrar a tu sesión. Tipeá /conclave y vas a ver los seis comandos.",

    "footer.tagline": "Scrum para equipos con Claude Code.",
    "footer.docs": "Documentación",
    "footer.github": "GitHub",
    "footer.license": "Licencia",
    "footer.version": "Versión",

    "docs.onthispage": "En esta página",
    "docs.editonGitHub": "Editar en GitHub",
    "docs.previous": "Anterior",
    "docs.next": "Siguiente",

    "lang.switchTo": "Cambiar a",
  },
} as const;

export type UIKey = keyof (typeof ui)["en"];
