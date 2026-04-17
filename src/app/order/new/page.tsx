"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { products } from "@/data/products";

interface OrderData {
  id: string;
  product: string;
  model: string;
  purchaseDate: string;
  warrantyExpiresAt: string;
}

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product") || "";

  const [selectedProductId, setSelectedProductId] = useState(productId);
  const [address, setAddress] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState<OrderData | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId) {
      setError("請選擇產品");
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) {
      setError("找不到選擇的產品");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.name,
          model: product.nameEn,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login?redirect=/order/new");
          return;
        }
        setError(data.error || "Failed to create order");
        return;
      }

      setSuccessOrder(data.order);
    } catch {
      setError("網絡錯誤，請重試");
    } finally {
      setLoading(false);
    }
  }

  if (successOrder) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 text-5xl">✅</div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
            訂單已提交！
          </h2>
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
            訂單號：{successOrder.id}
          </p>
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
            產品：{successOrder.product}
          </p>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            購買日：{successOrder.purchaseDate}
          </p>
          <Link
            href="/orders"
            className="inline-block rounded-lg bg-sky-600 px-6 py-2.5 font-medium text-white hover:bg-sky-700"
          >
            查看我的訂單
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
        新增訂單
      </h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="product"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              選擇產品
            </label>
            <select
              id="product"
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">請選擇產品</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.currency} {p.price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              安裝地址（選填）
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="香港中環皇后大道中 99 號"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
            />
          </div>

          <div>
            <label
              htmlFor="remark"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              備註（選填）
            </label>
            <textarea
              id="remark"
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="其他需求或備註..."
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {loading ? "提交中..." : "提交訂單"}
            </button>
            <Link
              href="/"
              className="flex items-center rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              取消
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="text-slate-500">載入中...</p>
      </div>
    }>
      <NewOrderForm />
    </Suspense>
  );
}
