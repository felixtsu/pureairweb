"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
}

export function ProductOrderButton({ productId }: Props) {
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Pre-fetch auth state
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { phone: string | null }) => {
        if (!data.phone) {
          router.push(`/login?redirect=/order/new?product=${productId}`);
        } else {
          router.push(`/order/new?product=${productId}`);
        }
      })
      .catch(() => {
        router.push(`/login?redirect=/order/new?product=${productId}`);
      });
  }, [productId, router]);

  return (
    <button
      disabled
      className="rounded-lg bg-sky-600 px-5 py-2.5 font-medium text-white opacity-50 cursor-not-allowed"
    >
      跳轉中...
    </button>
  );
}
