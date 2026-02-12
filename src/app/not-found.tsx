import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
        找不到頁面
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        請檢查網址或返回首頁。
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-sky-600 px-6 py-3 font-medium text-white hover:bg-sky-700"
      >
        返回首頁
      </Link>
    </div>
  );
}
