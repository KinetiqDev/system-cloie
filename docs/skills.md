# Skills

All agent skills available to this repo, grouped by source. Descriptions are pulled from each `SKILL.md` frontmatter.

## Global Skills (`~/.agents/skills/`)

- **design-taste-frontend** — Anti-slop frontend skill for landing pages, portfolios, and redesigns. Reads the brief, infers the right design direction, and ships interfaces that do not look templated. (also bundled in project)
- **emil-design-eng** — Encodes Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great. (also bundled in project)
- **find-skills** — Discover and install agent skills via `npx skills` when the user wants functionality that might exist as an installable skill.
- **git-commit** — Intelligent commit with convention message generation: auto-detects type/scope, generates conventional messages from diff, supports interactive overrides and logical file staging.
- **humanizer** — Remove signs of AI-generated writing from text. Detects and fixes inflated symbolism, promotional language, em-dash overuse, rule-of-three, AI vocabulary, passive voice, and filler phrases.
- **shadcn** — Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI, including chat interfaces. (also bundled in project)
- **writing-great-skills** — Reference for writing and editing skills well — the vocabulary and principles that make a skill predictable. (also bundled in project)

## Project Skills — Engineering (`.agents/skills/`)

### Planning & Tracking

- **ask-matt** — Router over the skills in this repo; asks which skill or flow fits your situation.
- **wayfinder** — Plan a huge chunk of work as a shared map of investigation tickets on the issue tracker, resolved one at a time until the route is clear.
- **triage** — Move issues and external PRs through a state machine of triage roles — categorise, verify, grill if needed, write agent-ready briefs.
- **to-spec** — Synthesize the current conversation into a spec and publish it to the project issue tracker.
- **to-tickets** — Break a plan, spec, or conversation into dependency-ordered tracer-bullet tickets with blocking edges, published to the tracker.
- **setup-matt-pocock-skills** — Configure the repo for the engineering skills (issue tracker, triage labels, domain doc layout). Run once before first use.

### Architecture & Design

- **codebase-design** — Shared vocabulary for designing deep modules: interfaces, deepening opportunities, seams, testability, AI-navigability.
- **domain-modeling** — Build and sharpen the project's domain model — terminology, ubiquitous language, architectural decisions.
- **improve-codebase-architecture** — Scan for deepening opportunities, present a visual HTML report, then grill through whichever you pick.
- **prototype** — Build a throwaway prototype to sanity-check a state model, logic, or UI direction.
- **grill-me** — A relentless interview to sharpen a plan or design.
- **grilling** — Grill the user relentlessly about a plan or design to stress-test it before building.
- **grill-with-docs** — A relentless interview that also creates docs (ADRs and glossary entries) as decisions are resolved.

### UI/UX

- **design-taste-frontend** — Anti-slop frontend skill for landing pages, portfolios, and redesigns. (also in global)
- **shadcn** — Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. (also in global)
- **emil-design-eng** — Emil Kowalski's philosophy on UI polish, component design, and animation decisions. (also in global)
- **ui-ux-pro-max** — UI/UX design intelligence: 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, 25 chart types across 10 stacks.

### Implementation & Testing

- **next-best-practices** — Next.js best practices: file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling.
- **implement** — Implement a piece of work based on a spec or set of tickets.
- **tdd** — Test-driven development: build features or fix bugs test-first, red-green-refactor, integration tests.
- **code-review** — Review changes since a fixed point along two axes — Standards (repo coding standards) and Spec (originating issue/PRD) — via parallel sub-agents.

### Debugging & Research

- **a11y-debugging** — Accessibility debugging and auditing via Chrome DevTools MCP (semantic HTML, ARIA, focus, keyboard nav, tap targets, contrast).
- **chrome-devtools** — Efficient debugging, troubleshooting, and browser automation via Chrome DevTools MCP (network, performance, interactions).
- **agent-browser** — Browser automation CLI for AI agents: navigate, fill forms, click, screenshot, scrape, test web apps. Prefer over built-in browser tooling.
- **debug-optimize-lcp** — Debug and optimize Largest Contentful Paint, slow page loads, and Core Web Vitals using Chrome DevTools MCP.
- **diagnosing-bugs** — Diagnosis loop for hard bugs and performance regressions.
- **memory-leak-debugging** — Diagnose and resolve JS/Node memory leaks using Chrome DevTools MCP heap snapshots.
- **troubleshooting** — Troubleshoot Chrome DevTools connection/target issues; trigger when list_pages, new_page, or navigate_page fail.
- **fallow** — Codebase intelligence for TypeScript and JavaScript: changed-code risk, cleanup opportunities, duplication, complexity hotspots, boundary policies, feature flags, and auto-fix previews (dry-run first).
- **research** — Investigate a question against high-trust primary sources and capture findings as a Markdown file in the repo.

### Supabase

- **supabase** — Use for ANY task involving Supabase: products, client libraries, SSR integration, auth, RLS, CLI/MCP, schema changes, migrations, security audits.
- **supabase-postgres-best-practices** — Postgres performance optimization and best practices for writing, reviewing, or optimizing queries, schemas, and DB configuration.

### Process & Docs

- **handoff** — Compact the current conversation into a handoff document for another agent to pick up.
- **model-relay** — Resume active work after switching models or providers.
- **teach** — Teach the user a new skill or concept within the workspace.
- **write-a-skill** — Create new agent skills with proper structure, progressive disclosure, and bundled resources.
- **writing-great-skills** — Reference for writing and editing skills well. (also in global)
- **zoom-out** — Ask the agent to zoom out and give broader context or a higher-level perspective.

## Project Skills — OpenSpec (`.opencode/skills/`)

### Change Management

- **openspec-new-change** — Start a new OpenSpec change using the experimental artifact workflow.
- **openspec-explore** — Enter explore mode: a thinking partner for exploring ideas and clarifying requirements.
- **openspec-propose** — Propose a new change with all artifacts (proposal, design, specs, tasks) generated in one step.
- **openspec-ff-change** — Fast-forward through artifact creation when the direction is clear.
- **openspec-continue-change** — Continue a change by creating the next artifact.

### Implementation

- **openspec-apply-change** — Implement tasks from an OpenSpec change.

### Verification & Finalize

- **openspec-verify-change** — Validate that implementation matches the change artifacts.
- **openspec-sync-specs** — Sync delta specs from a change to main specs without archiving.
- **openspec-archive-change** — Archive a completed change.
- **openspec-bulk-archive-change** — Archive multiple completed changes at once.
- **openspec-onboard** — Guided onboarding: walk through a complete OpenSpec workflow cycle with narration and real codebase work.
