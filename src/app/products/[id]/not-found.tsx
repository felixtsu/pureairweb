import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
        找不到該產品
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        請返回產品列表選擇型號。
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sky-600 hover:underline dark:text-sky-400"
      >
        返回產品列表
      </Link>
    </div>
  );
}
