# Equidox AI — Architecture & Capabilities

**Last updated:** 2026-07-13  
**Network:** Stellar Testnet (Soroban)  
**Repo:** [LyfSeeker/Equidox-AI](https://github.com/LyfSeeker/Equidox-AI)

Equidox is an AI-assisted grant platform: escrowed XLM payouts are milestone-based, AI recommends approve/reject, and a human admin/reviewer releases funds. Builder reputation is stored on-chain in a Builder Passport.

---

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  Login (Keycloak) → Freighter wallet → Dashboard / Grants /      │
│  Review or Submit / Builder Passport                             │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ REST                        │ Sign & submit XDR
                ▼                             ▼
┌───────────────────────────┐    ┌────────────────────────────────┐
│     Backend (Express)     │    │     Freighter → Stellar RPC     │
│  AI · GitHub · IPFS hash  │    │         (Testnet)              │
│  Tx builders · Indexer    │    └────────────────┬───────────────┘
│  Postgres sync            │                     │
└─────────────┬─────────────┘                     ▼
              │                    ┌──────────────────────────────┐
              ▼                    │  Grant Manager (Soroban)      │
┌─────────────────────┐            │  Builder Passport (Soroban)  │
│ PostgreSQL (app)    │◄───────────│  Native XLM SAC (escrow)     │
│ grants, milestones, │  events    └──────────────────────────────┘
│ ai_reports, events  │
└─────────────────────┘

┌─────────────────────┐
│ Keycloak + KC DB    │  Auth only (roles: admin / user)
└─────────────────────┘
```

### Layer responsibilities

| Layer | What it does |
|-------|----------------|
| **Keycloak** | Login gate. Realm roles decide **Admin** vs **User**. |
| **Frontend** | UI, Freighter signing, role-based screens. |
| **Backend** | Builds unsigned txs, AI reports, GitHub evidence, stores DB state, indexes chain events. |
| **Grant Manager** | On-chain grants, milestones, escrow, approve/release. |
| **Builder Passport** | On-chain reputation after payouts. |
| **Postgres** | Off-chain titles, evidence JSON, AI reports, tx hashes, synced statuses. |

**Important:** AI never moves money. It only produces a verification hash. Admin/reviewer must approve and release on-chain.

---

## 2. Runtime services (Docker Compose)

| Service | URL / Port | Role |
|---------|------------|------|
| Frontend | http://localhost:3000 | App UI |
| Backend API | http://localhost:4000 | `/api/*` |
| Keycloak | http://localhost:8180 | Auth |
| App Postgres | `localhost:5432` | Equidox data |
| Keycloak Postgres | `localhost:5433` | Users / sessions |

### Demo logins

| Role | Username | Password | Login path |
|------|----------|----------|------------|
| **User** | `demo` | `demo` | `/login` |
| **Admin** | `admin` | `admin` | `/admin` |

After Keycloak sign-in, connect **Freighter** (Testnet) for on-chain actions.

### Live Testnet contracts

| Contract | ID |
|----------|-----|
| Grant Manager | `CDCW4WXFK2BM7ND5TYSRLLWLCACZEJUKMXCFRFH6IIDDMFKLKSBNDAAQ` |
| Builder Passport | `CCWQCRUXF2P56F6Z4RZZXPOOQITN55X3QYVXF626PBC4UXTVQRB3WWOL` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

---

## 3. End-to-end grant lifecycle

```
Create Grant → Deposit XLM (escrow) → Add Milestone(s)
     → User submits GitHub repo URL (evidence on-chain)
     → Admin runs AI verification (hash anchored)
     → Admin Approve & Release  OR  Reject
     → On release: XLM paid to builder + Passport updated
     → On reject: builder can resubmit evidence
     → Dashboard / Event Log refresh
```

### AI verification pipeline

```
User submits GitHub repo URL
            │
            ▼
Extract owner/repository
            │
            ▼
GitHub API
├── Repository metadata
├── Languages
├── File tree
├── Source files (selected)
├── Commits
├── Pull Requests
├── Issues
└── README
            │
            ▼
AI Model (OpenAI-compatible provider)
├── Code Quality
├── Security
├── Feature Completion
├── Documentation
├── Test Coverage
├── Architecture
└── Score (0–100)
            │
            ▼
Smart Contract
Release Funds / Reject
```

AI recommendation is advisory only. Funds move only when an admin signs `approve_milestone` + `release_funds`, or `reject_milestone`.

### Milestone status machine

```
pending → submitted → under_review → approved → paid
                ↘ rejected → (can resubmit)
```

---

## 4. What Admin can do (current)

Keycloak role: **`admin`** (UI badge: ADMIN).

| Capability | Where | Notes |
|------------|-------|--------|
| Sign in as admin | `/admin` | Then connect Freighter |
| View admin dashboard | Dashboard | Stats, escrow bars, incoming submissions, cancel |
| Create grants on-chain | Grants | Sets provider / builder / reviewer / budget |
| Deposit / manage escrow | Grants → Manage Escrow | Must lock enough XLM before release |
| Add milestones | Grants or Review page | Amount on-chain; title/description/deadline in DB |
| Open milestone review | `/verification/[grantId]` | Per-milestone lifecycle + AI report |
| See user evidence | Review page | Repo, demo, docs, notes, hash |
| Run / refresh AI report | Review page | Anchors verification hash when needed |
| Approve & release funds | Review page | Pays **builder** wallet; updates passport |
| Reject milestone | Review page | On-chain `reject_milestone`; builder may resubmit |
| Cancel grant | Dashboard (admin) | When contract rules allow |
| View event log / tx links | Dashboard → Event Log | Opens Stellar Expert |
| View Builder Passport | `/builder/[address]` | Reputation, payouts, history |
| Unlock premium AI (optional) | Review page | x402 path with graceful fallback |

Admin cannot skip escrow: release fails if locked XLM &lt; milestone amount.

---

## 5. What User can do (current)

Keycloak role: normal user / `demo` (UI badge: USER).

| Capability | Where | Notes |
|------------|-------|--------|
| Sign in as user | `/login` | Then connect Freighter |
| View updates dashboard | Dashboard | Read-oriented progress view |
| Browse grants | Grants | See status, budget, escrow (no create) |
| Open grant to submit | Grants → View & Submit | Goes to verification page |
| Submit evidence on-chain | `/verification/[grantId]` | Repo, demo, docs, commit, notes |
| Select milestones | Review/Submit page | Each milestone has its own cycle + report |
| View AI report (read-only) | Same page | After admin has analyzed |
| View lifecycle timeline | Same page | Per selected milestone |
| View Builder Passport | `/builder/me` or `/builder/[wallet]` | Own reputation after payouts |
| Fund Testnet wallet | Topbar | Friendbot helper |
| See tx hashes | Dashboard Event Log + status toasts | Links to Stellar Expert |

### User cannot

- Create grants  
- Deposit escrow  
- Add milestones  
- Run AI verify (admin review action)  
- Approve / release funds  
- Cancel grants  

---

## 6. Money flow (who gets paid)

1. Admin/provider deposits XLM into the **Grant Manager** escrow.  
2. Admin approves a milestone that is `under_review`.  
3. `release_funds` transfers that milestone’s XLM to the grant’s **builder** address.  
4. Builder Passport score / totals update for that builder.  

Admin wallet signs the release; builder wallet **receives** the funds.

---

## 7. Builder Passport (what the “Passport” section is)

Not a login document — an **on-chain reputation profile** for builders.

| Field | Meaning |
|-------|---------|
| Reputation score | Cumulative trust score |
| Completed milestones | Successful paid milestones |
| Total funds received | XLM paid out |
| Completed grants | Fully finished grants |
| Verification count | Anchored verifications |
| Badges | Optional on-chain badge bits |

Updated when funds are released. View at `/builder/[wallet]` or from Dashboard → Open Passport.

---

## 8. Where to find transaction hashes

| Place in UI | What you see |
|-------------|--------------|
| Dashboard → **Event Log** | Indexed events + clickable short tx hash |
| Grants card | Grant creation tx (when stored) |
| Milestone Review status line | Latest submit / verify / approve / release hash |
| Parties panel (paid milestone) | **Release tx** explorer link |
| Builder page | Recent payment / verification hashes |

Explorer format: `https://stellar.expert/explorer/testnet/tx/<HASH>`

---

## 9. Tech stack summary

| Area | Stack |
|------|--------|
| Contracts | Rust, `soroban-sdk`, Stellar CLI |
| Backend | Node.js, Express, PostgreSQL, Stellar SDK |
| AI | OpenAI if keyed; otherwise enriched mock |
| Frontend | Next.js, Tailwind, Freighter, Framer Motion |
| Auth | Keycloak realm `equidox` |
| Infra | Docker Compose |

---

## 10. Repo layout

```
contracts/
  common/              Shared types / errors / events
  grant-manager/       Grants, milestones, escrow, payouts
  builder-passport/    Builder reputation
backend/               Express API, AI, indexer, tx builders
frontend/              Next.js UI (admin + user)
keycloak/              Realm import
scripts/               Deploy / initialize
docker-compose.yml
ARCHITECTURE.md        This file
PROJECT_STATUS.md      Detailed MVP checklist
README.md              Quick start
```

---

## 11. Quick capability matrix

| Action | Admin | User |
|--------|:-----:|:----:|
| Keycloak login | ✓ | ✓ |
| Connect Freighter | ✓ | ✓ |
| Create grant | ✓ | ✗ |
| Deposit escrow | ✓ | ✗ |
| Add milestone | ✓ | ✗ |
| Submit evidence | — | ✓ |
| AI verify / refresh report | ✓ | ✗ (view only) |
| Approve & release | ✓ | ✗ |
| Reject milestone | ✓ | ✗ |
| Receive payout | if set as builder | if set as builder |
| View passport / events | ✓ | ✓ |
| Cancel grant | ✓ | ✗ |

---

## AI verification engine

Providers are **hardcoded via `backend/.env`** (no UI). Flow:

1. Parse GitHub URL → `owner/repo`  
2. GitHub API: metadata, languages, file tree, source files, commits, PRs, issues, README  
3. Model returns category scores + overall **Score (0–100)**  
4. Report saved to `ai_reports`; SHA-256 anchored via `store_verification_hash`  
5. Human reviewer **Release Funds** or **Reject** — AI never moves funds  

Category scores: Code Quality, Security, Feature Completion, Documentation, Test Coverage, Architecture.

```
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
AI_PRIMARY_PROVIDER=deepseek
OPENAI_API_KEY=...          # optional fallback
GITHUB_TOKEN=...            # optional, raises GitHub rate limits
# Optional custom OpenAI-compatible gateway:
# AI_API_KEY=...
# AI_BASE_URL=https://api.x.ai/v1
# AI_MODEL=grok-4-0709
# AI_PROVIDER_ID=grok
# AI_PROVIDER_NAME=Grok
# AI_PRIMARY_PROVIDER=grok
```

Then recreate backend: `docker compose up -d --force-recreate backend`
---

## 12. Run locally

```powershell
docker compose up --build
```

1. Open http://localhost:3000  
2. Login as `admin`/`admin` or `demo`/`demo`  
3. Connect Freighter (Testnet)  
4. Admin: create grant → escrow → milestones → review → release  
5. User: open grant → submit evidence for a milestone  

For deeper endpoint / schema / checklist detail, see `PROJECT_STATUS.md`.
