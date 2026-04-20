"use client";

import { useState, useEffect, useCallback } from "react";
import { BASE_PATH } from "@/lib/base-path";
import {
  CAPTCHA_PUBLIC_FALLBACK,
  type CaptchaRuntimePublicConfig,
} from "@/data/captcha-config";

export type { CaptchaRuntimePublicConfig } from "@/data/captcha-config";

export function useCaptchaRuntimeConfig() {
  const [config, setConfig] = useState<CaptchaRuntimePublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const url = `${BASE_PATH}/api/captcha/public-config?_=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const raw = (await res.json()) as Record<string, unknown>;
      const rate = Number(raw.randomTriggerRate);
      const cooldown = Number(raw.cooldownMinutes);
      if (!Number.isFinite(rate) || !Number.isFinite(cooldown)) {
        throw new Error("invalid_shape");
      }
      let mode: CaptchaRuntimePublicConfig["mode"] = "math";
      if (raw.mode === "slider" || raw.mode === "math") {
        mode = raw.mode;
      } else if (typeof raw.mode === "string") {
        const m = raw.mode.trim().toLowerCase();
        if (m === "slider" || m === "math") mode = m;
      }
      const fb = CAPTCHA_PUBLIC_FALLBACK;
      const normalized: CaptchaRuntimePublicConfig = {
        enabled: typeof raw.enabled === "boolean" ? raw.enabled : fb.enabled,
        loginCaptcha: typeof raw.loginCaptcha === "boolean" ? raw.loginCaptcha : fb.loginCaptcha,
        orderCaptcha: typeof raw.orderCaptcha === "boolean" ? raw.orderCaptcha : fb.orderCaptcha,
        randomTriggerRate: Math.min(1, Math.max(0, rate)),
        cooldownMinutes: Math.min(120, Math.max(1, Math.round(cooldown))),
        mode,
        captchaCooldownActive: raw.captchaCooldownActive === true,
      };
      setConfig(normalized);
    } catch {
      setConfig(CAPTCHA_PUBLIC_FALLBACK);
      setFetchError("fallback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    config: config ?? CAPTCHA_PUBLIC_FALLBACK,
    loading,
    fetchError,
    refetch,
  };
}
