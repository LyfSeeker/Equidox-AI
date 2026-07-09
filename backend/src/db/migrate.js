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
  amount_stroops BIGINT,
  status TEXT DEFAULT 'pending',
  evidence_hash TEXT,
  verification_hash TEXT,
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

CREATE INDEX IF NOT EXISTS idx_grants_on_chain ON grants(on_chain_grant_id);
CREATE INDEX IF NOT EXISTS idx_milestones_grant ON milestones(grant_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON chain_events(event_name);
`;

export async function migrate() {
  await query(SCHEMA);
  console.log("Database migration complete");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
