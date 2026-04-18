import { NextResponse } from "next/server";
import { createMathChallengeToken, generateMathProblem } from "@/lib/captcha-challenge";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { question, answer } = generateMathProblem();
    const token = createMathChallengeToken(answer);
    return NextResponse.json({ question, token });
  } catch (err) {
    console.error("[captcha/math/issue]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("CAPTCHA_HMAC_SECRET") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
