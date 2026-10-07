# Discovery Methodology

Condensed from the 10-step Discovery Phase framework. Read by the Product Manager subagent in `/conclave-discovery` (Step 4, `00-discovery.md`) and Step 6 (`04-mvp.md`). Not every step becomes its own section — the first four (ICP, business model, competitors, UVP) do; the rest inform later documents and Conclave inception.

## The 10 steps and where each one lives in the output

| # | Step | Where it lands |
|---|---|---|
| 1 | Identify target audience (ICP) | `00-discovery.md` § ICP |
| 2 | Choose business model | `00-discovery.md` § Business Model |
| 3 | Analyze competitors | `00-discovery.md` § Competitors |
| 4 | Determine UVP | `00-discovery.md` § UVP |
| 5 | Craft feature list | Full list here in `00-discovery.md`, filtered and grouped into candidate epics in `04-mvp.md` |
| 6 | Wireframe / prototype | Out of scope for this skill — markdown only. Mention if the user should do this next. |
| 7 | User journey | `00-discovery.md` § User Journey — short version, one primary flow |
| 8 | Set a budget | `04-mvp.md` § Delivery plan — expressed as sprints + team size, not dollars |
| 9 | Choose tech stack | `01-tech-stack.md` (Tech Lead) |
| 10 | Project roadmap | `04-mvp.md` § Sequencing hint — `/conclave-init` turns it into `conclave/product/roadmap.md` |

## Step-by-step guidance

### 1. ICP (Ideal Customer Profile)

Bad: "Small businesses that need software."
Good: "Uruguayan Mercado Libre sellers with 50–500 monthly orders, no dedicated customer support hire, currently answering buyer questions manually via the ML seller app on mobile."

Ask yourself:
- Who exactly? (industry, size, geography)
- What are they doing today to solve this problem?
- Why does that current solution suck for them?
- How do you reach them? (channel — LinkedIn, MELI Ads, community, referral)

### 2. Business Model

Pick one primary, name secondaries. Options:
- Subscription (SaaS tiers)
- Transaction fee / take rate
- Usage-based (per API call, per message, per GB)
- Freemium → paid conversion
- One-time license
- Marketplace commission
- Ads (rare, hard, high volume needed)

State the pricing hypothesis: "Basic $29/mo, Pro $99/mo, Enterprise custom" — even if it's a guess, name it. It anchors the rest of the doc.

### 3. Competitors

Find 3–5 real competitors. For each: name, URL, positioning in one line, pricing model, what they do well, what gap they leave. A table works better than prose here.

If there are zero competitors, that's a **red flag**, not a green light — probably the market doesn't exist yet, or you haven't looked hard enough.

### 4. UVP (Unique Value Proposition)

One sentence. Format:
> For [ICP], [product name] is a [category] that [key benefit] because [reason to believe], unlike [main competitor].

Test: could a random developer read this sentence and explain the product back to you in their own words? If not, rewrite.

### 5. Feature list

Full brainstormed list — everything that could be in the product eventually. Group by:
- Must-have (MVP candidate)
- Should-have (v1.x)
- Could-have (backlog)
- Won't-have (out of scope forever, or at least until product-market fit)

`04-mvp.md` re-filters this into the MVP and groups it into candidate epics.

### 6. Wireframe

Not produced by this command. Mention in `00-discovery.md` § Next steps: "Before Sprint 1, wireframe the 3–5 main screens (Figma or similar)." In Conclave this usually becomes a `discipline: design` story in Sprint 1.

### 7. User journey

One primary flow, 5–10 steps, from awareness to activation to habitual use. Optional Mermaid sequence diagram if it's non-trivial.

### 8. Budget

Expressed as sprints × team size. Example: "8 sprints × 2 weeks × 1 full-stack + 1 designer part-time ≈ 4 months to MVP." Don't quote dollar amounts unless the user specifically asks — it's a moving target and depends on where the team sits.

### 9. Tech stack

Handled by the Tech Lead with its own decision tree. Reference: `tech-stack-decision-tree.md`.

### 10. Roadmap

A sequencing hint in `04-mvp.md`: which candidate epic comes first and why (e.g. "Sprint 0: walking skeleton", "Sprint 1: auth + core entity", "Sprint 2: primary flow end-to-end"). Don't sequence more than 6–8 sprints out — anything beyond that is fiction. The Scrum Master turns this into the real roadmap during `/conclave-init`.

## Anti-patterns to avoid

- **Feature-first thinking** — Starting with "the app will have login, dashboard, chat, notifications…" before naming who it's for. Rewrite to start with the user.
- **Vague ICP** — "Small businesses" tells you nothing. Push for concreteness.
- **Copying a competitor's business model** without asking whether it fits *this* product.
- **UVP as marketing copy** — "The best platform for X!" is not a UVP.
- **Kitchen-sink MVP** — Every feature added to the MVP is one that delays the moment you learn whether users actually want this.
