use equidox_common::ContractError;
use soroban_sdk::{token, Address, Env, MuxedAddress};

fn native_token_client(env: &Env) -> Result<token::Client<'_>, ContractError> {
    let token_addr = env
        .storage()
        .instance()
        .get::<equidox_common::DataKey, Address>(&equidox_common::DataKey::NativeToken)
        .ok_or(ContractError::NotInitialized)?;
    Ok(token::Client::new(env, &token_addr))
}

pub fn transfer_in(env: &Env, from: &Address, amount: i128) -> Result<(), ContractError> {
    if amount <= 0 {
        return Err(ContractError::InvalidAmount);
    }
    let contract = env.current_contract_address();
    let client = native_token_client(env)?;
    client.transfer(from, &MuxedAddress::from(contract), &amount);
    Ok(())
}

pub fn transfer_out(env: &Env, to: &Address, amount: i128) -> Result<(), ContractError> {
    if amount <= 0 {
        return Err(ContractError::InvalidAmount);
    }
    let contract = env.current_contract_address();
    let client = native_token_client(env)?;
    client.transfer(&contract, &MuxedAddress::from(to.clone()), &amount);
    Ok(())
}

pub fn checked_add_i128(a: i128, b: i128) -> Result<i128, ContractError> {
    a.checked_add(b).ok_or(ContractError::ArithmeticOverflow)
}

pub fn checked_sub_i128(a: i128, b: i128) -> Result<i128, ContractError> {
    a.checked_sub(b).ok_or(ContractError::ArithmeticOverflow)
}
