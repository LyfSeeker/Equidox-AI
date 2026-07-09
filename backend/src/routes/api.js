import { Router } from "express";
import { listEvents } from "../services/indexer.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "equidox-backend",
    network: process.env.STELLAR_NETWORK || "testnet",
    contracts: {
      grantManager: process.env.GRANT_MANAGER_CONTRACT_ID || null,
      builderPassport: process.env.BUILDER_PASSPORT_CONTRACT_ID || null,
    },
  });
});

router.get("/events", async (req, res, next) => {
  try {
    const events = await listEvents({
      limit: parseInt(req.query.limit || "50", 10),
      eventName: req.query.eventName,
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

router.post("/x402/pay", (req, res) => {
  // Placeholder x402 payment verification — integrate with x402 provider in production
  const { txHash, amount } = req.body;
  if (!txHash) {
    return res.status(400).json({ error: "txHash required for payment proof" });
  }
  res.json({
    verified: true,
    amount,
    receipt: `x402-${txHash}`,
  });
});

export default router;
