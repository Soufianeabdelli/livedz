import { describe, it, expect } from "vitest";
import { isQrAllowedOnPlatform, resolveOverlayPlatform } from "./overlay-platform";

describe("overlay-platform", () => {
  it("defaults unknown or empty platform to tiktok (safe mode)", () => {
    expect(resolveOverlayPlatform(undefined)).toBe("tiktok");
    expect(resolveOverlayPlatform("unknown")).toBe("tiktok");
    expect(resolveOverlayPlatform("YouTube")).toBe("youtube");
  });

  it("hides QR codes on tiktok and instagram, allows them on youtube/facebook/twitch/kick", () => {
    expect(isQrAllowedOnPlatform("tiktok")).toBe(false);
    expect(isQrAllowedOnPlatform("instagram")).toBe(false);
    expect(isQrAllowedOnPlatform("youtube")).toBe(true);
    expect(isQrAllowedOnPlatform("facebook")).toBe(true);
    expect(isQrAllowedOnPlatform("twitch")).toBe(true);
    expect(isQrAllowedOnPlatform("kick")).toBe(true);
  });
});
