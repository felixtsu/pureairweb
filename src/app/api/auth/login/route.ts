import { NextRequest, NextResponse } from "next/server";
import { normalizeLoginCtx, parseAndVerifyActionPass } from "@/lib/captcha-action-proof";
import { readCaptchaRuntimeConfig } from "@/lib/captcha-runtime-store";
import { createServerSupabaseClient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      captchaActionPass?: unknown;
    };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const captchaActionPass = typeof body.captchaActionPass === "string" ? body.captchaActionPass.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const cfg = await readCaptchaRuntimeConfig();
    const emailCtx = normalizeLoginCtx(email);
    if (cfg.enabled && cfg.login_captcha) {
      if (!captchaActionPass) {
        return NextResponse.json({ error: "Captcha verification required" }, { status: 400 });
      }
      const v = parseAndVerifyActionPass(captchaActionPass, { act: "login", ctx: emailCtx });
      if (!v.ok) {
        return NextResponse.json({ error: "Invalid or expired captcha proof" }, { status: 400 });
      }
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
