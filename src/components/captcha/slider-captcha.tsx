"use client";

import dynamic from "next/dynamic";

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
 * 不傳 `request` / `onVerify`：庫在瀏覽器用底圖 + Canvas 挖空，並用 `dx` 與 `targetX`
 * 做本地容差比對；只有對齊才會觸發 `onSuccess`。
 *
 * 注意：若只傳 `onVerify` 而不傳 `request`，該庫會在 `onVerify` resolve 後直接視為通過，
 * **不再**做本地位置校驗，導致滑錯也能過（若後端啟發式又過寬）。
 */
export function SliderCaptcha({
  onVerified,
  onError,
  width = 320,
  height = 200,
  theme = "light",
}: SliderCaptchaProps) {
  return (
    <div className="w-full max-w-sm">
      <SliderCaptchaComponent
        // @ts-ignore
        root={null}
        width={width}
        height={height}
        theme={theme}
        onSuccess={onVerified}
        onFail={onError}
      />
    </div>
  );
}
