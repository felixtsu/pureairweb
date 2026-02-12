import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-semibold text-slate-900 dark:text-white">
          PureAir
        </Link>
        <ul className="flex gap-6">
          <li>
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              產品
            </Link>
          </li>
          <li>
            <Link
              href="/chat"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              AI 智能顧問
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
