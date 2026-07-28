# CLOIE Tech Stack

## Quick Reference

| Category | Technology | Version | Status |
|----------|-----------|---------|--------|
| Framework | Next.js (App Router) | 16.2.4 | ✅ installed |
| Language | TypeScript | 5.x | ✅ installed |
| Styling | Tailwind CSS | v4 | ✅ installed |
| UI Components | shadcn/ui (base-nova style) | latest | ✅ installed |
| Headless UI Primitives | @base-ui/react | ^1.4.0 | ✅ installed |
| Forms | react-hook-form | ^7.72.1 | ✅ installed |
| Validation | Zod | 4.3.6 | ✅ installed |
| Database | PostgreSQL (Supabase) | 15+ | ✅ configured |
| ORM | Prisma | 6.19.2 | ✅ installed |
| Auth | Supabase Auth (Google OAuth) | — | ✅ configured |
| Charts | Recharts | ^3.8.1 | ✅ installed |
| Text Processing | winkNLP + stopword | ^2.4.0 / ^3.1.5 | ✅ installed |
| Icons | lucide-react | ^1.8.0 | ✅ installed |
| Testing | Vitest | 4.1.4 | ✅ installed |
| Package Manager | pnpm | 10.30.3 | ✅ configured |
| Linting | ESLint | 9.x | ✅ configured |
| Formatting | Prettier | ^3.8.3 | ✅ configured |

### Planned, Not Yet Installed

| Technology | Notes |
|-----------|-------|
| TanStack Query | doc recommends, not implemented |
| SheetJS (xlsx) | doc recommends, not implemented |
| PDF export | doc recommends, not implemented |
| Playwright | doc recommends, not implemented |
| PWA manifest/SW | doc recommends, not implemented |
| CI/CD (GitHub workflows) | `.github/` is empty |

---

## Critical: shadcn + Base UI (Not Radix)

This project uses **shadcn/ui** with the **"base-nova"** style. The underlying headless primitives are **`@base-ui/react`**, **NOT** Radix UI.

- All components in `src/components/ui/` import from `@base-ui/react/*`
- **Do not install Radix UI packages** — `@radix-ui/*` is not used here
- Add new components: `npx shadcn@latest add <component>` (auto-picks Base UI)
- Styling variants: `class-variance-authority` (cva)
- Utility: `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)

---

## Where Things Live

| Concern | Location |
|---------|----------|
| UI components | `src/components/ui/` |
| Feature modules | `src/features/<name>/` |
| Prisma schema | `prisma/schema.prisma` entrypoint + `prisma/models/` domain files |
| Supabase migrations | `supabase/migrations/` |
| App routes | `src/app/` (App Router) |
| API routes | `src/app/api/` |
| Auth session handling | `src/lib/supabase/` |
| Zod schemas | `src/lib/forms/` (resolver: `customZodResolver`) |
| Charts | `src/features/analytics/components/` |
| Text processing | winkNLP + stopword in `src/` NLP modules |

---

## Non-Obvious Gotchas

- **Request entry point** is `src/proxy.ts`, not `middleware.ts`. It rewrites Server Action POSTs for `x-forwarded-host` then calls `updateSession()`.
- **Supabase SSR**: session refresh lives in `src/lib/supabase/middleware.ts` (imported by proxy.ts).
- **Dev auth bypass**: `POST /api/auth/dev-login` and `cloie_dev_auth` are development-only. `NEXT_PUBLIC_DEMO_MODE` does not enable them outside development.
- **Forms**: use `customZodResolver` from `src/lib/forms/zod-resolver.ts`. Do **not** use `@hookform/resolvers/zod` — it breaks with Turbopack + Zod 4.
- **Prisma + Supabase migrations**: edit `prisma/schema.prisma` or the relevant `prisma/models/` file, then `pnpm supabase:migration:diff -- <name>` to generate SQL. See `supabase/README.md`.
- **Prisma constraint gotcha**: `NULLS NOT DISTINCT` unique indexes can't be expressed in Prisma schema. Real constraint lives in `supabase/migrations/`; Prisma gets a non-unique `@@index` mirror.
- **Turbopack + Tailwind**: `.npmrc` hoists `*tailwindcss*` packages. `next.config.ts` aliases `tailwindcss` to absolute on-disk path. If `@import` breaks under pnpm + Turbopack, check these two files first.
- **Tailwind v4**: uses `@import "tailwindcss"` syntax in `globals.css`, plus `@import "shadcn/tailwind.css"`. No `tailwind.config.ts` (v4 convention).

---

## Security Practices (Enforced)

- All auth via Supabase SSR (server-side session validation)
- Route/API protection via server-side role + scope checks
- No client-only trust for authorization
- Zod validation on all form input
- Confidential response protection (qualitative comments restricted)
- One-response enforcement per evaluation
- Immutable finalized submissions

---

## Architecture Style

**Modular monolith** — feature-based modules under `src/features/`, shared UI primitives, server logic via Next.js App Router (no separate backend service).

---

## Verification Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Turbopack dev server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (unit/integration) |
| `pnpm build` | Full build + Next.js typecheck |
| `pnpm vitest run <path>` | Single test file |
| `pnpm db:seed` | Seed database (loads `.env.local`) |
| `pnpm supabase:types` | Regenerate Supabase TS types |

---

## Commit Convention

Conventional Commits: `<type>(<scope>): <description>`
Types: `feat`/`fix`/`refactor`/`perf`/`style`/`test`/`docs`/`build`/`ops`/`chore`
Breaking: `!` before `:` with `BREAKING CHANGE:` in footer.
