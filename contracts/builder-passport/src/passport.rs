use equidox_common::{
    BuilderPassport, ContractError, PassportKey, ReputationUpdated, VerificationRecord,
    MAX_REPUTATION_DELTA, MAX_REPUTATION_SCORE,
};
use soroban_sdk::{Address, BytesN, Env};

pub fn initialize(
    env: &Env,
    admin: Address,
    grant_manager: Address,
) -> Result<(), ContractError> {
    if env
        .storage()
        .instance()
        .get::<PassportKey, bool>(&PassportKey::Initialized)
        .unwrap_or(false)
    {
        return Err(ContractError::AlreadyInitialized);
    }

    admin.require_auth();

    env.storage().instance().set(&PassportKey::Admin, &admin);
    env.storage()
        .instance()
        .set(&PassportKey::AuthorizedUpdater, &grant_manager);
    env.storage()
        .instance()
        .set(&PassportKey::Initialized, &true);

    Ok(())
}

pub fn get_passport(env: &Env, builder: Address) -> Result<BuilderPassport, ContractError> {
    if !env
        .storage()
        .instance()
        .get::<PassportKey, bool>(&PassportKey::Initialized)
        .unwrap_or(false)
    {
        return Err(ContractError::NotInitialized);
    }

    env.storage()
        .persistent()
        .get::<PassportKey, BuilderPassport>(&PassportKey::Passport(builder))
        .ok_or(ContractError::PassportNotFound)
}

pub fn get_verification_history(
    env: &Env,
    builder: Address,
    index: u64,
) -> Result<VerificationRecord, ContractError> {
    if !env
        .storage()
        .instance()
        .get::<PassportKey, bool>(&PassportKey::Initialized)
        .unwrap_or(false)
    {
        return Err(ContractError::NotInitialized);
    }

    env.storage()
        .persistent()
        .get::<PassportKey, VerificationRecord>(&PassportKey::History(builder, index))
        .ok_or(ContractError::HistoryNotFound)
}

pub fn record_milestone_completion(
    env: &Env,
    caller: Address,
    builder: Address,
    grant_id: u64,
    milestone_id: u32,
    amount_released: i128,
    verification_hash: BytesN<32>,
    reputation_delta: u32,
) -> Result<(), ContractError> {
    if !env
        .storage()
        .instance()
        .get::<PassportKey, bool>(&PassportKey::Initialized)
        .unwrap_or(false)
    {
        return Err(ContractError::NotInitialized);
    }

    caller.require_auth();
    let authorized = env
        .storage()
        .instance()
        .get::<PassportKey, Address>(&PassportKey::AuthorizedUpdater)
        .ok_or(ContractError::NotInitialized)?;
    if caller != authorized {
        return Err(ContractError::Unauthorized);
    }

    if reputation_delta == 0 || reputation_delta > MAX_REPUTATION_DELTA {
        return Err(ContractError::InvalidReputationDelta);
    }

    let mut passport = env
        .storage()
        .persistent()
        .get::<PassportKey, BuilderPassport>(&PassportKey::Passport(builder.clone()))
        .unwrap_or(BuilderPassport {
            builder: builder.clone(),
            reputation_score: 0,
            completed_milestones: 0,
            completed_grants: 0,
            total_funds_received: 0,
            badges: 0,
            verification_count: 0,
            last_updated_at: 0,
        });

    passport.completed_milestones = passport
        .completed_milestones
        .checked_add(1)
        .ok_or(ContractError::ArithmeticOverflow)?;

    passport.total_funds_received = passport
        .total_funds_received
        .checked_add(amount_released)
        .ok_or(ContractError::ArithmeticOverflow)?;

    passport.verification_count = passport
        .verification_count
        .checked_add(1)
        .ok_or(ContractError::ArithmeticOverflow)?;

    let new_score = passport
        .reputation_score
        .saturating_add(reputation_delta)
        .min(MAX_REPUTATION_SCORE);
    passport.reputation_score = new_score;
    passport.last_updated_at = env.ledger().timestamp();

    env.storage()
        .persistent()
        .set(&PassportKey::Passport(builder.clone()), &passport);

    let history_count = env
        .storage()
        .persistent()
        .get::<PassportKey, u64>(&PassportKey::HistoryCount(builder.clone()))
        .unwrap_or(0);

    let record = VerificationRecord {
        grant_id,
        milestone_id,
        verification_hash,
        approved: true,
        timestamp: env.ledger().timestamp(),
    };
    env.storage()
        .persistent()
        .set(&PassportKey::History(builder.clone(), history_count), &record);
    env.storage()
        .persistent()
        .set(&PassportKey::HistoryCount(builder.clone()), &(history_count + 1));

    ReputationUpdated {
        builder: builder.clone(),
        new_score: passport.reputation_score,
        completed_milestones: passport.completed_milestones,
        total_funds_received: passport.total_funds_received,
    }
    .publish(env);

    Ok(())
}

pub fn set_badge(
    env: &Env,
    admin: Address,
    builder: Address,
    badge_bit: u32,
) -> Result<(), ContractError> {
    if !env
        .storage()
        .instance()
        .get::<PassportKey, bool>(&PassportKey::Initialized)
        .unwrap_or(false)
    {
        return Err(ContractError::NotInitialized);
    }

    admin.require_auth();
    let stored_admin = env
        .storage()
        .instance()
        .get::<PassportKey, Address>(&PassportKey::Admin)
        .ok_or(ContractError::NotInitialized)?;
    if admin != stored_admin {
        return Err(ContractError::Unauthorized);
    }

    if badge_bit >= 32 {
        return Err(ContractError::InvalidBadgeBit);
    }

    let mut passport = env
        .storage()
        .persistent()
        .get::<PassportKey, BuilderPassport>(&PassportKey::Passport(builder.clone()))
        .unwrap_or(BuilderPassport {
            builder: builder.clone(),
            reputation_score: 0,
            completed_milestones: 0,
            completed_grants: 0,
            total_funds_received: 0,
            badges: 0,
            verification_count: 0,
            last_updated_at: 0,
        });

    passport.badges |= 1u32 << badge_bit;
    passport.last_updated_at = env.ledger().timestamp();

    env.storage()
        .persistent()
        .set(&PassportKey::Passport(builder), &passport);

    Ok(())
}

pub fn increment_completed_grants(env: &Env, caller: Address, builder: Address) -> Result<(), ContractError> {
    caller.require_auth();
    let authorized = env
        .storage()
        .instance()
        .get::<PassportKey, Address>(&PassportKey::AuthorizedUpdater)
        .ok_or(ContractError::NotInitialized)?;
    if caller != authorized {
        return Err(ContractError::Unauthorized);
    }

    let mut passport = env
        .storage()
        .persistent()
        .get::<PassportKey, BuilderPassport>(&PassportKey::Passport(builder.clone()))
        .ok_or(ContractError::PassportNotFound)?;

    passport.completed_grants = passport
        .completed_grants
        .checked_add(1)
        .ok_or(ContractError::ArithmeticOverflow)?;
    passport.last_updated_at = env.ledger().timestamp();

    env.storage()
        .persistent()
        .set(&PassportKey::Passport(builder), &passport);

    Ok(())
}
