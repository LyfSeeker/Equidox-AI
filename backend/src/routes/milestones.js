import { Router } from "express";
import { query } from "../db/client.js";
import { analyzeMilestone, analyzePremium, PREMIUM_TYPES } from "../services/ai.js";
import { uploadJsonToIpfs } from "../services/ipfs.js";
import {
  buildContractInvoke,
  addressToScVal,
  u64ToScVal,
  u32ToScVal,
  i128ToScVal,
  bytesN32ToScVal,
  readMilestone,
} from "../services/stellar.js";
import { indexEvent } from "../services/indexer.js";

const router = Router();

const ZERO_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

async function syncMilestoneFromChain(dbMilestone, onChainGrantId, onChainMilestoneId) {
  let grantId = onChainGrantId;
  let mid =
    onChainMilestoneId != null
      ? onChainMilestoneId
      : dbMilestone.on_chain_milestone_id;

  if (grantId == null && dbMilestone.grant_id) {
    const g = await query(
      `SELECT on_chain_grant_id FROM grants WHERE id = $1`,
      [dbMilestone.grant_id]
    );
    grantId = g.rows[0]?.on_chain_grant_id;
  }

  if (grantId == null || mid == null) {
    return { db: dbMilestone, chain: null, synced: false };
  }

  const chain = await readMilestone(grantId, mid);
  if (!chain) return { db: dbMilestone, chain: null, synced: false };

  const verificationHash =
    chain.verification_hash && chain.verification_hash !== ZERO_HASH
      ? chain.verification_hash
      : null;

  const result = await query(
    `UPDATE milestones SET
       status = $1,
       evidence_hash = COALESCE($2, evidence_hash),
       verification_hash = COALESCE($3, verification_hash)
     WHERE id = $4
     RETURNING *`,
    [
      chain.status,
      chain.evidence_hash && chain.evidence_hash !== ZERO_HASH
        ? chain.evidence_hash
        : null,
      verificationHash,
      dbMilestone.id,
    ]
  );

  return {
    db: result.rows[0] || dbMilestone,
    chain,
    synced: true,
  };
}

router.post("/build/add", async (req, res, next) => {
  try {
    const { sourcePublicKey, providerAddress, onChainGrantId, amountStroops } =
      req.body;
    if (onChainGrantId == null) {
      return res.status(400).json({ error: "onChainGrantId is required" });
    }
    const tx = await buildContractInvoke({
      sourcePublicKey,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "add_milestone",
      args: [
        addressToScVal(providerAddress),
        u64ToScVal(onChainGrantId),
        i128ToScVal(amountStroops),
      ],
    });
    res.json(tx);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const {
      grantId,
      title,
      description,
      amountStroops,
      onChainMilestoneId,
      deadline,
      status,
      txHash,
    } = req.body;
    const result = await query(
      `INSERT INTO milestones
        (grant_id, title, description, amount_stroops, on_chain_milestone_id, deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        grantId,
        title,
        description || null,
        amountStroops,
        onChainMilestoneId ?? null,
        deadline || null,
        status || "pending",
      ]
    );

    if (onChainMilestoneId != null && txHash) {
      const g = await query(`SELECT on_chain_grant_id FROM grants WHERE id = $1`, [
        grantId,
      ]);
      await indexEvent(
        "MilestoneAdded",
        {
          grant_id: g.rows[0]?.on_chain_grant_id,
          milestone_id: onChainMilestoneId,
          amount: amountStroops,
          title,
        },
        txHash
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const {
      onChainMilestoneId,
      status,
      evidenceHash,
      verificationHash,
      submitTxHash,
      verifyTxHash,
      approveTxHash,
      releaseTxHash,
      evidenceJson,
      evidenceIpfsCid,
    } = req.body;

    const result = await query(
      `UPDATE milestones SET
         on_chain_milestone_id = COALESCE($1, on_chain_milestone_id),
         status = COALESCE($2, status),
         evidence_hash = COALESCE($3, evidence_hash),
         verification_hash = COALESCE($4, verification_hash),
         submit_tx_hash = COALESCE($5, submit_tx_hash),
         verify_tx_hash = COALESCE($6, verify_tx_hash),
         approve_tx_hash = COALESCE($7, approve_tx_hash),
         release_tx_hash = COALESCE($8, release_tx_hash),
         evidence_json = COALESCE($9::jsonb, evidence_json),
         evidence_ipfs_cid = COALESCE($10, evidence_ipfs_cid)
       WHERE id = $11
       RETURNING *`,
      [
        onChainMilestoneId ?? null,
        status ?? null,
        evidenceHash ?? null,
        verificationHash ?? null,
        submitTxHash ?? null,
        verifyTxHash ?? null,
        approveTxHash ?? null,
        releaseTxHash ?? null,
        evidenceJson ? JSON.stringify(evidenceJson) : null,
        evidenceIpfsCid ?? null,
        req.params.id,
      ]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/submitted", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT m.*,
              g.title AS grant_title,
              g.builder_address,
              g.id AS grant_db_id
       FROM milestones m
       JOIN grants g ON g.id = m.grant_id
       WHERE m.status IN ('submitted', 'under_review')
          OR m.evidence_json IS NOT NULL
       ORDER BY COALESCE((m.evidence_json->>'submittedAt')::timestamptz, m.created_at) DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/grant/:grantId", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.*,
        (SELECT row_to_json(r) FROM (
           SELECT completion_score, confidence_score, risk_score, summary,
                  recommended_action, report_json, ipfs_hash, premium, created_at
           FROM ai_reports WHERE milestone_id = m.id
           ORDER BY created_at DESC LIMIT 1
         ) r) AS latest_report
       FROM milestones m
       WHERE m.grant_id = $1
       ORDER BY COALESCE(m.on_chain_milestone_id, m.id)`,
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
      notes,
      commitSha,
      builderAddress,
      onChainGrantId,
      onChainMilestoneId,
    } = req.body;

    const milestone = await query(`SELECT * FROM milestones WHERE id = $1`, [
      milestoneId,
    ]);
    const m = milestone.rows[0];
    if (!m) return res.status(404).json({ error: "Milestone not found" });

    const evidence = {
      repoUrl,
      demoUrl,
      docsUrl,
      notes: notes || null,
      commitSha: commitSha || null,
      milestoneTitle: m.title,
      submittedAt: new Date().toISOString(),
    };
    const uploaded = await uploadJsonToIpfs(evidence);

    const tx = await buildContractInvoke({
      sourcePublicKey: builderAddress,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "submit_milestone",
      args: [
        addressToScVal(builderAddress),
        u64ToScVal(onChainGrantId),
        u32ToScVal(onChainMilestoneId),
        bytesN32ToScVal(uploaded.hashBytes),
      ],
    });

    await query(
      `UPDATE milestones SET
         status = 'submitted',
         evidence_hash = $1,
         evidence_json = $2::jsonb,
         evidence_ipfs_cid = $3
       WHERE id = $4`,
      [
        uploaded.hashBytes,
        JSON.stringify(evidence),
        uploaded.ipfsCid || null,
        milestoneId,
      ]
    );

    res.json({
      evidenceHash: uploaded.hashBytes,
      ipfsCid: uploaded.ipfsCid,
      evidence,
      unsignedTransaction: tx,
    });
  } catch (err) {
    next(err);
  }
});

/** Rebuild submit_milestone using already-stored evidence hash (heal pending chain). */
router.post("/resubmit/build", async (req, res, next) => {
  try {
    const {
      milestoneId,
      builderAddress,
      onChainGrantId,
      onChainMilestoneId,
    } = req.body;

    const milestone = await query(`SELECT * FROM milestones WHERE id = $1`, [
      milestoneId,
    ]);
    const m = milestone.rows[0];
    if (!m) return res.status(404).json({ error: "Milestone not found" });
    if (!m.evidence_hash) {
      return res.status(400).json({
        error: "No stored evidence hash — user must submit evidence first",
      });
    }

    const tx = await buildContractInvoke({
      sourcePublicKey: builderAddress,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "submit_milestone",
      args: [
        addressToScVal(builderAddress),
        u64ToScVal(onChainGrantId),
        u32ToScVal(onChainMilestoneId),
        bytesN32ToScVal(m.evidence_hash),
      ],
    });

    res.json({
      evidenceHash: m.evidence_hash,
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

    const milestone = await query(`SELECT * FROM milestones WHERE id = $1`, [
      milestoneId,
    ]);
    let m = milestone.rows[0];
    if (!m) return res.status(404).json({ error: "Milestone not found" });

    // Heal DB ↔ chain drift before deciding whether to re-anchor.
    const synced = await syncMilestoneFromChain(
      m,
      onChainGrantId,
      onChainMilestoneId
    );
    m = synced.db;

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

    const chainStatus = synced.chain?.status || m.status;
    const alreadyAnchored = ["under_review", "approved", "paid"].includes(
      chainStatus
    );

    if (alreadyAnchored) {
      return res.json({
        analysis,
        verificationHash:
          m.verification_hash ||
          synced.chain?.verification_hash ||
          uploaded.hashBytes,
        unsignedTransaction: null,
        alreadyAnchored: true,
        chainStatus,
      });
    }

    if (chainStatus !== "submitted" && m.status !== "submitted") {
      return res.status(400).json({
        error: `Milestone status must be submitted before first analyze (current: ${chainStatus})`,
      });
    }

    const tx = await buildContractInvoke({
      sourcePublicKey: operatorAddress,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "store_verification_hash",
      args: [
        addressToScVal(operatorAddress),
        u64ToScVal(onChainGrantId),
        u32ToScVal(onChainMilestoneId),
        bytesN32ToScVal(uploaded.hashBytes),
      ],
    });

    res.json({
      analysis,
      verificationHash: uploaded.hashBytes,
      unsignedTransaction: tx,
      alreadyAnchored: false,
      chainStatus,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/sync", async (req, res, next) => {
  try {
    const { milestoneId, onChainGrantId, onChainMilestoneId } = req.body;
    const milestone = await query(`SELECT * FROM milestones WHERE id = $1`, [
      milestoneId,
    ]);
    const m = milestone.rows[0];
    if (!m) return res.status(404).json({ error: "Milestone not found" });

    const synced = await syncMilestoneFromChain(
      m,
      onChainGrantId ?? undefined,
      onChainMilestoneId ?? undefined
    );

    // Also attach grant on_chain id from grants table if needed
    if (!synced.chain && m.grant_id) {
      const g = await query(`SELECT on_chain_grant_id FROM grants WHERE id = $1`, [
        m.grant_id,
      ]);
      const gid = g.rows[0]?.on_chain_grant_id;
      if (gid != null && m.on_chain_milestone_id != null) {
        const again = await syncMilestoneFromChain(m, gid, m.on_chain_milestone_id);
        return res.json({
          milestone: again.db,
          chain: again.chain,
          synced: again.synced,
        });
      }
    }

    res.json({
      milestone: synced.db,
      chain: synced.chain,
      synced: synced.synced,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/approve/build", async (req, res, next) => {
  try {
    const { reviewerAddress, onChainGrantId, onChainMilestoneId, step } =
      req.body;
    const which = step === "release" ? "release" : "approve";

    if (which === "approve") {
      const approveTransaction = await buildContractInvoke({
        sourcePublicKey: reviewerAddress,
        contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
        method: "approve_milestone",
        args: [
          addressToScVal(reviewerAddress),
          u64ToScVal(onChainGrantId),
          u32ToScVal(onChainMilestoneId),
        ],
      });
      return res.json({ step: "approve", transaction: approveTransaction });
    }

    const releaseTransaction = await buildContractInvoke({
      sourcePublicKey: reviewerAddress,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "release_funds",
      args: [
        addressToScVal(reviewerAddress),
        u64ToScVal(onChainGrantId),
        u32ToScVal(onChainMilestoneId),
      ],
    });
    res.json({ step: "release", transaction: releaseTransaction });
  } catch (err) {
    next(err);
  }
});

router.post("/premium", async (req, res, next) => {
  try {
    const { repoUrl, reportType, demoUrl, docsUrl, paymentReceipt } = req.body;

    if (process.env.X402_ENABLED === "true") {
      if (!paymentReceipt) {
        const price = process.env.X402_PRICE_STROOPS || "1000000";
        return res.status(402).json({
          error: "Payment Required",
          x402: {
            enabled: true,
            price,
            asset: "XLM",
            description: "Premium AI deep analysis report",
            reportTypes: PREMIUM_TYPES,
            paymentUrl: `/api/x402/pay`,
          },
        });
      }

      const receipt = await query(
        `SELECT * FROM x402_receipts WHERE tx_hash = $1`,
        [paymentReceipt]
      );
      if (!receipt.rows[0]) {
        return res.status(402).json({
          error: "Invalid or missing x402 payment receipt",
          x402: { enabled: true },
        });
      }
    }

    const analysis = await analyzePremium({
      repoUrl,
      reportType,
      demoUrl,
      docsUrl,
    });
    const uploaded = await uploadJsonToIpfs({ ...analysis, premium: true });

    res.json({
      analysis,
      ipfsHash: uploaded.hashBytes,
      gatewayUrl: uploaded.gatewayUrl,
      premium: true,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/events", async (req, res, next) => {
  try {
    const { eventName, payload, txHash } = req.body;
    const result = await indexEvent(eventName, payload, txHash);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
