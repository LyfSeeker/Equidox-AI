import { Router } from "express";
import { listEvents } from "../services/indexer.js";
import { query } from "../db/client.js";
import {
  accountExists,
  fundWithFriendbot,
  readPassport,
} from "../services/stellar.js";
import { getAiConfig } from "../services/settings.js";

const router = Router();

router.get("/health", async (_req, res) => {
  let ai = {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    kimi: Boolean(process.env.AI_API_KEY),
    model:
      process.env.AI_MODEL ||
      process.env.GEMINI_MODEL ||
      process.env.DEEPSEEK_MODEL ||
      "—",
    providers: 0,
  };
  try {
    const cfg = await getAiConfig();
    const ready = cfg.providers.filter((p) => p.apiKey);
    const primary =
      cfg.providers.find((p) => p.id === cfg.primaryProviderId) || ready[0];
    ai = {
      gemini: ready.some((p) => p.id === "gemini"),
      deepseek: ready.some((p) => p.id === "deepseek"),
      openai: ready.some((p) => p.id === "openai"),
      kimi: ready.some((p) => p.id === "kimi"),
      model: primary?.model || "—",
      primary: primary?.id || null,
      providers: ready.length,
    };
  } catch {
    // keep env fallback
  }

  res.json({
    status: "ok",
    service: "equidox-backend",
    network: process.env.STELLAR_NETWORK || "testnet",
    contracts: {
      grantManager: process.env.GRANT_MANAGER_CONTRACT_ID || null,
      builderPassport: process.env.BUILDER_PASSPORT_CONTRACT_ID || null,
    },
    ai,
    indexer: process.env.INDEXER_ENABLED !== "false",
  });
});

router.get("/events", async (req, res) => {
  try {
    const events = await listEvents({
      limit: parseInt(req.query.limit || "50", 10),
      eventName: req.query.eventName,
    });
    res.json(events);
  } catch (err) {
    console.warn("list events failed:", err?.message || err);
    res.json([]);
  }
});

router.get("/account/:address", async (req, res, next) => {
  try {
    const address = req.params.address;
    const exists = await accountExists(address);
    res.json({ address, exists, network: process.env.STELLAR_NETWORK || "testnet" });
  } catch (err) {
    next(err);
  }
});

router.post("/friendbot", async (req, res, next) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: "address required" });

    if (await accountExists(address)) {
      return res.json({ funded: true, alreadyExists: true, address });
    }

    const result = await fundWithFriendbot(address);
    res.json({ ...result, address });
  } catch (err) {
    next(err);
  }
});

router.get("/passport/:address", async (req, res) => {
  const builder = req.params.address;

  // Prefer live Soroban passport
  try {
    const onChain = await readPassport(builder);
    if (onChain) {
      // Enrich with recent payment events
      let recent_payments = [];
      let verification_history = [];
      try {
        const payments = await query(
          `SELECT * FROM chain_events
           WHERE event_name = 'PaymentReleased'
             AND (payload->>'builder' = $1 OR payload::text ILIKE $2)
           ORDER BY indexed_at DESC LIMIT 10`,
          [builder, `%${builder.slice(0, 8)}%`]
        );
        recent_payments = payments.rows;
        const verifs = await query(
          `SELECT * FROM chain_events
           WHERE event_name IN ('AiVerificationAdded', 'VerificationStored', 'MilestoneApproved')
           ORDER BY indexed_at DESC LIMIT 10`
        );
        verification_history = verifs.rows;
      } catch {
        // ignore enrichment failures
      }

      return res.json({
        ...onChain,
        recent_payments,
        verification_history,
      });
    }
  } catch (err) {
    console.warn("on-chain passport read failed:", err.message);
  }

  // Fallback: DB aggregates
  let completed_milestones = 0;
  let completed_grants = 0;
  let total_funds_received = 0;

  try {
    const grants = await query(
      `SELECT COUNT(*)::int AS c FROM grants WHERE builder_address = $1 AND status IN ('completed', 'funded', 'active')`,
      [builder]
    );
    completed_grants = grants.rows[0]?.c || 0;

    const miles = await query(
      `SELECT COUNT(*)::int AS c, COALESCE(SUM(m.amount_stroops),0)::bigint AS funds
       FROM milestones m
       JOIN grants g ON g.id = m.grant_id
       WHERE g.builder_address = $1 AND m.status IN ('paid', 'approved')`,
      [builder]
    );
    completed_milestones = miles.rows[0]?.c || 0;
    total_funds_received = Number(miles.rows[0]?.funds || 0);
  } catch (err) {
    console.warn("passport db lookup failed:", err?.message || err);
  }

  const reputation_score = Math.min(
    1000,
    completed_milestones * 25 + completed_grants * 50
  );

  res.json({
    builder,
    reputation_score,
    completed_milestones,
    completed_grants,
    total_funds_received,
    badges: completed_milestones > 0 ? 1 : 0,
    verification_count: completed_milestones,
    recent_payments: [],
    verification_history: [],
    source: "api",
  });
});

router.post("/x402/pay", async (req, res, next) => {
  try {
    const { txHash, amount, payerAddress, reportType } = req.body;
    if (!txHash) {
      return res.status(400).json({ error: "txHash required for payment proof" });
    }

    // Soft verify: accept any non-empty hash when x402 is enabled for demo.
    // If Horizon verification is desired later, check payment op here.
    const existing = await query(
      `SELECT * FROM x402_receipts WHERE tx_hash = $1`,
      [txHash]
    );
    if (existing.rows[0]) {
      return res.json({
        verified: true,
        amount: existing.rows[0].amount_stroops,
        receipt: txHash,
        alreadyRecorded: true,
      });
    }

    await query(
      `INSERT INTO x402_receipts (tx_hash, payer_address, amount_stroops, report_type, verified)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [txHash, payerAddress || null, amount || process.env.X402_PRICE_STROOPS || 1000000, reportType || null]
    );

    res.json({
      verified: true,
      amount,
      receipt: txHash,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
