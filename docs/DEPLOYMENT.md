# CircuLink — Production Deployment Runbook

Target: Aliyun ECS (`139.196.139.118`), domain `circulink.cn`, nginx + systemd +
PostgreSQL, Node 20. The app is a Vite SPA + an Express/Prisma API.

/ var / www / circulink layout on the server:

```
/var/www/circulink/
├── dist/            # built output (client + dist/server/index.js)
├── node_modules/    # production deps + generated Prisma client
├── prisma/          # schema.prisma + migrations (for migrate deploy)
├── package.json
└── .env             # production env (NOT in git) — see .env.production.example
```

---

## 1. One-time server setup (already done for the current host)

- nginx site: copy `deploy/nginx-circulink.conf` → `/etc/nginx/sites-available/circulink`,
  symlink into `sites-enabled`, `sudo nginx -t && sudo systemctl reload nginx`.
- systemd unit: copy `deploy/circulink.service` → `/etc/systemd/system/circulink.service`,
  `sudo systemctl daemon-reload && sudo systemctl enable --now circulink`.
- TLS: Let's Encrypt certs at `/etc/letsencrypt/live/circulink.cn/` (certbot).

## 2. Environment file

On the server, create `/var/www/circulink/.env` from `.env.production.example`.
**Fill in:** `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, the DirectMail
`DM_SMTP_*` + `APP_BASE_URL=https://circulink.cn`, optionally the `R2_*` block,
and optionally `ALLOWED_EMAIL_DOMAINS` for a DKU-only launch.

systemd's `EnvironmentFile` is not a shell: every line must be `KEY=value` with
**no quotes and no inline `# comments` after a value**.

## 3. Deploy a new release

From a clean checkout of `main` on the server (or build in CI and rsync `dist/`):

```bash
cd /var/www/circulink
git fetch origin && git checkout main && git reset --hard origin/main

npm ci                       # install deps (incl. dev, needed for the TS build)
npm run prisma:generate      # generate Prisma client
npm run prisma:migrate:deploy # apply any new migrations (safe, forward-only)
npm run build                # build client + compile server -> dist/

sudo systemctl restart circulink
```

Then verify:

```bash
curl -s https://circulink.cn/api/healthz          # {"status":"ok"}
curl -s https://circulink.cn/api/version          # node/version/uptime
curl -sI https://circulink.cn/ | grep -i strict-transport-security  # HSTS present
```

> The current live build predates these fixes — the first deploy of `main` after
> this change set is required to ship them (ICP footer, security fixes, etc.).

## 4. Create the first admin (bootstrap)

There is no self-service admin. After a user has registered normally, promote them
in the database:

```bash
psql "$DATABASE_URL" -c \
  "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'you@dukekunshan.edu.cn';"
```

Roles: `USER`, `ADMIN`, `CLUB_OPERATOR`, `BUY42_PARTNER`. Admins can then manage
roles from the app (`/admin/reviews` → user management) and review listings.

## 5. Rollback

```bash
cd /var/www/circulink
git checkout <previous-good-sha>
npm ci && npm run prisma:generate && npm run build
sudo systemctl restart circulink
```

Migrations are forward-only; a schema rollback needs a manual reverse migration.

## 6. Backups (set up if not already)

- **Postgres:** nightly `pg_dump` to off-box / OSS storage.
- **Uploads:** if using local disk (`UPLOAD_DIR`), back up `/var/www/circulink/uploads`.
  If using Cloudflare R2 (`R2_*` set), R2 holds the images instead.

---

## Known follow-ups (not launch blockers)

- **Money precision:** `Item.price` / `Order.total` are `Float`. Switching to
  `Decimal` is cleaner but changes JSON to strings — do it with a coordinated
  frontend change (every `.toFixed` → `Number(x).toFixed`).
- **Account deletion:** `User` relations are `onDelete: Restrict`, so users can't
  be deleted yet. Decide per-relation cascade/set-null semantics before adding a
  delete-account feature.
- **AI listing assistant:** requires `OPENAI_*` pointed at a China-reachable
  endpoint; unset ⇒ heuristic fallback (no error).
