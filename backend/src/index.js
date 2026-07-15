import "dotenv/config";
import express from "express";
import cors from "cors";
import grantsRouter from "./routes/grants.js";
import milestonesRouter from "./routes/milestones.js";
import apiRouter from "./routes/api.js";
import aiRouter from "./routes/ai.js";
import { startEventIndexer } from "./services/poller.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// JSON.stringify cannot serialize BigInt (Soroban u64/i128 return values).
app.set("json replacer", (_key, value) =>
  typeof value === "bigint" ? value.toString() : value
);

app.use("/api", apiRouter);
app.use("/api/grants", grantsRouter);
app.use("/api/milestones", milestonesRouter);
app.use("/api/ai", aiRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  const msg = err.message || "Internal server error";
  // Friendlier Freighter / Horizon account errors
  if (/Account not found/i.test(msg)) {
    return res.status(400).json({
      error: msg,
      code: "ACCOUNT_NOT_FOUND",
      hint: "Fund this Testnet account with Friendbot via POST /api/friendbot",
    });
  }
  res.status(500).json({
    error: msg,
    ...(err.code ? { code: err.code } : {}),
    ...(err.hint ? { hint: err.hint } : {}),
  });
});

app.listen(PORT, () => {
  console.log(`Equidox backend running on http://localhost:${PORT}`);
  console.log(`Network: ${process.env.STELLAR_NETWORK || "testnet"}`);
  startEventIndexer();
});
