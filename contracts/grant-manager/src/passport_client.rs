use equidox_common::ContractError;
use soroban_sdk::{contractclient, Address, BytesN, Env};

#[allow(dead_code)]
#[contractclient(name = "BuilderPassportContractClient")]
pub trait BuilderPassportContractInterface {
    fn record_milestone_completion(
        env: Env,
        caller: Address,
        builder: Address,
        grant_id: u64,
        milestone_id: u32,
        amount_released: i128,
        verification_hash: BytesN<32>,
        reputation_delta: u32,
    ) -> Result<(), ContractError>;

    fn increment_completed_grants(
        env: Env,
        caller: Address,
        builder: Address,
    ) -> Result<(), ContractError>;
}
