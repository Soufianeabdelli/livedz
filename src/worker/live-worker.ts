/**
 * Standalone Live Capture Worker.
 *
 * Runs outside Next.js (via `npm run worker:live` or Docker worker service),
 * claims PENDING / expired-lease LiveSession rows from Postgres, holds long-lived
 * TikTok WebSocket connections, renews heartbeats, and sweeps expired live drafts.
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { CaptureSession } from "@/lib/live/capture";
import { expireStaleLiveDrafts } from "@/lib/live/orders";
import {
  claimNextSession,
  markSessionStopped,
  renewSessionLease,
} from "@/lib/live/session-manager";
import { TikTokLiveConnection } from "@/lib/live/tiktok";

const WORKER_ID = `worker-${process.pid}-${randomUUID().slice(0, 6)}`;
const POLL_MS = 3_000;
const HEARTBEAT_MS = 10_000;
const SWEEP_MS = 60_000;

type ActiveSlot = {
  sessionId: string;
  capture: CaptureSession;
  timer: ReturnType<typeof setInterval>;
};

const active = new Map<string, ActiveSlot>();
let shuttingDown = false;

async function startOwnedSession() {
  const claimed = await claimNextSession(WORKER_ID);
  if (!claimed) return false;

  const conn = new TikTokLiveConnection({
    username: claimed.tiktokUsername,
    sessionId: process.env.TIKTOK_SESSION_ID || undefined,
    signApiKey: process.env.TIKTOK_SIGN_API_KEY || undefined,
  });

  const capture = new CaptureSession({
    merchantId: claimed.merchantId,
    sessionId: claimed.id,
    sessionToken: claimed.sessionToken,
    codePrefix: claimed.liveCodePrefix,
    connection: conn,
  });

  try {
    await capture.start(claimed.tiktokUsername);
    console.log(`[${WORKER_ID}] connected @${claimed.tiktokUsername} (${claimed.id})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${WORKER_ID}] connect failed for @${claimed.tiktokUsername}:`, msg);
    await markSessionStopped(claimed.id, WORKER_ID, msg);
    return true;
  }

  const timer = setInterval(async () => {
    const st = capture.getStatus();
    const keepGoing = await renewSessionLease(claimed.id, WORKER_ID, {
      roomId: st.roomId,
      commentsSeen: st.commentsSeen,
      ordersCreated: st.ordersCreated,
      questionsSeen: st.questionsSeen,
      errors: st.errors,
      lastError: st.lastError,
    });
    if (!keepGoing || !st.active) {
      await teardownSlot(claimed.id, keepGoing ? st.lastError ?? "disconnected" : undefined);
    }
  }, HEARTBEAT_MS);

  active.set(claimed.id, { sessionId: claimed.id, capture, timer });
  return true;
}

async function teardownSlot(sessionId: string, error?: string) {
  const slot = active.get(sessionId);
  if (!slot) return;
  active.delete(sessionId);
  clearInterval(slot.timer);
  await slot.capture.stop().catch(() => {});
  await markSessionStopped(sessionId, WORKER_ID, error).catch(() => {});
  console.log(`[${WORKER_ID}] stopped session ${sessionId}${error ? ` (${error})` : ""}`);
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[${WORKER_ID}] shutting down (${active.size} active sessions)...`);
  await Promise.all([...active.keys()].map((id) => teardownSlot(id, "worker_shutdown")));
  await prisma.$disconnect();
  process.exit(0);
}

async function main() {
  console.log(`[${WORKER_ID}] LiveDZ worker started`);
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  // Periodic expiry sweep for unclaimed live DRAFT orders
  setInterval(() => {
    void expireStaleLiveDrafts()
      .then((n) => {
        if (n > 0) console.log(`[${WORKER_ID}] expired ${n} unclaimed live draft(s)`);
      })
      .catch((e) => console.error(`[${WORKER_ID}] expiry sweep error:`, e));
  }, SWEEP_MS);

  while (!shuttingDown) {
    try {
      // Drain any pending sessions before sleeping
      while (!shuttingDown && (await startOwnedSession())) {
        // continue claiming
      }
    } catch (e) {
      console.error(`[${WORKER_ID}] poll error:`, e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

void main();
