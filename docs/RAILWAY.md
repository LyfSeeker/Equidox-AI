# Railway deployment — Equidox AI

Equidox is a **monorepo**. Railway does not run `docker-compose.yml` as one unit.
Create **one project** with separate services and wire them with variables / private networking.

| Service | Railway type | Root directory | Config |
|--------|--------------|----------------|--------|
| App Postgres | Database → PostgreSQL | — | Plugin |
| Backend | GitHub Repo | `backend` | `backend/railway.toml` |
| Frontend | GitHub Repo | `frontend` | `frontend/railway.toml` |
| Keycloak Postgres | Database → PostgreSQL | — | Plugin |
| Keycloak | GitHub Repo (or Docker image) | `keycloak` | `keycloak/railway.toml` |

Copy-paste env templates:

- [`backend/.env.railway.example`](../backend/.env.railway.example)
- [`frontend/.env.railway.example`](../frontend/.env.railway.example)

---

## 1. Create the project

1. Railway → **New project** → **Empty Project**.
2. Name it `equidox-ai` (optional).

---

## 2. App Postgres

1. **+ New** → **Database** → **PostgreSQL**.
2. Rename to something clear (e.g. `Postgres` or `equidox-db`).
3. You will reference `DATABASE_URL` from the backend service.

---

## 3. Backend

1. **+ New** → **GitHub Repository** → `LyfSeeker/Equidox-AI` → branch `main`.
2. **Settings → Root Directory:** `backend`
3. Builder should pick up `Dockerfile` via `railway.toml`.
4. **Variables** — paste from `backend/.env.railway.example`, then:
   - Add reference: `DATABASE_URL` → Postgres `DATABASE_URL`
   - Set `DATABASE_SSL=true`
   - Set `AI_API_KEY` (Moonshot / Kimi)
5. **Networking → Generate Domain** → copy the HTTPS URL (e.g. `https://….up.railway.app`).
6. Confirm deploy: open `https://YOUR-BACKEND/api/health`.

### Backend variable checklist

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | yes | `4000` (Railway may also inject `PORT`) |
| `NODE_ENV` | yes | `production` |
| `RUN_MIGRATIONS` | yes | `true` on first deploys |
| `DATABASE_URL` | yes | Reference from Postgres |
| `DATABASE_SSL` | yes | `true` on Railway |
| `STELLAR_NETWORK` | yes | `testnet` |
| `HORIZON_URL` | yes | Testnet Horizon |
| `SOROBAN_RPC_URL` | yes | Testnet Soroban RPC |
| `GRANT_MANAGER_CONTRACT_ID` | yes | See README Testnet table |
| `BUILDER_PASSPORT_CONTRACT_ID` | yes | See README Testnet table |
| `NATIVE_XLM_TOKEN_CONTRACT` | yes | Testnet XLM SAC |
| `AI_API_KEY` | yes | Kimi / Moonshot |
| `AI_BASE_URL` | yes | `https://api.moonshot.ai/v1` |
| `AI_MODEL` | yes | `kimi-k2.6` |
| `AI_PRIMARY_PROVIDER` | yes | `kimi` |
| `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` | no | Failover |
| `GITHUB_TOKEN` | no | Higher GitHub rate limits |
| `INDEXER_ENABLED` | no | Default `true` |

Compose defaults used in examples match `docker-compose.yml` / README Testnet IDs.

---

## 4. Frontend

1. **+ New** → **GitHub Repository** → same repo.
2. **Root Directory:** `frontend`
3. **Set all `NEXT_PUBLIC_*` variables before the first successful build** (see `frontend/.env.railway.example`).
4. `NEXT_PUBLIC_API_URL` = backend public HTTPS URL from step 3.
5. `NEXT_PUBLIC_KEYCLOAK_URL` = Keycloak public URL (step 5) — you can deploy frontend after Keycloak exists, or rebuild once Keycloak is live.
6. **Generate Domain** for the frontend.

### Why rebuild matters

`NEXT_PUBLIC_*` values are compiled into the Next.js client via Dockerfile `ARG`/`ENV`. Changing them in Railway **after** a build does nothing until you **Redeploy**.

---

## 5. Keycloak + Keycloak Postgres

### 5a. Keycloak database

1. **+ New** → **Database** → **PostgreSQL** (second one).
2. Rename e.g. `Keycloak-Postgres`.

### 5b. Keycloak service

1. **+ New** → **GitHub Repository** → same repo.
2. **Root Directory:** `keycloak` (uses `keycloak/Dockerfile`, not `start-dev`).
3. Variables:

```text
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<strong-unique-password>
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://${{Keycloak-Postgres.PGHOST}}:${{Keycloak-Postgres.PGPORT}}/${{Keycloak-Postgres.PGDATABASE}}
KC_DB_USERNAME=${{Keycloak-Postgres.PGUSER}}
KC_DB_PASSWORD=${{Keycloak-Postgres.PGPASSWORD}}
KC_HTTP_ENABLED=true
KC_PROXY_HEADERS=xforwarded
KC_HOSTNAME_STRICT=false
```

If JDBC reference syntax is awkward in your Railway UI, paste the literal host/user/password/db from the Keycloak Postgres **Connect** panel into:

```text
KC_DB_URL=jdbc:postgresql://HOST:PORT/DATABASE
KC_DB_USERNAME=...
KC_DB_PASSWORD=...
```

4. **Generate Domain** for Keycloak.
5. Optionally set `KC_HOSTNAME` to that public hostname (without `https://`).
6. Open admin console: `https://YOUR-KEYCLOAK/` → Administration Console → login with `KEYCLOAK_ADMIN` / password.

### 5c. Realm import

The image runs `start --import-realm` and copies `equidox-realm.json`.

Imported defaults (local Docker):

- Realm: `equidox`
- Users: `demo` / `demo`, `admin` / `admin` — **change passwords in production**
- Client: `equidox-frontend` (public, PKCE)

The imported client still has **localhost** redirect URIs. Update them for Railway (next section).

---

## 6. Keycloak client checklist (redirect URIs)

In Keycloak Admin → realm **equidox** → **Clients** → **equidox-frontend**:

| Field | Value |
|-------|--------|
| Root URL | `https://YOUR-FRONTEND.up.railway.app` |
| Home URL / Base URL | `https://YOUR-FRONTEND.up.railway.app` |
| Valid redirect URIs | `https://YOUR-FRONTEND.up.railway.app/*` |
| Valid post logout redirect URIs | `https://YOUR-FRONTEND.up.railway.app/*` |
| Web origins | `https://YOUR-FRONTEND.up.railway.app` |

Keep localhost entries too if you still develop locally:

- Redirect: `http://localhost:3000/*`
- Web origin: `http://localhost:3000`

Then:

1. Set frontend `NEXT_PUBLIC_KEYCLOAK_URL=https://YOUR-KEYCLOAK.up.railway.app`
2. **Redeploy frontend** so the login page hits Railway Keycloak.

### Login smoke test

1. Open frontend URL → `/login`
2. Sign in as `demo` / `demo` (or updated password)
3. Confirm redirect back to the app (not stuck on Keycloak or CORS/origin errors)
4. Connect Freighter (Testnet) for on-chain actions

---

## 7. Suggested deploy order

```text
Empty Project
  → App Postgres
  → Backend (+ domain + health)
  → Keycloak Postgres
  → Keycloak (+ domain + client URI fixes)
  → Frontend (NEXT_PUBLIC_* set, then domain)
```

Minimal demo without auth: Postgres + Backend + Frontend only (login will not work fully until Keycloak is wired).

---

## 8. Custom domain (optional)

Per service: **Settings → Networking → Custom Domain**.

Add the CNAME/TXT records Railway shows at your DNS provider. After the frontend domain changes, update Keycloak redirect URIs and rebuild frontend `NEXT_PUBLIC_*` if needed.

---

## 9. Cost / trial tips

- Full stack (2× Postgres + backend + frontend + Keycloak) is heavy on a small trial credit.
- Sleep unused services when testing.
- Prefer strong secrets; never reuse compose defaults (`postgres`/`admin`) on a public URL.

---

## 10. Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| Frontend calls `localhost:4000` | `NEXT_PUBLIC_API_URL` wrong or not rebuilt |
| Login redirect error | Keycloak client redirect URI ≠ frontend URL |
| Backend cannot connect DB | Missing `DATABASE_SSL=true` or bad `DATABASE_URL` reference |
| Keycloak crash loop | Bad `KC_DB_*` / JDBC URL; check Keycloak Postgres vars |
| AI reviews fail | Missing `AI_API_KEY` |
| Build uses wrong folder | Root Directory not set to `backend` / `frontend` / `keycloak` |
