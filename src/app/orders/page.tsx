"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  product: string;
  model: string;
  purchaseDate: string;
  warrantyExpiresAt: string;
}

function getWarrantyStatus(expiresAt: string): {
  label: string;
  color: string;
  bg: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "已過期", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" };
  }
  if (diffDays <= 90) {
    return { label: "即將到期", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" };
  }
  return { label: "有效", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login?redirect=/orders");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.error) {
          setError(data.error);
        } else {
          setOrders(data.orders || []);
        }
      })
      .catch(() => setError("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-slate-500">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          我的訂單
        </h1>
        <Link
          href="/order/new"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          新增訂單
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-500 dark:text-slate-400">暫無訂單</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sky-600 hover:underline dark:text-sky-400"
          >
            瀏覽產品 →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = getWarrantyStatus(order.warrantyExpiresAt);
            return (
              <div
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {order.product}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      型號：{order.model}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      購買日：{order.purchaseDate}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      保固到期：{order.warrantyExpiresAt}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
