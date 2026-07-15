# Equidox AI — Architecture & Capabilities

**Last updated:** 2026-07-15  
**Network:** Stellar Testnet (Soroban)  
**Repo:** [LyfSeeker/Equidox-AI](https://github.com/LyfSeeker/Equidox-AI)

Equidox is an AI-assisted grant platform: escrowed XLM payouts are milestone-based, **Equidox AI v1.0** recommends approve/reject against acceptance criteria, and a human admin/reviewer releases funds. Builder reputation is stored on-chain in a Builder Passport.

---

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  / → Login (Keycloak) → role home → Freighter →                  │
│  Home / Dashboard / Grants / Review|Submit / Passport            │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ REST                        │ Sign & submit XDR
                ▼                             ▼
┌───────────────────────────┐    ┌────────────────────────────────┐
│     Backend (Express)     │    │     Freighter → Stellar RPC     │
│  llm.js (Kimi+/failover)  │    │         (Testnet)              │
│  GitHub · IPFS hash       │    └────────────────┬───────────────┘
│  Tx builders · Indexer    │                     │
│  Postgres sync            │                     ▼
└─────────────┬─────────────┘    ┌──────────────────────────────┐
              │                  │  Grant Manager (Soroban)      │
              ▼                  │  Builder Passport (Soroban)  │
┌─────────────────────┐          │  Native XLM SAC (escrow)     │
│ PostgreSQL (app)    │◄─────────│                              │
│ grants, milestones, │  events  └──────────────────────────────┘
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
| **Frontend** | UI, Freighter signing, role-based screens + `/home` landing. |
| **Backend** | Builds unsigned txs, Equidox AI reports, GitHub evidence, DB state, chain events. |
| **Grant Manager** | On-chain grants, milestones, escrow, approve/release. |
| **Builder Passport** | On-chain reputation after payouts. |
| **Postgres** | Titles, acceptance criteria, evidence JSON, AI reports, tx hashes, statuses. |

**Important:** AI never moves money. It only produces a verification hash + advisory report. Admin/reviewer must approve and release on-chain.

---

## 2. Runtime services (Docker Compose)

| Service | URL / Port | Role |
|---------|------------|------|
| Frontend | http://localhost:3000 | App UI (login-first) |
| Backend API | http://localhost:4000 | `/api/*` |
| Keycloak | http://localhost:8180 | Auth |
| App Postgres | `localhost:5432` | Equidox data |
| Keycloak Postgres | `localhost:5433` | Users / sessions |

### Auth entry

| Path | Behavior |
|------|----------|
| `/` | Signed out → `/login`; signed in → role home |
| `/login` | Shared sign-in (admin or demo) |
| `/admin` | Admin-only sign-in helper (optional) |
| `/home` | Product landing (sidebar HOME); wallet not required when signed in |

### Post-login homes

| Role | Username / Password | Lands on |
|------|---------------------|----------|
| **Admin** | `admin` / `admin` | `/dashboard` |
| **User** | `demo` / `demo` | `/submit` |

After Keycloak sign-in, connect **Freighter** (Testnet) for on-chain actions (except browsing `/home`).

### Live Testnet contracts

| Contract | ID |
|----------|-----|
| Grant Manager | `CDCW4WXFK2BM7ND5TYSRLLWLCACZEJUKMXCFRFH6IIDDMFKLKSBNDAAQ` |
| Builder Passport | `CCWQCRUXF2P56F6Z4RZZXPOOQITN55X3QYVXF626PBC4UXTVQRB3WWOL` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

---

## 3. End-to-end grant lifecycle

```
Create Grant (with milestone titles + acceptance criteria + payouts)
     → create_grant + add_milestone(s) on-chain; criteria stored in Postgres
     → Deposit XLM (escrow)
     → (Optional) Add more milestones via Manage Escrow
     → User submits evidence (repo / demo / docs / notes)
     → Admin runs Equidox AI v1.0 (criteria-first report + hash)
     → Admin Approve & Release  OR  Reject
     → On release: XLM paid to builder + Passport updated
     → Dashboard grant selection shows that grant’s Activity Timeline
```

### AI verification pipeline

```
User submits GitHub repo (+ optional demo/docs)
            │
            ▼
GitHub evidence pack + milestone.acceptanceCriteria
            │
            ▼
Equidox AI v1.0 (primary: Kimi / Moonshot)
├── Feature Completion (30%)  ← vs acceptance criteria
├── Code Quality (20%)
├── Security (15%)
├── Documentation (10%)
├── Testing (10%)
├── Deployment (5%)
├── GitHub Health (5%)
├── Innovation (5%)
├── criteriaChecklist (PASS|FAIL|PARTIAL|NOT_VERIFIED)
└── recommendation (APPROVE|MANUAL_REVIEW|REJECT)
            │
            ▼
Persist ai_reports + optional IPFS/hash → human Release / Reject
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
| Sign in | `/` or `/login` or `/admin` | Then connect Freighter |
| Admin dashboard | `/dashboard` | KPIs, pending reviews, select grant → timeline |
| Create grants + milestones | `/grants` | Budget = sum of milestone payouts; criteria in DB |
| Deposit / manage escrow | Grants → Manage Escrow | Lock enough XLM before release |
| Add extra milestones | Create Milestone modal | Title/criteria/amount/deadline |
| Review submissions | `/review`, `/verification/[id]` | Evidence + AI report |
| Run / refresh AI | Verification | Prompt `equidox-ai-v1.0` |
| Approve & release / Reject | Verification | Pays **builder**; updates passport |
| Cancel / refund grant | Dashboard | When contract rules allow |
| Event log / explorer links | Dashboard | Stellar Expert |
| Builder Passport | `/builder/[address]` | Reputation history |

Admin cannot skip escrow: release fails if locked XLM &lt; milestone amount.

---

## 5. What User can do (current)

Keycloak role: normal user / `demo` (UI badge: USER).

| Capability | Where | Notes |
|------------|-------|--------|
| Sign in | `/` → `/login` | Lands on `/submit` |
| Product landing | `/home` | Via sidebar HOME |
| Updates dashboard | `/dashboard` | Progress; click grant for timeline |
| Browse grants | `/grants` | View & submit (no create) |
| Submit evidence | `/submit`, `/verification/[id]` | Repo, demo, docs, notes |
| View AI report (read-only) | Verification | After admin analyzes |
| Builder Passport | `/builder/me` | After payouts |
| Fund Testnet wallet | Topbar | Friendbot |

### User cannot

- Create grants / deposit escrow / add milestones  
- Run AI verify  
- Approve / release / cancel grants  

---

## 6. Money flow (who gets paid)

1. Admin/provider deposits XLM into the **Grant Manager** escrow.  
2. Admin approves a milestone that is `under_review`.  
3. `release_funds` transfers that milestone’s XLM to the grant’s **builder** address.  
4. Builder Passport score / totals update for that builder.  

Admin wallet signs the release; builder wallet **receives** the funds.

---

## 7. Builder Passport

On-chain reputation profile (not a login document): score, completed milestones, funds received, grants, verification count, badges. Updated on release. View at `/builder/[wallet]`.

---

## 8. Where to find transaction hashes

| Place in UI | What you see |
|-------------|--------------|
| Dashboard → Live Events | Indexed events + explorer links |
| Grants card | Grant creation tx (when stored) |
| Milestone Review status | Submit / verify / approve / release hash |
| Builder page | Recent payment / verification hashes |

Explorer: `https://stellar.expert/explorer/testnet/tx/<HASH>`

---

## 9. Tech stack summary

| Area | Stack |
|------|--------|
| Contracts | Rust, `soroban-sdk`, Stellar CLI |
| Backend | Node.js, Express, PostgreSQL, Stellar SDK |
| AI | `llm.js` — Kimi primary; Gemini / DeepSeek / OpenAI fallbacks |
| Frontend | Next.js, Tailwind, Freighter, Framer Motion, BrandIcon |
| Auth | Keycloak realm `equidox` + `authRedirect` helpers |
| Infra | Docker Compose |

---

## 10. Repo layout

```
contracts/
  common/
  grant-manager/
  builder-passport/
backend/               # Express API — services/llm.js is the AI client
frontend/              # Next.js UI
keycloak/
scripts/
docker-compose.yml
ARCHITECTURE.md
PROJECT_STATUS.md
README.md
FRONTEND_UI.md
```

---

## 11. Quick capability matrix

| Action | Admin | User |
|--------|:-----:|:----:|
| Keycloak login | ✓ | ✓ |
| Connect Freighter | ✓ | ✓ |
| View `/home` landing | ✓ | ✓ |
| Create grant + milestones | ✓ | ✗ |
| Deposit escrow | ✓ | ✗ |
| Submit evidence | — | ✓ |
| AI verify / refresh | ✓ | view only |
| Approve & release / Reject | ✓ | ✗ |
| Dashboard grant → timeline | ✓ | ✓ |
| View passport / events | ✓ | ✓ |
| Cancel grant | ✓ | ✗ |

---

## AI verification engine

Providers are configured via **`backend/.env`**. Implementation:

- Façade: `backend/src/services/ai.js` (GitHub + docs evidence pack)  
- HTTP client + legacy normalization: `backend/src/services/llm.js`  
- **Modular grant reviewer:** `backend/ai/`  
  - `prompts/` — system, reviewer, scoring, decision rules, output schema  
  - `skills/` — dynamically loaded by detected stack  
  - `examples/` — few-shot APPROVE / MANUAL_REVIEW / REJECT  
  - `pipeline/` — evidence → specialist briefings → decision (+ optional full stages)  
  - `mcp/` — MCP adapters with REST fallbacks  
  - Zod validation + self-review + report fingerprint cache  
- Provider list / primary: `backend/src/services/settings.js`  

**Prompt version:** `equidox-ai-v2.0-pipeline`

Flow:

1. Parse GitHub URL → evidence pack + milestone acceptance criteria  
2. Call primary provider (Kimi); on failure try other configured providers  
3. Normalize JSON → scores, checklist, recommendation  
4. Save `ai_reports`; SHA-256 / IPFS hash for `store_verification_hash`  
5. Human **Release Funds** or **Reject**  

```
# Primary (Kimi / Moonshot)
AI_API_KEY=...
AI_BASE_URL=https://api.moonshot.ai/v1
AI_MODEL=kimi-k2.6
AI_PROVIDER_ID=kimi
AI_PROVIDER_NAME=Kimi
AI_PRIMARY_PROVIDER=kimi

# Optional fallbacks
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
GITHUB_TOKEN=
```

Recreate backend after env changes: `docker compose up -d --force-recreate backend`

---

## 12. Run locally

```powershell
docker compose up --build
```

1. Open http://localhost:3000 → sign in (`admin`/`admin` or `demo`/`demo`)  
2. Connect Freighter (Testnet)  
3. Admin: create grant with milestones → escrow → review → release  
4. User: Submit → evidence for a milestone  
5. Sidebar **HOME** → `/home` landing  

For MVP checklist / troubleshooting, see `PROJECT_STATUS.md`.
