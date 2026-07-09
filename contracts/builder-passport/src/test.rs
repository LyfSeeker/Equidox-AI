#![cfg(test)]

use super::*;
use equidox_common::ContractError;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

fn setup_passport(env: &Env) -> (Address, Address, Address) {
    let admin = Address::generate(env);
    let grant_manager = Address::generate(env);
    let passport_id = env.register(BuilderPassportContract, ());
    let client = BuilderPassportContractClient::new(env, &passport_id);
    env.mock_all_auths();
    client.initialize(&admin, &grant_manager);
    (passport_id, admin, grant_manager)
}

#[test]
fn test_initialize_passport() {
    let env = Env::default();
    let (passport_id, _admin, _gm) = setup_passport(&env);
    let client = BuilderPassportContractClient::new(&env, &passport_id);
    assert!(client.try_initialize(&Address::generate(&env), &Address::generate(&env)).is_err());
}

#[test]
fn test_record_milestone_completion_unauthorized() {
    let env = Env::default();
    let (passport_id, _admin, _gm) = setup_passport(&env);
    let client = BuilderPassportContractClient::new(&env, &passport_id);
    let stranger = Address::generate(&env);
    let builder = Address::generate(&env);
    let hash = BytesN::from_array(&env, &[1u8; 32]);

    env.mock_all_auths();
    let result = client.try_record_milestone_completion(
        &stranger,
        &builder,
        &0,
        &0,
        &1_000_000_000,
        &hash,
        &10,
    );
    assert_eq!(result, Err(Ok(ContractError::Unauthorized)));
}

#[test]
fn test_record_milestone_completion_and_badge() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let grant_manager = Address::generate(&env);
    let builder = Address::generate(&env);
    let passport_id = env.register(BuilderPassportContract, ());
    let client = BuilderPassportContractClient::new(&env, &passport_id);

    env.mock_all_auths();
    client.initialize(&admin, &grant_manager);

    let hash = BytesN::from_array(&env, &[2u8; 32]);
    client.record_milestone_completion(
        &grant_manager,
        &builder,
        &1,
        &0,
        &5_000_000_000,
        &hash,
        &25,
    );

    let passport = client.get_passport(&builder);
    assert_eq!(passport.reputation_score, 25);
    assert_eq!(passport.completed_milestones, 1);
    assert_eq!(passport.total_funds_received, 5_000_000_000);
    assert_eq!(passport.verification_count, 1);

    let history = client.get_verification_history(&builder, &0);
    assert_eq!(history.grant_id, 1);
    assert!(history.approved);

    client.set_badge(&admin, &builder, &0);
    let passport = client.get_passport(&builder);
    assert_eq!(passport.badges, 1);
}

#[test]
fn test_invalid_reputation_delta() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let grant_manager = Address::generate(&env);
    let builder = Address::generate(&env);
    let passport_id = env.register(BuilderPassportContract, ());
    let client = BuilderPassportContractClient::new(&env, &passport_id);

    env.mock_all_auths();
    client.initialize(&admin, &grant_manager);

    let hash = BytesN::from_array(&env, &[3u8; 32]);
    let result = client.try_record_milestone_completion(
        &grant_manager,
        &builder,
        &0,
        &0,
        &1,
        &hash,
        &101,
    );
    assert_eq!(result, Err(Ok(ContractError::InvalidReputationDelta)));
}
