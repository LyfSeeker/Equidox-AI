# Rust Review

## Best practices
- Idiomatic errors
- Safe ownership
- Clippy-friendly patterns
- Crate tests

## Common mistakes
- Unnecessary unsafe
- Unwrap in library paths

## Red flags
- Unjustified unsafe blocks

## Evaluation checklist
- [ ] Cargo.toml
- [ ] #[cfg(test)]
- [ ] Panic paths

## Scoring guidance
Contract/backend Rust quality feeds architecture + security.

## Example observation
Contract panics on malformed input — robustness risk.
