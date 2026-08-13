# Canonical Name Release Evidence

## Database And Contract

- Target: isolated dedicated-demo Supabase project `eacqyoldexodezvawvqy`; primary Production ref `eyvfrfyqetttjtsveaag` was distinct.
- `NODE_ENV=production pnpm verify:demo-target-isolation`: passed before destructive reset, contract push, and final reset/reseed.
- `pnpm supabase:push:dry-run` before contract push listed only `20260813014341_remove_legacy_split_user_name_columns.sql`.
- `NODE_ENV=production pnpm supabase:push`: applied the contract migration.
- `pnpm supabase migration list`: local and remote history match through `20260813014341`.
- Final live schema query: `public.users` exposes only required `name`; `users_name_not_blank` remains; no compatibility trigger remains; null-name count is `0`; whitespace-only count is `0`; seeded user count is `25`.
- `pnpm supabase:types`: regenerated `src/types/supabase-database.ts`; generated `users` Row/Insert/Update types expose `name` and omit `first_name`/`last_name`.
- `NODE_ENV=production pnpm demo:reset`: replayed the complete migration history and reseeded canonical-name fixtures successfully.

## Application Verification

- `pnpm test`: `330` files passed, `10` skipped; `2732` tests passed, `19` skipped.
- `pnpm lint`: `0` errors, `40` warnings.
- `pnpm build`: production compilation and TypeScript checking passed.
- `pnpm exec prisma validate --schema prisma`: passed.
- Focused migration/workflow/bootstrap tests: `27/27` passed.
- Final contract and generated-schema focused test: `10/10` passed.

## Browser And Authentication Evidence

- Authentication mode: `signed demo session`.
- Origin: ephemeral Cloudflare-tunneled local production build, `https://run-shoot-receive-engineer.trycloudflare.com`.
- `NODE_ENV=production PRODUCTION_EVIDENCE_BASE_URL=<origin> pnpm verify:dedicated-demo-auth-boundary`: passed after starting a clean production server with dedicated-demo configuration.
- Origin root returned HTTP `200`; production browser smoke reached the CLOIE role portal.
- This is tunneled local production evidence, not a durable hosting deployment.
- Real OAuth flow reached the actual Google sign-in page for the isolated Supabase project, but no authorized disposable Google account was authenticated; no real OAuth callback or first-link mutation was claimed.
- Development/demo evidence is not used as proof of real OAuth metadata behavior.

## Known Limitations

- No real Google OAuth first-link, linked-name preservation, provider-name absence, or identity-conflict browser trace was completed because no authorized Google test account was available in the browser.
- No database integration suite was run against the hosted demo database; repository database suites remain gated by `RUN_DATABASE_INTEGRATION_TESTS=1`.
- Contract cleanup is irreversible with respect to reconstructing semantic first/last components from opaque names; recovery requires a pre-contract snapshot or forward fix.
