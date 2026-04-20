"use client";

import { useState, Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CAPTCHA_COOKIE, CAPTCHA_TIMESTAMP_COOKIE } from "@/data/captcha-config";
import { BASE_PATH } from "@/lib/base-path";
import { MathCaptcha } from "@/components/captcha/math-captcha";
import { SliderCaptcha } from "@/components/captcha/slider-captcha";
import { useCaptchaRuntimeConfig } from "@/hooks/use-captcha-runtime-config";

function isWithinCaptchaCooldown(cooldownMinutes: number): boolean {
  if (typeof window === "undefined") return false;
  const verified = document.cookie.match(new RegExp(`(^| )${CAPTCHA_COOKIE}=([^;]+)`));
  const timestamp = document.cookie.match(new RegExp(`(^| )${CAPTCHA_TIMESTAMP_COOKIE}=([^;]+)`));
  if (!verified || !timestamp) return false;
  const mins = (Date.now() - parseInt(timestamp[2], 10)) / 60000;
  return mins < cooldownMinutes;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/";

  const { config, loading: configLoading, refetch } = useCaptchaRuntimeConfig();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pendingGateToken, setPendingGateToken] = useState<string | null>(null);
  const [captchaOverride, setCaptchaOverride] = useState<boolean | null>(null);

  useEffect(() => {
    const param = searchParams?.get("captcha");
    if (param === "1") setCaptchaOverride(true);
    else if (param === "0") setCaptchaOverride(false);
    else setCaptchaOverride(null);
  }, [searchParams]);

  const badgeHint = useMemo(() => {
    if (configLoading) return { label: "設定載入中…", amber: false };
    if (captchaOverride === true) return { label: "🔐 URL 強制驗證", amber: true };
    if (captchaOverride === false) return { label: "✅ URL 關閉驗證", amber: false };
    if (!config.enabled) return { label: "✅ 系統已關閉", amber: false };
    if (!config.loginCaptcha) return { label: "✅ 登入未啟用", amber: false };
    if (config.captchaCooldownActive || isWithinCaptchaCooldown(config.cooldownMinutes)) {
      return { label: "✅ 冷卻中", amber: false };
    }
    if (config.randomTriggerRate <= 0) return { label: "✅ 機率為 0", amber: false };
    if (config.randomTriggerRate >= 1) return { label: "🔐 將要求驗證", amber: true };
    return { label: "🔐 依機率可能驗證", amber: true };
  }, [config, configLoading, captchaOverride]);

  async function handleVerified(actionPassToken?: string) {
    if (!actionPassToken) {
      setError("驗證失敗：缺少通行憑證");
      setLoading(false);
      return;
    }
    setShowCaptcha(false);
    setPendingGateToken(null);
    setLoading(true);
    await refetch();
    await submitLogin(actionPassToken);
  }

  function handleCancel() {
    setShowCaptcha(false);
    setPendingGateToken(null);
    setLoading(false);
  }

  async function submitLogin(captchaActionPass: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaActionPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登入失敗");
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("網絡錯誤，請重試");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (configLoading) {
      setError("驗證設定載入中，請稍候再試");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const gateRes = await fetch(`${BASE_PATH}/api/captcha/action-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email,
          captchaOverride,
        }),
      });
      const gateJson = (await gateRes.json()) as {
        needCaptcha?: boolean;
        pendingGateToken?: string | null;
        actionPassToken?: string | null;
        error?: string;
      };
      if (!gateRes.ok) {
        setError(gateJson.error || "無法取得驗證狀態");
        return;
      }
      if (gateJson.needCaptcha && gateJson.pendingGateToken) {
        setPendingGateToken(gateJson.pendingGateToken);
        setShowCaptcha(true);
        return;
      }
      const pass = typeof gateJson.actionPassToken === "string" ? gateJson.actionPassToken : "";
      if (!pass) {
        setError("缺少驗證通行憑證，請重試");
        return;
      }
      await submitLogin(pass);
    } catch {
      setError("網絡錯誤，請重試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showCaptcha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl dark:bg-amber-900/30">
                🛡️
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                安全驗證
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                請完成以下驗證以繼續操作
              </p>
            </div>
            {config.mode === "slider" ? (
              <SliderCaptcha onVerified={handleVerified} pendingGateToken={pendingGateToken ?? undefined} />
            ) : (
              <MathCaptcha onVerified={handleVerified} pendingGateToken={pendingGateToken ?? undefined} />
            )}
            <button
              type="button"
              onClick={handleCancel}
              className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              登入
            </h1>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: badgeHint.amber ? "rgba(234,179,8,0.15)" : "rgba(34,197,94,0.15)",
                color: badgeHint.amber ? "#ca8a04" : "#16a34a",
              }}
            >
              {badgeHint.label}
            </span>
          </div>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            使用您的電子郵件和密碼登入
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                電子郵件
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                密碼
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || configLoading}
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {configLoading ? "載入設定…" : loading ? "登入中..." : "登入"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            <Link href="/" className="text-sky-600 hover:underline dark:text-sky-400">
              ← 返回首頁
            </Link>
          </p>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-700/30 dark:text-slate-400">
            💡 Demo 開關：?captcha=1 開啟驗證 · ?captcha=0 關閉驗證 · 機率與題型由{" "}
            <Link href="/admin/captcha" className="text-sky-600 hover:underline dark:text-sky-400">
              管理後台
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-center text-slate-500">載入中...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
