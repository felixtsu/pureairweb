"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BASE_PATH } from "@/lib/base-path";

interface MathCaptchaProps {
  onVerified: () => void;
  maxAttempts?: number;
}

export function MathCaptcha({ onVerified, maxAttempts = 5 }: MathCaptchaProps) {
  const [question, setQuestion] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [issueLoading, setIssueLoading] = useState(true);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadIssue = useCallback(async () => {
    setIssueLoading(true);
    setIssueError(null);
    setInput("");
    setError(false);
    try {
      const res = await fetch(`${BASE_PATH}/api/captcha/math/issue`, { method: "POST" });
      const data = (await res.json()) as { question?: string; token?: string; error?: string };
      if (!res.ok) {
        setIssueError(data.error || "無法載入驗證題");
        setQuestion("");
        setToken(null);
        return;
      }
      if (!data.question || !data.token) {
        setIssueError("伺服器回應異常");
        setToken(null);
        return;
      }
      setQuestion(data.question);
      setToken(data.token);
    } catch {
      setIssueError("網絡錯誤，請重試");
      setToken(null);
    } finally {
      setIssueLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIssue();
  }, [loadIssue]);

  useEffect(() => {
    if (!issueLoading && token && !locked) {
      inputRef.current?.focus();
    }
  }, [issueLoading, token, locked]);

  const refresh = useCallback(() => {
    void loadIssue();
  }, [loadIssue]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || !input.trim() || !token || verifyLoading) return;

    setVerifyLoading(true);
    setError(false);
    try {
      const res = await fetch(`${BASE_PATH}/api/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captchaType: "math",
          token,
          answer: Number.parseInt(input, 10),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        onVerified();
        return;
      }

      const err = data.error || "wrong_answer";
      if (err === "expired") {
        setIssueError("題目已過期，已為你換新題");
        await loadIssue();
        return;
      }

      const next = attempts + 1;
      setAttempts(next);
      setError(true);
      setInput("");

      if (next >= maxAttempts) {
        setLocked(true);
      } else {
        inputRef.current?.focus();
      }
    } catch {
      setError(true);
      setIssueError("網絡錯誤，請重試");
    } finally {
      setVerifyLoading(false);
    }
  }

  function handleReset() {
    setAttempts(0);
    setLocked(false);
    setIssueError(null);
    void loadIssue();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const remaining = maxAttempts - attempts;

  if (issueLoading && !question) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center justify-center space-y-2 rounded-xl bg-slate-50 p-8 dark:bg-slate-700/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">載入驗證題中…</p>
      </div>
    );
  }

  if (issueError && !token) {
    return (
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-center text-sm text-amber-800 dark:text-amber-200">{issueError}</p>
        <button
          type="button"
          onClick={() => void loadIssue()}
          className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      {issueError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {issueError}
        </p>
      )}

      <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-700/50">
        <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">{question}</p>
      </div>

      {locked ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-red-500">已超過嘗試次數上限，請重新開始</p>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            重新開始
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="輸入答案"
            disabled={verifyLoading || !token}
            className={`w-full rounded-lg border px-4 py-3 text-center font-mono text-xl tracking-wider transition-colors
              focus:outline-none focus:ring-2 focus:ring-sky-500
              ${
                error
                  ? "border-red-400 bg-red-50 text-red-600 dark:border-red-600 dark:bg-red-900/20"
                  : "border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              }`}
          />

          {error && (
            <p className="text-center text-sm text-red-500">
              答案錯誤，請重試（剩餘 {remaining} 次）
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={verifyLoading || issueLoading}
              onClick={refresh}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              換一題
            </button>
            <button
              type="submit"
              disabled={!input.trim() || verifyLoading || !token}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {verifyLoading ? "驗證中…" : "驗證"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
