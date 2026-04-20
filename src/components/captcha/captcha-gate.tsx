"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "captcha_passed";

interface CaptchaGateProps {
  children: (props: {
    showCaptcha: boolean;
    /** For product gate only; login/order use signed passes from `/api/captcha/verify`. */
    onVerified: (actionPassToken?: string) => void;
  }) => React.ReactNode;
  enabled?: boolean;
  probability?: number;
  cooldownMinutes?: number;
  onVerified?: () => void;
}

function isWithinCooldown(cooldownMinutes: number): boolean {
  if (typeof window === "undefined") return true;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const passedAt = parseInt(raw, 10);
  if (Number.isNaN(passedAt)) return false;
  return Date.now() - passedAt < cooldownMinutes * 60 * 1000;
}

function markPassed(): void {
  sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
}

function shouldTrigger(probability: number): boolean {
  return Math.random() < probability;
}

export function CaptchaGate({
  children,
  enabled = true,
  probability = 0.2,
  cooldownMinutes = 5,
  onVerified,
}: CaptchaGateProps) {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;

    if (!enabled) return;
    if (isWithinCooldown(cooldownMinutes)) return;
    if (shouldTrigger(probability)) {
      setShowCaptcha(true);
    }
  }, [enabled, probability, cooldownMinutes]);

  const handleVerified = useCallback((_actionPassToken?: string) => {
    markPassed();
    setShowCaptcha(false);
    onVerified?.();
  }, [onVerified]);

  return <>{children({ showCaptcha, onVerified: handleVerified })}</>;
}
