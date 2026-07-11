# Conventional Commits Cheatsheet

> Repo-specific quick reference for the commit convention used by this project.
> Full spec: https://www.conventionalcommits.org/en/v1.0.0/

## Format

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

- **Lowercase description** — imperative present tense (e.g., "add feature", not "added feature")
- **No trailing period** in the description
- **Scope** is optional; use it to indicate the affected area (e.g., `test(portal)`, `fix(ci)`)

## Types

| Type | Use when |
|------|----------|
| `feat` | A new feature or capability is added |
| `fix` | A bug is fixed |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | A performance improvement |
| `style` | Code style changes (formatting, missing semicolons, etc.) |
| `test` | Adding or correcting tests |
| `docs` | Documentation changes only |
| `build` | Build system or dependency changes |
| `ops` | Infrastructure, deployment, or CI/CD changes |
| `chore` | Routine maintenance (deps, tooling, clean-up) |

## Breaking Changes

Use `!` before the `:` to signal a breaking change, and add a `BREAKING CHANGE:` footer:

```
feat(api)!: remove deprecated v1 endpoints

BREAKING CHANGE: The /api/v1/* routes have been removed. Migrate to /api/v2/*.
```

## Examples from this repo

```
fix(ci): skip DB-gated integration tests when DATABASE_URL unset
test(portal): extend MockPortalShellProps to render SessionBanner + assert session content
chore: remove deprecated .gitignore entries
```
