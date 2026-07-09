use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum GrantStatus {
    Active = 0,
    Completed = 1,
    Cancelled = 2,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum MilestoneStatus {
    Pending = 0,
    Submitted = 1,
    UnderReview = 2,
    Approved = 3,
    Rejected = 4,
    Paid = 5,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Role {
    Admin = 0,
    GrantProvider = 1,
    Builder = 2,
    Reviewer = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Grant {
    pub id: u64,
    pub provider: Address,
    pub builder: Address,
    pub reviewer: Address,
    pub total_budget: i128,
    pub escrowed_balance: i128,
    pub released_total: i128,
    pub status: GrantStatus,
    pub milestone_count: u32,
    pub metadata_hash: BytesN<32>,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub grant_id: u64,
    pub milestone_id: u32,
    pub amount: i128,
    pub status: MilestoneStatus,
    pub evidence_hash: BytesN<32>,
    pub verification_hash: BytesN<32>,
    pub submitted_at: u64,
    pub reviewed_at: u64,
    pub paid_at: u64,
    pub payment_tx_guard: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BuilderPassport {
    pub builder: Address,
    pub reputation_score: u32,
    pub completed_milestones: u32,
    pub completed_grants: u32,
    pub total_funds_received: i128,
    pub badges: u32,
    pub verification_count: u32,
    pub last_updated_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationRecord {
    pub grant_id: u64,
    pub milestone_id: u32,
    pub verification_hash: BytesN<32>,
    pub approved: bool,
    pub timestamp: u64,
}

pub const MAX_REPUTATION_SCORE: u32 = 1000;
pub const MAX_REPUTATION_DELTA: u32 = 100;

pub fn zero_hash(env: &soroban_sdk::Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}
