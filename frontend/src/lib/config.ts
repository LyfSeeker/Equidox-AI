export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const KEYCLOAK_URL =
  process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8180";

export const KEYCLOAK_REALM =
  process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "equidox";

export const KEYCLOAK_CLIENT_ID =
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "equidox-frontend";

export const STELLAR_NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK || "mainnet";

export const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015";

export const GRANT_MANAGER_ID =
  process.env.NEXT_PUBLIC_GRANT_MANAGER_CONTRACT_ID ||
  "CBVQQZSSOH6EH3JNDYCJGOTJZX34KDBJUXFHJWDMQGYIM5FH2ZPT327E";

export const BUILDER_PASSPORT_ID =
  process.env.NEXT_PUBLIC_BUILDER_PASSPORT_CONTRACT_ID ||
  "CCS3GE6Y4RV7UKCX57TXKPXVRBTC4DH44YZJN63IYC7NZ3AXBMGHOYDV";

const EXPLORER_NETWORK = STELLAR_NETWORK === "mainnet" ? "public" : "testnet";

export function shortAddress(address?: string | null, chars = 4) {
  if (!address) return "—";
  if (address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars + 1)}...${address.slice(-chars)}`;
}

export function stroopsToXlm(stroops: number | string | null | undefined) {
  const n = Number(stroops || 0);
  return (n / 10_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 7,
  });
}

export function explorerTxUrl(hash?: string | null) {
  if (!hash) return null;
  return `https://stellar.expert/explorer/${EXPLORER_NETWORK}/tx/${hash}`;
}

export function explorerAccountUrl(address?: string | null) {
  if (!address) return null;
  return `https://stellar.expert/explorer/${EXPLORER_NETWORK}/account/${address}`;
}
