"use client";

import { useState, useEffect, useRef } from "react";

interface CaptchaModalProps {
  isOpen: boolean;
  onVerified: () => void;
  onCancel: () => void;
  mode?: "math" | "slider";
}

function generateMathProblem(): { question: string; answer: number } {
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "+") {
    a = Math.floor(Math.random() * 50) + 10;
    b = Math.floor(Math.random() * 50) + 10;
    answer = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * 50) + 30;
    b = Math.floor(Math.random() * 30) + 1;
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
    answer = a * b;
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}

export default function CaptchaModal({
  isOpen,
  onVerified,
  onCancel,
  mode = "math",
}: CaptchaModalProps) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [problem] = useState(generateMathProblem);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAnswer("");
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parseInt(answer, 10) === problem.answer) {
      onVerified();
    } else {
      setError(true);
      setAttempts((a) => a + 1);
      setAnswer("");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
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

        {/* Captcha challenge - Math */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-700/50">
            <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
              {problem.question}
            </p>
          </div>

          <input
            ref={inputRef}
            type="number"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setError(false);
            }}
            placeholder="輸入答案"
            className={`w-full rounded-lg border px-4 py-3 text-center text-xl font-mono tracking-wider transition-colors
              focus:outline-none focus:ring-2 focus:ring-sky-500
              ${error
                ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:border-red-600"
                : "border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              }`}
          />

          {error && (
            <p className="text-center text-sm text-red-500">
              答案錯誤，請重試（{3 - attempts} 次機會）
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!answer}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              驗證
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Demo 安全驗證 · 請如實回答
        </p>
      </div>
    </div>
  );
}
