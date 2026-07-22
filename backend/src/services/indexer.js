import { query } from "../db/client.js";

async function insertEvent(eventName, payload, txHash, ledgerSequence = null) {
  if (txHash) {
    const existing = await query(
      `SELECT id FROM chain_events WHERE tx_hash = $1 AND event_name = $2 LIMIT 1`,
      [txHash, eventName]
    );
    if (existing.rows[0]) return false;
  }

  await query(
    `INSERT INTO chain_events (contract_id, event_name, payload, tx_hash, ledger_sequence)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      process.env.GRANT_MANAGER_CONTRACT_ID || "unknown",
      eventName,
      payload,
      txHash || null,
      ledgerSequence,
    ]
  );
  return true;
}

function num(v) {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  return Number(v);
}

const EVENT_HANDLERS = {
  GrantCreated: async (payload, txHash) => {
    const grantId = num(payload.grant_id ?? payload.grantId);
    if (grantId != null && txHash) {
      await query(
        `UPDATE grants
         SET on_chain_grant_id = COALESCE(on_chain_grant_id, $1),
             tx_hash = COALESCE(tx_hash, $2),
             status = 'active'
         WHERE (on_chain_grant_id IS NULL OR on_chain_grant_id = $1)
           AND (
             tx_hash = $2
             OR (
               provider_address = $3
               AND builder_address = $4
               AND on_chain_grant_id IS NULL
             )
           )`,
        [
          grantId,
          txHash,
          payload.provider || null,
          payload.builder || null,
        ]
      );
    }
  },

  FundsDeposited: async (payload) => {
    const grantId = num(payload.grant_id ?? payload.grantId);
    const escrow = num(payload.new_escrow_balance ?? payload.amount);
    if (grantId != null) {
      await query(
        `UPDATE grants
         SET escrowed_stroops = $1,
             status = 'funded'
         WHERE on_chain_grant_id = $2`,
        [escrow, grantId]
      );
    }
  },

  MilestoneAdded: async (payload) => {
    // informational; DB milestone synced via API after Freighter submit
    void payload;
  },

  MilestoneSubmitted: async (payload, txHash) => {
    const grantId = num(payload.grant_id ?? payload.grantId);
    const mid = num(payload.milestone_id ?? payload.milestoneId);
    await query(
      `UPDATE milestones m
       SET status = 'submitted',
           evidence_hash = COALESCE($1, evidence_hash),
           submit_tx_hash = COALESCE($2, submit_tx_hash)
       FROM grants g
       WHERE m.grant_id = g.id
         AND g.on_chain_grant_id = $3
         AND m.on_chain_milestone_id = $4`,
      [payload.evidence_hash || null, txHash, grantId, mid]
    );
  },

  VerificationStored: async (payload, txHash) => {
    const grantId = num(payload.grant_id ?? payload.grantId);
    const mid = num(payload.milestone_id ?? payload.milestoneId);
    await query(
      `UPDATE milestones m
       SET status = 'under_review',
           verification_hash = COALESCE($1, verification_hash),
           verify_tx_hash = COALESCE($2, verify_tx_hash)
       FROM grants g
       WHERE m.grant_id = g.id
         AND g.on_chain_grant_id = $3
         AND m.on_chain_milestone_id = $4`,
      [payload.verification_hash || null, txHash, grantId, mid]
    );
  },

  AiVerificationAdded: async (payload, txHash) => {
    await EVENT_HANDLERS.VerificationStored(payload, txHash);
  },

  MilestoneApproved: async (payload, txHash) => {
    const grantId = num(payload.grant_id ?? payload.grantId);
    const mid = num(payload.milestone_id ?? payload.milestoneId);
    await query(
      `UPDATE milestones m
       SET status = 'approved',
           approve_tx_hash = COALESCE($1, approve_tx_hash)
       FROM grants g
       WHERE m.grant_id = g.id
         AND g.on_chain_grant_id = $2
         AND m.on_chain_milestone_id = $3`,
      [txHash, grantId, mid]
    );
  },

  MilestoneRejected: async (payload) => {
    const grantId = num(payload.grant_id ?? payload.grantId);
    const mid = num(payload.milestone_id ?? payload.milestoneId);
    await query(
      `UPDATE milestones m
       SET status = 'rejected'
       FROM grants g
       WHERE m.grant_id = g.id
         AND g.on_chain_grant_id = $1
         AND m.on_chain_milestone_id = $2`,
      [grantId, mid]
    );
  },

  PaymentReleased: async (payload, txHash) => {
    const grantId = num(payload.grant_id ?? payload.grantId);
    const mid = num(payload.milestone_id ?? payload.milestoneId);
    const amount = num(payload.amount);
    await query(
      `UPDATE milestones m
       SET status = 'paid',
           release_tx_hash = COALESCE($1, release_tx_hash)
       FROM grants g
       WHERE m.grant_id = g.id
         AND g.on_chain_grant_id = $2
         AND m.on_chain_milestone_id = $3`,
      [txHash, grantId, mid]
    );
    if (amount) {
      await query(
        `UPDATE grants
         SET released_stroops = COALESCE(released_stroops, 0) + $1,
             escrowed_stroops = GREATEST(COALESCE(escrowed_stroops, 0) - $1, 0)
         WHERE on_chain_grant_id = $2`,
        [amount, grantId]
      );
    }
  },

  PassportUpdated: async () => {},
  ReputationUpdated: async () => {},
  GrantCancelled: async (payload) => {
    const grantId = num(payload.grant_id ?? payload.grantId);
    await query(
      `UPDATE grants SET status = 'cancelled' WHERE on_chain_grant_id = $1`,
      [grantId]
    );
  },
};

const BAD_EVENT_NAMES = new Set([
  "[object Object]",
  "[objectObject]",
  "Unknown",
  "object Object",
  "",
]);

function isUsableEventName(name) {
  if (name == null) return false;
  const s = String(name).trim();
  if (!s || BAD_EVENT_NAMES.has(s)) return false;
  if (/^\[object/i.test(s)) return false;
  return true;
}

export async function indexEvent(eventName, payload, txHash, ledgerSequence = null) {
  if (!isUsableEventName(eventName)) {
    return { indexed: false, duplicate: false, skipped: true };
  }
  const inserted = await insertEvent(eventName, payload, txHash, ledgerSequence);
  if (!inserted) return { indexed: false, duplicate: true };

  const handler = EVENT_HANDLERS[eventName];
  if (handler) {
    try {
      await handler(payload || {}, txHash);
    } catch (err) {
      console.warn(`handler ${eventName} failed:`, err.message);
    }
  }
  return { indexed: true, duplicate: false };
}

export async function listEvents({ limit = 50, eventName } = {}) {
  if (eventName) {
    const res = await query(
      `SELECT * FROM chain_events
       WHERE event_name = $1
         AND event_name <> '[object Object]'
         AND event_name <> '[objectObject]'
         AND event_name <> 'Unknown'
       ORDER BY indexed_at DESC
       LIMIT $2`,
      [eventName, limit]
    );
    return res.rows.filter((row) => isUsableEventName(row.event_name));
  }
  const res = await query(
    `SELECT * FROM chain_events
     WHERE event_name IS NOT NULL
       AND event_name <> ''
       AND event_name <> '[object Object]'
       AND event_name <> '[objectObject]'
       AND event_name <> 'Unknown'
     ORDER BY indexed_at DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows.filter((row) => isUsableEventName(row.event_name));
}

export async function getIndexerCursor(key = "soroban_start_ledger") {
  const res = await query(`SELECT value FROM indexer_state WHERE key = $1`, [key]);
  return res.rows[0]?.value || null;
}

export async function setIndexerCursor(value, key = "soroban_start_ledger") {
  await query(
    `INSERT INTO indexer_state (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, String(value)]
  );
}

/** Normalize topic/value from Soroban RPC event into a friendly name + payload. */
export function parseRpcEvent(ev) {
  const topics = ev.topic || ev.topics || [];
  let eventName = "Unknown";
  try {
    const first = topics[0];
    if (typeof first === "string") eventName = first.replace(/^"|"$/g, "");
    else if (first?.symbol) eventName = first.symbol;
    else if (first && typeof first === "object" && typeof first.name === "string") {
      eventName = first.name;
    } else if (typeof first === "number" || typeof first === "bigint") {
      eventName = String(first);
    } else if (typeof first === "string") {
      eventName = first;
    } else {
      eventName = "Unknown";
    }
  } catch {
    eventName = "Unknown";
  }

  // Map common aliases from contract topic symbols
  const aliases = {
    grant_created: "GrantCreated",
    funds_deposited: "FundsDeposited",
    milestone_submitted: "MilestoneSubmitted",
    ai_verification_added: "AiVerificationAdded",
    verification_stored: "VerificationStored",
    milestone_approved: "MilestoneApproved",
    milestone_rejected: "MilestoneRejected",
    payment_released: "PaymentReleased",
    reputation_updated: "ReputationUpdated",
    passport_updated: "PassportUpdated",
    grant_cancelled: "GrantCancelled",
    milestone_added: "MilestoneAdded",
  };
  const key = String(eventName).toLowerCase();
  if (aliases[key]) eventName = aliases[key];
  else if (!eventName.match(/^[A-Z]/)) {
    // PascalCase guess
    const pascal = String(eventName)
      .split(/[_\s]+/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    eventName = aliases[pascal.toLowerCase()] || pascal || eventName;
  }

  let payload = {};
  try {
    const val = ev.value;
    if (val && typeof val === "object") payload = val;
    else if (typeof val === "string") {
      try {
        payload = JSON.parse(val);
      } catch {
        payload = { raw: val };
      }
    }
  } catch {
    payload = {};
  }

  return {
    eventName,
    payload: {
      ...payload,
      contractId: ev.contractId || ev.contractId,
      topic: topics,
    },
    txHash: ev.txHash || ev.transactionHash || null,
    ledger: ev.ledger || ev.ledgerCloseTime || null,
  };
}
