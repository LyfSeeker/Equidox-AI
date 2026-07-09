use soroban_sdk::{contractevent, Address, BytesN};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GrantCreated {
    pub grant_id: u64,
    pub provider: Address,
    pub builder: Address,
    pub reviewer: Address,
    pub total_budget: i128,
    pub metadata_hash: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FundsDeposited {
    pub grant_id: u64,
    pub provider: Address,
    pub amount: i128,
    pub new_escrow_balance: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneSubmitted {
    pub grant_id: u64,
    pub milestone_id: u32,
    pub builder: Address,
    pub evidence_hash: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AiVerificationAdded {
    pub grant_id: u64,
    pub milestone_id: u32,
    pub verification_hash: BytesN<32>,
    pub operator: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneApproved {
    pub grant_id: u64,
    pub milestone_id: u32,
    pub reviewer: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneRejected {
    pub grant_id: u64,
    pub milestone_id: u32,
    pub reviewer: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentReleased {
    pub grant_id: u64,
    pub milestone_id: u32,
    pub builder: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReputationUpdated {
    pub builder: Address,
    pub new_score: u32,
    pub completed_milestones: u32,
    pub total_funds_received: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GrantCancelled {
    pub grant_id: u64,
    pub provider: Address,
    pub refund_amount: i128,
}
