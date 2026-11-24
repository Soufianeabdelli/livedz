/**
 * DB-backed LiveSession coordinator.
 *
 * The Next.js web app writes commands ("PENDING", "STOPPING") and reads status
 * from Postgres. A separate worker process (`src/worker/live-worker.ts`) claims
 * sessions with a time-limited lease and maintains the TikTok WebSocket connections.
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { CaptureStatus } from "./types";

const DEFAULT_LEASE_MS = 30_000;

export type StartCaptureInput = {
  merchantId: string;
  tiktokUsername: string;
};

export type StartCaptureResult =
  | { ok: true; sessionId: string; sessionToken: string; claimPath: string }
  | { ok: false; error: "already_active" };

export async function startCapture(input: StartCaptureInput): Promise<StartCaptureResult> {
  const cleanUser = input.tiktokUsername.replace(/^@/, "").trim();
  const now = new Date();

  const existing = await prisma.liveSession.findFirst({
    where: {
      merchantId: input.merchantId,
      OR: [
        { status: "PENDING" },
        { status: "RUNNING", leaseExpiresAt: { gt: now } },
      ],
    },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "already_active" };

  // Mark any stale orphaned RUNNING sessions as ERROR before creating a new one
  await prisma.liveSession.updateMany({
    where: {
      merchantId: input.merchantId,
      status: { in: ["RUNNING", "STOPPING"] },
      OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
    },
    data: { status: "ERROR", lastError: "worker_lease_expired", stoppedAt: now },
  });

  const sessionToken = randomBytes(16).toString("base64url");
  const session = await prisma.liveSession.create({
    data: {
      merchantId: input.merchantId,
      sessionToken,
      tiktokUsername: cleanUser,
      status: "PENDING",
    },
    select: { id: true, sessionToken: true },
  });

  return {
    ok: true,
    sessionId: session.id,
    sessionToken: session.sessionToken,
    claimPath: `/l/${session.sessionToken}`,
  };
}

export async function stopCapture(merchantId: string): Promise<boolean> {
  const active = await prisma.liveSession.findFirst({
    where: { merchantId, status: { in: ["PENDING", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (!active) return false;

  if (active.status === "PENDING") {
    await prisma.liveSession.updateMany({
      where: { id: active.id, status: "PENDING" },
      data: { status: "STOPPED", stoppedAt: new Date() },
    });
  } else {
    await prisma.liveSession.updateMany({
      where: { id: active.id, status: "RUNNING" },
      data: { status: "STOPPING" },
    });
  }
  return true;
}

export async function getCaptureStatus(merchantId: string): Promise<CaptureStatus> {
  const row = await prisma.liveSession.findFirst({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });

  if (!row) {
    return {
      sessionId: null,
      sessionToken: null,
      claimPath: null,
      active: false,
      status: "IDLE",
      tiktokUsername: null,
      roomId: null,
      workerId: null,
      heartbeatAt: null,
      startedAt: null,
      lastError: null,
      commentsSeen: 0,
      ordersCreated: 0,
      questionsSeen: 0,
      errors: 0,
    };
  }

  const active = row.status === "PENDING" || row.status === "RUNNING" || row.status === "STOPPING";
  return {
    sessionId: row.id,
    sessionToken: row.sessionToken,
    claimPath: `/l/${row.sessionToken}`,
    active,
    status: row.status,
    tiktokUsername: row.tiktokUsername,
    roomId: row.roomId,
    workerId: row.workerId,
    heartbeatAt: row.heartbeatAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    lastError: row.lastError,
    commentsSeen: row.commentsSeen,
    ordersCreated: row.ordersCreated,
    questionsSeen: row.questionsSeen,
    errors: row.errors,
  };
}

export async function listRecentLiveQuestions(merchantId: string, take = 15) {
  return prisma.liveQuestion.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      tiktokUsername: true,
      productCode: true,
      comment: true,
      createdAt: true,
    },
  });
}

// ── Worker lease primitives ───────────────────────────────────────────

export type ClaimedSession = {
  id: string;
  merchantId: string;
  sessionToken: string;
  tiktokUsername: string;
  liveCodePrefix: string;
};

/**
 * Atomically claims one PENDING session or one RUNNING session with an expired lease.
 * Uses PostgreSQL FOR UPDATE SKIP LOCKED so multiple workers never grab the same live.
 */
export async function claimNextSession(
  workerId: string,
  leaseMs = DEFAULT_LEASE_MS,
): Promise<ClaimedSession | null> {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; merchantId: string; sessionToken: string; tiktokUsername: string }>>`
      SELECT "id", "merchantId", "sessionToken", "tiktokUsername"
      FROM "LiveSession"
      WHERE "status" = 'PENDING'
         OR ("status" = 'RUNNING' AND "leaseExpiresAt" < ${now})
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;

    const row = rows[0];
    if (!row) return null;

    await tx.liveSession.update({
      where: { id: row.id },
      data: {
        status: "RUNNING",
        workerId,
        heartbeatAt: now,
        leaseExpiresAt,
        startedAt: now,
      },
    });

    const merchant = await tx.merchant.findUnique({
      where: { id: row.merchantId },
      select: { liveCodePrefix: true },
    });

    return {
      id: row.id,
      merchantId: row.merchantId,
      sessionToken: row.sessionToken,
      tiktokUsername: row.tiktokUsername,
      liveCodePrefix: merchant?.liveCodePrefix ?? "K",
    };
  });
}

/**
 * Renews a worker's lease and persists counters. Returns false if the session was
 * requested to stop (`STOPPING`) or was taken over by another worker.
 */
export async function renewSessionLease(
  sessionId: string,
  workerId: string,
  stats: {
    roomId?: string | null;
    commentsSeen: number;
    ordersCreated: number;
    questionsSeen: number;
    errors: number;
    lastError?: string | null;
  },
  leaseMs = DEFAULT_LEASE_MS,
): Promise<boolean> {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);

  const res = await prisma.liveSession.updateMany({
    where: { id: sessionId, workerId, status: "RUNNING" },
    data: {
      heartbeatAt: now,
      leaseExpiresAt,
      roomId: stats.roomId ?? undefined,
      commentsSeen: stats.commentsSeen,
      ordersCreated: stats.ordersCreated,
      questionsSeen: stats.questionsSeen,
      errors: stats.errors,
      lastError: stats.lastError ?? undefined,
    },
  });
  return res.count === 1;
}

export async function markSessionStopped(
  sessionId: string,
  workerId: string,
  error?: string,
): Promise<void> {
  await prisma.liveSession.updateMany({
    where: { id: sessionId, workerId },
    data: {
      status: error ? "ERROR" : "STOPPED",
      lastError: error ? error.slice(0, 240) : null,
      stoppedAt: new Date(),
      leaseExpiresAt: null,
    },
  });
}
