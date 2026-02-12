import Link from "next/link";
import type { Product } from "@/data/products";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          {product.name}
        </h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {product.nameEn}
        </span>
      </div>
      <p className="mb-4 text-slate-600 dark:text-slate-300">{product.tagline}</p>
      <dl className="mb-4 space-y-2 text-sm">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">適用面積</dt>
          <dd className="font-medium text-slate-700 dark:text-slate-200">
            {product.areaRange}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">主要功能</dt>
          <dd className="text-slate-700 dark:text-slate-200">
            {product.features.join("，")}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">噪音</dt>
          <dd className="text-slate-700 dark:text-slate-200">{product.noise}</dd>
        </div>
      </dl>
      <ul className="mb-6 flex flex-wrap gap-2">
        {product.highlights.map((h) => (
          <li
            key={h}
            className="rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-800 dark:bg-sky-900/50 dark:text-sky-200"
          >
            {h}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {product.currency} {product.price.toLocaleString()}
        </p>
        <Link
          href={`/products/${product.id}`}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          了解詳情
        </Link>
      </div>
    </article>
  );
}
