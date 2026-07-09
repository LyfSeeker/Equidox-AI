#![no_std]

mod access;
mod escrow;
mod grant;
mod milestone;
mod passport_client;

use equidox_common::{ContractError, Grant, Milestone};
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};

#[contract]
pub struct GrantManager;

#[contractimpl]
impl GrantManager {
    pub fn initialize(
        env: Env,
        admin: Address,
        passport_contract: Address,
        native_token: Address,
    ) -> Result<(), ContractError> {
        grant::initialize(&env, admin, passport_contract, native_token)
    }

    pub fn create_grant(
        env: Env,
        provider: Address,
        builder: Address,
        reviewer: Address,
        total_budget: i128,
        metadata_hash: BytesN<32>,
    ) -> Result<u64, ContractError> {
        grant::create_grant(
            &env,
            provider,
            builder,
            reviewer,
            total_budget,
            metadata_hash,
        )
    }

    pub fn deposit_funds(
        env: Env,
        provider: Address,
        grant_id: u64,
        amount: i128,
    ) -> Result<(), ContractError> {
        grant::deposit_funds(&env, provider, grant_id, amount)
    }

    pub fn cancel_grant(
        env: Env,
        provider: Address,
        grant_id: u64,
    ) -> Result<(), ContractError> {
        grant::cancel_grant(&env, provider, grant_id)
    }

    pub fn get_grant(env: Env, grant_id: u64) -> Result<Grant, ContractError> {
        grant::get_grant(&env, grant_id)
    }

    pub fn add_milestone(
        env: Env,
        provider: Address,
        grant_id: u64,
        amount: i128,
    ) -> Result<u32, ContractError> {
        grant::add_milestone(&env, provider, grant_id, amount)
    }

    pub fn submit_milestone(
        env: Env,
        builder: Address,
        grant_id: u64,
        milestone_id: u32,
        evidence_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        milestone::submit_milestone(&env, builder, grant_id, milestone_id, evidence_hash)
    }

    pub fn store_verification_hash(
        env: Env,
        operator: Address,
        grant_id: u64,
        milestone_id: u32,
        verification_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        milestone::store_verification_hash(
            &env,
            operator,
            grant_id,
            milestone_id,
            verification_hash,
        )
    }

    pub fn approve_milestone(
        env: Env,
        reviewer: Address,
        grant_id: u64,
        milestone_id: u32,
    ) -> Result<(), ContractError> {
        milestone::approve_milestone(&env, reviewer, grant_id, milestone_id)
    }

    pub fn reject_milestone(
        env: Env,
        reviewer: Address,
        grant_id: u64,
        milestone_id: u32,
    ) -> Result<(), ContractError> {
        milestone::reject_milestone(&env, reviewer, grant_id, milestone_id)
    }

    pub fn release_funds(
        env: Env,
        reviewer: Address,
        grant_id: u64,
        milestone_id: u32,
    ) -> Result<(), ContractError> {
        milestone::release_funds(&env, reviewer, grant_id, milestone_id)
    }

    pub fn get_milestone(
        env: Env,
        grant_id: u64,
        milestone_id: u32,
    ) -> Result<Milestone, ContractError> {
        milestone::get_milestone(&env, grant_id, milestone_id)
    }

    pub fn get_escrow_balance(env: Env, grant_id: u64) -> Result<i128, ContractError> {
        grant::get_escrow_balance(&env, grant_id)
    }

    pub fn set_paused(env: Env, admin: Address, paused: bool) -> Result<(), ContractError> {
        grant::set_paused(&env, admin, paused)
    }

    pub fn set_verification_operator(
        env: Env,
        admin: Address,
        operator: Address,
    ) -> Result<(), ContractError> {
        grant::set_verification_operator(&env, admin, operator)
    }
}

#[cfg(test)]
mod test;
