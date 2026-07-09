import StellarSdk from "@stellar/stellar-sdk";

const {
  Contract,
  Networks,
  rpc: SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
  xdr,
} = StellarSdk;

function getNetworkPassphrase() {
  return process.env.STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

function getServer() {
  return new SorobanRpc.Server(
    process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
  );
}

/**
 * Builds an unsigned Soroban transaction for Freighter signing.
 * The frontend passes the signed XDR back for submission.
 */
export async function buildContractInvoke({
  sourcePublicKey,
  contractId,
  method,
  args = [],
}) {
  const server = getServer();
  const sourceAccount = await server.getAccount(sourcePublicKey);
  const contract = new Contract(contractId);

  let transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  transaction = await server.prepareTransaction(transaction);

  return {
    xdr: transaction.toXDR(),
    networkPassphrase: getNetworkPassphrase(),
  };
}

export function addressToScVal(address) {
  return Address.fromString(address).toScVal();
}

export function u64ToScVal(value) {
  return nativeToScVal(value, { type: "u64" });
}

export function i128ToScVal(value) {
  return nativeToScVal(BigInt(value), { type: "i128" });
}

export function bytesN32ToScVal(hexHash) {
  const buf = Buffer.from(hexHash.padStart(64, "0").slice(0, 64), "hex");
  return xdr.ScVal.scvBytes(buf);
}

export async function submitTransaction(signedXdr) {
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(response)}`);
  }

  let getResponse = await server.getTransaction(response.hash);
  while (getResponse.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    getResponse = await server.getTransaction(response.hash);
  }

  return {
    hash: response.hash,
    status: getResponse.status,
    result: getResponse,
  };
}

export async function readGrant(grantId) {
  const contractId = process.env.GRANT_MANAGER_CONTRACT_ID;
  if (!contractId) return null;

  const server = getServer();
  const contract = new Contract(contractId);

  const account = await server.getAccount(
    process.env.DEFAULT_READ_ACCOUNT ||
      "GCFCVEY6YOO24HAI2JCX6BH2RDAJRMSQJODOGUY6H4NMNVQR3KYV446Z"
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call("get_grant", u64ToScVal(grantId)))
    .setTimeout(180)
    .build();

  const sim = await server.simulateTransaction(tx);
  return sim;
}
