"use client";

import { useState, Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { products } from "@/data/products";
import { BASE_PATH } from "@/lib/base-path";
import { CAPTCHA_COOKIE, CAPTCHA_TIMESTAMP_COOKIE } from "@/data/captcha-config";
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

interface OrderData {
  id: string;
  product: string;
  model: string;
  purchaseDate: string;
  warrantyExpiresAt: string;
}

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams?.get("product") ?? "";

  const { config, loading: configLoading, refetch } = useCaptchaRuntimeConfig();

  const [selectedProductId, setSelectedProductId] = useState(productId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState<OrderData | null>(null);

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
    if (!config.orderCaptcha) return { label: "✅ 下單未啟用", amber: false };
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
    await submitOrder(actionPassToken);
  }

  function handleCancel() {
    setShowCaptcha(false);
    setPendingGateToken(null);
    setLoading(false);
  }

  async function submitOrder(captchaActionPass: string) {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) {
      setError("找不到選擇的產品");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_PATH}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.name,
          model: product.nameEn,
          productId: selectedProductId,
          captchaActionPass,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?redirect=/order/new");
          return;
        }
        setError(data.error || "Failed to create order");
        return;
      }

      setSuccessOrder(data.order);
    } catch {
      setError("網絡錯誤，請重試");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId) {
      setError("請選擇產品");
      return;
    }
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
          action: "order",
          productId: selectedProductId,
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
      await submitOrder(pass);
    } catch {
      setError("網絡錯誤，請重試");
    } finally {
      setLoading(false);
    }
  }

  if (successOrder) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 text-5xl">✅</div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            訂單已提交！
          </h2>
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
            訂單號：{successOrder.id}
          </p>
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
            產品：{successOrder.product}
          </p>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            購買日：{successOrder.purchaseDate}
          </p>
          <Link
            href="/orders"
            className="inline-block rounded-lg bg-sky-600 px-6 py-2.5 font-medium text-white hover:bg-sky-700"
          >
            查看我的訂單
          </Link>
        </div>
      </div>
    );
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

      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            新增訂單
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

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div>
              <label
                htmlFor="product"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                選擇產品
              </label>
              <select
                id="product"
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">請選擇產品</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.currency} {p.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || configLoading}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {configLoading ? "載入設定…" : loading ? "提交中..." : "提交訂單"}
              </button>
              <Link
                href="/"
                className="flex items-center rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                取消
              </Link>
            </div>
          </form>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-700/30 dark:text-slate-400">
            💡 Demo：?captcha=1 / ?captcha=0 · 機率與題型由{" "}
            <Link href="/admin/captcha" className="text-sky-600 hover:underline dark:text-sky-400">
              管理後台
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl px-4 py-12 text-center">
          <p className="text-slate-500">載入中...</p>
        </div>
      }
    >
      <NewOrderForm />
    </Suspense>
  );
}
