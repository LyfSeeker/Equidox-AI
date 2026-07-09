#![no_std]

mod passport;

use equidox_common::{BuilderPassport, ContractError, VerificationRecord};
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};

#[contract]
pub struct BuilderPassportContract;

#[contractimpl]
impl BuilderPassportContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        grant_manager: Address,
    ) -> Result<(), ContractError> {
        passport::initialize(&env, admin, grant_manager)
    }

    pub fn get_passport(env: Env, builder: Address) -> Result<BuilderPassport, ContractError> {
        passport::get_passport(&env, builder)
    }

    pub fn get_verification_history(
        env: Env,
        builder: Address,
        index: u64,
    ) -> Result<VerificationRecord, ContractError> {
        passport::get_verification_history(&env, builder, index)
    }

    pub fn record_milestone_completion(
        env: Env,
        caller: Address,
        builder: Address,
        grant_id: u64,
        milestone_id: u32,
        amount_released: i128,
        verification_hash: BytesN<32>,
        reputation_delta: u32,
    ) -> Result<(), ContractError> {
        passport::record_milestone_completion(
            &env,
            caller,
            builder,
            grant_id,
            milestone_id,
            amount_released,
            verification_hash,
            reputation_delta,
        )
    }

    pub fn set_badge(
        env: Env,
        admin: Address,
        builder: Address,
        badge_bit: u32,
    ) -> Result<(), ContractError> {
        passport::set_badge(&env, admin, builder, badge_bit)
    }

    pub fn increment_completed_grants(
        env: Env,
        caller: Address,
        builder: Address,
    ) -> Result<(), ContractError> {
        passport::increment_completed_grants(&env, caller, builder)
    }
}

#[cfg(test)]
mod test;
