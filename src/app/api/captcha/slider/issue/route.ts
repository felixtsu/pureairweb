import { NextResponse } from "next/server";
import { createSliderChallengeToken } from "@/lib/captcha-challenge";
import {
  SLIDER_STAGE,
  buildServerSliderSvgs,
  computeSnapDx,
  svgToDataUrl,
} from "@/lib/slider-challenge-svg";

export const dynamic = "force-dynamic";

/**
 * 签发滑块挑战：随机缺口位置 + HMAC token；底图/拼块为服务端 SVG（与库 request() 模式一致）。
 */
export async function POST() {
  try {
    const m = SLIDER_STAGE.edgeMargin;
    const slotLeftMax = SLIDER_STAGE.w - SLIDER_STAGE.piece - m;
    const span = slotLeftMax - SLIDER_STAGE.slotLeftMin + 1;
    const slotLeft = SLIDER_STAGE.slotLeftMin + Math.floor(Math.random() * span);
    const slotTop =
      m + Math.floor(Math.random() * (SLIDER_STAGE.h - SLIDER_STAGE.piece - 2 * m));
    const snapDx = computeSnapDx(slotLeft);
    const { bgSvg, pieceSvg } = buildServerSliderSvgs(slotLeft, slotTop);
    const token = createSliderChallengeToken(snapDx);

    return NextResponse.json({
      bgUrl: svgToDataUrl(bgSvg),
      puzzleUrl: svgToDataUrl(pieceSvg),
      token,
    });
  } catch (err) {
    console.error("[captcha/slider/issue]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("CAPTCHA_HMAC_SECRET") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
