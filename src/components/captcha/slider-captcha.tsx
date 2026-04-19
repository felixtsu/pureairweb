"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { BASE_PATH } from "@/lib/base-path";

// @ts-ignore - slider-captcha-js/react has no type declarations
const SliderCaptchaComponent = dynamic(() => import("slider-captcha-js/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-xl bg-slate-50 p-8 dark:bg-slate-700/50">
      <p className="text-sm text-slate-500 dark:text-slate-400">載入驗證元件中…</p>
    </div>
  ),
});

interface SliderCaptchaProps {
  onVerified: () => void;
  onError?: (error: unknown) => void;
  width?: number;
  height?: number;
  theme?: "light" | "dark";
}

/**
 * 不傳 `request`：庫在瀏覽器用單張底圖 + Canvas 挖空拼圖缺口（正確視覺）。
 * 僅傳 `onVerify`：滑完後把軌跡等 POST 後端做啟發式校驗（見 SPEC_CAPTCHA.md）。
 * 若同時傳 `request` + `onVerify`，庫會改為兩張 URL 圖片模式，不會再挖空底圖。
 */
export function SliderCaptcha({
  onVerified,
  onError,
  width = 320,
  height = 200,
  theme = "light",
}: SliderCaptchaProps) {
  const onVerify = useCallback(
    async (data: {
      duration: number;
      trail: [number, number][];
      targetType: string;
      x: number;
    }) => {
      const res = await fetch(`${BASE_PATH}/api/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaType: "slider", ...data }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "verify_failed");
      }
    },
    [],
  );

  return (
    <div className="w-full max-w-sm">
      <SliderCaptchaComponent
        // @ts-ignore
        root={null}
        width={width}
        height={height}
        theme={theme}
        onVerify={onVerify}
        onSuccess={onVerified}
        onFail={onError}
      />
    </div>
  );
}
