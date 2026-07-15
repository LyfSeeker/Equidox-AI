# Equidox AI — Soroban Smart Contracts

Production-oriented Soroban workspace for **Equidox AI**: milestone verification escrow, grant management, and builder reputation on Stellar.

**Status (2026-07-15):** Dockerized Testnet MVP — Keycloak login-first → role homes → Freighter grant lifecycle → **Equidox AI v1.0** (Kimi primary, criteria-first). See `PROJECT_STATUS.md` and `ARCHITECTURE.md`.

## Contracts

| Contract | WASM | Purpose |
|---|---|---|
| `grant-manager` | `target/wasm32v1-none/release/grant_manager.wasm` | Grants, milestones, XLM escrow, payouts |
| `builder-passport` | `target/wasm32v1-none/release/builder_passport.wasm` | On-chain builder reputation |
| `equidox-common` | (library, not deployed) | Shared types, errors, events |

## Build

```powershell
stellar contract build
cargo test
```

## Deploy to Testnet

```powershell
# 1. Build contracts
stellar contract build

# 2. Deploy (requires funded identity, e.g. alice)
.\scripts\deploy.ps1 -SourceAccount alice -Network testnet

# 3. Initialize linked contracts
.\scripts\initialize.ps1 -SourceAccount alice -Network testnet -NativeToken <XLM_SAC_ADDRESS>
```

### Native XLM token address

The grant manager escrows XLM via the **Stellar Asset Contract (SAC)**. Pass the network-native XLM SAC address to `initialize`. On Testnet you can look it up via Stellar Lab or the CLI asset info commands for your network.

## Architecture

- **On-chain**: grant IDs, escrow balances, milestone state machine, verification hashes, passport aggregates, events
- **Off-chain**: Equidox AI v1.0 (Kimi / failover providers), GitHub evidence, reports (Postgres + optional IPFS), Keycloak auth, x402 premium (optional)

Detailed diagrams: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

## Grant lifecycle

```
create_grant (+ add_milestone × N with acceptance criteria)
  → deposit_funds → submit_milestone
  → AI verify + store_verification_hash
  → approve_milestone → release_funds
```

## Testnet Deployment (live)

| Contract | ID |
|---|---|
| Grant Manager | `CDCW4WXFK2BM7ND5TYSRLLWLCACZEJUKMXCFRFH6IIDDMFKLKSBNDAAQ` |
| Builder Passport | `CCWQCRUXF2P56F6Z4RZZXPOOQITN55X3QYVXF626PBC4UXTVQRB3WWOL` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

See `PROJECT_STATUS.md` for full MVP progress, endpoints, and demo flow.

## Backend

```powershell
cd backend
npm install
npm run db:migrate   # requires PostgreSQL
npm run dev
```

API health check: `GET http://localhost:4000/api/health` (includes `ai.primary`, e.g. `kimi`)

AI keys live in `backend/.env` — see `backend/.env.example` (Kimi primary: `AI_API_KEY`, `AI_PRIMARY_PROVIDER=kimi`).

## Docker

Run frontend + backend + PostgreSQL + Keycloak:

```powershell
docker compose up --build
```

- Frontend: `http://localhost:3000` → redirects to `/login` until signed in  
  - User `demo` / `demo` → `/submit`  
  - Admin `admin` / `admin` → `/dashboard`  
  - Landing: `/home` (sidebar HOME)
- API: `http://localhost:4000/api/health`
- Keycloak: `http://localhost:8180` (console admin `admin` / `admin`)
- App Postgres: `localhost:5432` (`postgres` / `postgres` / `equidox`)
- Keycloak Postgres: `localhost:5433` (`keycloak` / `keycloak` / `keycloak`)

After sign-in, connect Freighter (Testnet) for on-chain actions.

```powershell
# Inspect app DB
docker exec -it equidox-postgres psql -U postgres -d equidox
```

Individual images:

```powershell
docker build -t equidox-backend ./backend
docker build -t equidox-frontend ./frontend
```

```
contracts/
  common/           # Shared types, errors, events
  grant-manager/    # Main escrow contract
  builder-passport/ # Reputation registry
backend/            # Express API — AI in services/llm.js
frontend/           # Next.js UI
keycloak/           # Realm import
scripts/            # Deploy & initialize
```
