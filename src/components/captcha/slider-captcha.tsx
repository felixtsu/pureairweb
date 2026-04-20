"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_PATH } from "@/lib/base-path";

interface HoleInfo {
  shape: "polygon";
  x: number;
  y: number;
  polygonPoints: number[];
  width: number;
  height: number;
}

interface SliderApiData {
  token: string;
  bgImage: string;
  sliderImage: string;
  holeData: HoleInfo[];
  matchHoleIndex: number;
  sliderWidth: number;
  sliderHeight: number;
  bgWidth: number;
  bgHeight: number;
}

interface SliderCaptchaProps {
  onVerified: () => void;
  onError?: (error: unknown) => void;
  theme?: "light" | "dark";
}

export function SliderCaptcha({ onVerified, onError, theme = "light" }: SliderCaptchaProps) {
  const [loading, setLoading] = useState(true);
  const [bgImage, setBgImage] = useState("");
  const [sliderImage, setSliderImage] = useState("");
  const [sliderX, setSliderX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [challenge, setChallenge] = useState<SliderApiData | null>(null);
  const [layoutScale, setLayoutScale] = useState(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutScaleRef = useRef(1);
  const grabOffsetRef = useRef(0);
  const trailStartRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const trailRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const sliderXRef = useRef(0);
  const challengeRef = useRef<SliderApiData | null>(null);
  const tokenRef = useRef("");

  useEffect(() => {
    layoutScaleRef.current = layoutScale;
  }, [layoutScale]);

  const loadChallenge = useCallback(
    async (opts?: { clearError?: boolean }) => {
      if (opts?.clearError !== false) setError(null);
      setVerified(false);
      setSliderX(0);
      sliderXRef.current = 0;
      trailRef.current = [];
      trailStartRef.current = null;
      setLoading(true);
      try {
        const res = await fetch(`${BASE_PATH}/api/captcha/slider`, { method: "GET" });
        const json = (await res.json()) as { success?: boolean; data?: SliderApiData; error?: string };
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || "無法載入滑塊驗證");
        }
        setChallenge(json.data);
        challengeRef.current = json.data;
        setBgImage(json.data.bgImage);
        setSliderImage(json.data.sliderImage);
        tokenRef.current = json.data.token;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "載入失敗";
        setError(msg);
        onError?.(e);
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    void loadChallenge();
  }, [loadChallenge]);

  const matchHole = challenge?.holeData[challenge.matchHoleIndex];
  const bgW = challenge?.bgWidth ?? 480;
  const bgH = challenge?.bgHeight ?? 320;
  const sliderW = challenge?.sliderWidth ?? 1;
  const sliderH = challenge?.sliderHeight ?? 1;
  const fixedY = matchHole?.y ?? 0;
  const maxSliderX = Math.max(0, bgW - sliderW);

  /** 根据视口宽度缩放舞台（逻辑坐标仍为 bgW×bgH） */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !challenge) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const s = Math.min(1, w / bgW);
      const next = Math.max(0.01, s);
      layoutScaleRef.current = next;
      setLayoutScale(next);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [bgW, challenge]);

  const appendTrailPoint = useCallback(
    (xLeft: number) => {
      const now = Date.now();
      if (trailStartRef.current === null) trailStartRef.current = now;
      const t = now - trailStartRef.current;
      const cx = xLeft + sliderW / 2;
      const cy = fixedY + sliderH / 2;
      trailRef.current = [...trailRef.current, { x: cx, y: cy, t }];
    },
    [fixedY, sliderH, sliderW],
  );

  const verifyWithRefs = useCallback(async () => {
    const ch = challengeRef.current;
    const tok = tokenRef.current;
    if (!ch) return;
    const hole = ch.holeData[ch.matchHoleIndex];
    if (!hole) return;
    const sx = sliderXRef.current;
    const userX = sx + ch.sliderWidth / 2;
    const userY = hole.y + ch.sliderHeight / 2;
    let sendTrail = trailRef.current;
    if (sendTrail.length < 3) {
      const now = Date.now();
      const base = trailStartRef.current ?? now;
      sendTrail = [
        { x: userX, y: userY, t: 0 },
        { x: userX, y: userY, t: Math.min(50, now - base) },
        { x: userX, y: userY, t: Math.min(100, now - base + 1) },
      ];
    }
    try {
      const res = await fetch(`${BASE_PATH}/api/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captchaType: "slider_v2",
          token: tok,
          userX,
          userY,
          trail: sendTrail,
        }),
      });
      const result = (await res.json()) as { success?: boolean; message?: string; reason?: string };
      if (!res.ok || !result.success) {
        throw new Error(result.message || "驗證失敗");
      }
      setVerified(true);
      onVerified();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "驗證失敗";
      setError(msg);
      onError?.(e);
      await loadChallenge({ clearError: false });
      setError(msg);
    }
  }, [loadChallenge, onError, onVerified]);

  const clientXToLogicalX = useCallback((clientX: number): number | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = layoutScaleRef.current || 1;
    return (clientX - rect.left) / scale;
  }, []);

  const onPointerMove = useCallback(
    (clientX: number) => {
      if (!draggingRef.current) return;
      const localX = clientXToLogicalX(clientX);
      if (localX === null) return;
      let next = localX - grabOffsetRef.current;
      if (next < 0) next = 0;
      if (next > maxSliderX) next = maxSliderX;
      sliderXRef.current = next;
      setSliderX(next);
      appendTrailPoint(next);
    },
    [appendTrailPoint, clientXToLogicalX, maxSliderX],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      onPointerMove(e.clientX);
    };
    const onMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      void verifyWithRefs();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) onPointerMove(e.touches[0]!.clientX);
    };
    const onTouchEnd = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      void verifyWithRefs();
    };

    if (dragging) {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("touchmove", onTouchMove, { passive: true });
      document.addEventListener("touchend", onTouchEnd);
    }
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, onPointerMove, verifyWithRefs]);

  const startDrag = (clientX: number) => {
    if (!containerRef.current || verified || loading) return;
    const localX = clientXToLogicalX(clientX);
    if (localX === null) return;
    grabOffsetRef.current = localX - sliderXRef.current;
    draggingRef.current = true;
    setDragging(true);
    trailStartRef.current = null;
    trailRef.current = [];
  };

  const borderClass =
    theme === "dark" ? "border-slate-600 ring-slate-700" : "border-slate-200 ring-slate-100";

  if (loading && !challenge) {
    return (
      <div className="flex w-full max-w-lg items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-600 dark:bg-slate-800/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">載入驗證元件中…</p>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="w-full max-w-lg rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
        {error}
        <button
          type="button"
          className="mt-2 block rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
          onClick={() => void loadChallenge()}
        >
          重試
        </button>
      </div>
    );
  }

  const outerW = bgW * layoutScale;
  const outerH = bgH * layoutScale;

  return (
    <div className="w-full max-w-full space-y-2">
      <div ref={viewportRef} className="w-full max-w-full">
        <div
          ref={containerRef}
          className={`relative mx-auto overflow-hidden rounded-xl border shadow-sm ring-1 ${borderClass}`}
          style={{ width: outerW, height: outerH }}
        >
          <div
            className="absolute left-0 top-0 overflow-hidden"
            style={{
              width: bgW,
              height: bgH,
              transform: `scale(${layoutScale})`,
              transformOrigin: "top left",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bgImage}
              alt=""
              className="pointer-events-none block h-full w-full select-none object-cover"
              draggable={false}
            />

            {matchHole && sliderImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sliderImage}
                alt=""
                draggable={false}
                className="absolute touch-none select-none"
                style={{
                  left: sliderX,
                  top: fixedY,
                  width: sliderW,
                  height: sliderH,
                  touchAction: "none",
                  cursor: verified ? "default" : dragging ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  startDrag(e.clientX);
                }}
                onTouchStart={(e) => {
                  if (e.touches.length > 0) startDrag(e.touches[0]!.clientX);
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {error && challenge && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {verified && <p className="text-sm text-emerald-600 dark:text-emerald-400">驗證通過</p>}

      {!verified && !loading && challenge && (
        <p className="text-xs text-slate-500 dark:text-slate-400">拖動拼圖對齊缺口後放開滑鼠或手指</p>
      )}
    </div>
  );
}
