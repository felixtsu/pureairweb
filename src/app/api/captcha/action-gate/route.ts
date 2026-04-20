import { NextRequest, NextResponse } from "next/server";

import {
  CAPTCHA_COOLDOWN_COOKIE,
  createGateToken,
  createWaivePass,
  normalizeLoginCtx,
  verifyCooldownCookieValue,
  type CaptchaAction,
} from "@/lib/captcha-action-proof";
import { readCaptchaRuntimeConfig } from "@/lib/captcha-runtime-store";

export const dynamic = "force-dynamic";

interface ActionGateBody {
  action?: string;
  productId?: string;
  email?: string;
  /** URL demo override: true = force captcha, false = force skip, null = use server config */
  captchaOverride?: boolean | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ActionGateBody;
    const action = body.action;
    if (action !== "order" && action !== "login") {
      return NextResponse.json({ error: "action must be order or login" }, { status: 400 });
    }
    const act = action as CaptchaAction;

    let ctx = "";
    if (act === "order") {
      ctx = typeof body.productId === "string" ? body.productId.trim() : "";
      if (!ctx) {
        return NextResponse.json({ error: "productId is required for order gate" }, { status: 400 });
      }
    } else {
      const raw = typeof body.email === "string" ? body.email : "";
      ctx = normalizeLoginCtx(raw);
      if (!ctx) {
        return NextResponse.json({ error: "email is required for login gate" }, { status: 400 });
      }
    }

    const captchaOverride =
      body.captchaOverride === true ? true : body.captchaOverride === false ? false : null;

    const cfg = await readCaptchaRuntimeConfig();
    const cooldownMin = cfg.cooldown_minutes;
    const rate = cfg.random_trigger_rate;

    const cdRaw = request.cookies.get(CAPTCHA_COOLDOWN_COOKIE)?.value;
    const inCooldown = cdRaw ? verifyCooldownCookieValue(cdRaw) : false;

    const captchaOffForAction =
      captchaOverride !== null
        ? !captchaOverride
        : !cfg.enabled
          ? true
          : act === "order"
            ? !cfg.order_captcha
            : !cfg.login_captcha;

    const passTtlMs = 3 * 60 * 1000;

    if (captchaOffForAction) {
      return NextResponse.json({
        needCaptcha: false,
        actionPassToken: createWaivePass({ act, ctx, ttlMs: passTtlMs }),
        pendingGateToken: null,
      });
    }

    if (inCooldown) {
      return NextResponse.json({
        needCaptcha: false,
        actionPassToken: createWaivePass({ act, ctx, ttlMs: passTtlMs }),
        pendingGateToken: null,
      });
    }

    const needCaptcha =
      captchaOverride !== null ? captchaOverride : rate > 0 && Math.random() < rate;

    if (!needCaptcha) {
      return NextResponse.json({
        needCaptcha: false,
        actionPassToken: createWaivePass({ act, ctx, ttlMs: passTtlMs }),
        pendingGateToken: null,
      });
    }

    const pendingGateToken = createGateToken({ act, need: true, ctx, ttlMs: 3 * 60 * 1000 });
    return NextResponse.json({
      needCaptcha: true,
      actionPassToken: null,
      pendingGateToken,
      cooldownMinutes: cooldownMin,
    });
  } catch (err) {
    console.error("[captcha/action-gate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
