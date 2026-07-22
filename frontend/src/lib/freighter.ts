"use client";

import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
  signMessage,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./config";

export async function detectFreighter() {
  try {
    const result = await isConnected();
    return Boolean(result.isConnected) && !result.error;
  } catch {
    return false;
  }
}

export async function connectFreighter(options?: { forcePrompt?: boolean }) {
  const access = await requestAccess();
  if (access.error || !access.address) {
    throw new Error(access.error?.message || "Freighter access denied");
  }

  // Freighter skips the allow-list popup once the site is already approved.
  // After logout, require a sign-in message so the extension UI opens again.
  if (options?.forcePrompt) {
    const signed = await signMessage(
      `Sign in to Equidox Trust Layer\nNetwork: Stellar Mainnet\n${new Date().toISOString()}`,
      {
        address: access.address,
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    );

    if (signed.error || !signed.signedMessage) {
      throw new Error(
        signed.error?.message || "Connection cancelled in Freighter"
      );
    }
  }

  return access.address;
}

export async function getFreighterAddress() {
  const result = await getAddress();
  if (result.error || !result.address) return null;
  return result.address;
}

export async function signXdrWithFreighter(
  xdr: string,
  address: string,
  networkPassphrase = NETWORK_PASSPHRASE
) {
  const signed = await signTransaction(xdr, {
    address,
    networkPassphrase,
  });

  if (signed.error || !signed.signedTxXdr) {
    throw new Error(signed.error?.message || "Failed to sign transaction");
  }

  return signed.signedTxXdr;
}
