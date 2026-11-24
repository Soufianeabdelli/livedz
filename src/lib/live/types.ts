/**
 * Types for the live-comment capture module.
 *
 * Platform-agnostic: the parser and order creator work with these types,
 * while platform adapters (TikTok, Instagram, …) emit them.
 */

/** A chat message received from a live stream. */
export type LiveComment = {
  /** Platform message ID (used for idempotency when available) */
  msgId?: string;
  /** Platform-specific unique user handle (without @) */
  uniqueId: string;
  /** Display name the viewer chose */
  nickname: string;
  /** Raw comment text */
  comment: string;
  /** ISO timestamp */
  timestamp: string;
  /** URL to the viewer's profile picture (optional) */
  profilePictureUrl?: string;
};

/**
 * What the parser extracts from a comment.
 * A single comment can match at most one product code, or be flagged as a question.
 */
export type ParsedIntent =
  | { match: false; isQuestion?: false }
  | { match: false; isQuestion: true; productCode?: string }
  | {
      match: true;
      /** Product code the viewer wrote, e.g. "K1", "P3" */
      productCode: string;
      /** Quantity, default 1 */
      quantity: number;
      /** Optional size hint, e.g. "L", "42" */
      size?: string;
      /** Optional color hint, e.g. "noir", "أسود" */
      color?: string;
    };

/** Events emitted by a LiveConnection. */
export type LiveEvent =
  | { type: "connected"; roomId: string }
  | { type: "chat"; comment: LiveComment }
  | { type: "disconnected"; reason: string }
  | { type: "error"; message: string };

export type LiveEventHandler = (event: LiveEvent) => void;

/** A connection to one live stream. Platform adapters implement this. */
export interface LiveConnection {
  /** Connect and start receiving events. Resolves when the connection is established. */
  connect(): Promise<{ roomId: string }>;
  /** Gracefully disconnect. */
  disconnect(): Promise<void>;
  /** Whether the connection is currently live. */
  readonly connected: boolean;
  /** Register the single event handler (call before connect). */
  onEvent(handler: LiveEventHandler): void;
}

/** Lightweight result of creating an order from a live comment. */
export type LiveOrderResult =
  | { ok: true; orderId: string; productName: string; totalDzd: number; duplicate: boolean }
  | { ok: false; reason: "product_not_found" | "out_of_stock" | "db_error" };

/** Status of a live capture session for the dashboard (DB-backed). */
export type CaptureStatus = {
  sessionId: string | null;
  sessionToken: string | null;
  claimPath: string | null;
  active: boolean;
  status: "IDLE" | "PENDING" | "RUNNING" | "STOPPING" | "STOPPED" | "ERROR";
  tiktokUsername: string | null;
  roomId: string | null;
  workerId: string | null;
  heartbeatAt: string | null;
  startedAt: string | null;
  lastError: string | null;
  commentsSeen: number;
  ordersCreated: number;
  questionsSeen: number;
  errors: number;
};
