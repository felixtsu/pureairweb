import Link from "next/link";
import { products } from "@/data/products";
import { ProductCard } from "@/components/product-card";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">
          PureAir 空氣淨化器
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          家用至商用，多款型號覆蓋不同面積與需求。HEPA 濾網、除甲醛、智能 App 控制，守護室內空氣品質。
        </p>
        <Link
          href="/chat"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-white hover:bg-sky-700"
        >
          與 AI 智能顧問對話
        </Link>
      </section>

      <section>
        <h2 className="mb-8 text-2xl font-semibold text-slate-900 dark:text-white">
          產品型號
        </h2>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
