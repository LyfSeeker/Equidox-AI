import { Router } from "express";
import { query } from "../db/client.js";
import { analyzeMilestone, analyzePremium } from "../services/ai.js";
import { uploadJsonToIpfs } from "../services/ipfs.js";
import {
  buildContractInvoke,
  addressToScVal,
  u64ToScVal,
  bytesN32ToScVal,
} from "../services/stellar.js";
import { indexEvent } from "../services/indexer.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { grantId, title, amountStroops, onChainMilestoneId } = req.body;
    const result = await query(
      `INSERT INTO milestones (grant_id, title, amount_stroops, on_chain_milestone_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [grantId, title, amountStroops, onChainMilestoneId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/grant/:grantId", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM milestones WHERE grant_id = $1 ORDER BY on_chain_milestone_id`,
      [req.params.grantId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/submit", async (req, res, next) => {
  try {
    const {
      milestoneId,
      repoUrl,
      demoUrl,
      docsUrl,
      builderAddress,
      onChainGrantId,
      onChainMilestoneId,
    } = req.body;

    const milestone = await query(`SELECT * FROM milestones WHERE id = $1`, [milestoneId]);
    const m = milestone.rows[0];
    if (!m) return res.status(404).json({ error: "Milestone not found" });

    const evidence = { repoUrl, demoUrl, docsUrl, submittedAt: new Date().toISOString() };
    const uploaded = await uploadJsonToIpfs(evidence);

    const tx = await buildContractInvoke({
      sourcePublicKey: builderAddress,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "submit_milestone",
      args: [
        addressToScVal(builderAddress),
        u64ToScVal(onChainGrantId),
        u64ToScVal(onChainMilestoneId),
        bytesN32ToScVal(uploaded.hashBytes),
      ],
    });

    await query(
      `UPDATE milestones SET status = 'submitted', evidence_hash = $1 WHERE id = $2`,
      [uploaded.hashBytes, milestoneId]
    );

    res.json({
      evidenceHash: uploaded.hashBytes,
      ipfsCid: uploaded.ipfsCid,
      unsignedTransaction: tx,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const {
      milestoneId,
      repoUrl,
      demoUrl,
      docsUrl,
      operatorAddress,
      onChainGrantId,
      onChainMilestoneId,
    } = req.body;

    const milestone = await query(`SELECT * FROM milestones WHERE id = $1`, [milestoneId]);
    const m = milestone.rows[0];
    if (!m) return res.status(404).json({ error: "Milestone not found" });

    const analysis = await analyzeMilestone({
      repoUrl,
      demoUrl,
      docsUrl,
      milestoneTitle: m.title,
    });

    const uploaded = await uploadJsonToIpfs(analysis);

    await query(
      `INSERT INTO ai_reports
        (milestone_id, completion_score, confidence_score, risk_score, summary, recommended_action, report_json, ipfs_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        milestoneId,
        analysis.completion_score,
        analysis.confidence_score,
        analysis.risk_score,
        analysis.summary,
        analysis.recommended_action,
        JSON.stringify(analysis),
        uploaded.hashBytes,
      ]
    );

    const tx = await buildContractInvoke({
      sourcePublicKey: operatorAddress,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "store_verification_hash",
      args: [
        addressToScVal(operatorAddress),
        u64ToScVal(onChainGrantId),
        u64ToScVal(onChainMilestoneId),
        bytesN32ToScVal(uploaded.hashBytes),
      ],
    });

    await query(
      `UPDATE milestones SET status = 'under_review', verification_hash = $1 WHERE id = $2`,
      [uploaded.hashBytes, milestoneId]
    );

    res.json({
      analysis,
      verificationHash: uploaded.hashBytes,
      unsignedTransaction: tx,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/approve/build", async (req, res, next) => {
  try {
    const { reviewerAddress, onChainGrantId, onChainMilestoneId } = req.body;
    const approveTx = await buildContractInvoke({
      sourcePublicKey: reviewerAddress,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "approve_milestone",
      args: [
        addressToScVal(reviewerAddress),
        u64ToScVal(onChainGrantId),
        u64ToScVal(onChainMilestoneId),
      ],
    });
    const releaseTx = await buildContractInvoke({
      sourcePublicKey: reviewerAddress,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "release_funds",
      args: [
        addressToScVal(reviewerAddress),
        u64ToScVal(onChainGrantId),
        u64ToScVal(onChainMilestoneId),
      ],
    });
    res.json({ approveTransaction: approveTx, releaseTransaction: releaseTx });
  } catch (err) {
    next(err);
  }
});

router.post("/premium", async (req, res, next) => {
  try {
    if (process.env.X402_ENABLED === "true") {
      const price = process.env.X402_PRICE_STROOPS || "1000000";
      res.status(402).json({
        error: "Payment Required",
        x402: {
          price: price,
          asset: "XLM",
          description: "Premium AI deep analysis report",
          paymentUrl: `/api/x402/pay?amount=${price}`,
        },
      });
      return;
    }

    const { repoUrl, reportType } = req.body;
    const analysis = await analyzePremium({ repoUrl, reportType });
    const uploaded = await uploadJsonToIpfs({ ...analysis, premium: true });

    res.json({
      analysis,
      ipfsHash: uploaded.hashBytes,
      gatewayUrl: uploaded.gatewayUrl,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/events", async (req, res, next) => {
  try {
    const { eventName, payload, txHash } = req.body;
    await indexEvent(eventName, payload, txHash);
    res.json({ indexed: true });
  } catch (err) {
    next(err);
  }
});

export default router;
