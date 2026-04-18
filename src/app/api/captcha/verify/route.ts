import { NextRequest, NextResponse } from "next/server";
import { verifyMathChallengeToken, verifySliderHeuristicPayload } from "@/lib/captcha-challenge";

export const dynamic = "force-dynamic";

interface MathVerifyBody {
  captchaType: "math";
  token: string;
  answer: number;
}

interface SliderVerifyBody {
  captchaType: "slider";
  x: number;
  duration: number;
  trail: [number, number][];
  targetType?: string;
}

type VerifyRequestBody = MathVerifyBody | SliderVerifyBody;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<VerifyRequestBody> & { captchaType?: string };

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
      return NextResponse.json({ success: true });
    }

    if (body.captchaType === "slider") {
      const slider = body as Partial<SliderVerifyBody>;
      const check = verifySliderHeuristicPayload({
        x: slider.x,
        duration: slider.duration,
        trail: slider.trail,
      });
      if (!check.ok) {
        return NextResponse.json({ success: false, error: check.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
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
