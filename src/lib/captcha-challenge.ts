import crypto from "crypto";

export type MathOperator = "+" | "-" | "×";

export interface MathProblem {
  question: string;
  answer: number;
}

interface MathChallengePayload {
  typ: "math";
  v: 1;
  exp: number;
  answer: number;
}

const TOKEN_TTL_MS = 10 * 60 * 1000;

function getHmacSecret(): string {
  const s = process.env.CAPTCHA_HMAC_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CAPTCHA_HMAC_SECRET is required in production (min 16 chars)");
  }
  return "dev-only-captcha-hmac-secret";
}

/** Same distribution as the former client-only math captcha. */
export function generateMathProblem(): MathProblem {
  const ops: MathOperator[] = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number;
  let b: number;
  let answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * 50) + 10;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * 50) + 30;
      b = Math.floor(Math.random() * 30) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      answer = a * b;
      break;
    default: {
      const _never: never = op;
      throw new Error(`unexpected op: ${_never}`);
    }
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}

function signPayload(payload: MathChallengePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", getHmacSecret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function createMathChallengeToken(answer: number): string {
  const payload: MathChallengePayload = {
    typ: "math",
    v: 1,
    exp: Date.now() + TOKEN_TTL_MS,
    answer,
  };
  return signPayload(payload);
}

export function verifyMathChallengeToken(
  token: string,
  submittedAnswer: number,
): { ok: true } | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { ok: false, error: "invalid_token_format" };
  }
  const [body, sig] = parts;
  if (!body || !sig) {
    return { ok: false, error: "invalid_token_format" };
  }
  const expectedMac = crypto.createHmac("sha256", getHmacSecret()).update(body).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedMac))) {
      return { ok: false, error: "invalid_signature" };
    }
  } catch {
    return { ok: false, error: "invalid_signature" };
  }

  let payload: MathChallengePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MathChallengePayload;
  } catch {
    return { ok: false, error: "invalid_payload" };
  }

  if (payload.typ !== "math" || payload.v !== 1) {
    return { ok: false, error: "wrong_challenge_type" };
  }
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
    return { ok: false, error: "expired" };
  }
  if (typeof payload.answer !== "number" || Number(submittedAnswer) !== payload.answer) {
    return { ok: false, error: "wrong_answer" };
  }

  return { ok: true };
}

/**
 * Slider: `slider-captcha-js` keeps the true notch position on the client; the server
 * cannot cryptographically verify the slide offset. This only enforces coarse
 * anti-bot heuristics (see SPEC_CAPTCHA.md).
 */
export function verifySliderHeuristicPayload(data: {
  x: unknown;
  duration: unknown;
  trail: unknown;
}): { ok: true } | { ok: false; error: string } {
  if (typeof data.x !== "number" || Number.isNaN(data.x)) {
    return { ok: false, error: "invalid_x" };
  }
  if (data.x < 0 || data.x > 400) {
    return { ok: false, error: "x_out_of_range" };
  }
  if (typeof data.duration !== "number" || Number.isNaN(data.duration)) {
    return { ok: false, error: "invalid_duration" };
  }
  if (data.duration < 400 || data.duration > 180_000) {
    return { ok: false, error: "duration_out_of_range" };
  }
  if (!Array.isArray(data.trail) || data.trail.length < 5) {
    return { ok: false, error: "trail_too_short" };
  }
  for (const pt of data.trail) {
    if (!Array.isArray(pt) || pt.length !== 2) {
      return { ok: false, error: "invalid_trail" };
    }
    if (typeof pt[0] !== "number" || typeof pt[1] !== "number") {
      return { ok: false, error: "invalid_trail" };
    }
  }
  return { ok: true };
}
