import crypto from "crypto";

export type CaptchaAction = "order" | "login";

export const CAPTCHA_COOLDOWN_COOKIE = "captcha_cd";

type TokenTyp = "gate" | "waive" | "solved" | "cd";

interface BasePayload {
  v: 1;
  typ: TokenTyp;
  exp: number;
}

export interface GatePayload extends BasePayload {
  typ: "gate";
  act: CaptchaAction;
  need: boolean;
  /** productId (order) or normalized email (login) */
  ctx: string;
  n: string;
}

export interface WaivePayload extends BasePayload {
  typ: "waive";
  act: CaptchaAction;
  ctx: string;
  n: string;
}

export interface SolvedPayload extends BasePayload {
  typ: "solved";
  act: CaptchaAction;
  ctx: string;
  n: string;
}

interface CooldownPayload extends BasePayload {
  typ: "cd";
}

function getHmacSecret(): string {
  const s = process.env.CAPTCHA_HMAC_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CAPTCHA_HMAC_SECRET is required in production (min 16 chars)");
  }
  return "dev-only-captcha-hmac-secret";
}

function signPayload(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", getHmacSecret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function parseSignedToken<T extends BasePayload>(token: string): { ok: true; payload: T } | { ok: false; reason: string } {
  const trimmed = token.trim();
  if (!trimmed.includes(".")) return { ok: false, reason: "malformed" };
  const [body, mac] = trimmed.split(".", 2);
  if (!body || !mac) return { ok: false, reason: "malformed" };
  const expected = crypto.createHmac("sha256", getHmacSecret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }
  try {
    const json = Buffer.from(body, "base64url").toString("utf8");
    const payload = JSON.parse(json) as T;
    if (!payload || typeof payload !== "object") return { ok: false, reason: "invalid" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function normalizeLoginCtx(email: string): string {
  return email.trim().toLowerCase();
}

export function createGateToken(params: {
  act: CaptchaAction;
  need: boolean;
  ctx: string;
  ttlMs?: number;
}): string {
  const n = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + (params.ttlMs ?? 3 * 60 * 1000);
  const p: GatePayload = { v: 1, typ: "gate", act: params.act, need: params.need, ctx: params.ctx, n, exp };
  return signPayload(p as unknown as Record<string, unknown>);
}

export function createWaivePass(params: { act: CaptchaAction; ctx: string; ttlMs?: number }): string {
  const n = crypto.randomBytes(8).toString("hex");
  const exp = Date.now() + (params.ttlMs ?? 3 * 60 * 1000);
  const p: WaivePayload = { v: 1, typ: "waive", act: params.act, ctx: params.ctx, n, exp };
  return signPayload(p as unknown as Record<string, unknown>);
}

export function createSolvedPassFromGate(gate: GatePayload, ttlMs?: number): string {
  const exp = Date.now() + (ttlMs ?? 3 * 60 * 1000);
  const p: SolvedPayload = { v: 1, typ: "solved", act: gate.act, ctx: gate.ctx, n: gate.n, exp };
  return signPayload(p as unknown as Record<string, unknown>);
}

export function parseAndVerifyGateToken(
  token: string,
): { ok: true; gate: GatePayload } | { ok: false; reason: string } {
  const r = parseSignedToken<GatePayload>(token);
  if (!r.ok) return { ok: false, reason: r.reason };
  const p = r.payload;
  if (p.v !== 1 || p.typ !== "gate") return { ok: false, reason: "wrong_type" };
  if (p.exp <= Date.now()) return { ok: false, reason: "expired" };
  if (!p.n || typeof p.ctx !== "string" || (p.act !== "order" && p.act !== "login")) {
    return { ok: false, reason: "invalid" };
  }
  if (typeof p.need !== "boolean") return { ok: false, reason: "invalid" };
  return { ok: true, gate: p };
}

export function parseAndVerifyActionPass(
  token: string,
  expected: { act: CaptchaAction; ctx: string },
): { ok: true } | { ok: false; reason: string } {
  const r = parseSignedToken<WaivePayload | SolvedPayload>(token);
  if (!r.ok) return { ok: false, reason: r.reason };
  const p = r.payload;
  if (p.v !== 1) return { ok: false, reason: "wrong_type" };
  if (p.typ !== "waive" && p.typ !== "solved") return { ok: false, reason: "wrong_type" };
  if (p.act !== expected.act) return { ok: false, reason: "wrong_action" };
  if (p.ctx !== expected.ctx) return { ok: false, reason: "context_mismatch" };
  if (p.exp <= Date.now()) return { ok: false, reason: "expired" };
  return { ok: true };
}

export function createCooldownCookieValue(cooldownMinutes: number): string {
  const exp = Date.now() + cooldownMinutes * 60 * 1000;
  const p: CooldownPayload = { v: 1, typ: "cd", exp };
  return signPayload(p as unknown as Record<string, unknown>);
}

export function verifyCooldownCookieValue(cookieVal: string): boolean {
  const r = parseSignedToken<CooldownPayload>(cookieVal);
  if (!r.ok || r.payload.v !== 1 || r.payload.typ !== "cd") return false;
  return r.payload.exp > Date.now();
}
