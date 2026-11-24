/**
 * Live capture orchestrator.
 *
 * Ties together: LiveConnection -> parser -> order creator / question logger.
 * Runs inside the dedicated worker process (or standalone in tests).
 */

import type { CaptureStatus, LiveComment, LiveConnection, LiveEvent } from "./types";
import { parseComment } from "./parser";
import { createLiveOrder, recordLiveQuestion } from "./orders";

export type CaptureSessionOptions = {
  merchantId: string;
  sessionId?: string;
  sessionToken?: string;
  codePrefix?: string;
  connection: LiveConnection;
  onOrder?: (event: {
    orderId: string;
    productName: string;
    totalDzd: number;
    uniqueId: string;
    duplicate: boolean;
  }) => void;
  onQuestion?: (event: {
    uniqueId: string;
    productCode?: string;
    comment: string;
  }) => void;
  onStatus?: (status: CaptureStatus) => void;
};

export class CaptureSession {
  private readonly merchantId: string;
  private readonly sessionId: string | null;
  private readonly sessionToken: string | null;
  private readonly codePrefix: string;
  private readonly conn: LiveConnection;
  private readonly onOrder?: CaptureSessionOptions["onOrder"];
  private readonly onQuestion?: CaptureSessionOptions["onQuestion"];
  private readonly onStatus?: CaptureSessionOptions["onStatus"];

  private tiktokUsername: string | null = null;
  private roomId: string | null = null;
  private startedAt: string | null = null;
  private lastError: string | null = null;
  private commentsSeen = 0;
  private ordersCreated = 0;
  private questionsSeen = 0;
  private errors = 0;

  constructor(opts: CaptureSessionOptions) {
    this.merchantId = opts.merchantId;
    this.sessionId = opts.sessionId ?? null;
    this.sessionToken = opts.sessionToken ?? null;
    this.codePrefix = opts.codePrefix ?? "K";
    this.conn = opts.connection;
    this.onOrder = opts.onOrder;
    this.onQuestion = opts.onQuestion;
    this.onStatus = opts.onStatus;
  }

  async start(tiktokUsername: string): Promise<{ roomId: string }> {
    this.tiktokUsername = tiktokUsername;
    this.commentsSeen = 0;
    this.ordersCreated = 0;
    this.questionsSeen = 0;
    this.errors = 0;
    this.lastError = null;
    this.startedAt = new Date().toISOString();

    this.conn.onEvent((event) => {
      void this.handleEvent(event);
    });

    const state = await this.conn.connect();
    this.roomId = state.roomId;
    this.emitStatus();
    return state;
  }

  async stop(): Promise<void> {
    await this.conn.disconnect();
    this.roomId = null;
    this.startedAt = null;
    this.emitStatus();
  }

  getStatus(): CaptureStatus {
    return {
      sessionId: this.sessionId,
      sessionToken: this.sessionToken,
      claimPath: this.sessionToken ? `/l/${this.sessionToken}` : null,
      active: this.conn.connected,
      status: this.conn.connected ? "RUNNING" : "STOPPED",
      tiktokUsername: this.tiktokUsername,
      roomId: this.roomId,
      workerId: null,
      heartbeatAt: null,
      startedAt: this.startedAt,
      lastError: this.lastError,
      commentsSeen: this.commentsSeen,
      ordersCreated: this.ordersCreated,
      questionsSeen: this.questionsSeen,
      errors: this.errors,
    };
  }

  private async handleEvent(event: LiveEvent) {
    switch (event.type) {
      case "connected":
        this.roomId = event.roomId;
        this.emitStatus();
        break;
      case "chat":
        this.commentsSeen++;
        await this.processComment(event.comment);
        break;
      case "disconnected":
        console.warn("[capture] disconnected:", event.reason);
        this.emitStatus();
        break;
      case "error":
        this.errors++;
        this.lastError = event.message.slice(0, 200);
        console.error("[capture] error:", event.message);
        this.emitStatus();
        break;
    }
  }

  private async processComment(comment: LiveComment) {
    const intent = parseComment(comment.comment, { codePrefix: this.codePrefix });

    if (!intent.match) {
      if (intent.isQuestion) {
        this.questionsSeen++;
        await recordLiveQuestion({
          merchantId: this.merchantId,
          liveSessionId: this.sessionId ?? undefined,
          uniqueId: comment.uniqueId,
          productCode: intent.productCode,
          comment: comment.comment,
          msgId: comment.msgId,
        }).catch(() => {});
        this.onQuestion?.({
          uniqueId: comment.uniqueId,
          productCode: intent.productCode,
          comment: comment.comment,
        });
      }
      return;
    }

    const result = await createLiveOrder({
      merchantId: this.merchantId,
      liveSessionId: this.sessionId ?? undefined,
      msgId: comment.msgId,
      uniqueId: comment.uniqueId,
      nickname: comment.nickname,
      rawComment: comment.comment,
      intent,
    });

    if (result.ok) {
      if (!result.duplicate) this.ordersCreated++;
      this.onOrder?.({
        orderId: result.orderId,
        productName: result.productName,
        totalDzd: result.totalDzd,
        uniqueId: comment.uniqueId,
        duplicate: result.duplicate,
      });
    } else if (result.reason === "db_error") {
      this.errors++;
    }

    if (this.commentsSeen % 10 === 0) this.emitStatus();
  }

  private emitStatus() {
    this.onStatus?.(this.getStatus());
  }
}
