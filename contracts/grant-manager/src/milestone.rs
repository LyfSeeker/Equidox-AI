use crate::access::{get_passport_contract, require_initialized, require_not_paused, require_verification_operator};
use crate::escrow::{checked_add_i128, checked_sub_i128, transfer_out};
use crate::grant::{load_grant, load_milestone, save_grant, save_milestone};
use crate::passport_client::BuilderPassportContractClient;
use equidox_common::{
    AiVerificationAdded, ContractError, GrantStatus, MilestoneApproved, MilestoneRejected,
    MilestoneStatus, MilestoneSubmitted, PaymentReleased, zero_hash, MAX_REPUTATION_DELTA,
};
use soroban_sdk::{Address, BytesN, Env};

pub fn submit_milestone(
    env: &Env,
    builder: Address,
    grant_id: u64,
    milestone_id: u32,
    evidence_hash: BytesN<32>,
) -> Result<(), ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    builder.require_auth();

    let grant = load_grant(env, grant_id)?;
    if grant.builder != builder {
        return Err(ContractError::BuilderMismatch);
    }
    if grant.status != GrantStatus::Active {
        return Err(ContractError::GrantNotActive);
    }

    let mut milestone = load_milestone(env, grant_id, milestone_id)?;
    if milestone.status != MilestoneStatus::Pending
        && milestone.status != MilestoneStatus::Rejected
    {
        return Err(ContractError::InvalidStatusTransition);
    }

    milestone.status = MilestoneStatus::Submitted;
    milestone.evidence_hash = evidence_hash.clone();
    milestone.submitted_at = env.ledger().timestamp();
    milestone.verification_hash = zero_hash(env);
    save_milestone(env, &milestone);

    MilestoneSubmitted {
        grant_id,
        milestone_id,
        builder,
        evidence_hash,
    }
    .publish(env);

    Ok(())
}

pub fn store_verification_hash(
    env: &Env,
    operator: Address,
    grant_id: u64,
    milestone_id: u32,
    verification_hash: BytesN<32>,
) -> Result<(), ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    require_verification_operator(env, &operator)?;

    let grant = load_grant(env, grant_id)?;
    if grant.status != GrantStatus::Active {
        return Err(ContractError::GrantNotActive);
    }

    let mut milestone = load_milestone(env, grant_id, milestone_id)?;
    if milestone.status != MilestoneStatus::Submitted {
        return Err(ContractError::InvalidStatusTransition);
    }

    milestone.status = MilestoneStatus::UnderReview;
    milestone.verification_hash = verification_hash.clone();
    save_milestone(env, &milestone);

    AiVerificationAdded {
        grant_id,
        milestone_id,
        verification_hash,
        operator,
    }
    .publish(env);

    Ok(())
}

pub fn approve_milestone(
    env: &Env,
    reviewer: Address,
    grant_id: u64,
    milestone_id: u32,
) -> Result<(), ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    reviewer.require_auth();

    let grant = load_grant(env, grant_id)?;
    if grant.reviewer != reviewer {
        return Err(ContractError::ReviewerMismatch);
    }
    if grant.status != GrantStatus::Active {
        return Err(ContractError::GrantNotActive);
    }

    let mut milestone = load_milestone(env, grant_id, milestone_id)?;
    if milestone.status != MilestoneStatus::UnderReview {
        return Err(ContractError::InvalidStatusTransition);
    }

    milestone.status = MilestoneStatus::Approved;
    milestone.reviewed_at = env.ledger().timestamp();
    save_milestone(env, &milestone);

    MilestoneApproved {
        grant_id,
        milestone_id,
        reviewer,
    }
    .publish(env);

    Ok(())
}

pub fn reject_milestone(
    env: &Env,
    reviewer: Address,
    grant_id: u64,
    milestone_id: u32,
) -> Result<(), ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    reviewer.require_auth();

    let grant = load_grant(env, grant_id)?;
    if grant.reviewer != reviewer {
        return Err(ContractError::ReviewerMismatch);
    }
    if grant.status != GrantStatus::Active {
        return Err(ContractError::GrantNotActive);
    }

    let mut milestone = load_milestone(env, grant_id, milestone_id)?;
    if milestone.status != MilestoneStatus::UnderReview {
        return Err(ContractError::InvalidStatusTransition);
    }

    milestone.status = MilestoneStatus::Rejected;
    milestone.reviewed_at = env.ledger().timestamp();
    save_milestone(env, &milestone);

    MilestoneRejected {
        grant_id,
        milestone_id,
        reviewer,
    }
    .publish(env);

    Ok(())
}

pub fn release_funds(
    env: &Env,
    reviewer: Address,
    grant_id: u64,
    milestone_id: u32,
) -> Result<(), ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    reviewer.require_auth();

    let mut grant = load_grant(env, grant_id)?;
    if grant.reviewer != reviewer {
        return Err(ContractError::ReviewerMismatch);
    }
    if grant.status != GrantStatus::Active {
        return Err(ContractError::GrantNotActive);
    }

    let mut milestone = load_milestone(env, grant_id, milestone_id)?;
    if milestone.status != MilestoneStatus::Approved {
        return Err(ContractError::InvalidStatusTransition);
    }
    if milestone.payment_tx_guard || milestone.status == MilestoneStatus::Paid {
        return Err(ContractError::AlreadyPaid);
    }
    if grant.escrowed_balance < milestone.amount {
        return Err(ContractError::InsufficientEscrow);
    }

    let amount = milestone.amount;
    let builder = grant.builder.clone();
    let verification_hash = milestone.verification_hash.clone();

    // Update state before transfer (reentrancy-safe pattern)
    grant.escrowed_balance = checked_sub_i128(grant.escrowed_balance, amount)?;
    grant.released_total = checked_add_i128(grant.released_total, amount)?;

    milestone.status = MilestoneStatus::Paid;
    milestone.payment_tx_guard = true;
    milestone.paid_at = env.ledger().timestamp();

    save_milestone(env, &milestone);

    let all_paid = all_milestones_paid(env, &grant);
    if all_paid {
        grant.status = GrantStatus::Completed;
    }
    save_grant(env, &grant);

    transfer_out(env, &builder, amount)?;

    PaymentReleased {
        grant_id,
        milestone_id,
        builder: builder.clone(),
        amount,
    }
    .publish(env);

    let passport_addr = get_passport_contract(env)?;
    let passport_client = BuilderPassportContractClient::new(env, &passport_addr);
    let caller = env.current_contract_address();
    let reputation_delta = compute_reputation_delta(amount);

    passport_client.record_milestone_completion(
        &caller,
        &builder,
        &grant_id,
        &milestone_id,
        &amount,
        &verification_hash,
        &reputation_delta,
    );

    if all_paid {
        let _ = passport_client.increment_completed_grants(&caller, &builder);
    }

    Ok(())
}

pub fn get_milestone(
    env: &Env,
    grant_id: u64,
    milestone_id: u32,
) -> Result<equidox_common::Milestone, ContractError> {
    require_initialized(env)?;
    load_milestone(env, grant_id, milestone_id)
}

fn all_milestones_paid(env: &Env, grant: &equidox_common::Grant) -> bool {
    if grant.milestone_count == 0 {
        return false;
    }
    for i in 0..grant.milestone_count {
        if let Ok(m) = load_milestone(env, grant.id, i) {
            if m.status != MilestoneStatus::Paid {
                return false;
            }
        } else {
            return false;
        }
    }
    true
}

fn compute_reputation_delta(amount: i128) -> u32 {
    // Simple bounded heuristic: 1 point per 10_000_000 stroops (1 XLM), max 100
    let stroops_per_point: i128 = 10_000_000;
    let points = (amount / stroops_per_point) as u32;
    if points > MAX_REPUTATION_DELTA {
        MAX_REPUTATION_DELTA
    } else if points == 0 {
        1
    } else {
        points
    }
}
