export const OVERLAY_PLATFORMS = ["tiktok", "instagram", "youtube", "facebook", "twitch", "kick"] as const;
export type OverlayPlatform = (typeof OVERLAY_PLATFORMS)[number];

export function resolveOverlayPlatform(raw?: string | null): OverlayPlatform {
  const clean = (raw ?? "").trim().toLowerCase();
  if ((OVERLAY_PLATFORMS as readonly string[]).includes(clean)) {
    return clean as OverlayPlatform;
  }
  return "tiktok";
}

export function isQrAllowedOnPlatform(platform: OverlayPlatform): boolean {
  return platform !== "tiktok" && platform !== "instagram";
}
