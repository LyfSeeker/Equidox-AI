# Equidox AI — Project Status & Progress Report

**Last updated:** 2026-07-15  
**Repo:** [LyfSeeker/Equidox-AI](https://github.com/LyfSeeker/Equidox-AI)  
**Branch:** `feature/equidox-ai-kimi-dashboard` (merged to `main` via PR #5; local continues with auth + HOME)  
**Goal:** AI-powered milestone verification and grant distribution on **Stellar / Soroban**, with on-chain escrow + Builder Passport reputation.

**One-line status:** Production-shaped MVP on Docker + Freighter (Testnet): Keycloak sign-in by role → create grants with milestones/criteria → escrow → submit evidence → **Equidox AI v1.0** (Kimi primary) → human approve/release → passport + dashboard lifecycle.

---

## 1. What this project is

Equidox is a trust layer for grants/hackathons:

| Layer | Responsibility |
|-------|----------------|
| **On-chain (Soroban)** | Grants, milestones, XLM escrow, approve/reject/release, passport reputation |
| **Off-chain (backend)** | Equidox AI v1.0 analysis, GitHub evidence, metadata hashing, Freighter tx building, Postgres sync, event indexer |
| **Frontend (Next.js)** | Keycloak gate, role homes, dashboard lifecycle, grants, review/submit, verification, builder passport |

AI never moves money — it only produces an advisory report + verification hash. A human **reviewer** releases funds.

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
- **AI:** OpenAI-compatible client in `backend/src/services/llm.js`
  - **Primary:** Kimi / Moonshot (`kimi-k2.6`) via `AI_*` env
  - **Fallbacks:** Gemini, DeepSeek, OpenAI when keyed
  - **Prompt:** Equidox AI v1.0 (`equidox-ai-v1.0`) — criteria-first checklist scoring
- **IPFS:** Optional via `IPFS_API_URL`; otherwise local SHA-256 hash of JSON
- **Indexer:** Background Soroban RPC event poller (`INDEXER_ENABLED=true`)

### Frontend
- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4 (“Crucible” dark industrial UI)
- **Wallet:** Freighter (`@stellar/freighter-api`)
- **Auth:** Keycloak realm `equidox` — `/` → `/login` → role home
- **Motion/icons:** `framer-motion`, `lucide-react`, custom `BrandIcon` assets
- **Docker:** `output: "standalone"`

### Infra
- **Docker Compose:** `postgres` + `backend` + `frontend` + `keycloak` + `keycloak-db`
- **Local URLs:**
  - Frontend: http://localhost:3000 → sign-in first
  - Backend: http://localhost:4000 (`/api/health`)
  - Keycloak: http://localhost:8180
  - App Postgres: `localhost:5432` (`postgres` / `postgres` / `equidox`)
  - Keycloak Postgres: `localhost:5433`

---

## 3. Auth & routing (current)

| Step | Behavior |
|------|----------|
| Visit `/` | Redirect: signed-out → `/login`; signed-in → role home |
| Login | Keycloak password grant (`/login` for all roles; `/admin` still works) |
| **Admin** post-login | `/dashboard` |
| **User** post-login | `/submit` |
| `/home` | Marketing landing (sidebar **HOME**); no wallet required once signed in |
| App pages | Require Freighter wallet after Keycloak |

| Role | Username | Password |
|------|----------|----------|
| User | `demo` | `demo` |
| Admin | `admin` | `admin` |

---

## 4. Repository layout

```
contracts/
  common/             # Shared types, errors, events
  grant-manager/      # Grants, milestones, XLM escrow, payouts
  builder-passport/   # On-chain builder reputation
backend/
  src/
    routes/           # api, grants, milestones, ai
    services/         # llm (AI), ai façade, github, settings, stellar, indexer
    db/
frontend/
  src/app/            # /, /login, /home, /dashboard, /grants, /submit, /review,
                      # /builder/[id], /verification/[id], /admin
  src/components/     # Sidebar, Topbar, AuthGate, AiReportPanel, BrandIcon, …
  src/lib/            # api, authRedirect, freighter, keycloak, config
keycloak/
scripts/
docker-compose.yml
ARCHITECTURE.md
PROJECT_STATUS.md
README.md
```

---

## 5. Live Testnet contracts (Compose defaults)

| Contract | ID |
|----------|-----|
| **Grant Manager** | `CDCW4WXFK2BM7ND5TYSRLLWLCACZEJUKMXCFRFH6IIDDMFKLKSBNDAAQ` |
| **Builder Passport** | `CCWQCRUXF2P56F6Z4RZZXPOOQITN55X3QYVXF626PBC4UXTVQRB3WWOL` |
| **Native XLM SAC (Testnet)** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

---

## 6. Product lifecycle (implemented)

```
Sign in (Keycloak) → Connect Freighter
  → Admin: Create Grant with milestone(s) + acceptance criteria
       → create_grant + add_milestone(s) on-chain; criteria in Postgres
  → Deposit XLM (escrow)
  → (Optional) Create extra milestones via Manage Escrow modal
  → Builder: Submit evidence (repo, demo, docs, notes)
  → Admin: AI verify (Equidox AI v1.0 against acceptance criteria)
  → Anchor verification hash
  → Approve & Release  OR  Reject
  → Passport update + dashboard timeline / events refresh
```

### Milestone state machine
```
pending → submitted → under_review → approved → paid
                ↘ rejected → (can resubmit)
```

---

## 7. What works (MVP checklist)

### On-chain
| Feature | Status |
|---------|--------|
| `create_grant` / `deposit_funds` / `add_milestone` | Works |
| `submit_milestone` / `store_verification_hash` | Works |
| `approve_milestone` / `reject_milestone` / `release_funds` | Works |
| Escrow + double-pay guard + passport on release | Works |
| Unit tests + Testnet deploy | Works |

### Backend
| Feature | Status |
|---------|--------|
| Health (+ AI provider readiness: kimi / gemini / deepseek / openai) | Works |
| Grants CRUD, metadata hash, multi-milestone create | Works |
| Tx builders + signed XDR submit + ID sync | Works |
| Equidox AI v1.0 via `llm.js` (Kimi primary, provider failover) | Works |
| Criteria checklist + weighted category scores in report | Works |
| GitHub evidence pack | Works |
| Soroban indexer + `chain_events` | Works |
| x402 premium path (optional) | Works |
| Docker migrate-on-start | Works |

### Frontend
| Feature | Status |
|---------|--------|
| Login-first `/` + role redirect | Works |
| HOME landing at `/home` (sidebar) | Works |
| Freighter connect / Friendbot | Works |
| Grants: multi-milestone create, escrow modal, Create Milestone sizing | Works |
| Dashboard: select grant → Activity Timeline updates | Works |
| Review / Submit / Verification flows | Works |
| AiReportPanel: PASS/FAIL/PARTIAL/NOT_VERIFIED checklist | Works |
| Brand icons (passport / escrow / milestone / builder) | Works |
| Notifications / Topbar updates | Works |

---

## 8. AI verification (Equidox AI v2 pipeline)

**Prompt version:** `equidox-ai-v2.0-pipeline`  
**Package:** `backend/ai/` (prompts, skills, examples, pipeline, MCP adapters)  
**Client:** `backend/src/services/llm.js` wires providers into `runReviewPipeline`

Features:

- Modular markdown prompts + per-technology skills (loaded only when detected)
- Context builder (grant, criteria, GitHub, docs, passport hooks)
- Zod schema validation + one repair retry + schema-safe fallback
- Self-review pass (optional via `AI_SELF_REVIEW`)
- Report fingerprint cache (`AI_CACHE_REPORTS`)
- `AI_PIPELINE_MODE=compact|full`
- MCP adapter stubs (GitHub / FS / Postgres / Browser / Git) with REST fallback

Scores (weighted toward feature completion vs acceptance criteria) plus maintainability / architecture.

| Category | Weight |
|----------|--------|
| Feature completion | 30% |
| Code quality | 15% |
| Architecture | 10% |
| Security | 15% |
| Documentation | 8% |
| Testing | 8% |
| Deployment | 4% |
| GitHub health | 4% |
| Innovation | 3% |
| Maintainability | 3% |

Also returns: `overallScore`, `trustScore`, `confidenceScore`, `riskScore`, `riskLevel`, `recommendation`, `criteriaChecklist`, technical/architecture/security/docs/testing/github narratives, strengths/weaknesses, recommendations.

**Env (see `backend/.env.example`):**

```
AI_API_KEY=...
AI_BASE_URL=https://api.moonshot.ai/v1
AI_MODEL=kimi-k2.6
AI_PROVIDER_ID=kimi
AI_PROVIDER_NAME=Kimi
AI_PRIMARY_PROVIDER=kimi
AI_PIPELINE_MODE=compact
AI_SELF_REVIEW=true
AI_CACHE_REPORTS=true
# Optional: GEMINI_*, DEEPSEEK_*, OPENAI_*, GITHUB_TOKEN
```

---

## 9. API surface (key endpoints)

### Core
- `GET /api/health`
- `GET /api/events`
- `GET /api/account/:address`
- `POST /api/friendbot`
- `GET /api/passport/:address`

### Grants
- `POST /api/grants/metadata`
- `POST /api/grants` / `PATCH /api/grants/:id`
- `GET /api/grants` / `GET /api/grants/:id`
- `POST /api/grants/build/create` / `deposit` / `submit`

### Milestones
- `POST /api/milestones/build/add`
- `POST /api/milestones` / `PATCH /api/milestones/:id`
- `GET /api/milestones/grant/:grantId`
- `POST /api/milestones/submit` / `verify` / `approve/build` / `premium`

### AI
- `POST /api/ai/analyze` (sync or async job)
- `POST /api/ai/chat` (reviewer copilot)

---

## 10. Database schema (current)

**`grants`** — on-chain id, escrow/released, parties, budget, metadata, status  
**`milestones`** — acceptance criteria in `description`, amounts, evidence hashes, status, tx hashes  
**`ai_reports`** — scores, recommendation, `report_json`, provider/model/prompt_version, tokens, latency  
**`chain_events`** / **`indexer_state`** / **`x402_receipts`**

---

## 11. Docker / run

```powershell
docker compose up --build
```

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend | 4000 |
| App Postgres | 5432 |
| Keycloak | 8180 |
| Keycloak Postgres | 5433 |

Inspect DB:

```powershell
docker exec -it equidox-postgres psql -U postgres -d equidox
```

---

## 12. Demo script

1. Open http://localhost:3000 → sign in (`admin`/`admin` or `demo`/`demo`)  
2. Connect Freighter (Testnet); fund if needed  
3. **Admin:** Grants → create with milestones + criteria → deposit escrow  
4. **User:** Submit → open grant → submit evidence  
5. **Admin:** Review → AI verify → Approve & Release  
6. Check Dashboard timelines (click grants) + Builder Passport + Event Log  

---

## 13. Progress phases

### Phase 1 — Contracts — done
- [x] Grant Manager + Builder Passport + common lib  
- [x] Tests, deploy scripts, Testnet deploy  

### Phase 2 — Backend — done
- [x] Express + Postgres + Docker  
- [x] Tx builders, GitHub, IPFS-hash, indexer, x402  
- [x] Equidox AI v1.0 + Kimi primary + provider failover (`llm.js`)  

### Phase 3 — Frontend MVP — done
- [x] Freighter + full grant lifecycle UI  
- [x] Multi-milestone create + criteria-first review UI  
- [x] Login-first auth + role homes + HOME landing  
- [x] Dashboard grant selection → lifecycle timeline  

### Still optional (post-MVP)
- [ ] Stricter Horizon verification for real x402 payments  
- [ ] Stronger Soroban event topic parsing across RPC versions  
- [ ] Production IPFS pinning service  
- [ ] Persist AI provider secrets via vault / secret manager in deploy envs  

---

## 14. Security / trust model

- Escrow holds XLM until reviewer releases  
- AI is advisory only; cannot pay alone  
- Roles: provider, builder, reviewer (on-chain) + Keycloak admin/user (app)  
- Double-pay guard on milestones  
- Users sign with Freighter; backend does not hold user keys for grant flows  
- API keys only in `backend/.env` (gitignored), never committed  

---

## 15. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Lands on marketing instead of login | Hard-refresh; `/` should redirect to `/login` when signed out |
| AI fails / mock-like | Set `AI_API_KEY` (Kimi) + `AI_PRIMARY_PROVIDER=kimi`; recreate backend |
| `Account not found` | **Fund Testnet Wallet** / Friendbot |
| HOME no highlight | Ensure URL is `/home` (not `/`) |
| Empty event log | Indexer ~15s; refresh after txs |
| Port 3000 busy | Stop other Node / Compose stacks |

---

## 16. Verdict

**MVP complete for Testnet demos:** auth by role, milestone-first grants with AI criteria review (Kimi), Freighter escrow/release, passport, and dashboard lifecycle browsing are wired and Dockerized.
