import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  claimNextSession,
  getCaptureStatus,
  markSessionStopped,
  renewSessionLease,
  startCapture,
  stopCapture,
} from "@/lib/live/session-manager";

const tag = randomBytes(4).toString("hex");
let m1 = "";
let m2 = "";

beforeAll(async () => {
  m1 = (await prisma.merchant.create({ data: { name: "M1", slug: `sm1-${tag}` } })).id;
  m2 = (await prisma.merchant.create({ data: { name: "M2", slug: `sm2-${tag}` } })).id;
});

beforeEach(async () => {
  await prisma.liveSession.deleteMany({ where: { merchantId: { in: [m1, m2] } } });
});

afterAll(async () => {
  await prisma.liveSession.deleteMany({ where: { merchantId: { in: [m1, m2] } } });
  await prisma.merchant.deleteMany({ where: { id: { in: [m1, m2] } } });
  await prisma.$disconnect();
});

describe("DB-backed LiveSession coordinator", () => {
  it("prevents starting two simultaneous active sessions for the same merchant", async () => {
    const a = await startCapture({ merchantId: m1, tiktokUsername: "@shop1" });
    expect(a.ok).toBe(true);
    const b = await startCapture({ merchantId: m1, tiktokUsername: "@shop1" });
    expect(b).toEqual({ ok: false, error: "already_active" });
  });

  it("claims sessions atomically across competing workers and honors STOPPING signal", async () => {
    const s = await startCapture({ merchantId: m1, tiktokUsername: "shop_live" });
    expect(s.ok).toBe(true);
    if (!s.ok) return;

    // Two workers race to claim the single PENDING session
    const [c1, c2] = await Promise.all([
      claimNextSession(`w1-${tag}`),
      claimNextSession(`w2-${tag}`),
    ]);
    const winners = [c1, c2].filter(Boolean);
    expect(winners).toHaveLength(1);
    const winnerId = c1 ? `w1-${tag}` : `w2-${tag}`;

    const keep1 = await renewSessionLease(s.sessionId, winnerId, {
      roomId: "r-99",
      commentsSeen: 12,
      ordersCreated: 3,
      questionsSeen: 2,
      errors: 0,
    });
    expect(keep1).toBe(true);

    const status = await getCaptureStatus(m1);
    expect(status.status).toBe("RUNNING");
    expect(status.commentsSeen).toBe(12);
    expect(status.claimPath).toBe(`/l/${s.sessionToken}`);

    // Merchant stops capture -> status becomes STOPPING -> worker sees renewSessionLease=false
    expect(await stopCapture(m1)).toBe(true);
    const keep2 = await renewSessionLease(s.sessionId, winnerId, {
      roomId: "r-99",
      commentsSeen: 13,
      ordersCreated: 3,
      questionsSeen: 2,
      errors: 0,
    });
    expect(keep2).toBe(false);

    await markSessionStopped(s.sessionId, winnerId);
    expect((await getCaptureStatus(m1)).status).toBe("STOPPED");
  });

  it("allows another worker to take over an expired lease", async () => {
    const s = await startCapture({ merchantId: m2, tiktokUsername: "shop2" });
    if (!s.ok) throw new Error("start failed");

    const claimed = await claimNextSession(`dead-worker-${tag}`, -5_000); // already expired lease
    expect(claimed?.id).toBe(s.sessionId);

    const takeover = await claimNextSession(`healthy-worker-${tag}`);
    expect(takeover?.id).toBe(s.sessionId);
  });
});
