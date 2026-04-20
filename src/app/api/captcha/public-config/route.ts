import { NextRequest, NextResponse } from "next/server";
import { CAPTCHA_COOLDOWN_COOKIE, verifyCooldownCookieValue } from "@/lib/captcha-action-proof";
import { readCaptchaRuntimeConfig } from "@/lib/captcha-runtime-store";

export const dynamic = "force-dynamic";

/** Unauthenticated read of captcha UX flags (no admin token). */
export async function GET(request: NextRequest) {
  try {
    const c = await readCaptchaRuntimeConfig();
    const cdRaw = request.cookies.get(CAPTCHA_COOLDOWN_COOKIE)?.value;
    const captchaCooldownActive = cdRaw ? verifyCooldownCookieValue(cdRaw) : false;
    const res = NextResponse.json({
      enabled: c.enabled,
      loginCaptcha: c.login_captcha,
      orderCaptcha: c.order_captcha,
      randomTriggerRate: c.random_trigger_rate,
      cooldownMinutes: c.cooldown_minutes,
      mode: c.captcha_mode,
      captchaCooldownActive,
    });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return res;
  } catch (err) {
    console.error("[captcha/public-config]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
