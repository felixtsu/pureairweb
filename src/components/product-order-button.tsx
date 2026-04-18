"use client";

import { useRouter } from "next/navigation";

interface Props {
  productId: string;
}

export function ProductOrderButton({ productId }: Props) {
  const router = useRouter();

  function handleClick() {
    router.push(`/order/new?product=${productId}`);
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-lg bg-sky-600 px-5 py-2.5 font-medium text-white hover:bg-sky-700"
    >
      立即訂購
    </button>
  );
}
