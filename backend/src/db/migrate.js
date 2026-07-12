import { query } from "./client.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS grants (
  id SERIAL PRIMARY KEY,
  on_chain_grant_id BIGINT,
  provider_address TEXT NOT NULL,
  builder_address TEXT NOT NULL,
  reviewer_address TEXT NOT NULL,
  title TEXT,
  description TEXT,
  total_budget_stroops BIGINT,
  escrowed_stroops BIGINT DEFAULT 0,
  released_stroops BIGINT DEFAULT 0,
  metadata_hash TEXT,
  status TEXT DEFAULT 'active',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  grant_id INTEGER REFERENCES grants(id),
  on_chain_milestone_id INTEGER,
  title TEXT,
  description TEXT,
  amount_stroops BIGINT,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  evidence_hash TEXT,
  verification_hash TEXT,
  submit_tx_hash TEXT,
  verify_tx_hash TEXT,
  approve_tx_hash TEXT,
  release_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_reports (
  id SERIAL PRIMARY KEY,
  milestone_id INTEGER REFERENCES milestones(id),
  completion_score NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  risk_score NUMERIC(5,2),
  summary TEXT,
  recommended_action TEXT,
  report_json JSONB,
  ipfs_hash TEXT,
  premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chain_events (
  id SERIAL PRIMARY KEY,
  contract_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  payload JSONB,
  tx_hash TEXT,
  ledger_sequence BIGINT,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS indexer_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS x402_receipts (
  id SERIAL PRIMARY KEY,
  tx_hash TEXT UNIQUE NOT NULL,
  payer_address TEXT,
  amount_stroops BIGINT,
  report_type TEXT,
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grants_on_chain ON grants(on_chain_grant_id);
CREATE INDEX IF NOT EXISTS idx_milestones_grant ON milestones(grant_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON chain_events(event_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_dedupe
  ON chain_events (tx_hash, event_name)
  WHERE tx_hash IS NOT NULL;
`;

const ALTERS = [
  `ALTER TABLE grants ADD COLUMN IF NOT EXISTS escrowed_stroops BIGINT DEFAULT 0`,
  `ALTER TABLE grants ADD COLUMN IF NOT EXISTS released_stroops BIGINT DEFAULT 0`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS submit_tx_hash TEXT`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS verify_tx_hash TEXT`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS approve_tx_hash TEXT`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS release_tx_hash TEXT`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS evidence_json JSONB`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS evidence_ipfs_cid TEXT`,
];

export async function migrate() {
  await query(SCHEMA);
  for (const sql of ALTERS) {
    try {
      await query(sql);
    } catch (err) {
      console.warn("migrate alter skipped:", err.message);
    }
  }
  console.log("Database migration complete");
}

const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMain || process.argv[1]?.endsWith("migrate.js")) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
