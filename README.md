# Equidox AI — Soroban Smart Contracts

Production-oriented Soroban workspace for **Equidox AI**: milestone verification escrow, grant management, and builder reputation on Stellar.

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

- **On-chain**: grant IDs, escrow balances, milestone state machine, IPFS content hashes, passport aggregates, events
- **Off-chain**: AI analysis (OpenAI), GitHub data, full reports (IPFS), reviewer notes, x402 premium payments

## Grant lifecycle

```
create_grant → deposit_funds → add_milestone → submit_milestone
  → store_verification_hash → approve_milestone → release_funds
```

## Testnet Deployment (live)

| Contract | ID |
|---|---|
| Grant Manager | `CDCVDDIQG4ILG2G5JXLSY5EYTOTBVM5NT3NVH7IYXQTV35PEIZLRMTDQ` |
| Builder Passport | `CCSADRTCRFJMQMXJ4TN642U3HS6R5TQ4C73UNRLSTRMTS7WAXEWVIK4B` |
| Native XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

Config saved to `%USERPROFILE%\.config\stellar\equidox\init-testnet.json`

## Backend

```powershell
cd backend
npm install
npm run db:migrate   # requires PostgreSQL
npm run dev
```

API health check: `GET http://localhost:4000/api/health`


```
contracts/
  common/           # Shared types, errors, events
  grant-manager/    # Main escrow contract
  builder-passport/ # Reputation registry
backend/            # Express API for AI, IPFS, tx building
scripts/            # Deploy & initialize scripts
```
