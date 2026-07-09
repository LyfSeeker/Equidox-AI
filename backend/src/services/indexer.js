import { query } from "../db/client.js";

const EVENT_HANDLERS = {
  GrantCreated: async (payload, txHash) => {
    await query(
      `INSERT INTO chain_events (contract_id, event_name, payload, tx_hash)
       VALUES ($1, $2, $3, $4)`,
      [process.env.GRANT_MANAGER_CONTRACT_ID, "GrantCreated", payload, txHash]
    );
  },
  FundsDeposited: async (payload, txHash) => {
    await query(
      `INSERT INTO chain_events (contract_id, event_name, payload, tx_hash)
       VALUES ($1, $2, $3, $4)`,
      [process.env.GRANT_MANAGER_CONTRACT_ID, "FundsDeposited", payload, txHash]
    );
  },
  PaymentReleased: async (payload, txHash) => {
    await query(
      `INSERT INTO chain_events (contract_id, event_name, payload, tx_hash)
       VALUES ($1, $2, $3, $4)`,
      [process.env.GRANT_MANAGER_CONTRACT_ID, "PaymentReleased", payload, txHash]
    );
  },
  AiVerificationAdded: async (payload, txHash) => {
    await query(
      `INSERT INTO chain_events (contract_id, event_name, payload, tx_hash)
       VALUES ($1, $2, $3, $4)`,
      [process.env.GRANT_MANAGER_CONTRACT_ID, "AiVerificationAdded", payload, txHash]
    );
  },
  ReputationUpdated: async (payload, txHash) => {
    await query(
      `INSERT INTO chain_events (contract_id, event_name, payload, tx_hash)
       VALUES ($1, $2, $3, $4)`,
      [process.env.GRANT_MANAGER_CONTRACT_ID, "ReputationUpdated", payload, txHash]
    );
  },
};

export async function indexEvent(eventName, payload, txHash) {
  const handler = EVENT_HANDLERS[eventName];
  if (handler) {
    await handler(payload, txHash);
  } else {
    await query(
      `INSERT INTO chain_events (contract_id, event_name, payload, tx_hash)
       VALUES ($1, $2, $3, $4)`,
      [process.env.GRANT_MANAGER_CONTRACT_ID || "unknown", eventName, payload, txHash]
    );
  }
}

export async function listEvents({ limit = 50, eventName } = {}) {
  if (eventName) {
    const res = await query(
      `SELECT * FROM chain_events WHERE event_name = $1 ORDER BY indexed_at DESC LIMIT $2`,
      [eventName, limit]
    );
    return res.rows;
  }
  const res = await query(
    `SELECT * FROM chain_events ORDER BY indexed_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
}
