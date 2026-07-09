use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    PassportContract,
    GrantCount,
    Paused,
    VerificationOperator,
    Initialized,
    NativeToken,
}

#[contracttype]
#[derive(Clone)]
pub enum GrantKey {
    Grant(u64),
    Milestone(u64, u32),
}

#[contracttype]
#[derive(Clone)]
pub enum PassportKey {
    Passport(Address),
    History(Address, u64),
    HistoryCount(Address),
    AuthorizedUpdater,
    Admin,
    Initialized,
}
