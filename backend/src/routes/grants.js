import { Router } from "express";
import { query } from "../db/client.js";
import { uploadJsonToIpfs } from "../services/ipfs.js";
import {
  buildContractInvoke,
  addressToScVal,
  u64ToScVal,
  i128ToScVal,
  bytesN32ToScVal,
  submitTransaction,
  readGrant,
} from "../services/stellar.js";
import { indexEvent } from "../services/indexer.js";

const router = Router();

router.post("/metadata", async (req, res, next) => {
  try {
    const { title, description, terms, milestones } = req.body;
    const uploaded = await uploadJsonToIpfs({
      title,
      description,
      terms,
      milestones: Array.isArray(milestones) ? milestones : [],
    });
    res.json({
      metadataHash: uploaded.hashBytes,
      ipfsCid: uploaded.ipfsCid,
      gatewayUrl: uploaded.gatewayUrl,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const {
      providerAddress,
      builderAddress,
      reviewerAddress,
      title,
      description,
      totalBudgetStroops,
      metadataHash,
      onChainGrantId,
      txHash,
      status,
    } = req.body;

    if (onChainGrantId == null || onChainGrantId === "") {
      return res.status(400).json({
        error:
          "onChainGrantId is required — refuse to save grants that did not confirm on-chain",
      });
    }
    if (!txHash) {
      return res.status(400).json({
        error: "txHash is required for grant creation",
      });
    }

    const result = await query(
      `INSERT INTO grants
        (provider_address, builder_address, reviewer_address, title, description,
         total_budget_stroops, metadata_hash, on_chain_grant_id, tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        providerAddress,
        builderAddress,
        reviewerAddress,
        title,
        description,
        totalBudgetStroops,
        metadataHash,
        onChainGrantId,
        txHash,
        status || "active",
      ]
    );

    await indexEvent(
      "GrantCreated",
      {
        grant_id: onChainGrantId,
        provider: providerAddress,
        builder: builderAddress,
        reviewer: reviewerAddress,
        total_budget: totalBudgetStroops,
      },
      txHash
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const {
      onChainGrantId,
      txHash,
      status,
      escrowedStroops,
      releasedStroops,
      totalBudgetStroops,
    } = req.body;

    const result = await query(
      `UPDATE grants SET
         on_chain_grant_id = COALESCE($1, on_chain_grant_id),
         tx_hash = COALESCE($2, tx_hash),
         status = COALESCE($3, status),
         escrowed_stroops = COALESCE($4, escrowed_stroops),
         released_stroops = COALESCE($5, released_stroops),
         total_budget_stroops = COALESCE($6, total_budget_stroops)
       WHERE id = $7
       RETURNING *`,
      [
        onChainGrantId ?? null,
        txHash ?? null,
        status ?? null,
        escrowedStroops ?? null,
        releasedStroops ?? null,
        totalBudgetStroops ?? null,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Grant not found" });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const includeFailed = String(req.query.includeFailed || "") === "1";
    const includeIncomplete =
      String(req.query.includeIncomplete || "") === "1";
    let sql = `SELECT * FROM grants WHERE status IS DISTINCT FROM 'failed'`;
    if (!includeIncomplete) {
      sql += ` AND on_chain_grant_id IS NOT NULL`;
    }
    if (includeFailed) {
      sql = `SELECT * FROM grants WHERE 1=1`;
    }
    sql += ` ORDER BY created_at DESC`;
    const result = await query(sql);
    res.json(result.rows);
  } catch (err) {
    console.warn("list grants failed:", err.message);
    res.json([]);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM grants WHERE id = $1`, [
      req.params.id,
    ]);
    if (!result.rows[0]) return res.status(404).json({ error: "Grant not found" });

    const grant = result.rows[0];
    const skipLive =
      req.query.live === "0" ||
      req.query.live === "false" ||
      process.env.GRANT_DETAIL_SKIP_LIVE === "true";

    let onChain = null;
    if (!skipLive && grant.on_chain_grant_id != null) {
      onChain = await readGrant(grant.on_chain_grant_id);
      if (onChain) {
        // Fire-and-forget DB refresh — don't block the response
        query(
          `UPDATE grants SET
             escrowed_stroops = $1,
             released_stroops = $2
           WHERE id = $3`,
          [onChain.escrowed_balance, onChain.released_total, grant.id]
        ).catch(() => {});
        grant.escrowed_stroops = onChain.escrowed_balance;
        grant.released_stroops = onChain.released_total;
      }
    }

    res.json({
      ...grant,
      on_chain: onChain,
      live_escrow_stroops:
        onChain?.escrowed_balance ?? grant.escrowed_stroops ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/build/create", async (req, res, next) => {
  try {
    const {
      sourcePublicKey,
      providerAddress,
      builderAddress,
      reviewerAddress,
      totalBudgetStroops,
      metadataHash,
    } = req.body;

    const tx = await buildContractInvoke({
      sourcePublicKey,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "create_grant",
      args: [
        addressToScVal(providerAddress),
        addressToScVal(builderAddress),
        addressToScVal(reviewerAddress),
        i128ToScVal(totalBudgetStroops),
        bytesN32ToScVal(metadataHash),
      ],
    });

    res.json(tx);
  } catch (err) {
    next(err);
  }
});

router.post("/build/deposit", async (req, res, next) => {
  try {
    const { sourcePublicKey, providerAddress, grantId, amountStroops } =
      req.body;
    const tx = await buildContractInvoke({
      sourcePublicKey,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "deposit_funds",
      args: [
        addressToScVal(providerAddress),
        u64ToScVal(grantId),
        i128ToScVal(amountStroops),
      ],
    });
    res.json(tx);
  } catch (err) {
    next(err);
  }
});

router.post("/build/cancel", async (req, res, next) => {
  try {
    const { sourcePublicKey, providerAddress, grantId } = req.body;
    if (grantId == null) {
      return res.status(400).json({ error: "grantId (on-chain) is required" });
    }
    const tx = await buildContractInvoke({
      sourcePublicKey,
      contractId: process.env.GRANT_MANAGER_CONTRACT_ID,
      method: "cancel_grant",
      args: [addressToScVal(providerAddress), u64ToScVal(grantId)],
    });
    res.json(tx);
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

router.post("/submit", async (req, res, next) => {
  try {
    const { signedXdr } = req.body;
    const result = await submitTransaction(signedXdr);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
