use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    GrantNotFound = 4,
    MilestoneNotFound = 5,
    InvalidStatusTransition = 6,
    InsufficientEscrow = 7,
    AlreadyPaid = 8,
    GrantNotActive = 9,
    GrantCancelled = 10,
    InvalidAmount = 11,
    ArithmeticOverflow = 12,
    ContractPaused = 13,
    CannotCancelWithPendingPayouts = 14,
    PassportCallFailed = 15,
    BuilderMismatch = 16,
    ReviewerMismatch = 17,
    PassportNotFound = 18,
    HistoryNotFound = 19,
    InvalidReputationDelta = 20,
    InvalidBadgeBit = 21,
}
