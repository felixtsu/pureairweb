"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MeData {
  user: { id: string; email: string } | null;
}

export function SiteHeader() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: MeData) => setUserEmail(data.user?.email ?? null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUserEmail(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-semibold text-slate-900 dark:text-white">
          PureAir
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            產品
          </Link>
          <Link
            href="/chat"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            AI 智能顧問
          </Link>

          {userEmail ? (
            <>
              <Link
                href="/orders"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                我的訂單
              </Link>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {userEmail}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              >
                退出登入
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              登入
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="sm:hidden text-slate-600 dark:text-slate-300"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              產品
            </Link>
            <Link
              href="/chat"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              AI 智能顧問
            </Link>
            {userEmail ? (
              <>
                <Link
                  href="/orders"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  我的訂單
                </Link>
                <span className="text-sm text-slate-500 dark:text-slate-400">{userEmail}</span>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="text-left text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  退出登入
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-block w-fit rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                onClick={() => setMenuOpen(false)}
              >
                登入
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
