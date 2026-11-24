/**
 * TikTok Live adapter built on `tiktok-live-connector` v2.
 *
 * Keeps all library-specific event shapes isolated behind `LiveConnection`.
 */

import type { LiveComment, LiveConnection, LiveEventHandler } from "./types";

export type TikTokOptions = {
  /** TikTok @username without the leading @ */
  username: string;
  /** Optional TikTok `sessionid` cookie for authenticated access */
  sessionId?: string;
  /** Optional TikTok `tt-target-idc` cookie (e.g. "useast5", "maliva") */
  ttTargetIdc?: string;
  /** Optional EulerStream sign API key (defaults to TIKTOK_SIGN_API_KEY env) */
  signApiKey?: string;
};

type ConnectorEventPayload = {
  common?: { msgId?: string };
  user?: { displayId?: string; uniqueId?: string; nickname?: string; idStr?: string; id?: string };
  content?: string;
  comment?: string;
  uniqueId?: string;
  nickname?: string;
};

export class TikTokLiveConnectionAdapter implements LiveConnection {
  private handler: LiveEventHandler | null = null;
  private inner: { disconnect: () => Promise<void> | void } | null = null;
  private _connected = false;
  private readonly opts: TikTokOptions;

  constructor(opts: TikTokOptions) {
    this.opts = { ...opts, username: opts.username.replace(/^@/, "").trim() };
  }

  get connected() {
    return this._connected;
  }

  onEvent(handler: LiveEventHandler) {
    this.handler = handler;
  }

  async connect(): Promise<{ roomId: string }> {
    const mod = await import("tiktok-live-connector");
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = mod;

    const signApiKey = this.opts.signApiKey ?? process.env.TIKTOK_SIGN_API_KEY;
    const baseOpts = signApiKey ? { signApiKey } : {};
    const conn = this.opts.sessionId
      ? new TikTokLiveConnection(this.opts.username, {
          ...baseOpts,
          session: {
            cookie: {
              type: "cookie",
              value: {
                sessionId: this.opts.sessionId,
                ttTargetIdc: this.opts.ttTargetIdc ?? process.env.TIKTOK_TARGET_IDC ?? "useast5",
              },
            },
          },
          authenticateWs: true,
        })
      : new TikTokLiveConnection(this.opts.username, baseOpts);

    conn.on(WebcastEvent.CHAT, (raw: unknown) => {
      const d = raw as ConnectorEventPayload;
      const uniqueId = (
        d.user?.displayId ||
        d.user?.uniqueId ||
        d.uniqueId ||
        d.user?.idStr ||
        d.user?.id ||
        ""
      )
        .replace(/^@/, "")
        .trim();
      const text = d.content ?? d.comment ?? "";
      if (!uniqueId || !text) return;

      const comment: LiveComment = {
        msgId: d.common?.msgId || undefined,
        uniqueId,
        nickname: d.user?.nickname || d.nickname || uniqueId,
        comment: text,
        timestamp: new Date().toISOString(),
      };
      this.handler?.({ type: "chat", comment });
    });

    conn.on(ControlEvent.DISCONNECTED, (ev: { code?: number; reason?: string } | undefined) => {
      this._connected = false;
      const reason = ev?.reason || (ev?.code ? `code:${ev.code}` : "disconnected");
      this.handler?.({ type: "disconnected", reason });
    });

    conn.on(ControlEvent.ERROR, (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "info" in err
            ? String((err as { info?: unknown }).info)
            : String(err);
      this.handler?.({ type: "error", message: msg });
    });

    const state = await conn.connect();
    this._connected = true;
    this.inner = conn;
    this.handler?.({ type: "connected", roomId: state.roomId });
    return { roomId: state.roomId };
  }

  async disconnect(): Promise<void> {
    if (this.inner) {
      await Promise.resolve(this.inner.disconnect());
    }
    this._connected = false;
    this.inner = null;
  }
}

export { TikTokLiveConnectionAdapter as TikTokLiveConnection };
