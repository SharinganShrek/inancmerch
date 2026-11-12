"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import type { CatalogProduct } from "@/lib/types";

export function HomeClient({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);

  const load = useCallback(async () => {
    const res = await fetch("/api/catalog", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.products)) setProducts(data.products);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 2000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <main className="flex flex-col md:h-full md:overflow-hidden">
      <div className="shrink-0 px-3 py-1.5 text-center">
        <p className="text-[10px] tracking-[0.12em] text-[var(--muted)] uppercase md:text-[11px]">
          Aralık, 100 kişi alırsa oluşacak fiyat ile 70 kişi alırsa oluşacak fiyat
          arasındadır. Talep arttıkça birim fiyat düşer.
        </p>
        <a
          href="https://docs.google.com/document/d/1hwBc02SXhMH1h-vSDmCXrde417XQisAvjyjTxCj8rX8/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-block text-[11px] tracking-[0.12em] text-[var(--copper-soft)] uppercase underline decoration-[var(--copper)] underline-offset-2 md:text-[12px]"
        >
          Fiyatlandırma hakkında detaylı bilgi
        </a>
      </div>
      <section className="grid grid-cols-2 gap-2 p-2 pt-0 md:min-h-0 md:flex-1 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </main>
  );
}
