import { API_URL } from "./config";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    const err = data as {
      error?: string;
      code?: string;
      x402?: unknown;
      hint?: string;
    } | null;
    const error = new Error(err?.error || `Request failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
      x402?: unknown;
      hint?: string;
    };
    error.status = res.status;
    error.code = err?.code;
    error.x402 = err?.x402;
    error.hint = err?.hint;
    throw error;
  }

  return data as T;
}

export type Grant = {
  id: number;
  on_chain_grant_id: number | null;
  provider_address: string;
  builder_address: string;
  reviewer_address: string;
  title: string | null;
  description: string | null;
  total_budget_stroops: number | null;
  escrowed_stroops?: number | null;
  released_stroops?: number | null;
  live_escrow_stroops?: number | null;
  metadata_hash: string | null;
  status: string;
  tx_hash: string | null;
  created_at: string;
  on_chain?: {
    escrowed_balance?: number;
    released_total?: number;
    milestone_count?: number;
  } | null;
};

export type MilestoneEvidence = {
  repoUrl?: string;
  demoUrl?: string;
  docsUrl?: string;
  notes?: string | null;
  commitSha?: string | null;
  milestoneTitle?: string;
  submittedAt?: string;
};

export type Milestone = {
  id: number;
  grant_id: number;
  on_chain_milestone_id: number | null;
  title: string | null;
  description?: string | null;
  amount_stroops: number | null;
  deadline?: string | null;
  status: string;
  evidence_hash: string | null;
  evidence_json?: MilestoneEvidence | null;
  evidence_ipfs_cid?: string | null;
  verification_hash: string | null;
  submit_tx_hash?: string | null;
  verify_tx_hash?: string | null;
  approve_tx_hash?: string | null;
  release_tx_hash?: string | null;
  created_at: string;
  latest_report?: {
    completion_score: number;
    confidence_score: number;
    risk_score: number;
    summary: string;
    recommended_action: string;
    report_json?: Record<string, unknown>;
    ipfs_hash?: string | null;
    premium?: boolean | null;
    created_at?: string;
  } | null;
};

export type ChainEvent = {
  id: number;
  contract_id: string;
  event_name: string;
  payload: unknown;
  tx_hash: string | null;
  indexed_at: string;
};

export type Health = {
  status: string;
  service: string;
  network: string;
  contracts: {
    grantManager: string | null;
    builderPassport: string | null;
  };
};

export type UnsignedTx = {
  xdr: string;
  networkPassphrase: string;
};

export type Analysis = {
  completion_score: number;
  confidence_score: number;
  risk_score: number;
  code_quality_score?: number;
  security_score?: number;
  documentation_score?: number;
  deployment_score?: number;
  summary: string;
  recommended_action: string;
  findings?: string[];
  github?: Record<string, unknown>;
  source?: string;
  generated_at?: string;
};

export function analysisFromMilestoneReport(
  report: Milestone["latest_report"] | null | undefined
): Analysis | null {
  if (!report) return null;
  const json = (report.report_json || {}) as Record<string, unknown>;
  return {
    completion_score: Number(report.completion_score),
    confidence_score: Number(report.confidence_score),
    risk_score: Number(report.risk_score),
    summary: report.summary,
    recommended_action: report.recommended_action,
    findings: Array.isArray(json.findings)
      ? (json.findings as string[])
      : undefined,
    code_quality_score:
      typeof json.code_quality_score === "number"
        ? json.code_quality_score
        : undefined,
    security_score:
      typeof json.security_score === "number" ? json.security_score : undefined,
    documentation_score:
      typeof json.documentation_score === "number"
        ? json.documentation_score
        : undefined,
    deployment_score:
      typeof json.deployment_score === "number"
        ? json.deployment_score
        : undefined,
    source: typeof json.source === "string" ? json.source : undefined,
    generated_at:
      report.created_at ||
      (typeof json.generated_at === "string" ? json.generated_at : undefined),
    ...(json as Partial<Analysis>),
  };
}

export const api = {
  health: () => request<Health>("/api/health"),

  listGrants: () => request<Grant[]>("/api/grants"),

  getGrant: (id: string | number) => request<Grant>(`/api/grants/${id}`),

  createGrantRecord: (body: Record<string, unknown>) =>
    request<Grant>("/api/grants", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateGrant: (id: string | number, body: Record<string, unknown>) =>
    request<Grant>(`/api/grants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  uploadMetadata: (body: {
    title: string;
    description: string;
    terms?: string;
  }) =>
    request<{ metadataHash: string; ipfsCid: string | null }>(
      "/api/grants/metadata",
      { method: "POST", body: JSON.stringify(body) }
    ),

  buildCreateGrant: (body: Record<string, unknown>) =>
    request<UnsignedTx>("/api/grants/build/create", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  buildDeposit: (body: Record<string, unknown>) =>
    request<UnsignedTx>("/api/grants/build/deposit", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  buildCancelGrant: (body: Record<string, unknown>) =>
    request<UnsignedTx>("/api/grants/build/cancel", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  buildAddMilestone: (body: Record<string, unknown>) =>
    request<UnsignedTx>("/api/milestones/build/add", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  submitSignedTx: (signedXdr: string) =>
    request<{ hash: string; status: string; returnValue?: unknown }>(
      "/api/grants/submit",
      {
        method: "POST",
        body: JSON.stringify({ signedXdr }),
      }
    ),

  listEvents: (limit = 20) =>
    request<ChainEvent[]>(`/api/events?limit=${limit}`),

  listMilestones: (grantId: string | number) =>
    request<Milestone[]>(`/api/milestones/grant/${grantId}`),

  listSubmittedMilestones: () =>
    request<
      (Milestone & {
        grant_title?: string | null;
        builder_address?: string;
        grant_db_id?: number;
      })[]
    >("/api/milestones/submitted"),

  syncMilestone: (body: Record<string, unknown>) =>
    request<{
      milestone: Milestone;
      chain: { status: string; verification_hash?: string | null } | null;
      synced: boolean;
    }>("/api/milestones/sync", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  buildResubmitEvidence: (body: Record<string, unknown>) =>
    request<{
      evidenceHash: string;
      unsignedTransaction: UnsignedTx;
    }>("/api/milestones/resubmit/build", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createMilestone: (body: Record<string, unknown>) =>
    request<Milestone>("/api/milestones", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateMilestone: (id: string | number, body: Record<string, unknown>) =>
    request<Milestone>(`/api/milestones/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  submitMilestone: (body: Record<string, unknown>) =>
    request<{
      evidenceHash: string;
      ipfsCid?: string | null;
      evidence?: MilestoneEvidence;
      unsignedTransaction: UnsignedTx;
    }>("/api/milestones/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  verifyMilestone: (body: Record<string, unknown>) =>
    request<{
      analysis: Analysis;
      verificationHash: string;
      unsignedTransaction: UnsignedTx | null;
      alreadyAnchored?: boolean;
    }>("/api/milestones/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  buildApproveRelease: (body: Record<string, unknown>) =>
    request<{
      step: "approve" | "release";
      transaction: UnsignedTx;
    }>("/api/milestones/approve/build", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  premiumReport: (body: Record<string, unknown>) =>
    request<{
      analysis: Record<string, unknown>;
      ipfsHash: string;
      premium?: boolean;
      x402?: unknown;
    }>("/api/milestones/premium", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getPassport: (address: string) =>
    request<{
      builder: string;
      reputation_score: number;
      completed_milestones: number;
      completed_grants: number;
      total_funds_received: string | number;
      badges: number;
      verification_count: number;
      source: string;
      recent_payments?: ChainEvent[];
      verification_history?: ChainEvent[];
    }>(`/api/passport/${address}`),

  checkAccount: (address: string) =>
    request<{ address: string; exists: boolean }>(`/api/account/${address}`),

  fundFriendbot: (address: string) =>
    request<{ funded: boolean; alreadyExists?: boolean; hash?: string }>(
      "/api/friendbot",
      {
        method: "POST",
        body: JSON.stringify({ address }),
      }
    ),

  recordX402Payment: (body: Record<string, unknown>) =>
    request<{ verified: boolean; receipt: string }>("/api/x402/pay", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  indexEvent: (body: {
    eventName: string;
    payload: Record<string, unknown>;
    txHash: string;
  }) =>
    request<{ indexed: boolean }>("/api/grants/events", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
