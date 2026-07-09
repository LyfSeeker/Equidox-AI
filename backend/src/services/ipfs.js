import crypto from "crypto";

/**
 * Uploads JSON to IPFS if configured, otherwise returns a deterministic SHA-256 digest
 * formatted as a 32-byte hex string suitable for Soroban BytesN<32>.
 */
export async function uploadJsonToIpfs(data) {
  const json = JSON.stringify(data);
  const hash = crypto.createHash("sha256").update(json).digest();

  if (process.env.IPFS_API_URL) {
    try {
      const res = await fetch(`${process.env.IPFS_API_URL}/api/v0/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      if (res.ok) {
        const result = await res.json();
        const cidHash = crypto.createHash("sha256").update(result.Hash).digest();
        return {
          ipfsCid: result.Hash,
          hashBytes: Buffer.from(cidHash).toString("hex"),
          gatewayUrl: `${process.env.IPFS_GATEWAY}${result.Hash}`,
        };
      }
    } catch {
      // fall through to local hash
    }
  }

  return {
    ipfsCid: null,
    hashBytes: hash.toString("hex"),
    gatewayUrl: null,
  };
}

export function hexToBytesN32(hex) {
  const buf = Buffer.from(hex.padStart(64, "0").slice(0, 64), "hex");
  if (buf.length !== 32) throw new Error("Hash must be 32 bytes");
  return buf;
}
