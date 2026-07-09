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
} from "../services/stellar.js";
import { indexEvent } from "../services/indexer.js";

const router = Router();

router.post("/metadata", async (req, res, next) => {
  try {
    const { title, description, terms } = req.body;
    const uploaded = await uploadJsonToIpfs({ title, description, terms });
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
    } = req.body;

    const result = await query(
      `INSERT INTO grants
        (provider_address, builder_address, reviewer_address, title, description, total_budget_stroops, metadata_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        providerAddress,
        builderAddress,
        reviewerAddress,
        title,
        description,
        totalBudgetStroops,
        metadataHash,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM grants ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM grants WHERE id = $1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Grant not found" });
    res.json(result.rows[0]);
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
    const { sourcePublicKey, providerAddress, grantId, amountStroops } = req.body;
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

router.post("/events", async (req, res, next) => {
  try {
    const { eventName, payload, txHash } = req.body;
    await indexEvent(eventName, payload, txHash);
    res.json({ indexed: true });
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
