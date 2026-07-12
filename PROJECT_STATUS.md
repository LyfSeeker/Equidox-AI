# Equidox AI — Project Status & Progress Report

**Last updated:** 2026-07-11 (hackathon MVP complete)  
**Repo:** `hello-world` (Equidox AI / Equidox Trust Layer)  
**Branch:** `feature/soroban-smart-contracts`  
**Goal:** AI-powered milestone verification and grant distribution on **Stellar / Soroban**, with on-chain escrow + Builder Passport reputation.

**One-line status:** Full end-to-end grant lifecycle is wired in Docker + Freighter on Stellar Testnet — create → deposit → add milestone → submit → AI verify → approve → release → passport/dashboard update.

---

## 1. What this project is

Equidox is a trust layer for grants/hackathons:

| Layer | Responsibility |
|-------|----------------|
| **On-chain (Soroban)** | Grants, milestones, XLM escrow, approve/reject/release, passport reputation |
| **Off-chain (backend)** | AI analysis, GitHub evidence, metadata hashing, Freighter tx building, Postgres sync, event indexer |
| **Frontend (Next.js)** | Dashboard, Freighter wallet, grant/escrow/milestone flows, verification, builder passport |

AI never moves money by itself — it only produces a **verification hash** anchored on-chain. A human **reviewer** approves and releases funds.

---

## 2. Tech stack

### Smart contracts
- **Language:** Rust + `soroban-sdk`
- **Network:** Stellar Testnet
- **Tooling:** Stellar CLI, `cargo test`
- **Escrow asset:** Native XLM via Stellar Asset Contract (SAC)

### Backend
- **Runtime:** Node.js (ESM)
- **Framework:** Express
- **DB:** PostgreSQL 16 (`pg`)
- **Stellar:** `@stellar/stellar-sdk`
- **Other:** `cors`, `dotenv`, `uuid`
- **AI:** OpenAI `gpt-4o-mini` if `OPENAI_API_KEY` is set; otherwise enriched mock
- **IPFS:** Optional via `IPFS_API_URL`; otherwise local SHA-256 hash of JSON
- **Indexer:** Background Soroban RPC event poller (`INDEXER_ENABLED=true`)

### Frontend
- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4 (“Crucible” dark industrial UI)
- **Wallet:** Freighter (`@stellar/freighter-api`)
- **Motion/icons:** `framer-motion`, `lucide-react`
- **UX:** Toasts, skeletons, lifecycle timeline, explorer links
- **Docker:** `output: "standalone"`

### Infra
- **Docker Compose:** `postgres` + `backend` + `frontend` + `keycloak` + `keycloak-db`
- **Local URLs:**
  - Frontend: http://localhost:3000 (Keycloak login gate → then Freighter)
  - Backend: http://localhost:4000 (`/api/health`)
  - Keycloak: http://localhost:8180 (admin `admin` / `admin`; realm `equidox`; demo `demo` / `demo`; app admin `admin` / `admin`)
  - App Postgres: `localhost:5432` (`postgres` / `postgres` / `equidox`)
  - Keycloak Postgres: `localhost:5433` (`keycloak` / `keycloak` / `keycloak`) — users, credentials, sessions

---

## 3. Repository layout

```
contracts/
  common/             # Shared types, errors, events (library, not deployed)
  grant-manager/      # Grants, milestones, XLM escrow, payouts
  builder-passport/   # On-chain builder reputation
  hello-world/        # Tutorial leftover (not the product contract)
backend/
  src/
    routes/           # api, grants, milestones
    services/         # ai, github, ipfs, stellar, indexer, poller
    db/               # client + migrate
frontend/
  src/app/            # login, dashboard, grants, builder/[id], verification/[id]
  src/components/     # Sidebar, Topbar, AuthGate, AppChrome, LifecycleTimeline
  src/context/        # AuthContext, WalletContext, ToastContext
  src/lib/            # api, freighter, keycloak, config
keycloak/             # Realm import (equidox + demo user)
scripts/              # deploy.ps1, initialize.ps1
docker-compose.yml
PROJECT_STATUS.md
```

---

## 4. Live Testnet contracts (Compose defaults)

| Contract | ID |
|----------|-----|
| **Grant Manager** | `CDCW4WXFK2BM7ND5TYSRLLWLCACZEJUKMXCFRFH6IIDDMFKLKSBNDAAQ` |
| **Builder Passport** | `CCWQCRUXF2P56F6Z4RZZXPOOQITN55X3QYVXF626PBC4UXTVQRB3WWOL` |
| **Native XLM SAC (Testnet)** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

**CLI identity used in development:**
- `alice` → `GCFCVEY6YOO24HAI2JCX6BH2RDAJRMSQJODOGUY6H4NMNVQR3KYV446Z`

---

## 5. Complete product lifecycle (implemented)

```
Connect Wallet (+ Friendbot if unfunded)
  → Create Grant (on-chain + DB sync of on_chain_grant_id / tx_hash)
  → Deposit XLM (escrow UI: budget / escrow / remaining)
  → Create Milestone (amount on-chain via add_milestone; title/desc/deadline in Postgres)
  → Builder submits evidence (submit_milestone)
  → AI analyzes GitHub / demo / docs
  → Store verification hash on Stellar
  → Reviewer approves
  → Release funds
  → Builder Passport updates
  → Dashboard + event log refresh
```

### Milestone state machine
```
Pending → Submitted → UnderReview → Approved → Paid
                 ↘ Rejected → (can resubmit)
```

---

## 6. What works (MVP checklist)

### On-chain (contracts)
| Feature | Status |
|---------|--------|
| `create_grant` / `deposit_funds` / `add_milestone` | Works |
| `submit_milestone` / `store_verification_hash` | Works |
| `approve_milestone` / `reject_milestone` / `release_funds` | Works |
| Escrow + double-pay guard + passport update on release | Works |
| Unit tests (~15/15) + prior CLI Testnet escrow proof | Works |

### Backend
| Feature | Status |
|---------|--------|
| Health, grants CRUD, metadata hash | Works |
| Build create / deposit / add_milestone / submit / verify / approve+release txs | Works |
| Submit signed XDR + parse return values | Works |
| Auto PATCH sync: `on_chain_grant_id`, `on_chain_milestone_id`, tx hashes, status, escrow | Works |
| Friendbot + account exists check | Works |
| Live passport read from Soroban (`get_passport`) + DB fallback | Works |
| AI scores (completion, confidence, risk, code, security, docs, deploy) | Works |
| GitHub evidence (README, commits, tests, tree, languages) when token set | Works |
| Soroban event poller + deduped `chain_events` | Works |
| x402 premium gate + receipt table (graceful fallback if off) | Works |
| Docker migrate-on-start + healthchecks | Works |

### Frontend
| Feature | Status |
|---------|--------|
| Freighter connect / disconnect / reconnect sign-in prompt | Works |
| Fund Testnet Wallet (Friendbot) in Topbar | Works |
| Grants: create → deposit panel → Create Milestone modal | Works |
| Verification `/verification/[grantId]`: submit → AI → approve/release | Works |
| Builder `/builder/[wallet]` (+ `/builder/me`) live passport | Works |
| Dashboard: stats, escrow bars, timeline, events, builders | Works |
| Toasts, skeletons, tx progress, explorer links | Works |
| Dynamic sidebar builder link | Works |

---

## 7. API surface (key endpoints)

### Core
- `GET /api/health`
- `GET /api/events`
- `GET /api/account/:address`
- `POST /api/friendbot`
- `GET /api/passport/:address`
- `POST /api/x402/pay`

### Grants
- `POST /api/grants/metadata`
- `POST /api/grants` (accepts `onChainGrantId`, `txHash`)
- `PATCH /api/grants/:id`
- `GET /api/grants` / `GET /api/grants/:id` (includes live escrow when possible)
- `POST /api/grants/build/create`
- `POST /api/grants/build/deposit`
- `POST /api/grants/submit`

### Milestones
- `POST /api/milestones/build/add` ← **add_milestone XDR**
- `POST /api/milestones` / `PATCH /api/milestones/:id`
- `GET /api/milestones/grant/:grantId` (includes latest AI report)
- `POST /api/milestones/submit`
- `POST /api/milestones/verify`
- `POST /api/milestones/approve/build`
- `POST /api/milestones/premium`

---

## 8. Database schema (current)

**`grants`** — includes `on_chain_grant_id`, `escrowed_stroops`, `released_stroops`, `tx_hash`, status, parties, budget, metadata  

**`milestones`** — includes `on_chain_milestone_id`, title, description, deadline, amounts, status, evidence/verification hashes, submit/verify/approve/release tx hashes  

**`ai_reports`** — scores, summary, recommendation, `report_json`, ipfs hash, premium flag  

**`chain_events`** — indexed events with dedupe on `(tx_hash, event_name)`  

**`indexer_state`** — Soroban poller cursor  

**`x402_receipts`** — premium payment proofs  

---

## 9. Indexed / handled events

| Event | Handled |
|-------|---------|
| GrantCreated | Yes (+ DB sync) |
| FundsDeposited | Yes (+ escrow update) |
| MilestoneAdded | Yes |
| MilestoneSubmitted | Yes |
| AiVerificationAdded / VerificationStored | Yes |
| MilestoneApproved / MilestoneRejected | Yes |
| PaymentReleased | Yes |
| PassportUpdated / ReputationUpdated | Yes (logged) |
| GrantCancelled | Yes |

---

## 10. Docker / run

```powershell
docker compose up --build
```

| Service | Port | Notes |
|---------|------|-------|
| Frontend | 3000 | Healthy |
| Backend | 4000 | Waits for Postgres, migrates, starts indexer |
| Postgres | 5432 | Volume `equidox_pg_data` |

**Optional `.env`**
- `OPENAI_API_KEY`, `GITHUB_TOKEN`
- `IPFS_API_URL` / `IPFS_GATEWAY`
- `X402_ENABLED=true` for premium paywall
- `INDEXER_ENABLED` / `INDEXER_POLL_MS`
- `FRIENDBOT_URL`
- Contract ID overrides if redeployed

---

## 11. Demo script (hackathon)

1. Open http://localhost:3000 → Connect Freighter  
2. If needed: **Fund Testnet Wallet**  
3. **Grants** → Create On-Chain Grant (sign in Freighter)  
4. **Deposit Funds** → confirm escrow stats  
5. **Create Milestone** (title/desc/amount/deadline) → sign `add_milestone`  
6. Open **verification/{grantId}** → Submit Evidence → Analyze & Anchor Hash  
7. **Approve & Release Funds** (two Freighter confirms)  
8. Check **Dashboard** events/timeline and **Builder Passport**  

---

## 12. Progress phases

### Phase 1 — Contracts — done
- [x] Grant Manager + Builder Passport + common lib  
- [x] Tests, deploy/initialize scripts, Testnet deploy + CLI escrow proof  

### Phase 2 — Backend — done
- [x] Express + Postgres + Docker  
- [x] Tx builders, AI, GitHub, IPFS-hash helpers  
- [x] Friendbot, live passport, indexer, x402 receipts, ID sync  

### Phase 3 — Frontend MVP — done
- [x] Freighter + full grant lifecycle UI  
- [x] Deposit + on-chain milestones  
- [x] Verification / dashboard / passport polish  
- [x] Toasts, timeline, Friendbot, dynamic routes  

### Still optional (post-hackathon)
- [ ] Stricter Horizon verification for real x402 payments  
- [ ] Stronger Soroban event topic parsing across RPC versions  
- [ ] Fallback grant-id discovery if tx return value is missing  
- [ ] Production IPFS pinning / pinning service  
- [ ] Reject-milestone + cancel-grant UI buttons  
- [ ] Commit/push remaining local changes if not on remote yet  

---

## 13. Security / trust model

- Escrow holds XLM until reviewer releases  
- AI is advisory (hash only); cannot pay alone  
- Roles: provider, builder, reviewer, operator  
- Double-pay guard on milestones  
- Users sign with Freighter; backend does not hold user keys for grant flows  

---

## 14. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Account not found` | Use **Fund Testnet Wallet** / `POST /api/friendbot` |
| Freighter no popup after logout | App forces sign-in message after disconnect |
| AI always mock | Set `OPENAI_API_KEY` and restart backend |
| No on-chain milestone | Use **Create Milestone** on Grants (not DB-only) |
| Empty event log | Indexer polls every ~15s; also indexed from UI after each tx |
| Port 3000 busy | Stop local `npm run dev` or other process |

---

## 15. Verdict

**Hackathon-ready MVP:** Dockerized, Freighter-compatible, Stellar Testnet contracts live, and the full grant lifecycle is available in the UI without manual on-chain ID mapping.
