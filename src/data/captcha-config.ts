/**
 * Cookie names + client fallback when `/api/captcha/public-config` is unavailable.
 * Authoritative settings are stored server-side (`/tmp/captcha-config.json`) and
 * edited via `/admin/captcha`.
 */

export type CaptchaMode = "math" | "slider";

export interface CaptchaRuntimePublicConfig {
  enabled: boolean;
  loginCaptcha: boolean;
  orderCaptcha: boolean;
  randomTriggerRate: number;
  cooldownMinutes: number;
  mode: CaptchaMode;
  /** True when HttpOnly cooldown cookie is active (server-side). */
  captchaCooldownActive?: boolean;
}

/** Must stay aligned with `DEFAULT_RUNTIME_CONFIG` in `src/lib/captcha-runtime-store.ts`. */
export const CAPTCHA_PUBLIC_FALLBACK: CaptchaRuntimePublicConfig = {
  enabled: true,
  loginCaptcha: true,
  orderCaptcha: true,
  randomTriggerRate: 0.3,
  cooldownMinutes: 5,
  mode: "math",
};

export const CAPTCHA_COOKIE = "captcha_verified";
export const CAPTCHA_TIMESTAMP_COOKIE = "captcha_verified_at";
