#![cfg(test)]

use super::*;
use builder_passport::BuilderPassportContract;
use equidox_common::{ContractError, GrantStatus, MilestoneStatus};
use soroban_sdk::{testutils::Address as _, token, Address, BytesN, Env};

const ONE_XLM: i128 = 10_000_000;

fn hash_with_byte(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

struct TestContext<'a> {
    env: Env,
    admin: Address,
    provider: Address,
    builder: Address,
    reviewer: Address,
    token_id: Address,
    passport_id: Address,
    gm: GrantManagerClient<'a>,
}

fn setup(env: &Env) -> TestContext<'_> {
    env.mock_all_auths();

    let admin = Address::generate(env);
    let provider = Address::generate(env);
    let builder = Address::generate(env);
    let reviewer = Address::generate(env);

    let token_admin = Address::generate(env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_id = token_contract.address();

    let passport_id = env.register(BuilderPassportContract, ());
    let grant_manager_id = env.register(GrantManager, ());
    let gm = GrantManagerClient::new(env, &grant_manager_id);

    let passport_client =
        builder_passport::BuilderPassportContractClient::new(env, &passport_id);
    passport_client.initialize(&admin, &grant_manager_id);
    gm.initialize(&admin, &passport_id, &token_id);

    TestContext {
        env: env.clone(),
        admin,
        provider,
        builder,
        reviewer,
        token_id,
        passport_id,
        gm,
    }
}

fn fund_token(env: &Env, token_id: &Address, to: &Address, amount: i128) {
    let stellar = token::StellarAssetClient::new(env, token_id);
    stellar.mint(to, &amount);
}

#[test]
fn test_create_grant() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    assert_eq!(grant_id, 0);

    let grant = ctx.gm.get_grant(&grant_id);
    assert_eq!(grant.status, GrantStatus::Active);
    assert_eq!(grant.milestone_count, 0);
}

#[test]
fn test_deposit_funds() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );

    fund_token(&env, &ctx.token_id, &ctx.provider, 10 * ONE_XLM);
    ctx.gm
        .deposit_funds(&ctx.provider, &grant_id, &(10 * ONE_XLM));

    let grant = ctx.gm.get_grant(&grant_id);
    assert_eq!(grant.escrowed_balance, 10 * ONE_XLM);
}

#[test]
fn test_full_milestone_lifecycle_and_payout() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    let milestone_id = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));

    fund_token(&env, &ctx.token_id, &ctx.provider, 10 * ONE_XLM);
    ctx.gm
        .deposit_funds(&ctx.provider, &grant_id, &(10 * ONE_XLM));

    ctx.gm.submit_milestone(
        &ctx.builder,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 2),
    );
    ctx.gm.store_verification_hash(
        &ctx.admin,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 3),
    );
    ctx.gm
        .approve_milestone(&ctx.reviewer, &grant_id, &milestone_id);
    ctx.gm.release_funds(&ctx.reviewer, &grant_id, &milestone_id);

    let milestone = ctx.gm.get_milestone(&grant_id, &milestone_id);
    assert_eq!(milestone.status, MilestoneStatus::Paid);
    assert!(milestone.payment_tx_guard);

    let grant = ctx.gm.get_grant(&grant_id);
    assert_eq!(grant.released_total, 5 * ONE_XLM);
    assert_eq!(grant.escrowed_balance, 5 * ONE_XLM);

    let passport_client =
        builder_passport::BuilderPassportContractClient::new(&env, &ctx.passport_id);
    let passport = passport_client.get_passport(&ctx.builder);
    assert_eq!(passport.completed_milestones, 1);
    assert_eq!(passport.total_funds_received, 5 * ONE_XLM);
}

#[test]
fn test_provider_can_store_verification_hash() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    let milestone_id = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));
    ctx.gm.submit_milestone(
        &ctx.builder,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 2),
    );

    // Provider (same wallet that created the grant) may anchor AI verification.
    ctx.gm.store_verification_hash(
        &ctx.provider,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 3),
    );

    let milestone = ctx.gm.get_milestone(&grant_id, &milestone_id);
    assert_eq!(milestone.status, MilestoneStatus::UnderReview);
}

#[test]
fn test_unauthorized_reviewer() {
    let env = Env::default();
    let ctx = setup(&env);
    let wrong_reviewer = Address::generate(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    let milestone_id = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));
    ctx.gm.submit_milestone(
        &ctx.builder,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 2),
    );
    ctx.gm.store_verification_hash(
        &ctx.admin,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 3),
    );

    let result = ctx
        .gm
        .try_approve_milestone(&wrong_reviewer, &grant_id, &milestone_id);
    assert_eq!(result, Err(Ok(ContractError::ReviewerMismatch)));
}

#[test]
fn test_builder_mismatch_on_submit() {
    let env = Env::default();
    let ctx = setup(&env);
    let impostor = Address::generate(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    let milestone_id = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));

    let result = ctx.gm.try_submit_milestone(
        &impostor,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 2),
    );
    assert_eq!(result, Err(Ok(ContractError::BuilderMismatch)));
}

#[test]
fn test_reject_and_resubmit() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    let milestone_id = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));
    ctx.gm.submit_milestone(
        &ctx.builder,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 2),
    );
    ctx.gm.store_verification_hash(
        &ctx.admin,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 3),
    );
    ctx.gm
        .reject_milestone(&ctx.reviewer, &grant_id, &milestone_id);

    let m = ctx.gm.get_milestone(&grant_id, &milestone_id);
    assert_eq!(m.status, MilestoneStatus::Rejected);

    ctx.gm.submit_milestone(
        &ctx.builder,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 4),
    );
    let m = ctx.gm.get_milestone(&grant_id, &milestone_id);
    assert_eq!(m.status, MilestoneStatus::Submitted);
}

#[test]
fn test_cancel_blocked_with_approved_milestone() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    let milestone_id = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));
    ctx.gm.submit_milestone(
        &ctx.builder,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 2),
    );
    ctx.gm.store_verification_hash(
        &ctx.admin,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 3),
    );
    ctx.gm
        .approve_milestone(&ctx.reviewer, &grant_id, &milestone_id);

    let result = ctx.gm.try_cancel_grant(&ctx.provider, &grant_id);
    assert_eq!(result, Err(Ok(ContractError::CannotCancelWithPendingPayouts)));
}

#[test]
fn test_double_release_prevented() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    let milestone_id = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));
    ctx.gm.submit_milestone(
        &ctx.builder,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 2),
    );
    ctx.gm.store_verification_hash(
        &ctx.admin,
        &grant_id,
        &milestone_id,
        &hash_with_byte(&env, 3),
    );
    ctx.gm
        .approve_milestone(&ctx.reviewer, &grant_id, &milestone_id);

    let result = ctx
        .gm
        .try_release_funds(&ctx.reviewer, &grant_id, &milestone_id);
    assert_eq!(result, Err(Ok(ContractError::InsufficientEscrow)));
}

#[test]
fn test_contract_paused() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.gm.set_paused(&ctx.admin, &true);

    let result = ctx.gm.try_create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    assert_eq!(result, Err(Ok(ContractError::ContractPaused)));
}

#[test]
fn test_cancel_grant_refund() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    ctx.gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));

    fund_token(&env, &ctx.token_id, &ctx.provider, 10 * ONE_XLM);
    ctx.gm
        .deposit_funds(&ctx.provider, &grant_id, &(10 * ONE_XLM));

    let token_client = token::Client::new(&env, &ctx.token_id);
    let balance_before = token_client.balance(&ctx.provider);

    ctx.gm.cancel_grant(&ctx.provider, &grant_id);

    let grant = ctx.gm.get_grant(&grant_id);
    assert_eq!(grant.status, GrantStatus::Cancelled);
    assert_eq!(grant.escrowed_balance, 0);

    let balance_after = token_client.balance(&ctx.provider);
    assert_eq!(balance_after, balance_before + 10 * ONE_XLM);
}

#[test]
fn test_grant_completed_when_all_milestones_paid() {
    let env = Env::default();
    let ctx = setup(&env);

    let grant_id = ctx.gm.create_grant(
        &ctx.provider,
        &ctx.builder,
        &ctx.reviewer,
        &(10 * ONE_XLM),
        &hash_with_byte(&env, 1),
    );
    let m0 = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));
    let m1 = ctx
        .gm
        .add_milestone(&ctx.provider, &grant_id, &(5 * ONE_XLM));

    fund_token(&env, &ctx.token_id, &ctx.provider, 10 * ONE_XLM);
    ctx.gm
        .deposit_funds(&ctx.provider, &grant_id, &(10 * ONE_XLM));

    for (mid, hash_byte) in [(m0, 2u8), (m1, 3u8)] {
        ctx.gm.submit_milestone(
            &ctx.builder,
            &grant_id,
            &mid,
            &hash_with_byte(&env, hash_byte),
        );
        ctx.gm.store_verification_hash(
            &ctx.admin,
            &grant_id,
            &mid,
            &hash_with_byte(&env, hash_byte + 10),
        );
        ctx.gm.approve_milestone(&ctx.reviewer, &grant_id, &mid);
        ctx.gm.release_funds(&ctx.reviewer, &grant_id, &mid);
    }

    let grant = ctx.gm.get_grant(&grant_id);
    assert_eq!(grant.status, GrantStatus::Completed);
    assert_eq!(grant.released_total, 10 * ONE_XLM);

    let passport_client =
        builder_passport::BuilderPassportContractClient::new(&env, &ctx.passport_id);
    let passport = passport_client.get_passport(&ctx.builder);
    assert_eq!(passport.completed_milestones, 2);
    assert_eq!(passport.completed_grants, 1);
}
