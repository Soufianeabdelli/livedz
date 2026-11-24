import { describe, it, expect, vi, beforeEach } from "vitest";
import { CaptureSession } from "./capture";
import type { CaptureStatus, LiveConnection, LiveEventHandler, LiveEvent } from "./types";

class MockConnection implements LiveConnection {
  handler: LiveEventHandler | null = null;
  private _connected = false;

  get connected() {
    return this._connected;
  }

  onEvent(handler: LiveEventHandler) {
    this.handler = handler;
  }

  async connect() {
    this._connected = true;
    this.handler?.({ type: "connected", roomId: "room-123" });
    return { roomId: "room-123" };
  }

  async disconnect() {
    this._connected = false;
    this.handler?.({ type: "disconnected", reason: "manual" });
  }

  emit(event: LiveEvent) {
    this.handler?.(event);
  }
}

vi.mock("./orders", () => ({
  createLiveOrder: vi.fn().mockResolvedValue({
    ok: true,
    orderId: "order-abc",
    productName: "Test Product",
    totalDzd: 2500,
    duplicate: false,
  }),
  recordLiveQuestion: vi.fn().mockResolvedValue(undefined),
}));

type OrderCallback = (e: {
  orderId: string;
  productName: string;
  totalDzd: number;
  uniqueId: string;
  duplicate: boolean;
}) => void;
type QuestionCallback = (e: { uniqueId: string; productCode?: string; comment: string }) => void;
type StatusCallback = (s: CaptureStatus) => void;

describe("CaptureSession", () => {
  let conn: MockConnection;
  let session: CaptureSession;
  let onOrderSpy: ReturnType<typeof vi.fn<OrderCallback>>;
  let onQuestionSpy: ReturnType<typeof vi.fn<QuestionCallback>>;
  let onStatusSpy: ReturnType<typeof vi.fn<StatusCallback>>;

  beforeEach(() => {
    conn = new MockConnection();
    onOrderSpy = vi.fn<OrderCallback>();
    onQuestionSpy = vi.fn<QuestionCallback>();
    onStatusSpy = vi.fn<StatusCallback>();
    session = new CaptureSession({
      merchantId: "merch-1",
      sessionToken: "AbCdEfGhIjKlMnOpQrStUv",
      connection: conn,
      onOrder: onOrderSpy,
      onQuestion: onQuestionSpy,
      onStatus: onStatusSpy,
    });
  });

  it("starts and reports connected status with claimPath", async () => {
    await session.start("testuser");
    const status = session.getStatus();
    expect(status.active).toBe(true);
    expect(status.roomId).toBe("room-123");
    expect(status.tiktokUsername).toBe("testuser");
    expect(status.claimPath).toBe("/l/AbCdEfGhIjKlMnOpQrStUv");
    expect(onStatusSpy).toHaveBeenCalled();
  });

  it("stops and reports disconnected status", async () => {
    await session.start("testuser");
    await session.stop();
    const status = session.getStatus();
    expect(status.active).toBe(false);
    expect(status.roomId).toBeNull();
  });

  it("processes a matching comment and calls onOrder", async () => {
    await session.start("testuser");
    conn.emit({
      type: "chat",
      comment: {
        msgId: "msg-1",
        uniqueId: "viewer1",
        nickname: "Viewer One",
        comment: "K1",
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((r) => setTimeout(r, 30));

    expect(onOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-abc",
        productName: "Test Product",
        uniqueId: "viewer1",
        duplicate: false,
      }),
    );
    expect(session.getStatus().commentsSeen).toBe(1);
    expect(session.getStatus().ordersCreated).toBe(1);
  });

  it("records a question without creating an order", async () => {
    await session.start("testuser");
    conn.emit({
      type: "chat",
      comment: {
        uniqueId: "viewer3",
        nickname: "Viewer Three",
        comment: "K1 شحال",
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((r) => setTimeout(r, 30));

    expect(onOrderSpy).not.toHaveBeenCalled();
    expect(onQuestionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ uniqueId: "viewer3", productCode: "K1" }),
    );
    expect(session.getStatus().questionsSeen).toBe(1);
    expect(session.getStatus().ordersCreated).toBe(0);
  });

  it("ignores a non-matching comment", async () => {
    await session.start("testuser");
    conn.emit({
      type: "chat",
      comment: {
        uniqueId: "viewer2",
        nickname: "Viewer Two",
        comment: "hello everyone 🔥",
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((r) => setTimeout(r, 30));

    expect(onOrderSpy).not.toHaveBeenCalled();
    expect(session.getStatus().commentsSeen).toBe(1);
    expect(session.getStatus().ordersCreated).toBe(0);
  });

  it("tracks errors from connection", async () => {
    await session.start("testuser");
    conn.emit({ type: "error", message: "connection lost" });
    expect(session.getStatus().errors).toBe(1);
    expect(session.getStatus().lastError).toBe("connection lost");
  });
});
