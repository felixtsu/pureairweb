import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/data/products";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-block text-sky-600 hover:underline dark:text-sky-400"
      >
        ← 返回產品列表
      </Link>
      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-700">
          <div className="flex items-baseline justify-between">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {product.name}
            </h1>
            <span className="text-slate-500 dark:text-slate-400">
              {product.nameEn}
            </span>
          </div>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">
            {product.tagline}
          </p>
          <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
            {product.currency} {product.price.toLocaleString()}
          </p>
        </header>

        <dl className="space-y-6">
          <div>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
              適用面積
            </dt>
            <dd className="mt-1 text-slate-800 dark:text-slate-200">
              {product.areaRange}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
              主要功能
            </dt>
            <dd className="mt-1 text-slate-800 dark:text-slate-200">
              <ul className="list-inside list-disc">
                {product.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
              噪音水平
            </dt>
            <dd className="mt-1 text-slate-800 dark:text-slate-200">
              {product.noise}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
              特點
            </dt>
            <dd className="mt-1 text-slate-800 dark:text-slate-200">
              <ul className="list-inside list-disc">
                {product.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <footer className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/chat"
            className="rounded-lg bg-sky-600 px-5 py-2.5 font-medium text-white hover:bg-sky-700"
          >
            與 AI 顧問諮詢此型號
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            查看其他型號
          </Link>
        </footer>
      </article>
    </div>
  );
}
