import { NextRequest, NextResponse } from "next/server";
import {
  verifyMathChallengeToken,
  verifySliderChallengeToken,
  verifySliderHeuristicPayload,
} from "@/lib/captcha-challenge";
import {
  CAPTCHA_COOLDOWN_COOKIE,
  createCooldownCookieValue,
  createSolvedPassFromGate,
  parseAndVerifyGateToken,
} from "@/lib/captcha-action-proof";
import type { TrailPoint } from "@/lib/captcha-trajectory";
import { verifySliderV2Challenge } from "@/lib/captcha-slider-v2-token";
import { readCaptchaRuntimeConfig } from "@/lib/captcha-runtime-store";

export const dynamic = "force-dynamic";

interface MathVerifyBody {
  captchaType: "math";
  token: string;
  answer: number;
}

interface SliderVerifyBody {
  captchaType: "slider";
  token: string;
  x: number;
  duration: number;
  trail: [number, number][];
  targetType?: string;
}

interface SliderV2VerifyBody {
  captchaType: "slider_v2";
  token: string;
  userX: number;
  userY: number;
  trail: TrailPoint[];
}

type VerifyRequestBody = MathVerifyBody | SliderVerifyBody | SliderV2VerifyBody;

async function successResponseWithOptionalGate(
  body: Partial<VerifyRequestBody> & { pendingGateToken?: string },
): Promise<NextResponse> {
  const pendingRaw = typeof body.pendingGateToken === "string" ? body.pendingGateToken.trim() : "";
  if (!pendingRaw) {
    return NextResponse.json({ success: true });
  }
  const g = parseAndVerifyGateToken(pendingRaw);
  if (!g.ok || !g.gate.need) {
    return NextResponse.json({ success: false, error: "invalid_or_expired_gate" }, { status: 400 });
  }
  const actionPassToken = createSolvedPassFromGate(g.gate);
  const cfg = await readCaptchaRuntimeConfig();
  const res = NextResponse.json({ success: true, actionPassToken });
  res.cookies.set(CAPTCHA_COOLDOWN_COOKIE, createCooldownCookieValue(cfg.cooldown_minutes), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cfg.cooldown_minutes * 60,
  });
  return res;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<VerifyRequestBody> & {
      captchaType?: string;
      pendingGateToken?: string;
    };

    if (!body.captchaType) {
      return NextResponse.json(
        { success: false, error: "captchaType is required" },
        { status: 400 },
      );
    }

    if (body.captchaType === "math") {
      const { token, answer } = body as Partial<MathVerifyBody>;
      if (typeof token !== "string" || !token.trim()) {
        return NextResponse.json(
          { success: false, error: "token is required for math captcha" },
          { status: 400 },
        );
      }
      if (answer === undefined || answer === null || Number.isNaN(Number(answer))) {
        return NextResponse.json(
          { success: false, error: "answer is required for math captcha" },
          { status: 400 },
        );
      }

      const result = verifyMathChallengeToken(token, Number(answer));
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error });
      }
      return await successResponseWithOptionalGate(body);
    }

    if (body.captchaType === "slider") {
      const slider = body as Partial<SliderVerifyBody>;
      if (typeof slider.token !== "string" || !slider.token.trim()) {
        return NextResponse.json(
          { success: false, error: "token is required for slider captcha" },
          { status: 400 },
        );
      }
      const xNum = Number(slider.x);
      if (Number.isNaN(xNum)) {
        return NextResponse.json({ success: false, error: "invalid_x" }, { status: 400 });
      }
      const xRounded = Math.round(xNum);
      const pos = verifySliderChallengeToken(slider.token, xRounded);
      if (!pos.ok) {
        return NextResponse.json({ success: false, error: pos.error }, { status: 400 });
      }
      const check = verifySliderHeuristicPayload(
        {
          x: xRounded,
          duration: slider.duration,
          trail: slider.trail,
        },
        { maxX: pos.maxDx },
      );
      if (!check.ok) {
        return NextResponse.json({ success: false, error: check.error }, { status: 400 });
      }
      return await successResponseWithOptionalGate(body);
    }

    if (body.captchaType === "slider_v2") {
      const v2 = body as Partial<SliderV2VerifyBody>;
      if (typeof v2.token !== "string" || !v2.token.trim()) {
        return NextResponse.json(
          { success: false, message: "token is required", reason: "token_invalid" },
          { status: 400 },
        );
      }
      const userX = Number(v2.userX);
      const userY = Number(v2.userY);
      if (Number.isNaN(userX) || Number.isNaN(userY)) {
        return NextResponse.json(
          { success: false, message: "invalid position", reason: "token_invalid" },
          { status: 400 },
        );
      }
      const trail = Array.isArray(v2.trail) ? v2.trail : [];
      const normalizedTrail: TrailPoint[] = trail.map((p) => ({
        x: Number(p?.x),
        y: Number(p?.y),
        t: Number(p?.t),
      }));
      const result = verifySliderV2Challenge(v2.token, userX, userY, normalizedTrail);
      if (!result.ok) {
        const reason = result.reason;
        const message =
          reason === "position_mismatch"
            ? "位置偏差過大"
            : reason === "trajectory_suspicious"
              ? "軌跡異常"
              : reason === "token_expired"
                ? "驗證已過期"
                : "驗證失敗";
        return NextResponse.json({ success: false, message, reason });
      }
      return await successResponseWithOptionalGate(body);
    }

    return NextResponse.json(
      { success: false, error: `Unknown captchaType: ${body.captchaType}` },
      { status: 400 },
    );
  } catch (err) {
    console.error("[captcha/verify]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
