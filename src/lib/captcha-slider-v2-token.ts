import crypto from "crypto";

import type { TrailPoint } from "@/lib/captcha-trajectory";
import { analyzeTrajectory } from "@/lib/captcha-trajectory";

const SLIDER_V2_TTL_MS = 5 * 60 * 1000;
const POSITION_TOL_PX = 10;

export interface SliderV2Payload {
  typ: "slider_v2";
  v: 2;
  exp: number;
  /** 目标缺口中心 X（背景图坐标） */
  tx: number;
  ty: number;
  /** 滑块左缘对齐到目标时，拼图块中心 X = tx */
  pieceCenterOffsetX: number;
  pieceCenterOffsetY: number;
  bgW: number;
  bgH: number;
  sliderW: number;
  sliderH: number;
  /** 防重放 */
  nonce: string;
}

const usedNonces = new Map<string, number>();

function pruneUsedNonces(): void {
  const now = Date.now();
  const maxAge = SLIDER_V2_TTL_MS + 60_000;
  usedNonces.forEach((t, n) => {
    if (now - t > maxAge) usedNonces.delete(n);
  });
}

function getHmacSecret(): string {
  const s = process.env.CAPTCHA_HMAC_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CAPTCHA_HMAC_SECRET is required in production (min 16 chars)");
  }
  return "dev-only-captcha-hmac-secret";
}

function signJsonPayload(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", getHmacSecret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function createSliderV2Token(payload: Omit<SliderV2Payload, "exp" | "nonce"> & { nonce: string }): string {
  const full: SliderV2Payload = {
    ...payload,
    exp: Date.now() + SLIDER_V2_TTL_MS,
  };
  return signJsonPayload(full as unknown as Record<string, unknown>);
}

function parseSliderV2Token(token: string): { ok: true; payload: SliderV2Payload } | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "invalid_token_format" };
  const [body, sig] = parts;
  if (!body || !sig) return { ok: false, error: "invalid_token_format" };
  const expectedMac = crypto.createHmac("sha256", getHmacSecret()).update(body).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedMac))) {
      return { ok: false, error: "invalid_signature" };
    }
  } catch {
    return { ok: false, error: "invalid_signature" };
  }
  let payload: SliderV2Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SliderV2Payload;
  } catch {
    return { ok: false, error: "invalid_payload" };
  }
  if (payload.typ !== "slider_v2" || payload.v !== 2) {
    return { ok: false, error: "wrong_challenge_type" };
  }
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
    return { ok: false, error: "expired" };
  }
  if (
    typeof payload.tx !== "number" ||
    typeof payload.ty !== "number" ||
    typeof payload.pieceCenterOffsetX !== "number" ||
    typeof payload.pieceCenterOffsetY !== "number" ||
    typeof payload.bgW !== "number" ||
    typeof payload.bgH !== "number" ||
    typeof payload.sliderW !== "number" ||
    typeof payload.sliderH !== "number" ||
    typeof payload.nonce !== "string"
  ) {
    return { ok: false, error: "invalid_payload" };
  }
  return { ok: true, payload };
}

export function verifySliderV2Challenge(
  token: string,
  userX: number,
  userY: number,
  trail: TrailPoint[],
): { ok: true } | { ok: false; reason: "position_mismatch" | "trajectory_suspicious" | "token_invalid" | "token_expired" } {
  pruneUsedNonces();
  const parsed = parseSliderV2Token(token);
  if (!parsed.ok) {
    const err = parsed.error;
    if (err === "expired") return { ok: false, reason: "token_expired" };
    return { ok: false, reason: "token_invalid" };
  }
  const { payload } = parsed;

  if (usedNonces.has(payload.nonce)) {
    return { ok: false, reason: "token_invalid" };
  }

  const pieceCx = userX;
  const pieceCy = userY;
  const dist = Math.hypot(pieceCx - payload.tx, pieceCy - payload.ty);
  if (dist > POSITION_TOL_PX) {
    return { ok: false, reason: "position_mismatch" };
  }

  const { suspicious } = analyzeTrajectory(trail);
  if (suspicious) {
    return { ok: false, reason: "trajectory_suspicious" };
  }

  usedNonces.set(payload.nonce, Date.now());
  return { ok: true };
}
