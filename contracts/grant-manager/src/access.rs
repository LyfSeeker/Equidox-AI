use equidox_common::{ContractError, DataKey};
use soroban_sdk::{Address, Env};

pub fn require_initialized(env: &Env) -> Result<(), ContractError> {
    if !env
        .storage()
        .instance()
        .get::<DataKey, bool>(&DataKey::Initialized)
        .unwrap_or(false)
    {
        return Err(ContractError::NotInitialized);
    }
    Ok(())
}

pub fn require_not_paused(env: &Env) -> Result<(), ContractError> {
    if env
        .storage()
        .instance()
        .get::<DataKey, bool>(&DataKey::Paused)
        .unwrap_or(false)
    {
        return Err(ContractError::ContractPaused);
    }
    Ok(())
}

pub fn require_admin(env: &Env, admin: &Address) -> Result<(), ContractError> {
    admin.require_auth();
    let stored = env
        .storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::Admin)
        .ok_or(ContractError::NotInitialized)?;
    if stored != *admin {
        return Err(ContractError::Unauthorized);
    }
    Ok(())
}

pub fn require_verification_operator(env: &Env, operator: &Address) -> Result<(), ContractError> {
    operator.require_auth();
    let stored = env
        .storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::VerificationOperator)
        .ok_or(ContractError::NotInitialized)?;
    if stored != *operator {
        return Err(ContractError::Unauthorized);
    }
    Ok(())
}

pub fn get_passport_contract(env: &Env) -> Result<Address, ContractError> {
    env.storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::PassportContract)
        .ok_or(ContractError::NotInitialized)
}
