# System CLOIE deployment inventory

Last verified: 2026-09-22
Operator: tugeru

## Host

- Hostname: home-lab
- Ubuntu version: 26.04.1 LTS (re-confirmed via `lsb_release`, 2026-09-22)
- Tailscale IP: 100.87.139.102

## Coolify

- Context: home-lab
- Coolify server version: 4.3.23 (observed via `coolify context verify`, 2026-09-22; was 4.3.14 on 2026-09-10)
- CLI version: 1.8.0
- Project UUID: af6wojt18bysconhgtf1tkc4
- Environment: production, UUID m2ylidqblwumb5obxnlopv4p
- Server UUID: onpjscrsqxbj66exk8brdhyi
- Destination/network: coolify, UUID bjhm2e7eo9lpa7pbp3fzjcc2

## System CLOIE App

- Resource name: System CLOIE App
- Resource UUID: q5lnvl1jcuyeqejgakvqzw64
- Repository: KinetiqDev/system-cloie
- Branch: main
- Deployed commit: b08c77a8da58c69b6c5456c3a49e1028e7517539 (PR #633 feat/630 scaffold selection; 2026-09-16 redeploy kzmn4fb2, `finished`; health 200 re-verified 2026-09-22). Origin/main has since advanced to 75f2fc56 (PR #637, 2026-09-22); prod is behind by ~6 days of merges.
- Internal port: 3000
- Domain: https://system-cloie.app
- Coolify origin route: http://system-cloie.app, because Cloudflare Tunnel terminates HTTPS
- Auto deploy: enabled (Coolify resource setting)
- Push webhook: NOT operational end-to-end. Coolify half is configured
  (secret present, Auto Deploy ON), but the Cloudflare tunnel route and the
  GitHub repository hook are not yet provisioned, so pushes to main do NOT
  trigger deployments yet. Re-checked 2026-09-22: GitHub API returns no
  repository webhooks, and recent prod/staging deployments were manual or
  branch-targeted (prod kzmn4fb2 on PR #633). Run
  `~/.config/system-cloie/cloie-webhook-wizard.sh`
  (runbook §38 "GitHub push webhook"), verify one successful webhook delivery,
  then update this entry to active with the verified deployment reference.
- Health path: /api/health

## Supabase

- Resource name: System CLOIE Supabase
- Resource UUID: z6in60cnponudoazdc5e3dhq
- Repository: KinetiqDev/system-cloie-infra
- Branch: main
- Infrastructure commit: 46d83994451ff8aaa5ba74634cf6f5c5b31a958f (last finished Supabase deployment 3eb5makc on 2026-09-07; no redeploy through 2026-09-22)
- Self-hosted release: self-hosted/v0.8.0
- Public API domain: https://api.system-cloie.app
- Gateway internal port: 8000
- Auto deploy: disabled
- PostgreSQL version: 17.6
- Supavisor private hostname: supavisor
- PostgreSQL private hostname: db
- Pooler session port: 5432
- Maintenance Postgres binding: 127.0.0.1:55432
- Database persistent volume: supabase_db-data
- Storage persistent volume: supabase_storage-data

## Staging

- System CLOIE Dev: UUID i4j51qjwn7ynj2twamqivku6, branch `fix/analytics-period-labels`, `running:healthy`; latest finished deployment elhmswch on 9a397c80 (2026-09-16). Auto Deploy ON.
- System CLOIE Preview: UUID 8vt0ubctoeekhjs0zyf4frqa, branch `fix/analytics-period-labels`, `running:healthy` on the prior finished build sjtgccb0 (b08c77a8, PR #633); latest deployment pwthtein on 9a397c80 (2026-09-16) `failed` in the Docker build (`general-education-analytics.ts` reference, then the `NEXT_PUBLIC_*` build-arg guard). Needs a rebuild after the fix lands. Auto Deploy ON.
- System CLOIE Supabase Staging: UUID g6afevrz4cxlafnyq7uv0haa, branch `staging-overlay`, `running:healthy`; last finished deployment n7ulo7dk on e4df6e73 (2026-09-07).
- Note: 9a397c80 is merged in origin/main (via PR #634), so staging tracks a merged commit, not an unmerged branch tip. Origin/main has since advanced to 75f2fc56 (PR #637).

## Cloudflare

- Tunnel service: active
- App route: system-cloie.app -> http://localhost:80, verified
- API route: api.system-cloie.app -> http://localhost:80, verified
- Router port forwarding: none required

## Secrets

- Supabase generated secrets: configured in Coolify
- Google OAuth: configured in Supabase Auth
- CONFIRMATION_SECRET: configured
- CLOIE_LEGAL_TICKET_SECRET: configured
- BOOTSTRAP_SECRETARY_EMAIL: configured
- AI credentials: configured on System CLOIE App (env names re-verified 2026-09-22: `CLOIE_AI_*` present alongside `CLOIE_APPEARANCE_ENABLED`, `CLOIE_BACKEND_ID`, `CLOIE_DEPLOYMENT_KIND`, `CLOIE_PRIMARY_BACKEND_ID`; no `CLOIE_DEMO_*`, `CLOIE_CI_TEST_*`, or `NEXT_PUBLIC_DEMO_MODE`). Dev and Preview carry their own staging values.
- Demo and CI authentication variables: not configured

## Backups

- Target PostgreSQL backup path: /var/backups/system-cloie/postgres
- Target Storage backup path: /var/backups/system-cloie/storage
- Target config backup path: /var/backups/system-cloie/config
- Current PostgreSQL backup: /var/backups/system-cloie/postgres/system-cloie-initial.dump
- Current Storage backup: /var/backups/system-cloie/storage/system-cloie-storage-initial.tar.gz
- Current config backup: /var/backups/system-cloie/config/system-cloie-infra-initial.tar.gz
- All three archives are root-owned, mode 0600, and passed format/readability checks
- Backup automation: not configured
- Off-server encrypted backup: not configured
- Last restore drill: not run

The current backups are on the same server and are not disaster recovery.

## Verification

- Supabase services: healthy
- PostgreSQL 17: verified with `SHOW server_version`, returned 17.6
- Persistent volumes: verified for PostgreSQL and Storage
- Supabase Auth through local Coolify route: HTTP 200
- Google provider: enabled
- Google authorize endpoint: redirects to Google with callback `https://api.system-cloie.app/auth/v1/callback`
- System CLOIE migrations: STALE — prod-remote and staging-remote last matched main through 20260909120000 (0 pending on both, verified 2026-09-10; prod applied with dry-run review, pre-apply backup at ~/system-cloie-backups/pre-migration-20260910.dump). Since then main merged 20260912174143 (2026-09-13, one-CILO-to-many-questions) and 20260922120000 (2026-09-22, course GO question bindings). The prod build at b08c77a8 contains the 20260912 migration file (ancestry-verified); DB apply state was NOT re-checked on 2026-09-22. Re-run `migration:list` against prod-remote and staging-remote before the next push.
- Staging no longer mirrors prod: Dev and Preview track branch `fix/analytics-period-labels` (Dev finished elhmswch on 9a397c80; Preview healthy on prior sjtgccb0 after pwthtein failed on 9a397c80; all 2026-09-16). Prod stays on main at b08c77a8 (kzmn4fb2, health 200 re-verified 2026-09-22).
- Prisma private database access: `SELECT 1` succeeded from the application container through Supavisor
- Application image: healthy
- Public application: HTTP 200
- Public health endpoint: returns `{"status":"ok","service":"System CLOIE"}`
- Anonymous protected route: redirects to the respondent portal
- Public database ports 5432, 55432, and 6543: closed
- External Supabase Auth: verified with the browser-safe publishable key; Google is enabled
- Google OAuth: user confirmed the live flow works through Google authentication and return to System CLOIE
- Tailscale: healthy
- Cloudflare Tunnel daemon: healthy
- Repository tests at initial deployment: two pre-existing failures in `program-head-outcomes-view.test.tsx` and `fallow-agent-guidance.test.ts`; lint completed with warnings; production build passed
- Baseline seed applied 2026-08-31 via standalone `tsx prisma/seed-baseline.ts` (idempotent upserts; NOT the wrapped `pnpm seed:baseline`, which destructively resets a demo-isolated target): 6 programs, 7 majors, 102 courses, 2 school years, 10 canonical term instances, 4 institutional evaluation templates; pre-existing stub school year `2026-2027` relabeled to the fixture ID before seeding; pre-seed backup at `/var/backups/system-cloie/postgres/pre-baseline-seed.dump`

## Outstanding operational readiness

- Schedule recurring PostgreSQL and Supabase Storage backups with retention and failure reporting.
- Create an encrypted off-server copy; the current backups and live data share the same filesystem.
- Run and record a full restore drill against a disposable non-production target.
- Capture a fresh backup after the first real OAuth/account activity and after the latest credential rotation.
- Establish encrypted recovery custody for runtime secrets; secrets are intentionally absent from Git and the config archive.
- Production migration command repaired and verified 2026-09-07: CLI bumped to ^2.116.0 (older releases ignore `sslmode` and force TLS against the plaintext target) and remote commands now default to `?sslmode=disable`; `migration:list` and `push --dry-run` confirmed green against the maintenance endpoint.
- Configure at least one Coolify notification channel for deployment, backup, host reachability, and disk failures.
- Root filesystem 76% used (41G of 57G) and Docker build cache 0B on 2026-09-22 (was 82% and ~16 GB build cache at the readiness audit); keep disk-capacity monitoring and build-cache cleanup.
- Define and rehearse application and Supabase rollback procedures with named operators and recovery objectives.
- Investigate Kong gateway `503 remote connection failure` on `/rest/v1/*` (PostgREST itself healthy, direct 200, schema cache current at 37 relations; System CLOIE does not use PostgREST so no user impact; observed 2026-09-07, predates the migration apply).
- Record a maintenance cadence for Ubuntu, Docker, Coolify, cloudflared, Tailscale, and the pinned Supabase self-hosted release.
