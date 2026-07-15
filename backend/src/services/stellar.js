import StellarSdk from "@stellar/stellar-sdk";

const {
  Contract,
  Networks,
  rpc: SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  StrKey,
  Horizon,
  TimeoutInfinite,
} = StellarSdk;

/** Valid for Freighter review after prepare; clock skew-safe via RPC time. */
const DEFAULT_TX_TIMEOUT_SECS = 900;

/** Short-lived caches for read-only Soroban sims (cuts 3 RPC → 1). */
const READ_ACCOUNT_TTL_MS = 30_000;
const READ_RESULT_TTL_MS = 8_000;
let cachedReadAccount = { key: "", account: null, expiresAt: 0 };
const simulateResultCache = new Map();

function getNetworkPassphrase() {
  return process.env.STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

export function getServer() {
  return new SorobanRpc.Server(
    process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
  );
}

function getHorizon() {
  return new Horizon.Server(
    process.env.HORIZON_URL || "https://horizon-testnet.stellar.org"
  );
}

export function getNetworkPassphraseExport() {
  return getNetworkPassphrase();
}

/**
 * Use Soroban RPC ledger close time — not the host clock.
 * Local clock skew otherwise yields sendTransaction ERROR / txTooLate
 * before Freighter even signs.
 */
async function getNetworkTimebounds(server, timeoutSecs = DEFAULT_TX_TIMEOUT_SECS) {
  const latest = await server.getLatestLedger();
  const networkNow = Number(
    latest.closeTime || Math.floor(Date.now() / 1000)
  );
  const ttl = Number(process.env.TX_TIMEOUT_SECS || timeoutSecs);
  return {
    minTime: 0,
    maxTime: networkNow + Math.max(60, ttl),
  };
}

async function getCachedReadAccount(server) {
  const key =
    process.env.DEFAULT_READ_ACCOUNT ||
    "GCFCVEY6YOO24HAI2JCX6BH2RDAJRMSQJODOGUY6H4NMNVQR3KYV446Z";
  const now = Date.now();
  if (
    cachedReadAccount.account &&
    cachedReadAccount.key === key &&
    cachedReadAccount.expiresAt > now
  ) {
    return cachedReadAccount.account;
  }
  const account = await server.getAccount(key);
  cachedReadAccount = { key, account, expiresAt: now + READ_ACCOUNT_TTL_MS };
  return account;
}

function getCachedSimulate(cacheKey) {
  const hit = simulateResultCache.get(cacheKey);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    simulateResultCache.delete(cacheKey);
    return undefined;
  }
  return hit.value;
}

function setCachedSimulate(cacheKey, value) {
  simulateResultCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + READ_RESULT_TTL_MS,
  });
  if (simulateResultCache.size > 200) {
    const first = simulateResultCache.keys().next().value;
    simulateResultCache.delete(first);
  }
}

/**
 * Builds an unsigned Soroban transaction for Freighter signing.
 */
export async function buildContractInvoke({
  sourcePublicKey,
  contractId,
  method,
  args = [],
}) {
  const server = getServer();
  const sourceAccount = await server.getAccount(sourcePublicKey);
  const contract = new Contract(contractId);
  const timebounds = await getNetworkTimebounds(server);

  let transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
    timebounds,
  })
    .addOperation(contract.call(method, ...args))
    .build();

  transaction = await server.prepareTransaction(transaction);

  return {
    xdr: transaction.toXDR(),
    networkPassphrase: getNetworkPassphrase(),
  };
}

export function addressToScVal(address) {
  const addr = String(address || "").trim();
  if (
    !StrKey.isValidEd25519PublicKey(addr) &&
    !StrKey.isValidContract(addr)
  ) {
    throw new Error(
      `Invalid Stellar address (check checksum): ${addr.slice(0, 8)}…`
    );
  }
  return Address.fromString(addr).toScVal();
}

export function u64ToScVal(value) {
  return nativeToScVal(value, { type: "u64" });
}

export function u32ToScVal(value) {
  return nativeToScVal(Number(value), { type: "u32" });
}

export function i128ToScVal(value) {
  return nativeToScVal(BigInt(value), { type: "i128" });
}

export function bytesN32ToScVal(hexHash) {
  const hex = String(hexHash || "")
    .replace(/^0x/i, "")
    .padStart(64, "0")
    .slice(0, 64);
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error("metadata/evidence hash must be exactly 32 bytes");
  }
  // Fixed-length 32-byte buffer → ScvBytes (Soroban BytesN<32> ABI)
  return nativeToScVal(buf);
}

function explainTransactionResult(result) {
  if (!result) return null;
  try {
    const out = {
      code: result.result().switch().name,
    };
    try {
      out.feeCharged = result.feeCharged().toString();
    } catch {
      // ignore
    }
    try {
      if (typeof result.result().results === "function") {
        out.operations = result.result().results().map((op) => {
          try {
            const tr = op.tr();
            const name = tr.switch().name;
            try {
              if (name === "invokeHostFunction") {
                return {
                  op: name,
                  result: tr.invokeHostFunctionResult().switch().name,
                };
              }
            } catch {
              // fall through
            }
            return { op: name };
          } catch {
            return { op: "unknown" };
          }
        });
      }
    } catch {
      // ignore
    }
    try {
      out.xdr = result.toXDR("base64");
    } catch {
      // ignore
    }
    return out;
  } catch (err) {
    try {
      return { xdr: result.toXDR("base64"), parseError: err.message };
    } catch {
      return { parseError: err.message };
    }
  }
}

function hintForTxCode(code) {
  switch (code) {
    case "txTooLate":
      return "Transaction expired before submit. Confirm Freighter quickly, or sync this machine's clock (NTP).";
    case "txTooEarly":
      return "Transaction minTime is in the future — check system clock / NTP.";
    case "txBadAuth":
    case "txBadAuthExtra":
      return "Signature missing or Freighter is on the wrong network. Use Stellar Testnet and approve the prompt.";
    case "txBadSeq":
      return "Account sequence conflict — wait a few seconds and retry.";
    case "txInsufficientBalance":
    case "txInsufficientFee":
      return "Wallet needs more XLM for fees, or the fee was too low.";
    default:
      return null;
  }
}

function jsonSafe(value) {
  if (typeof value === "bigint") {
    const asNum = Number(value);
    return Number.isSafeInteger(asNum) ? asNum : value.toString();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("hex");
  }
  if (Array.isArray(value)) {
    return value.map(jsonSafe);
  }
  if (value && typeof value === "object") {
    // TransactionResult / XDR enums: decode instead of "[object Object]"
    if (typeof value.result === "function" && typeof value.toXDR === "function") {
      return explainTransactionResult(value);
    }
    if (typeof value.toXDR === "function" || typeof value.switch === "function") {
      try {
        if (typeof value.switch === "function") {
          return value.switch().name;
        }
        return value.toXDR("base64");
      } catch {
        return null;
      }
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      try {
        out[k] = jsonSafe(v);
      } catch {
        out[k] = null;
      }
    }
    return out;
  }
  return value;
}

function formatSendFailure(response) {
  const explained = explainTransactionResult(response.errorResult);
  const code = explained?.code || null;
  const hint = hintForTxCode(code);
  const payload = {
    status: response.status,
    hash: response.hash,
    latestLedger: response.latestLedger,
    errorResult: explained,
  };
  if (hint) payload.hint = hint;
  return { code, hint, message: `Transaction failed: ${JSON.stringify(payload)}` };
}

export async function submitTransaction(signedXdr) {
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") {
    const failure = formatSendFailure(response);
    const err = new Error(failure.message);
    err.code = failure.code;
    err.hint = failure.hint;
    throw err;
  }

  let getResponse = await server.getTransaction(response.hash);
  const started = Date.now();
  while (getResponse.status === "NOT_FOUND" && Date.now() - started < 60000) {
    await new Promise((r) => setTimeout(r, 1000));
    getResponse = await server.getTransaction(response.hash);
  }

  let returnValue = null;
  try {
    if (getResponse.returnValue) {
      returnValue = jsonSafe(scValToNative(getResponse.returnValue));
    }
  } catch {
    returnValue = null;
  }

  return {
    hash: response.hash,
    status: getResponse.status,
    returnValue,
  };
}

export async function accountExists(publicKey) {
  try {
    const horizon = getHorizon();
    await horizon.loadAccount(publicKey);
    return true;
  } catch {
    return false;
  }
}

export async function fundWithFriendbot(publicKey) {
  if (process.env.STELLAR_NETWORK === "mainnet") {
    throw new Error("Friendbot is not available on mainnet");
  }
  const url = `${process.env.FRIENDBOT_URL || "https://friendbot.stellar.org"}/?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Friendbot failed: ${text || res.status}`);
  }
  const data = await res.json().catch(() => ({}));

  // Wait until Horizon sees the account
  for (let i = 0; i < 20; i++) {
    if (await accountExists(publicKey)) {
      return { funded: true, hash: data.hash || null };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { funded: true, hash: data.hash || null, pending: true };
}

async function simulateRead(contractId, method, args = []) {
  const cacheKey = `${contractId}:${method}:${JSON.stringify(
    args.map((a) => {
      try {
        return typeof a?.toXDR === "function" ? a.toXDR("base64") : String(a);
      } catch {
        return String(a);
      }
    })
  )}`;
  const cached = getCachedSimulate(cacheKey);
  if (cached !== undefined) return cached;

  const server = getServer();
  const contract = new Contract(contractId);
  const account = await getCachedReadAccount(server);

  // TimeoutInfinite avoids an extra getLatestLedger RPC on every read.
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(TimeoutInfinite)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error || "Simulation failed");
  }
  let value = null;
  if (SorobanRpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
    value = scValToNative(sim.result.retval);
  }
  setCachedSimulate(cacheKey, value);
  return value;
}

function normalizeAddress(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (val?.toString) return val.toString();
  return String(val);
}

function normalizeI128(val) {
  if (val == null) return 0;
  if (typeof val === "bigint") return Number(val);
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val);
  return Number(val);
}

export async function readGrant(grantId) {
  const contractId = process.env.GRANT_MANAGER_CONTRACT_ID;
  if (!contractId) return null;
  try {
    const raw = await simulateRead(contractId, "get_grant", [
      u64ToScVal(grantId),
    ]);
    if (!raw) return null;
    return {
      id: Number(raw.id ?? grantId),
      provider: normalizeAddress(raw.provider),
      builder: normalizeAddress(raw.builder),
      reviewer: normalizeAddress(raw.reviewer),
      total_budget: normalizeI128(raw.total_budget),
      escrowed_balance: normalizeI128(raw.escrowed_balance),
      released_total: normalizeI128(raw.released_total),
      status: raw.status,
      milestone_count: Number(raw.milestone_count || 0),
      created_at: Number(raw.created_at || 0),
    };
  } catch (err) {
    console.warn("readGrant failed:", err.message);
    return null;
  }
}

export async function readEscrowBalance(grantId) {
  const contractId = process.env.GRANT_MANAGER_CONTRACT_ID;
  if (!contractId) return null;
  try {
    const raw = await simulateRead(contractId, "get_escrow_balance", [
      u64ToScVal(grantId),
    ]);
    return normalizeI128(raw);
  } catch {
    return null;
  }
}

const MILESTONE_STATUS_MAP = [
  "pending",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "paid",
];

function hashToHex(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const hex = val.replace(/^0x/i, "");
    return hex.length ? hex : null;
  }
  if (Buffer.isBuffer(val)) return val.toString("hex");
  if (val instanceof Uint8Array) return Buffer.from(val).toString("hex");
  if (Array.isArray(val)) return Buffer.from(val).toString("hex");
  try {
    return Buffer.from(val).toString("hex");
  } catch {
    return null;
  }
}

export async function readMilestone(grantId, milestoneId) {
  const contractId = process.env.GRANT_MANAGER_CONTRACT_ID;
  if (!contractId) return null;
  try {
    const raw = await simulateRead(contractId, "get_milestone", [
      u64ToScVal(grantId),
      u32ToScVal(milestoneId),
    ]);
    if (!raw) return null;
    const statusNum = Number(raw.status ?? 0);
    return {
      grant_id: Number(raw.grant_id ?? grantId),
      milestone_id: Number(raw.milestone_id ?? milestoneId),
      amount: normalizeI128(raw.amount),
      status_num: statusNum,
      status: MILESTONE_STATUS_MAP[statusNum] || "pending",
      evidence_hash: hashToHex(raw.evidence_hash),
      verification_hash: hashToHex(raw.verification_hash),
      payment_tx_guard: Boolean(raw.payment_tx_guard),
    };
  } catch (err) {
    console.warn("readMilestone failed:", err.message);
    return null;
  }
}

export async function readPassport(builderAddress) {
  const contractId = process.env.BUILDER_PASSPORT_CONTRACT_ID;
  if (!contractId) return null;
  try {
    const raw = await simulateRead(contractId, "get_passport", [
      addressToScVal(builderAddress),
    ]);
    if (!raw) return null;
    return {
      builder: normalizeAddress(raw.builder) || builderAddress,
      reputation_score: Number(raw.reputation_score || 0),
      completed_milestones: Number(raw.completed_milestones || 0),
      completed_grants: Number(raw.completed_grants || 0),
      total_funds_received: normalizeI128(raw.total_funds_received),
      badges: Number(raw.badges || 0),
      verification_count: Number(raw.verification_count || 0),
      last_updated_at: Number(raw.last_updated_at || 0),
      source: "on-chain",
    };
  } catch (err) {
    console.warn("readPassport failed:", err.message);
    return null;
  }
}

export async function getLatestLedger() {
  const server = getServer();
  const info = await server.getLatestLedger();
  return info.sequence;
}

export async function fetchContractEvents({ startLedger, endLedger, limit = 50 }) {
  const server = getServer();
  const contractId = process.env.GRANT_MANAGER_CONTRACT_ID;
  const passportId = process.env.BUILDER_PASSPORT_CONTRACT_ID;
  if (!contractId) return { events: [], latestLedger: startLedger };

  const filters = [
    {
      type: "contract",
      contractIds: [contractId, passportId].filter(Boolean),
    },
  ];

  try {
    const page = await server.getEvents({
      startLedger,
      endLedger,
      filters,
      limit,
    });
    return {
      events: page.events || [],
      latestLedger: page.latestLedger || endLedger || startLedger,
    };
  } catch (err) {
    console.warn("fetchContractEvents failed:", err.message);
    return { events: [], latestLedger: startLedger };
  }
}

export { getNetworkPassphrase };
