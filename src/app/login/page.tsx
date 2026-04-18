"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { captchaConfig, CAPTCHA_COOKIE, CAPTCHA_TIMESTAMP_COOKIE } from "@/data/captcha-config";
import CaptchaModal from "@/components/captcha-modal";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Captcha state
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaOverride, setCaptchaOverride] = useState<boolean | null>(null);

  // Read ?captcha= URL param for demo toggle
  useEffect(() => {
    const param = searchParams?.get("captcha");
    if (param === "1") setCaptchaOverride(true);
    else if (param === "0") setCaptchaOverride(false);
    else setCaptchaOverride(null);
  }, [searchParams]);

  const isCaptchaActive = (() => {
    if (captchaOverride !== null) return captchaOverride;
    if (!captchaConfig.enabled) return false;
    if (typeof window !== "undefined") {
      const verified = document.cookie.match(new RegExp(`(^| )${CAPTCHA_COOKIE}=([^;]+)`));
      const timestamp = document.cookie.match(new RegExp(`(^| )${CAPTCHA_TIMESTAMP_COOKIE}=([^;]+)`));
      if (verified && timestamp) {
        const mins = (Date.now() - parseInt(timestamp[2], 10)) / 60000;
        if (mins < captchaConfig.cooldownMinutes) return false;
      }
    }
    return Math.random() < captchaConfig.triggerRate;
  })();

  function handleVerified() {
    if (typeof window !== "undefined") {
      document.cookie = `${CAPTCHA_COOKIE}=1; path=/; max-age=${captchaConfig.cooldownMinutes * 60}`;
      document.cookie = `${CAPTCHA_TIMESTAMP_COOKIE}=${Date.now()}; path=/; max-age=${captchaConfig.cooldownMinutes * 60}`;
    }
    setShowCaptcha(false);
    submitLogin();
  }

  function handleCancel() {
    setShowCaptcha(false);
    setLoading(false);
  }

  async function submitLogin() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
    setLoading(true);
    setError("");

    if (isCaptchaActive) {
      setShowCaptcha(true);
    } else {
      await submitLogin();
    }
  }

  return (
    <>
      <CaptchaModal
        isOpen={showCaptcha}
        onVerified={handleVerified}
        onCancel={handleCancel}
        mode={captchaConfig.mode}
      />

      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              登入
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: isCaptchaActive ? "rgba(234,179,8,0.15)" : "rgba(34,197,94,0.15)",
                color: isCaptchaActive ? "#ca8a04" : "#16a34a",
              }}
            >
              {isCaptchaActive ? "🔐 驗證開啟" : "✅ 驗證關閉"}
            </span>
          </div>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            使用您的電子郵件和密碼登入
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={loading}
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {loading ? "登入中..." : "登入"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            <Link href="/" className="text-sky-600 hover:underline dark:text-sky-400">
              ← 返回首頁
            </Link>
          </p>

          {/* Demo usage hint */}
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-700/30 dark:text-slate-400">
            💡 Demo 開關：?captcha=1 開啟驗證 · ?captcha=0 關閉驗證
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-center text-slate-500">載入中...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
