use crate::access::{require_admin, require_initialized, require_not_paused};
use crate::escrow::{checked_add_i128, transfer_in, transfer_out};
use equidox_common::{
    ContractError, DataKey, FundsDeposited, Grant, GrantCancelled, GrantCreated, GrantKey,
    GrantStatus, Milestone, MilestoneStatus, zero_hash,
};
use soroban_sdk::{Address, BytesN, Env};

pub fn initialize(
    env: &Env,
    admin: Address,
    passport_contract: Address,
    native_token: Address,
) -> Result<(), ContractError> {
    if env
        .storage()
        .instance()
        .get::<DataKey, bool>(&DataKey::Initialized)
        .unwrap_or(false)
    {
        return Err(ContractError::AlreadyInitialized);
    }

    admin.require_auth();

    env.storage().instance().set(&DataKey::Admin, &admin);
    env.storage()
        .instance()
        .set(&DataKey::PassportContract, &passport_contract);
    env.storage().instance().set(&DataKey::GrantCount, &0u64);
    env.storage().instance().set(&DataKey::Paused, &false);
    env.storage()
        .instance()
        .set(&DataKey::VerificationOperator, &admin);
    env.storage()
        .instance()
        .set(&DataKey::NativeToken, &native_token);
    env.storage()
        .instance()
        .set(&DataKey::Initialized, &true);

    Ok(())
}

pub fn load_grant(env: &Env, grant_id: u64) -> Result<Grant, ContractError> {
    env.storage()
        .persistent()
        .get::<GrantKey, Grant>(&GrantKey::Grant(grant_id))
        .ok_or(ContractError::GrantNotFound)
}

pub fn save_grant(env: &Env, grant: &Grant) {
    env.storage()
        .persistent()
        .set(&GrantKey::Grant(grant.id), grant);
}

pub fn load_milestone(
    env: &Env,
    grant_id: u64,
    milestone_id: u32,
) -> Result<Milestone, ContractError> {
    env.storage()
        .persistent()
        .get::<GrantKey, Milestone>(&GrantKey::Milestone(grant_id, milestone_id))
        .ok_or(ContractError::MilestoneNotFound)
}

pub fn save_milestone(env: &Env, milestone: &Milestone) {
    env.storage().persistent().set(
        &GrantKey::Milestone(milestone.grant_id, milestone.milestone_id),
        milestone,
    );
}

pub fn create_grant(
    env: &Env,
    provider: Address,
    builder: Address,
    reviewer: Address,
    total_budget: i128,
    metadata_hash: BytesN<32>,
) -> Result<u64, ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    provider.require_auth();

    if total_budget <= 0 {
        return Err(ContractError::InvalidAmount);
    }

    let grant_id = env
        .storage()
        .instance()
        .get::<DataKey, u64>(&DataKey::GrantCount)
        .unwrap_or(0);
    let next_id = grant_id
        .checked_add(1)
        .ok_or(ContractError::ArithmeticOverflow)?;

    let grant = Grant {
        id: grant_id,
        provider: provider.clone(),
        builder: builder.clone(),
        reviewer: reviewer.clone(),
        total_budget,
        escrowed_balance: 0,
        released_total: 0,
        status: GrantStatus::Active,
        milestone_count: 0,
        metadata_hash: metadata_hash.clone(),
        created_at: env.ledger().timestamp(),
    };

    save_grant(env, &grant);
    env.storage()
        .instance()
        .set(&DataKey::GrantCount, &next_id);

    GrantCreated {
        grant_id,
        provider,
        builder,
        reviewer,
        total_budget,
        metadata_hash,
    }
    .publish(env);

    Ok(grant_id)
}

pub fn deposit_funds(
    env: &Env,
    provider: Address,
    grant_id: u64,
    amount: i128,
) -> Result<(), ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    provider.require_auth();

    let mut grant = load_grant(env, grant_id)?;
    if grant.provider != provider {
        return Err(ContractError::Unauthorized);
    }
    if grant.status != GrantStatus::Active {
        return Err(ContractError::GrantNotActive);
    }

    transfer_in(env, &provider, amount)?;
    grant.escrowed_balance = checked_add_i128(grant.escrowed_balance, amount)?;
    save_grant(env, &grant);

    FundsDeposited {
        grant_id,
        provider,
        amount,
        new_escrow_balance: grant.escrowed_balance,
    }
    .publish(env);

    Ok(())
}

pub fn cancel_grant(env: &Env, provider: Address, grant_id: u64) -> Result<(), ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    provider.require_auth();

    let mut grant = load_grant(env, grant_id)?;
    if grant.provider != provider {
        return Err(ContractError::Unauthorized);
    }
    if grant.status != GrantStatus::Active {
        return Err(ContractError::GrantNotActive);
    }

    for i in 0..grant.milestone_count {
        let milestone = load_milestone(env, grant_id, i)?;
        if milestone.status == MilestoneStatus::Approved
            || milestone.status == MilestoneStatus::Paid
        {
            return Err(ContractError::CannotCancelWithPendingPayouts);
        }
    }

    let refund_amount = grant.escrowed_balance;
    if refund_amount > 0 {
        transfer_out(env, &provider, refund_amount)?;
        grant.escrowed_balance = 0;
    }

    grant.status = GrantStatus::Cancelled;
    save_grant(env, &grant);

    GrantCancelled {
        grant_id,
        provider,
        refund_amount,
    }
    .publish(env);

    Ok(())
}

pub fn get_grant(env: &Env, grant_id: u64) -> Result<Grant, ContractError> {
    require_initialized(env)?;
    load_grant(env, grant_id)
}

pub fn add_milestone(
    env: &Env,
    provider: Address,
    grant_id: u64,
    amount: i128,
) -> Result<u32, ContractError> {
    require_initialized(env)?;
    require_not_paused(env)?;
    provider.require_auth();

    if amount <= 0 {
        return Err(ContractError::InvalidAmount);
    }

    let mut grant = load_grant(env, grant_id)?;
    if grant.provider != provider {
        return Err(ContractError::Unauthorized);
    }
    if grant.status != GrantStatus::Active {
        return Err(ContractError::GrantNotActive);
    }

    let milestone_id = grant.milestone_count;
    let milestone = Milestone {
        grant_id,
        milestone_id,
        amount,
        status: MilestoneStatus::Pending,
        evidence_hash: zero_hash(env),
        verification_hash: zero_hash(env),
        submitted_at: 0,
        reviewed_at: 0,
        paid_at: 0,
        payment_tx_guard: false,
    };

    save_milestone(env, &milestone);
    grant.milestone_count = grant
        .milestone_count
        .checked_add(1)
        .ok_or(ContractError::ArithmeticOverflow)?;
    save_grant(env, &grant);

    Ok(milestone_id)
}

pub fn get_escrow_balance(env: &Env, grant_id: u64) -> Result<i128, ContractError> {
    let grant = load_grant(env, grant_id)?;
    Ok(grant.escrowed_balance)
}

pub fn set_paused(env: &Env, admin: Address, paused: bool) -> Result<(), ContractError> {
    require_admin(env, &admin)?;
    env.storage().instance().set(&DataKey::Paused, &paused);
    Ok(())
}

pub fn set_verification_operator(
    env: &Env,
    admin: Address,
    operator: Address,
) -> Result<(), ContractError> {
    require_admin(env, &admin)?;
    env.storage()
        .instance()
        .set(&DataKey::VerificationOperator, &operator);
    Ok(())
}
