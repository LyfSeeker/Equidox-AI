"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  connectFreighter,
  detectFreighter,
  getFreighterAddress,
  signXdrWithFreighter,
} from "@/lib/freighter";
import { api, type UnsignedTx } from "@/lib/api";
import { NETWORK_PASSPHRASE } from "@/lib/config";

const DISCONNECT_KEY = "equidox_wallet_disconnected";

type WalletContextValue = {
  address: string | null;
  connecting: boolean;
  freighterAvailable: boolean;
  error: string | null;
  connect: () => Promise<string>;
  disconnect: () => void;
  signAndSubmit: (
    tx: UnsignedTx
  ) => Promise<{ hash: string; status: string; returnValue?: unknown }>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function wasIntentionallyDisconnected() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DISCONNECT_KEY) === "1";
}

function markDisconnected() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DISCONNECT_KEY, "1");
}

function clearDisconnected() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DISCONNECT_KEY);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [freighterAvailable, setFreighterAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await detectFreighter();
      if (cancelled) return;
      setFreighterAvailable(available);

      // After logout, do not silently restore the previous Freighter session.
      if (!available || wasIntentionallyDisconnected()) return;

      try {
        const existing = await getFreighterAddress();
        if (!cancelled && existing) setAddress(existing);
      } catch {
        // not yet authorized
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const available = await detectFreighter();
      setFreighterAvailable(available);
      if (!available) {
        throw new Error("Install the Freighter browser extension to continue");
      }

      // After logout, Freighter won't re-show its allow popup (site already
      // approved). forcePrompt asks the user to sign a connect message instead.
      const forcePrompt = wasIntentionallyDisconnected();
      const addr = await connectFreighter({ forcePrompt });
      clearDisconnected();
      setAddress(addr);
      return addr;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    markDisconnected();
    setAddress(null);
    setError(null);
    setConnecting(false);
  }, []);

  const signAndSubmit = useCallback(
    async (tx: UnsignedTx) => {
      if (!address) throw new Error("Connect Freighter first");
      const signedXdr = await signXdrWithFreighter(
        tx.xdr,
        address,
        tx.networkPassphrase || NETWORK_PASSPHRASE
      );
      return api.submitSignedTx(signedXdr);
    },
    [address]
  );

  const value = useMemo(
    () => ({
      address,
      connecting,
      freighterAvailable,
      error,
      connect,
      disconnect,
      signAndSubmit,
    }),
    [
      address,
      connecting,
      freighterAvailable,
      error,
      connect,
      disconnect,
      signAndSubmit,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
