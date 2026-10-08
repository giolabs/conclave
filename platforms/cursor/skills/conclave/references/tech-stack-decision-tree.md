# Tech Stack Decision Tree

Adaptive recommendations for the Tech Lead in `/conclave-discovery` (`01-tech-stack.md`). Each choice later becomes an ADR during `/conclave-init` inception; the Descartados list becomes that ADR's alternatives considered. The point is **not** to always land on the same stack. It's to make a defensible choice given the project type, team size, and constraints.

## Decision axes

Before picking anything, resolve these:

1. **Project type** (asked in `/conclave-discovery` Step 2)
2. **Team size** — solo, 2–3, small team (5–8), or bigger. Solo devs shouldn't pick microservices; small teams shouldn't pick anything with a heavy DevOps tax.
3. **Regulatory constraints** — Fintech, health, or gov? That forces certain infra choices (audit logs, encryption at rest, data residency).
4. **Latency / real-time** — Chat, live tracking, trading? Push toward stacks with strong websocket / streaming support.
5. **Existing team skills** (and, in a repo that already has code, the stack Conclave detected — never recommend replacing a working stack without an explicit user ask) — If the user is already fluent in stack X, don't recommend Y for a marginal reason. Familiarity is worth ~30% velocity.

## Recommendations by project type

These are **starting points**, not commandments. Adjust based on the axes above.

### SaaS B2B

- **Frontend**: React + Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: NestJS (TypeScript) or Fastify. Use NestJS if the team likes structure and DI; Fastify if speed and minimalism matter more.
- **Database**: PostgreSQL + Prisma (or Drizzle if the team is comfortable and wants closer-to-SQL control)
- **Auth**: Auth.js (NextAuth) or Clerk for speed; Keycloak if enterprise SSO is table-stakes
- **Hosting**: Vercel (frontend) + AWS ECS/Fargate or Fly.io (backend) + RDS Postgres
- **Observability**: Sentry + a logging stack (CloudWatch or Grafana Cloud)

### SaaS B2C

Same as B2B but consider:
- Faster onboarding matters more → prefer Clerk / Auth0 over rolling your own
- Analytics is critical from day 1 → PostHog or Amplitude
- Payment flow matters → Stripe (or MercadoPago in LATAM)

### Marketplace

Two-sided complexity is real. Additions:
- Search: Meilisearch or Typesense (Elasticsearch only if you have someone who can operate it)
- Payments with escrow/split: Stripe Connect or MercadoPago Marketplace
- Notification infrastructure: Novu or a hand-rolled queue on top of SQS/BullMQ

### Mobile-first consumer

- **Mobile**: Flutter if the team knows it (great for cross-platform, one codebase). React Native if the web team is already React and TypeScript.
- **Backend**: NestJS or a lightweight Node/Fastify API — mobile clients hit thin, purpose-built endpoints
- **Push**: Firebase Cloud Messaging (still the standard) or OneSignal
- **Analytics**: Firebase Analytics for early stage; graduate to PostHog when needs grow

### Fintech

Regulatory + audit + integrity constraints dominate.

- **Backend**: NestJS or Go (Go if latency is a hard constraint). TypeScript is fine for most fintech unless it's HFT-adjacent.
- **Database**: PostgreSQL (never Mongo). Enable row-level security. Audit tables from day 1.
- **Message broker**: SQS or RabbitMQ for eventual consistency in ledger operations
- **Auth**: Keycloak or Cognito — enterprise-grade, not the fastest thing
- **Compliance**: Structured logging from day 1, CloudTrail on, KMS-encrypted RDS, VPC everything.

### Internal tool

Lean toward speed of delivery. Team size is usually small.

- **Frontend**: Retool, Refine, or plain Next.js — depends on how much UX polish is needed
- **Backend**: Whatever the team already runs. Don't introduce a new stack for an internal tool.
- **Database**: Reuse existing if possible.

### Other

If the project doesn't fit above, walk the decision axes explicitly in `01-tech-stack.md` and justify each choice. This is where seniority shows.

## Anti-patterns

- **Microservices for a solo founder** — you'll spend 60% of your time on infra, not product
- **NoSQL because "we might scale"** — you probably won't hit a scale where Postgres breaks. Postgres scales absurdly far.
- **Rewriting auth** — Just use a provider. Auth bugs kill startups.
- **Kubernetes for a 2-person team** — ECS Fargate or Fly.io will be plenty and cost you nothing in ops time.
- **Kafka for a startup** — SQS/BullMQ is fine until you have a real reason.
- **Latest framework because Twitter loves it** — pick things with 3+ years of stability and a real community.

## Format for the recommendation

For each choice, output three things:
1. **Choice** — the specific product/tool/version
2. **Why here** — one sentence tying it to a project-specific constraint
3. **When to reconsider** — one sentence naming the signal that would make you swap it out later

Example:
> **Auth: Auth.js (NextAuth)**
> Why: SaaS B2B with fast onboarding priority and no enterprise SSO requirement yet.
> Reconsider when: First enterprise prospect asks for SAML — then migrate to Keycloak or WorkOS.

## Rejected alternatives section

Every `01-tech-stack.md` needs a "Rejected alternatives" list with 2–3 alternatives seriously considered and why they lost. This is where the recommendation earns trust. Examples:

- "MongoDB — rejected. The business logic is strongly relational (invoices, transactions, users with roles), and Postgres gives JSONB for the semi-structured parts without giving up joins."
- "Ruby on Rails — rejected. The team already knows TypeScript; adding Ruby adds a language without moving velocity."
