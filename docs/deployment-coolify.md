# System CLOIE Coolify deployment plan

> Intended repository path: `docs/operations/deployment-coolify.md`
>
> Status: deployment runbook for the current beta/testing deployment
>
> Target host: Ubuntu Server home-lab
>
> Public application: `https://system-cloie.app`
>
> Public Supabase API: `https://api.system-cloie.app`
>
> Coolify CLI context: `home-lab`

## 1. Purpose

This document is the deployment runbook for System CLOIE.

It covers:

- the Ubuntu host layout;
- the System CLOIE Next.js application;
- independently self-hosted Supabase;
- PostgreSQL 17;
- Supavisor;
- Google OAuth;
- Coolify;
- Cloudflare Tunnel;
- Tailscale administration;
- secrets and environment variables;
- database migrations;
- backups;
- first deployment;
- normal redeployments after code changes;
- deployments that include schema changes;
- rollback and recovery;
- Supabase infrastructure updates.

This deployment is still beta/testing, but it must use production security behavior. The application deployment therefore uses `CLOIE_DEPLOYMENT_KIND=production`, real Google OAuth, real persistent data, and no demo or CI authentication configuration.

The goal is simple:

1. Supabase stays persistent and changes rarely.
2. System CLOIE can be rebuilt and redeployed often.
3. Pushing normal application code should be cheap.
4. Database changes must remain explicit and reviewable.
5. No database, SSH, or Coolify administration port is exposed to the public Internet.

## 2. Source of truth

Before changing deployment configuration, inspect the current repository.

Important application files:

```text
Dockerfile
.dockerignore
.env.example
next.config.ts
package.json
prisma/schema.prisma
prisma/models/
supabase/config.toml
supabase/migrations/
scripts/run-supabase-command.ts
scripts/generate-supabase-types.ts
src/app/api/health/route.ts
src/proxy.ts
```

Current repository facts at the time this runbook was written:

```text
Next.js: 16.3.3
Node image: 22-bookworm-slim
pnpm: 10.30.3
Next output: standalone
Application port: 3000
Health endpoint: GET /api/health
Remote database target: independently self-hosted Supabase
Required Postgres major: 17
```

The current executable repository wins if this document becomes stale.

For Coolify CLI commands, use `--help` before assuming command syntax:

```bash
coolify --help
coolify app --help
coolify service --help
coolify deploy --help
```

For Supabase infrastructure, verify the current official self-hosting documentation before upgrading or generating a new stack. Do not blindly reuse a self-hosted release number copied from an old deployment guide.

## 3. Target architecture

```text
PUBLIC INTERNET
       |
       v
Cloudflare
       |
       v
Cloudflare Tunnel
       |
       v
http://localhost:80
       |
       v
Coolify proxy
       |
       +-------------------------------+
       |                               |
       v                               v
system-cloie.app                 api.system-cloie.app
       |                               |
       v                               v
System CLOIE                    Supabase API gateway
Next.js container :3000               :8000
       |                               |
       |                         +-----+-----+---------+
       |                         |           |         |
       |                         v           v         v
       |                       Auth       PostgREST  Storage
       |                         |
       +-------------------------+
                 private Docker networking
                           |
                           v
                     Supavisor :5432
                           |
                           v
                     PostgreSQL 17
```

Administration stays private:

```text
Laptop
  |
  v
Tailscale
  |
  +-- Coolify administration
  +-- SSH
  +-- maintenance commands
  +-- database maintenance through localhost or private Docker networking
```

Never make these public:

```text
PostgreSQL :5432
Supavisor :5432
Supavisor :6543
Coolify administration :8000
SSH :22
```

There is no router port forwarding requirement for the public application. Cloudflare Tunnel initiates the outbound tunnel from the server.

## 4. Host filesystem layout

Create or maintain this layout:

```text
/home/tugeru/
├── src/
│   ├── system-cloie/
│   └── system-cloie-infra/
│       └── supabase/
│
└── .config/
    └── system-cloie/
        └── deploy.env

/var/backups/
└── system-cloie/
    ├── postgres/
    ├── storage/
    └── config/
```

### `/home/tugeru/src/system-cloie`

Working clone of the System CLOIE application repository.

Purpose:

- inspect the deployed code;
- run repository verification;
- run migration commands;
- run manual deployment checks;
- give deployment agents a stable application path.

This directory is not the production runtime. Coolify should clone the Git repository and build the application itself.

Expected contents include:

```text
/home/tugeru/src/system-cloie/
├── Dockerfile
├── .dockerignore
├── .env.example
├── package.json
├── next.config.ts
├── prisma/
├── supabase/
├── scripts/
└── src/
```

### `/home/tugeru/src/system-cloie-infra`

Working clone of the private infrastructure repository.

Its main responsibility is the self-hosted Supabase runtime definition.

Expected layout:

```text
/home/tugeru/src/system-cloie-infra/
└── supabase/
    ├── docker-compose.yml
    ├── .env.example
    ├── .supabase-version
    ├── run.sh
    ├── update.sh
    ├── reset.sh
    ├── utils/
    └── volumes/
```

Do not confuse the two `supabase/` directories:

```text
system-cloie/supabase/
    System CLOIE migrations and local Supabase development configuration

system-cloie-infra/supabase/
    self-hosted Supabase runtime infrastructure
```

### `/home/tugeru/.config/system-cloie/deploy.env`

Temporary or operator-controlled secret handoff file.

Permissions:

```bash
mkdir -p /home/tugeru/.config/system-cloie
chmod 700 /home/tugeru/.config/system-cloie
touch /home/tugeru/.config/system-cloie/deploy.env
chmod 600 /home/tugeru/.config/system-cloie/deploy.env
```

Human-provided values may be placed here:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BOOTSTRAP_SECRETARY_EMAIL=

# Optional. Leave absent unless intentionally enabling AI.
CLOIE_AI_API_KEY=
CLOIE_AI_BASE_URL=
CLOIE_AI_MODEL=
```

Rules:

- never commit this file;
- never copy it into either repository;
- never print it to logs;
- never run `cat` on it in captured deployment logs;
- never turn any server secret into a `NEXT_PUBLIC_*` variable.

The production source of truth for application and Supabase environment values is Coolify.

### `/var/backups/system-cloie`

Operator backup root.

```text
/var/backups/system-cloie/postgres
    PostgreSQL dumps

/var/backups/system-cloie/storage
    Supabase Storage backup material

/var/backups/system-cloie/config
    sanitized infrastructure inventory and recovery metadata
```

This directory is not enough by itself. A useful backup must eventually have an encrypted copy outside this server.

### Docker persistent data

Do not manually manage files under:

```text
/var/lib/docker/volumes/
```

Docker and Coolify own those paths.

PostgreSQL and Supabase Storage production data should use persistent Docker volumes. Containers are disposable. Persistent data is not.

## 5. Git repository model

Use two repositories.

### Application repository

```text
system-cloie
```

Contains:

- Next.js;
- Dockerfile;
- Prisma models;
- Supabase migrations;
- application tests;
- application source.

Coolify application resource uses this repository.

### Infrastructure repository

```text
system-cloie-infra
```

Keep it private.

Contains the versioned self-hosted Supabase Docker configuration.

Coolify Docker Compose resource uses this repository.

Do not commit:

```text
.env
*.pem
database passwords
OAuth client secrets
Supabase secret keys
JWT private signing material
Coolify API tokens
Cloudflare tunnel connector tokens
```

## 6. Deployment ownership model

Coolify should manage two independent resources.

```text
Coolify project: System CLOIE
|
+-- System CLOIE App
|   Source: system-cloie
|   Build pack: Dockerfile
|   Internal port: 3000
|   Public domain: system-cloie.app
|   Auto deploy: enabled after initial verification
|
+-- System CLOIE Supabase
    Source: system-cloie-infra
    Build pack: Docker Compose
    Public component: API gateway :8000
    Public domain: api.system-cloie.app
    Auto deploy: disabled
```

Why:

- application code changes frequently;
- Supabase infrastructure should not restart because a React page changed;
- Supabase upgrades need backups and deliberate review;
- application rollback and infrastructure rollback remain separate.

## 7. Agent operating rules

Deployment agent must follow these rules.

### Do

- inspect current files before changing anything;
- run `coolify ... --help` for commands whose syntax is uncertain;
- verify current official Supabase self-hosting documentation before choosing a release;
- keep the application and Supabase infrastructure as separate Coolify resources;
- ask the operator only when a value genuinely requires human input;
- generate strong random application secrets locally without printing them;
- store production environment variables in Coolify;
- inspect deployable Compose before starting Supabase;
- verify public and private networking;
- record resource UUIDs and non-secret deployment metadata.

### Do not

- print secrets;
- commit secrets;
- put secrets in shell history when avoidable;
- expose Postgres or Supavisor publicly;
- open router ports as a workaround;
- use Supabase Cloud;
- run destructive demo/reset commands;
- use `pnpm db:push` against this deployment;
- use `pnpm supabase:reset` against this deployment;
- use `pnpm demo:reset` against this deployment;
- use `pnpm seed:baseline` against this deployment;
- use `pnpm db:seed` unless the seed behavior has been explicitly reviewed and approved for this target;
- automatically update Supabase without a backup and review;
- guess private Docker hostnames.

If a required secret is absent, stop at that exact dependency and ask for it. Continue everything else that is safe to complete.

## 8. Human-provided inputs

Agent should obtain these from `/home/tugeru/.config/system-cloie/deploy.env` when present:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
BOOTSTRAP_SECRETARY_EMAIL
```

Agent may need operator help for:

```text
Cloudflare account action or credential if api.system-cloie.app tunnel route is missing
GitHub authorization if private repository access is not configured
Google Cloud Console changes if OAuth redirect URI is not configured
```

Optional AI credentials are not required for initial deployment.

## 9. Agent-generated secrets

Generate instead of asking the operator to invent them.

Supabase official setup tooling should generate its own:

```text
POSTGRES_PASSWORD
DASHBOARD_PASSWORD
Supabase publishable key
Supabase secret key
JWT signing material
pooler-related credentials and IDs
other official self-hosted stack secrets
```

Generate separate System CLOIE application secrets:

```text
CONFIRMATION_SECRET
CLOIE_LEGAL_TICKET_SECRET
```

Example generation mechanism:

```bash
openssl rand -base64 48
```

Do not print the generated values into a deployment report.

The deployment report records only:

```text
CONFIRMATION_SECRET: configured
CLOIE_LEGAL_TICKET_SECRET: configured
```

## 10. Preflight checks

Start every first deployment with:

```bash
whoami
hostnamectl
cat /etc/os-release
free -h
df -h
```

Verify Docker:

```bash
docker --version
docker compose version
docker info
docker ps
```

Verify Tailscale:

```bash
tailscale status
tailscale ip -4
```

Verify Cloudflare Tunnel:

```bash
cloudflared --version
sudo systemctl status cloudflared --no-pager
```

If unhealthy:

```bash
sudo journalctl -u cloudflared -n 100 --no-pager
```

Verify Coolify CLI:

```bash
coolify --version
coolify context list
coolify context verify
coolify project list
coolify server list
coolify resource list
```

Expected context:

```text
home-lab
```

Verify GitHub CLI:

```bash
gh --version
gh auth status
```

Verify application working tools:

```bash
node --version
pnpm --version
git --version
```

The current application uses Node 22 and pnpm 10.30.3.

If Corepack is available but pnpm is wrong:

```bash
corepack enable
corepack prepare pnpm@10.30.3 --activate
```

Do not require host Node.js for the running application container. Host Node/pnpm is useful for migrations and repository verification only.

## 11. Prepare the application working clone

If `/home/tugeru/src/system-cloie` is empty, clone the application repository.

Before cloning, inspect the expected GitHub account or organization. Do not create a repository under a guessed owner.

After cloning:

```bash
cd /home/tugeru/src/system-cloie
git remote -v
git status
git branch --show-current
git log -1 --oneline
```

Install dependencies only when host-side verification or migrations are needed:

```bash
pnpm install --frozen-lockfile
```

Initial repository verification:

```bash
pnpm lint
pnpm test
pnpm build
```

Do not block infrastructure discovery on slow optional tests unless the application currently fails its normal required gates.

## 12. Prepare `system-cloie-infra`

If the infrastructure repository does not exist:

1. determine the GitHub owner from the application remote;
2. create a private `system-cloie-infra` repository under that owner only when authorization is clear;
3. initialize `/home/tugeru/src/system-cloie-infra`;
4. keep its Supabase runtime under `supabase/`.

The infrastructure repo is version control for vendor configuration and CLOIE-specific deployment adjustments. It is not where live database data belongs.

## 13. Obtain the official self-hosted Supabase configuration

Use the current official Supabase self-hosting Docker release.

Preferred process:

1. read current `https://supabase.com/docs/guides/self-hosting/docker`;
2. inspect the official `setup.sh` before running it;
3. use a current pinned self-hosted snapshot or the official Linux setup flow;
4. ensure `.supabase-version` is created or recorded;
5. copy the resulting non-secret deployment files into `system-cloie-infra/supabase`;
6. never commit the generated `.env`.

Current official tooling provides:

```text
setup.sh
run.sh
update.sh
reset.sh
utils/generate-keys.sh
utils/add-new-auth-keys.sh
```

The official setup flow generates secrets and records the installed self-hosted release in `.supabase-version`.

Do not hard-code an old release tag from this document. The agent must inspect the current official release at deployment time.

## 14. Supabase URL configuration

Configure the Supabase deployment for these public URLs:

```dotenv
SUPABASE_PUBLIC_URL=https://api.system-cloie.app
API_EXTERNAL_URL=https://api.system-cloie.app/auth/v1
SITE_URL=https://system-cloie.app
PROXY_DOMAIN=api.system-cloie.app
```

The `/auth/v1` suffix on `API_EXTERNAL_URL` is intentional.

Allowed application callback:

```text
https://system-cloie.app/api/auth/callback
```

Configure the official self-hosted redirect allow-list variable using the exact variable name present in the current Supabase release. Do not invent a variable name if upstream changed it.

## 15. Google OAuth

Google authorized redirect URI:

```text
https://api.system-cloie.app/auth/v1/callback
```

Human source values:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Map them to the current official self-hosted Supabase Google provider configuration.

Current official Compose convention uses values equivalent to:

```dotenv
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=<human value>
GOOGLE_SECRET=<human GOOGLE_CLIENT_SECRET>
```

and passes them to Auth through:

```text
GOTRUE_EXTERNAL_GOOGLE_ENABLED
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID
GOTRUE_EXTERNAL_GOOGLE_SECRET
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI
```

Do not put the Google client secret into the Next.js application resource.

## 16. Adapt Supabase persistence for Coolify

The upstream Supabase Docker configuration may use repository-relative bind mounts for mutable database and Storage data.

For Coolify deployment, persistent application data should survive container replacement and repository refreshes.

Inspect the exact current Compose file. Convert only the mutable data mounts to named Docker volumes.

Conceptual target:

```yaml
services:
  db:
    volumes:
      - cloie-supabase-db-data:/var/lib/postgresql/data

  storage:
    volumes:
      - cloie-supabase-storage-data:/var/lib/storage

volumes:
  cloie-supabase-db-data:
  cloie-supabase-storage-data:
```

The exact target paths must match the current upstream Compose release.

Keep repository-managed initialization and configuration files as repository-relative mounts where upstream requires them.

Examples include SQL initialization files, pooler configuration, gateway configuration, and Edge Function source.

If repository-relative file mounts remain, enable Coolify's "Preserve Repository During Deployment" behavior for this Docker Compose resource.

Do not edit `/var/lib/docker/volumes` manually.

## 17. Maintenance-only Postgres host access

Application containers should use private Docker networking.

For host-side migration and maintenance convenience, a localhost-only Postgres binding is acceptable:

```yaml
ports:
  - "127.0.0.1:55432:5432"
```

This is a maintenance path, not the application's runtime path.

Never use:

```text
0.0.0.0:5432
0.0.0.0:55432
```

If the current stack or server already uses `55432`, choose another localhost-only high port and record it.

## 18. Do not publish internal Supabase ports

Do not publish these on public server interfaces:

```text
Postgres
Supavisor session port
Supavisor transaction port
internal Auth service
internal REST service
internal Realtime service
internal Storage service
```

The only public Supabase HTTP entry is the API gateway routed by Coolify.

If upstream Compose includes direct host port mappings, inspect each one and remove or restrict those that are unnecessary for this architecture.

## 19. Create the Supabase Coolify resource

Create a Git-backed Docker Compose resource from the private `system-cloie-infra` repository.

Target:

```text
Resource name: System CLOIE Supabase
Repository: system-cloie-infra
Branch: main
Base directory: /supabase
Compose file: docker-compose.yml
Build pack: Docker Compose
Auto deploy: disabled
```

Agent must discover the exact current Coolify CLI command with:

```bash
coolify service --help
coolify app --help
```

Use Coolify API only when the CLI lacks the needed operation.

Do not use an old Coolify one-click Supabase template as the source of truth.

## 20. Supabase Coolify networking

Enable:

```text
Connect To Predefined Network
```

The normal Coolify predefined Docker network is `coolify`.

Reason:

- Supabase Compose gets its own resource-specific network;
- the Next.js application is a separate Coolify resource;
- both must share a Docker network for private database access.

Do not add custom network definitions merely to reproduce Coolify's destination network.

After deployment, inspect the generated deployable Compose and actual containers.

Coolify may prefix service names to avoid collisions. Do not guess the cross-resource hostname.

Determine and record the actual resolvable hostnames for:

```text
Supavisor
PostgreSQL
```

Verify them from the System CLOIE application container after it joins the same network.

## 21. Supabase Coolify environment variables

Production Supabase secrets and configuration live in Coolify.

Use Coolify environment variable management or an environment sync mechanism that does not print secret values.

Do not keep production secrets in Git.

If the official setup script generated a local `.env`, use it only as a protected source for transferring values into Coolify:

```bash
chmod 600 /home/tugeru/src/system-cloie-infra/supabase/.env
```

Do not `cat` it into logged output.

After values are stored and verified in Coolify, the local `.env` may remain protected for maintenance if required by `update.sh`, or may be reconstructed later from the secret store. It is never committed.

## 22. Supabase public domain

Assign the public domain only to the Supabase API gateway component:

```text
https://api.system-cloie.app
```

Route it to the gateway's internal port:

```text
8000
```

The exact Coolify domain syntax can change. Use the current CLI or dashboard setting that maps a domain to a component and internal port.

Do not assign public domains to Postgres or Supavisor.

## 23. Cloudflare Tunnel routes

Expected public routes:

```text
system-cloie.app
    service: http://localhost:80

api.system-cloie.app
    service: http://localhost:80
```

Do not point Cloudflare directly to:

```text
localhost:3000
localhost:8000
```

Coolify's proxy should own hostname routing.

Public request flow:

```text
Cloudflare
  -> cloudflared
  -> localhost:80
  -> Coolify proxy
  -> matching container and internal port
```

If the `api.system-cloie.app` route does not exist and the agent has no authorized Cloudflare credential, stop and ask the operator to add that published application route.

Do not open router ports as a workaround.

## 24. Coolify HTTPS behavior behind Cloudflare Tunnel

Public HTTPS terminates at Cloudflare.

The tunnel origin is:

```text
http://localhost:80
```

Avoid configuring a Coolify HTTP-to-HTTPS redirect that creates a redirect loop behind this tunnel.

Set the resource's public domain as HTTPS, but keep Coolify's forced redirect disabled if the tunnel-to-origin HTTP path loops or if this has already been established for the host.

Verify with:

```bash
curl -I https://system-cloie.app
curl -I https://api.system-cloie.app
```

There must be no infinite redirect chain.

## 25. Deploy Supabase

Before deploy:

- review Source Compose;
- review Coolify Deployable Compose;
- confirm persistent volumes;
- confirm no unintended public host ports;
- confirm required variables are populated;
- confirm `Connect To Predefined Network` is enabled;
- confirm API gateway domain targets port 8000.

Deploy.

Then inspect:

```bash
docker ps
```

Use Coolify service logs or container logs for failing components.

Do not continue to the application until required Supabase components are healthy.

## 26. Verify PostgreSQL 17

System CLOIE's `supabase/config.toml` requires Postgres major 17.

Verify the running server:

```sql
SHOW server_version;
```

Expected:

```text
17.x
```

Stop deployment if the self-hosted backend is on an incompatible major version.

## 27. Verify Supabase Auth and API

Obtain the generated browser-safe publishable key.

Test:

```bash
curl -fsS   -H "apikey: <PUBLISHABLE_KEY>"   https://api.system-cloie.app/auth/v1/settings
```

Expected:

- HTTP success;
- Auth settings JSON;
- Google provider enabled after OAuth configuration.

Do not put the Supabase secret key in this command.

Public API routes should be reachable through the same gateway:

```text
/auth/v1/
/rest/v1/
/storage/v1/
/realtime/v1/
```

Only test services System CLOIE needs.

## 28. Apply System CLOIE database migrations

Supabase infrastructure being healthy does not mean the CLOIE schema exists.

Use the application repository's migration workflow.

From:

```text
/home/tugeru/src/system-cloie
```

Set `DIRECT_URL` to the private or localhost maintenance Postgres endpoint.

If using host localhost mapping:

```text
postgresql://postgres:<POSTGRES_PASSWORD>@127.0.0.1:55432/postgres
```

If the password contains URI-reserved characters, URL-encode it before constructing a PostgreSQL URL.

Run in this order:

```bash
pnpm supabase:migration:list
pnpm supabase:push:dry-run
```

Review the dry-run.

Then:

```bash
pnpm supabase:push
pnpm supabase:types
```

The current repository intentionally uses `DIRECT_URL` for remote migration list, push, dry-run, and remote type generation. It does not require Supabase Cloud project linking.

Never replace this with:

```bash
pnpm db:push
```

on this deployment.

## 29. Initial data

Do not automatically run demo or CI seed/reset workflows.

Forbidden on this target:

```bash
pnpm demo:reset
pnpm seed:baseline
pnpm supabase:reset
```

Do not run `pnpm db:seed` unless its current fixtures have been audited and explicitly approved for the beta backend.

Prefer:

- migrations for schema;
- `BOOTSTRAP_SECRETARY_EMAIL` for first privileged account bootstrap;
- normal System CLOIE interfaces for institutional configuration and user onboarding.

## 30. Create the System CLOIE Coolify application

Create a separate application resource.

Target:

```text
Resource name: System CLOIE App
Repository: system-cloie
Branch: main
Build pack: Dockerfile
Dockerfile location: /Dockerfile
Internal port: 3000
Domain: https://system-cloie.app
Health path: /api/health
Connect to predefined network: enabled
Auto deploy: enabled after initial deployment is proven
```

Use the private GitHub App integration if the repository is private.

The current Dockerfile already:

- builds with Node 22;
- activates pnpm 10.30.3;
- runs `pnpm build`;
- uses Next.js standalone output;
- copies `public` and `.next/static`;
- runs as the non-root `node` user;
- listens on `0.0.0.0:3000`;
- defines a container health check against `/api/health`.

Do not add an application Docker Compose file merely to wrap this single container.

## 31. System CLOIE build-time variables

These values are browser-safe and must exist while `next build` runs:

```dotenv
NEXT_PUBLIC_SITE_URL=https://system-cloie.app
NEXT_PUBLIC_SUPABASE_URL=https://api.system-cloie.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_KEY>
```

In Coolify, configure them as build variables and runtime variables.

The variable name still says `ANON_KEY`, but the self-hosted Supabase publishable key is the correct browser-safe value when compatible with the current Supabase client.

Never put a Supabase secret key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 32. System CLOIE runtime-only variables

Required production runtime values include:

```dotenv
DATABASE_URL=<Supavisor session-mode PostgreSQL URL>
DIRECT_URL=<private direct PostgreSQL URL>

CLOIE_BACKEND_ID=system-cloie-beta-primary
CLOIE_DEPLOYMENT_KIND=production
CLOIE_PRIMARY_BACKEND_ID=system-cloie-beta-primary

CONFIRMATION_SECRET=<generated strong secret>
CLOIE_LEGAL_TICKET_SECRET=<different generated strong secret>

BOOTSTRAP_SECRETARY_EMAIL=<human-provided institutional email>

CLOIE_APPEARANCE_ENABLED=false
```

If the current `.env.example` includes bounded AI configuration, leave it disabled unless explicitly requested:

```dotenv
CLOIE_AI_ENABLED=false
```

Do not set AI provider secrets if AI is disabled.

The current `.env.example` is authoritative for any additional runtime variables introduced after this document was written.

## 33. Variables that must not exist on this deployment

Do not configure production with:

```text
CLOIE_DEMO_ENABLED
CLOIE_DEMO_SESSION_SECRET
CLOIE_DEMO_ALLOWED_USERS
CLOIE_DEMO_BACKEND_ID
CLOIE_DEMO_DATABASE_ID

CLOIE_CI_TEST_ENABLED
CLOIE_CI_TEST_SESSION_SECRET
CLOIE_CI_TEST_ALLOWED_USERS

NEXT_PUBLIC_DEMO_MODE
RUN_DATABASE_INTEGRATION_TESTS
```

This is a production-kind beta deployment, not a dedicated demo or CI database.

## 34. Runtime database connection

Use Supavisor session mode for the persistent Next.js server.

Conceptual `DATABASE_URL`:

```text
postgresql://postgres.<POOLER_TENANT_ID>:<POSTGRES_PASSWORD>@<SUPAVISOR_PRIVATE_HOST>:5432/postgres
```

Use the exact username format and port from the current self-hosted Supabase release.

Do not guess `<SUPAVISOR_PRIVATE_HOST>`.

After both resources share the Coolify network:

1. inspect generated container/service names;
2. resolve the candidate hostname from the application container;
3. make an application-level connection;
4. record the working private hostname in the deployment inventory.

For `DIRECT_URL`, use a direct private Postgres hostname inside the application container:

```text
postgresql://postgres:<POSTGRES_PASSWORD>@<POSTGRES_PRIVATE_HOST>:5432/postgres
```

The localhost `127.0.0.1:55432` address is for commands executed on the Ubuntu host. It is not the database address from inside the Next.js container.

## 35. First System CLOIE build

Before Coolify deployment, local repository verification should be green:

```bash
cd /home/tugeru/src/system-cloie
pnpm lint
pnpm test
pnpm build
```

If practical, perform one direct Docker build using the same public build variables:

```bash
docker build   --build-arg NEXT_PUBLIC_SITE_URL=https://system-cloie.app   --build-arg NEXT_PUBLIC_SUPABASE_URL=https://api.system-cloie.app   --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY>   -t system-cloie:deployment-smoke .
```

Do not pass server secrets as Docker build arguments.

Coolify then builds from the repository Dockerfile.

## 36. Application health check

Expected:

```text
GET https://system-cloie.app/api/health
```

Response:

```json
{
  "status": "ok",
  "service": "System CLOIE"
}
```

The endpoint intentionally does not query Supabase or PostgreSQL. It proves application process liveness.

Database and Auth checks are separate smoke tests.

## 37. First end-to-end verification

Do not report success until these pass.

### Infrastructure

```text
Coolify Supabase resource healthy
PostgreSQL reports 17.x
persistent database volume exists
persistent Storage volume exists
Supabase API gateway reachable
Google provider enabled
Postgres not public
Supavisor not public
Cloudflare Tunnel healthy
Tailscale healthy
```

### Application

```text
Coolify System CLOIE resource healthy
https://system-cloie.app loads
/api/health returns 200
static assets load
Prisma can query PostgreSQL
protected route rejects unauthenticated access
Google OAuth completes
OAuth returns to https://system-cloie.app/api/auth/callback
authenticated user reaches expected onboarding or portal flow
```

### Port audit

Run:

```bash
sudo ss -ltnp
```

Review anything listening on:

```text
22
5432
6543
8000
3000
55432
```

Expected model:

- Coolify admin only through private administration path;
- maintenance Postgres, if used, bound to `127.0.0.1`;
- public application traffic reaches containers through Coolify proxy;
- no Postgres or Supavisor public listener.

## 38. Normal development and redeployment model

System CLOIE is still changing. The deployment must make ordinary code updates cheap.

### Code-only change

Normal workflow:

```text
developer changes code
    |
    v
tests and CI
    |
    v
push/merge to main
    |
    v
Coolify GitHub App notices push
    |
    v
Coolify rebuilds Dockerfile
    |
    v
new System CLOIE container
    |
    v
/api/health
    |
    v
smoke test
```

Recommended application setting:

```text
Auto Deploy: ON
Branch: main
```

Coolify GitHub App supports deployment on new commits.

#### GitHub push webhook

Auto Deploy needs GitHub to notify Coolify. The repository webhook is the wiring
that makes the flow above real. Current topology (beta):

```text
GitHub push to main
  |
  v
webhook.system-cloie.app  (Cloudflare Tunnel, HTTP -> localhost:8000)
  |
  v
Coolify POST /webhooks/source/github/events/manual
  validates X-Hub-Signature-256 against the app's
  manual_webhook_secret_github, matches repo + branch main, deploys
```

Configuration facts:

```text
Repository webhook: https://github.com/KinetiqDev/system-cloie/settings/hooks
Payload URL:        https://webhook.system-cloie.app/webhooks/source/github/events/manual
Content type:       application/json
Events:             Just the push event
Secret location:    Coolify (App > Advanced, manual_webhook_secret_github) and
                    /home/tugeru/.config/system-cloie/deploy.env as GITHUB_WEBHOOK_SECRET
```

Rules:

- The webhook hostname routes only to Coolify's webhook endpoint. Coolify
  administration (:8000) must stay off the public Internet otherwise.
- Setup and verification are scripted:
  `/home/tugeru/.config/system-cloie/cloie-webhook-wizard.sh` (idempotent).
- The GitHub "ping" delivery only proves reachability; the signature is proven
  by a real push. GitHub's webhook "Test delivery" (redelivers the latest push)
  is a safe end-to-end test: it redeploys the currently deployed commit.
- A push whose commit messages all contain `[skip ci]` or `[skip cd]` is
  acknowledged but not deployed.

No Supabase redeployment should occur for normal application commits.

### Manual application redeploy

When a redeploy is needed without a new commit:

```bash
coolify deploy --help
```

Then use the current supported deployment command by application UUID or name.

Inspect after deployment:

```bash
coolify deploy list
coolify app logs <APP_UUID> --lines 100 --show-timestamps
```

Use exact current CLI syntax discovered from `--help`.

## 39. Environment-variable-only change

Changing a Coolify environment variable does not require a Git commit.

Process:

1. update variable in Coolify;
2. if it is a `NEXT_PUBLIC_*` value, rebuild the application because it is embedded during Next.js build;
3. if it is runtime-only, restart or redeploy as required by Coolify;
4. smoke test.

Examples requiring rebuild:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Examples normally runtime-only:

```text
DATABASE_URL
DIRECT_URL
CONFIRMATION_SECRET
CLOIE_LEGAL_TICKET_SECRET
BOOTSTRAP_SECRETARY_EMAIL
CLOIE_APPEARANCE_ENABLED
CLOIE_AI_ENABLED
CLOIE_AI_API_KEY
CLOIE_AI_BASE_URL
CLOIE_AI_MODEL
```

## 40. Code change with a database migration

This needs more care than a normal push.

Do not let an app auto-deploy race a breaking schema change.

### Preferred beta workflow for additive migrations

Use backward-compatible, additive migration design when possible.

Process:

1. implement code and migration locally;
2. run normal tests;
3. run migration dry-run against beta backend;
4. inspect SQL;
5. back up database if the migration is significant;
6. apply migration while old app remains compatible;
7. push or merge code to `main`;
8. Coolify auto-deploys new application;
9. smoke test;
10. regenerate and commit Supabase types if the migration changes generated types and repository policy requires it.

Commands:

```bash
pnpm supabase:migration:list
pnpm supabase:push:dry-run
pnpm supabase:push
pnpm supabase:types
```

### Breaking or destructive migration

Do not rely on auto deploy.

Process:

1. disable application Auto Deploy temporarily;
2. take a verified database backup;
3. push reviewed code and migration;
4. apply the migration in the planned order;
5. manually deploy the compatible application version;
6. verify;
7. re-enable Auto Deploy.

Prefer expand-and-contract migrations instead of destructive one-shot changes.

Examples:

```text
add new column
deploy code that understands old and new
backfill
switch reads/writes
remove old column later
```

Never assume rolling application rollback can undo a database migration.

## 41. Infrastructure changes

Changes under `system-cloie-infra` are different from app changes.

Keep:

```text
Supabase Auto Deploy: OFF
```

Infrastructure workflow:

1. inspect upstream or desired change;
2. back up database and Storage when relevant;
3. modify infrastructure working tree;
4. review `docker compose config`;
5. review Coolify Deployable Compose;
6. commit infrastructure change;
7. manually deploy Supabase resource;
8. verify every required component;
9. verify application login and database behavior.

Do not restart the Supabase stack for an unrelated System CLOIE UI change.

## 42. Supabase updates

Supabase publishes coordinated self-hosted snapshots.

Do not independently pull random latest service images.

Use upstream versioned self-hosted configuration and current update guidance.

In the infrastructure working copy:

```bash
cd /home/tugeru/src/system-cloie-infra/supabase
sh update.sh --dry-run
```

Before applying:

- back up Postgres;
- back up Storage if used;
- read breaking changes;
- verify `.supabase-version`;
- inspect config conflicts.

Then update the infrastructure repo, review, commit, and manually redeploy through Coolify.

A Supabase update is an infrastructure maintenance task, not part of ordinary System CLOIE code deployment.

## 43. Application rollback

If a new System CLOIE deployment is bad:

1. stop further automatic changes;
2. inspect current deployment logs;
3. identify last known-good application deployment;
4. use Coolify's rollback or redeploy the previous known-good Git commit;
5. smoke test `/api/health`, public routes, Auth, and one database-backed route.

Important:

```text
Application rollback does not rollback database migrations.
```

If the failed release included an additive migration, keeping the migration and rolling application code back is often safe.

If it included a destructive migration, use the migration's explicit recovery plan or restore backup only after assessing data loss.

Prefer forward fixes over improvised reverse SQL.

## 44. Supabase rollback

Before any Supabase infrastructure upgrade, record:

```text
current .supabase-version
current infra Git commit
current image/config snapshot
backup path
backup verification result
```

If a new infrastructure revision fails and data format is still compatible:

- revert the infrastructure Git commit;
- manually redeploy previous configuration;
- verify.

For PostgreSQL major upgrades or stateful migrations, follow the upstream rollback or restore procedure. Do not assume reverting Compose is enough.

## 45. Backups

### PostgreSQL

Backup directory:

```text
/var/backups/system-cloie/postgres
```

Use `pg_dump` against direct Postgres.

Conceptual command:

```bash
pg_dump   --format=custom   --file="/var/backups/system-cloie/postgres/cloie-$(date +%F-%H%M).dump"   "<DIRECT_POSTGRES_URL>"
```

Do not put a password directly in shared shell history if avoidable.

During beta:

- take a backup before significant schema changes;
- take a backup before Supabase upgrades;
- schedule regular database backups once users begin entering real data.

### Supabase Storage

If CLOIE uses Supabase Storage, back up its persistent volume or migrate Storage to a managed S3-compatible target with its own backup policy.

### Configuration

Store non-secret recovery metadata under:

```text
/var/backups/system-cloie/config
```

Secrets belong in an approved secret manager or encrypted backup, not plaintext configuration backups.

### Off-server copy

A backup on the same disk is not disaster recovery.

Maintain an encrypted off-server copy.

## 46. Restore drill

Before institutional handover, prove recovery.

Use a non-production restore target.

Verify:

1. database dump restores;
2. expected migration history exists;
3. application can connect;
4. Auth-related application data remains consistent;
5. important user flows work;
6. Storage objects restore if applicable.

Record date and result in the deployment inventory or operations documentation.

## 47. Logs and troubleshooting

### Application

```bash
coolify app get <APP_UUID>
coolify app logs <APP_UUID> --lines 100 --show-timestamps
```

### Supabase

Use Coolify component logs or current `run.sh` helpers where applicable.

Examples:

```bash
sh run.sh logs auth
sh run.sh logs storage
```

### Cloudflare Tunnel

```bash
sudo journalctl -u cloudflared -n 100 --no-pager
```

### Docker

```bash
docker ps
docker inspect <container>
docker network inspect coolify
```

### Network checks

From host:

```bash
curl -I https://system-cloie.app
curl -I https://api.system-cloie.app
```

From the application container, verify private DNS and DB connectivity using tools available in the image.

Do not "fix" private connectivity by publishing Postgres.

## 48. Common failure map

### `system-cloie.app` gives gateway timeout

Check:

```text
Next.js container health
port 3000
Coolify domain target
Coolify network
Cloudflare route to localhost:80
```

### `api.system-cloie.app` gives gateway timeout

Check:

```text
Supabase gateway component health
internal port 8000
Coolify component domain
predefined network
Cloudflare route to localhost:80
```

### Google OAuth callback error

Check:

```text
API_EXTERNAL_URL=https://api.system-cloie.app/auth/v1
Google redirect=https://api.system-cloie.app/auth/v1/callback
SITE_URL=https://system-cloie.app
allowed application redirect includes https://system-cloie.app/api/auth/callback
Google provider enabled in self-hosted Auth
```

### Application builds but cannot access DB

Check:

```text
both resources share coolify network
actual Supavisor hostname
session port
POOLER_TENANT_ID
Postgres password URL encoding
DATABASE_URL username format
```

Do not use `localhost` inside the Next.js container.

### Migrations cannot reach DB

Check:

```text
DIRECT_URL
localhost-only maintenance mapping
Postgres health
password encoding
migration command uses repository remote workflow
```

### New code push does not redeploy

Check:

```text
GitHub App installation
repository permissions
Auto Deploy enabled
branch main
Coolify webhook/Git integration status
```

Webhook-specific checks for "New code push does not redeploy":

```text
GitHub hook exists and is active (repo Settings > Webhooks)
Recent Deliveries show push events with a green check
Cloudflare tunnel public hostname for the webhook subdomain exists
Cloudflare response for the webhook host is Coolify, not 404
manual_webhook_secret_github matches the GitHub hook secret exactly
```

If the secret is lost or exposed, rotate it in Coolify (App > Advanced) and set
the same value on the GitHub hook; re-run the wizard to sync both sides.

## 49. Deployment inventory

Agent must write or update a non-secret inventory after first successful deployment.

Suggested repository location:

```text
docs/operations/deployment-inventory.md
```

Never store secret values.

Template:

```markdown
# System CLOIE deployment inventory

Last verified:
Operator:

## Host

- Hostname:
- Ubuntu version:
- Tailscale IP:

## Coolify

- Context: home-lab
- Project UUID:
- Environment:
- Server UUID:
- Destination/network:

## System CLOIE App

- Resource name:
- Resource UUID:
- Repository:
- Branch: main
- Dockerfile: /Dockerfile
- Internal port: 3000
- Domain: https://system-cloie.app
- Auto deploy: enabled
- Health path: /api/health

## Supabase

- Resource name:
- Resource UUID:
- Repository: system-cloie-infra
- Infrastructure commit:
- .supabase-version:
- Public API domain: https://api.system-cloie.app
- Gateway internal port: 8000
- Auto deploy: disabled
- PostgreSQL major: 17
- Supavisor private hostname:
- Postgres private hostname:
- Maintenance Postgres host port:

## Cloudflare

- Tunnel name: system-cloie-homelab
- App route: system-cloie.app -> http://localhost:80
- API route: api.system-cloie.app -> http://localhost:80

## Secrets

- Supabase secrets: configured in Coolify
- Google OAuth: configured in Supabase resource
- CONFIRMATION_SECRET: configured
- CLOIE_LEGAL_TICKET_SECRET: configured
- BOOTSTRAP_SECRETARY_EMAIL: configured

## Backups

- PostgreSQL backup path: /var/backups/system-cloie/postgres
- Storage backup path: /var/backups/system-cloie/storage
- Last database backup:
- Last restore drill:

## Verification

- App health:
- Supabase Auth:
- Google OAuth:
- Prisma DB access:
- Public port audit:
```

## 50. First deployment checklist

Agent should work through this order.

```text
[ ] 1. Verify Ubuntu, Docker, Coolify, Tailscale, cloudflared, gh, Node, pnpm
[ ] 2. Verify Coolify context home-lab
[ ] 3. Verify System CLOIE Git repository and branch
[ ] 4. Prepare private system-cloie-infra repository
[ ] 5. Fetch current official self-hosted Supabase Docker configuration
[ ] 6. Record self-hosted release in .supabase-version
[ ] 7. Generate Supabase secrets using official tooling
[ ] 8. Configure Supabase public URLs
[ ] 9. Configure Google OAuth
[ ] 10. Convert mutable DB/Storage data to persistent Docker volumes
[ ] 11. Remove or restrict unintended host port mappings
[ ] 12. Add localhost-only direct Postgres maintenance binding if needed
[ ] 13. Commit only non-secret Supabase infrastructure files
[ ] 14. Create Supabase Docker Compose resource in Coolify
[ ] 15. Enable Preserve Repository During Deployment when required
[ ] 16. Enable Connect To Predefined Network
[ ] 17. Sync Supabase environment variables to Coolify
[ ] 18. Assign api.system-cloie.app to gateway port 8000
[ ] 19. Verify Cloudflare api route points to localhost:80
[ ] 20. Deploy Supabase
[ ] 21. Verify all required Supabase components
[ ] 22. Verify PostgreSQL 17
[ ] 23. Verify Auth and Google provider
[ ] 24. Apply System CLOIE migrations using DIRECT_URL
[ ] 25. Create System CLOIE Dockerfile application in Coolify
[ ] 26. Enable Connect To Predefined Network
[ ] 27. Discover actual Supavisor and Postgres private hostnames
[ ] 28. Configure build-time NEXT_PUBLIC_* values
[ ] 29. Configure runtime-only application variables
[ ] 30. Assign system-cloie.app to internal port 3000
[ ] 31. Deploy System CLOIE
[ ] 32. Verify /api/health
[ ] 33. Verify Prisma database access
[ ] 34. Verify Google OAuth end to end
[ ] 35. Verify protected-route behavior
[ ] 36. Audit public listening ports
[ ] 37. Enable app Auto Deploy on main
[ ] 38. Keep Supabase Auto Deploy off
[ ] 39. Create deployment inventory
[ ] 40. Create first database backup
```

## 51. Definition of done

Deployment is complete only when:

```text
System CLOIE app is healthy in Coolify
Supabase is healthy in Coolify
PostgreSQL is 17.x
System CLOIE migrations are current
system-cloie.app works over HTTPS
api.system-cloie.app works over HTTPS
Google OAuth works end to end
Prisma reaches database over private networking
Postgres is not publicly exposed
Supavisor is not publicly exposed
Coolify administration remains private
SSH remains private
Cloudflare Tunnel is healthy
Tailscale is healthy
persistent volumes are confirmed
application auto deploy works on main
Supabase does not auto deploy on app pushes
a database backup exists
deployment inventory exists
no secrets are present in Git
```

## 52. Normal developer cheat sheet

### UI or application code only

```text
change code
test
push/merge main
Coolify auto deploys app
smoke test
```

### Runtime environment change

```text
change Coolify variable
restart/redeploy app
smoke test
```

### `NEXT_PUBLIC_*` change

```text
change Coolify build + runtime variable
rebuild app
smoke test
```

### Additive database migration

```text
test code
dry-run migration
backup if significant
apply migration
push main
Coolify auto deploys app
smoke test
```

### Breaking database migration

```text
disable app auto deploy
backup
coordinate migration and app release
manual deploy
verify
re-enable auto deploy
```

### Supabase infrastructure update

```text
backup
update.sh --dry-run
review upstream changes
commit infra change
manual Supabase deploy
verify all components
verify System CLOIE
```

## 53. Current official references

Agent should prefer current versions of these pages:

```text
Supabase self-hosting with Docker
https://supabase.com/docs/guides/self-hosting/docker

Supabase self-hosted OAuth
https://supabase.com/docs/guides/self-hosting/self-hosted-oauth

Supabase self-hosted updates
https://supabase.com/docs/guides/self-hosting/updating

Coolify Dockerfile build pack
https://coolify.io/docs/applications/build-packs/dockerfile

Coolify Docker Compose build pack
https://coolify.io/docs/applications/build-packs/docker-compose

Coolify Docker Compose networking
https://next.coolify.io/docs/services/configuration/networking

Coolify GitHub auto deploy
https://coolify.io/docs/applications/ci-cd/github/auto-deploy

Coolify environment variables
https://coolify.io/docs/knowledge-base/environment-variables

Coolify CLI application deployment
https://next.coolify.io/docs/cli/deploy-applications
```

## 54. Final instruction to deployment agent

Treat this runbook as the deployment plan, not permission to ignore current code or current vendor documentation.

Before every material action:

1. inspect the relevant current repository file;
2. inspect current CLI help when syntax is uncertain;
3. verify current upstream Supabase/Coolify behavior when it could have changed;
4. preserve secrets;
5. preserve persistent data;
6. verify after the change.

If this document conflicts with the current executable System CLOIE repository, stop and reconcile the difference before deployment.
