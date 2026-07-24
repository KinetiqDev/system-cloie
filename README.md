# System CLOIE

**Comprehensive Learning Outcomes and Instructional Evaluation**

A college-level digital evaluation, monitoring, and reporting platform for Assumption College of Davao. CLOIE supports multiple academic programs, their courses, faculty members, and stakeholder-based outcome evaluation processes.

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: 20.x)
- pnpm 9+ (`npm install -g pnpm`)
- A Supabase project (for database)

### Setup

```bash
# 1. Clone and install
git clone <repository-url>
cd project-cloie
pnpm install

# 2. Environment variables
cp .env.example .env.local
# Edit .env.local with your credentials:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - DATABASE_URL (connection pooler)
# - DIRECT_URL (direct connection)

# 3. Database setup
pnpm db:push
pnpm db:seed  # Optional: seed demo data

# 4. Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Tech Stack

| Category        | Technology                   | Version |
| --------------- | ---------------------------- | ------- |
| Framework       | Next.js (App Router)         | 16.2.4  |
| React           | React                        | 19.2.4  |
| Language        | TypeScript                   | 5.x     |
| Styling         | Tailwind CSS                 | v4      |
| Components      | shadcn/ui                    | Latest  |
| Database        | PostgreSQL (Supabase)        | 15+     |
| ORM             | Prisma                       | 6.19.2   |
| Auth            | Supabase Auth (Google OAuth) | -       |
| Testing         | Vitest                       | 4.1.4   |
| Validation      | Zod                          | 4.3.6   |
| Package Manager | pnpm                         | 10.30.3 |

## Available Scripts

| Command                                           | Purpose                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                                        | Start Next.js dev server with Turbopack               |
| `pnpm build`                                      | Production build                                      |
| `pnpm lint`                                       | ESLint check                                          |
| `pnpm format`                                     | Prettier formatting (includes Tailwind class sorting) |
| `pnpm test`                                       | Run Vitest test suite                                 |
| `pnpm vitest run src/__tests__/path/file.test.ts` | Run single test file                                  |
| `pnpm db:push`                                    | Push Prisma schema to database                        |
| `pnpm db:seed`                                    | Seed database with demo data                          |
| `pnpm supabase:migration:diff`                    | Create database migration                             |
| `pnpm supabase:push`                              | Push migrations to Supabase                           |

## Project Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Route group (main app shell)
│   ├── api/               # API routes
│   ├── auth/              # Auth callback routes
│   └── ...
├── components/            # Shared UI components
│   └── ui/               # shadcn/ui base components
├── features/             # Feature-based modules
│   ├── analytics/        # Faculty/Program analytics
│   ├── auth/             # Authentication & session
│   ├── evaluations/      # Evaluation workflows
│   ├── instruments/      # Templates & instruments
│   ├── cilos/            # Course Intended Learning Outcomes
│   └── responses/        # Response handling
├── lib/                  # Utilities & configurations
│   ├── actions/          # Server Actions
│   ├── constants/        # App constants
│   ├── db/              # Prisma client
│   └── forms/           # Form utilities
├── styles/              # Global styles
│   └── tokens.css       # Design tokens
├── types/               # Global TypeScript types
└── __tests__/           # Test files (mirror src structure)
```

### Key Architectural Patterns

#### Middleware Pattern

Authentication middleware is at `src/proxy.ts` (not the traditional `middleware.ts`):

```typescript
// src/proxy.ts
export { proxy } from "@/features/auth/services/proxy";
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

#### Authentication Pattern

Dual authentication system:

1. **Production**: Supabase Auth (Google OAuth) with domain restriction (`@acd.edu.ph`, `@acdeducation.com`)
2. **Development**: Cookie-based bypass (`cloie_dev_auth`) for testing

See `src/features/auth/services/dev-auth.ts` for dev auth implementation.

#### Server Actions Pattern

Server Actions are thin wrappers delegating to feature services:

```typescript
// src/lib/actions/feature-actions.ts
"use server";

export async function someAction(data: InputType): Promise<ActionResult> {
  const result = await featureService(data);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  revalidatePath("/some-path");
  return { success: true };
}
```

#### Form Validation Pattern

Use the custom Zod resolver (official `@hookform/resolvers/zod` breaks with Turbopack + Zod 4):

```typescript
import { customZodResolver } from "@/lib/forms/zod-resolver";

const form = useForm({
  resolver: customZodResolver(schema),
});
```

#### Database Naming Convention

Prisma models use `@@map` for snake_case table names:

```prisma
model User {
  id String @id
  @@map("users")
}
```

TypeScript uses camelCase, database uses snake_case.

#### Design Tokens

CSS custom properties in `src/styles/tokens.css`, mapped via `@theme inline` in `src/app/globals.css`. Use token classes:

```html
<h1 class="text-heading-lg">Title</h1>
<p class="text-body-md">Content</p>
```

## Environment Variables

Key variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_REF`. See `supabase/README.md` for the full Supabase setup workflow.

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database (Prisma)
DATABASE_URL=postgresql://postgres:password@your-project-pooler.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:password@your-project.supabase.co:5432/postgres

# Auth (production restriction)
# Google OAuth credentials from Supabase
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run single file
pnpm vitest run src/__tests__/features/analytics/analytics.test.ts

# Watch mode
pnpm vitest
```

### Testing Patterns

For modules using React `cache()`, tests must reset modules:

```typescript
beforeEach(() => {
  vi.resetModules();
});

// Use dynamic import after reset
const { someFunction } = await import("@/lib/module");
```

See `src/__tests__/` for example test implementations.

## Database & Migrations

### Prisma Workflow

```bash
# After schema changes
pnpm db:push  # Push to dev database

# Generate types
pnpm exec prisma generate --schema prisma

# Seed data
pnpm db:seed
```

### Supabase Migrations

Migrations live in `supabase/migrations/` and are tracked in Git.

```bash
# Create migration (compares local schema to database)
pnpm supabase:migration:diff

# Apply migrations to Supabase project
pnpm supabase:push
```

See `supabase/README.md` for detailed cloud-only workflow.

## Code Style & Conventions

- **Quotes**: Double quotes
- **Semicolons**: Required
- **Trailing commas**: ES5 style
- **Indent**: 2 spaces
- **Line width**: 100 characters
- **Line endings**: LF
- **Import paths**: `@/*` maps to `./src/*`

Prettier config includes `prettier-plugin-tailwindcss` for automatic class sorting.

## Development Tips

### Dev Auth Bypass

Set the `cloie_dev_auth` cookie to bypass Supabase auth in development. Demo users use `@cloie.test` emails (see `src/lib/constants/demo-users.ts`).

### Domain Restriction

Production auth restricts to `@acd.edu.ph` and `@acdeducation.com` domains. Enforced in `src/app/api/auth/callback/route.ts`.

### Testing with `cache()`

Modules using React `cache()` for request deduplication require special handling:

- Use `vi.resetModules()` in `beforeEach`
- Dynamically import the module in tests
- Call `vi.resetModules()` in `beforeEach` and dynamically import to avoid stale cached results

### Tailwind v4 + pnpm

Special configuration in `.npmrc`:

```ini
public-hoist-pattern[]=*tailwindcss*
```

And `next.config.ts` includes custom `resolveTailwindcssPackagePath()` for Turbopack.
