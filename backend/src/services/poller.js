import {
  fetchContractEvents,
  getLatestLedger,
} from "./stellar.js";
import {
  getIndexerCursor,
  setIndexerCursor,
  indexEvent,
  parseRpcEvent,
} from "./indexer.js";

const POLL_MS = Number(process.env.INDEXER_POLL_MS || 15000);
let timer = null;
let running = false;

async function pollOnce() {
  if (running) return;
  running = true;
  try {
    const latest = await getLatestLedger();
    let start = Number((await getIndexerCursor()) || 0);
    const network = process.env.STELLAR_NETWORK || "mainnet";
    const networkKey = "soroban_network";
    const storedNetwork = await getIndexerCursor(networkKey);

    // Reset cursor when network changes or lag is too large (e.g. Testnet → Mainnet).
    const lag = start > 0 ? latest - start : Number.POSITIVE_INFINITY;
    if (storedNetwork !== network || !start || start < 1 || lag > 2_000) {
      start = Math.max(1, latest - 200);
      await setIndexerCursor(start);
      await setIndexerCursor(network, networkKey);
      console.log(
        `Indexer: cursor reset to ${start} on ${network} (tip ${latest})`
      );
    }

    if (start >= latest) {
      running = false;
      return;
    }

    const end = Math.min(latest, start + 500);
    const { events } = await fetchContractEvents({
      startLedger: start,
      endLedger: end,
      limit: 100,
    });

    for (const ev of events) {
      const parsed = parseRpcEvent(ev);
      if (
        !parsed.eventName ||
        parsed.eventName === "[object Object]" ||
        parsed.eventName === "[objectObject]" ||
        parsed.eventName === "Unknown" ||
        /^\[object/i.test(String(parsed.eventName))
      ) {
        continue;
      }
      await indexEvent(
        parsed.eventName,
        parsed.payload,
        parsed.txHash,
        parsed.ledger
      );
    }

    await setIndexerCursor(end + 1);
    if (events.length) {
      console.log(`Indexer: processed ${events.length} events through ledger ${end}`);
    }
  } catch (err) {
    console.warn("Indexer poll error:", err.message);
  } finally {
    running = false;
  }
}

export function startEventIndexer() {
  if (process.env.INDEXER_ENABLED === "false") {
    console.log("Soroban event indexer disabled");
    return;
  }
  if (timer) return;
  console.log(`Starting Soroban event indexer (every ${POLL_MS}ms)`);
  pollOnce();
  timer = setInterval(pollOnce, POLL_MS);
}

export function stopEventIndexer() {
  if (timer) clearInterval(timer);
  timer = null;
}
