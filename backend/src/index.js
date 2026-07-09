import "dotenv/config";
import express from "express";
import cors from "cors";
import grantsRouter from "./routes/grants.js";
import milestonesRouter from "./routes/milestones.js";
import apiRouter from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);
app.use("/api/grants", grantsRouter);
app.use("/api/milestones", milestonesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Equidox backend running on http://localhost:${PORT}`);
  console.log(`Network: ${process.env.STELLAR_NETWORK || "testnet"}`);
});
