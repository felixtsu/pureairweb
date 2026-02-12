"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        發生錯誤
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        {error.message || "請稍後再試。"}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
      >
        重試
      </button>
    </div>
  );
}
